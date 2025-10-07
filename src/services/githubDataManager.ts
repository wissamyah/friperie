import { GitHubAPIClient } from "./github/GitHubAPIClient";
import { CacheManager } from "./github/CacheManager";
import { OfflineQueueManager } from "./github/OfflineQueueManager";
import { CrossTabSync } from "./github/CrossTabSync";
import { DataMerger } from "./github/DataMerger";
import { DataState, GitHubConfig, SaveStatus } from "./github/types";

class GitHubDataManager {
  private static instance: GitHubDataManager;

  private githubAPI: GitHubAPIClient;
  private cacheManager: CacheManager;
  private offlineQueue: OfflineQueueManager;
  private crossTabSync: CrossTabSync;
  private dataMerger: DataMerger;

  private memoryData: DataState;
  private dataListeners: Set<(data: DataState) => void> = new Set();
  private saveStatusListeners: Set<
    (status: SaveStatus, error?: string) => void
  > = new Set();

  private saveLock: boolean = false;
  private batchUpdateInProgress: boolean = false;
  private batchUpdateQueue: Array<{ type: keyof DataState; data: any }> = [];
  private pendingSaves: Set<keyof DataState> = new Set();

  private isOnline: boolean = navigator.onLine;
  private saveStatus: SaveStatus = "idle";
  private lastSaveError: string | null = null;

  private constructor() {
    // Try to get token from localStorage if available
    const savedToken = typeof window !== 'undefined'
      ? localStorage.getItem('github_token')
      : null;

    // GitHub configuration for friperie-data repo
    const config: GitHubConfig = {
      owner: "wissamyah",
      repo: "friperie-data",
      path: "data/data.json",
      branch: "main",
      token: savedToken,
      apiBase: "https://api.github.com",
    };

    this.githubAPI = new GitHubAPIClient(config);
    this.cacheManager = new CacheManager();
    this.offlineQueue = new OfflineQueueManager();
    this.crossTabSync = new CrossTabSync("friperie-sync");
    this.dataMerger = new DataMerger();

    this.memoryData = this.dataMerger.getDefaultDataState();

    this.setupEventListeners();
  }

  static getInstance(): GitHubDataManager {
    if (!GitHubDataManager.instance) {
      GitHubDataManager.instance = new GitHubDataManager();
    }
    return GitHubDataManager.instance;
  }

  private setupEventListeners(): void {
    window.addEventListener("online", () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
    });

    this.crossTabSync.subscribe((data) => {
      if (data.type === "DATA_UPDATE") {
        this.memoryData = data.payload;
        this.notifyDataListeners();
      }
    });

    // Use browser's online/offline detection instead of polling GitHub API
    // This prevents hitting GitHub's rate limits (60 req/hour for unauthenticated)
  }

  private async checkConnection(): Promise<void> {
    // Use browser's navigator.onLine instead of polling GitHub API
    this.isOnline = navigator.onLine;
  }

  /**
   * Load all data from GitHub
   */
  async loadAllData(
    silent: boolean = false,
    skipCache: boolean = false
  ): Promise<DataState> {
    try {
      const cachedData = this.cacheManager.get("github_data");
      if (cachedData && !skipCache) {
        if (!silent) {
          this.memoryData = cachedData;
          this.notifyDataListeners();
        }
        return cachedData;
      }

      const { data, sha } = await this.githubAPI.fetchData();

      this.cacheManager.set("github_sha", sha, Infinity);
      this.cacheManager.set("github_data", data, 300000); // 5 min TTL

      if (!silent) {
        this.memoryData = data;
        this.notifyDataListeners();
      }

      return data;
    } catch (error) {
      console.error("Failed to load data:", error);
      throw error;
    }
  }

  /**
   * Get data for specific type
   */
  getData<K extends keyof DataState>(type: K): DataState[K] {
    return this.memoryData[type];
  }

  /**
   * Update data (SAVE-FIRST, then update UI)
   */
  async updateData<K extends keyof DataState>(
    type: K,
    data: DataState[K],
    immediate: boolean = true
  ): Promise<void> {
    // Mark for save
    this.pendingSaves.add(type);

    // If in batch mode, queue it
    if (this.batchUpdateInProgress) {
      this.batchUpdateQueue.push({ type, data });
      return;
    }

    // If offline, queue and update memory
    if (!this.isOnline) {
      this.offlineQueue.add(type, "update", data);
      this.memoryData[type] = data;
      this.notifyDataListeners();
      return;
    }

    // SAVE FIRST to GitHub (true save-first pattern)
    this.updateSaveStatus("saving");

    try {
      // Temporarily store the new data without updating memory
      const previousData = this.memoryData[type];
      this.memoryData[type] = data;

      // Save to GitHub FIRST
      await this.saveToGitHub();

      // Update UI ONLY AFTER successful save
      this.notifyDataListeners();
      this.broadcastToOtherTabs();

      this.updateSaveStatus("saved");

      // Reset to idle after 2 seconds
      setTimeout(() => {
        if (this.saveStatus === "saved") {
          this.updateSaveStatus("idle");
        }
      }, 2000);
    } catch (error: any) {
      // Revert memory on error
      await this.loadAllData(true, true);
      this.notifyDataListeners();

      this.updateSaveStatus("error", error.message);
      throw error;
    }
  }

  /**
   * Start batch update mode
   */
  startBatchUpdate(): void {
    this.batchUpdateInProgress = true;
    this.batchUpdateQueue = [];
  }

  /**
   * End batch update mode (triggers save)
   */
  async endBatchUpdate(): Promise<void> {
    this.batchUpdateInProgress = false;

    this.updateSaveStatus("saving");

    try {
      // Process all queued updates - update memory for save
      for (const { type, data } of this.batchUpdateQueue) {
        this.memoryData[type] = data;
      }

      // Save all changes together FIRST
      await this.saveToGitHub();

      // Notify listeners ONLY AFTER successful save
      this.notifyDataListeners();
      this.broadcastToOtherTabs();

      // Clear the queue after successful processing
      this.batchUpdateQueue = [];

      this.updateSaveStatus("saved");

      setTimeout(() => {
        if (this.saveStatus === "saved") {
          this.updateSaveStatus("idle");
        }
      }, 2000);
    } catch (error: any) {
      console.error('❌ [BATCH] Error during batch update:', error);
      // Revert on error
      await this.loadAllData(true, true);
      this.notifyDataListeners();

      this.updateSaveStatus("error", error.message);
      throw error;
    }
  }

  /**
   * Save to GitHub (with conflict resolution)
   */
  private async saveToGitHub(): Promise<void> {
    // Wait for any existing save to complete
    while (this.saveLock) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.saveLock = true;

    try {
      // Preserve user's changes before reloading
      const userChanges = { ...this.memoryData };

      // Reload to get the latest SHA (but don't update memory yet)
      const { sha: latestSha } = await this.githubAPI.fetchData();

      // Restore user's changes
      this.memoryData = userChanges;

      const newSha = await this.githubAPI.saveData(this.memoryData, latestSha);

      this.cacheManager.set("github_sha", newSha, Infinity);
      this.cacheManager.delete("github_data");
      this.pendingSaves.clear();
    } catch (error: any) {
      if (error.message === "SHA_CONFLICT") {
        await this.handleShaConflict();
      } else {
        console.error("❌ [SAVE] Save failed:", error);
        throw error;
      }
    } finally {
      this.saveLock = false;
    }
  }

  /**
   * Handle SHA conflict (merge and retry with exponential backoff)
   */
  private async handleShaConflict(retryCount: number = 0): Promise<void> {
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      throw new Error('Maximum retry attempts reached for SHA conflict resolution');
    }

    const localData = { ...this.memoryData };

    // Reload fresh data from GitHub
    const remoteData = await this.loadAllData(true, true);
    const freshSha = this.cacheManager.get("github_sha");

    // Merge local changes with remote data
    this.memoryData = this.dataMerger.mergeDataStates(remoteData, localData);

    try {
      // Try to save with the fresh SHA
      const newSha = await this.githubAPI.saveData(this.memoryData, freshSha);
      this.cacheManager.set("github_sha", newSha, Infinity);
      this.cacheManager.delete("github_data");

      this.notifyDataListeners();
      this.broadcastToOtherTabs();
    } catch (error: any) {
      if (error.message === "SHA_CONFLICT") {
        // Exponential backoff before retry
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 5000);
        await new Promise(resolve => setTimeout(resolve, backoffTime));

        // Recursive retry
        await this.handleShaConflict(retryCount + 1);
      } else {
        throw error;
      }
    }
  }

  /**
   * Process offline queue
   */
  private async processOfflineQueue(): Promise<void> {
    const operations = this.offlineQueue.getAll();

    for (const op of operations) {
      try {
        await this.updateData(op.dataType, op.data, true);
        this.offlineQueue.remove(op.id);
      } catch (error) {
        console.error("Failed to process queued operation:", error);
      }
    }
  }

  /**
   * Subscribe to data changes
   */
  subscribeToData(listener: (data: DataState) => void): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  /**
   * Subscribe to save status changes
   */
  subscribeToSaveStatus(
    listener: (status: SaveStatus, error?: string) => void
  ): () => void {
    this.saveStatusListeners.add(listener);
    return () => this.saveStatusListeners.delete(listener);
  }

  /**
   * Update save status and notify listeners
   */
  private updateSaveStatus(status: SaveStatus, error?: string): void {
    this.saveStatus = status;
    this.lastSaveError = error || null;
    this.saveStatusListeners.forEach((listener) => listener(status, error));
  }

  /**
   * Get current save status
   */
  getSaveStatus(): { status: SaveStatus; error: string | null } {
    return {
      status: this.saveStatus,
      error: this.lastSaveError,
    };
  }

  /**
   * Check if there are pending saves
   */
  hasPendingSaves(): boolean {
    return this.pendingSaves.size > 0 || !this.offlineQueue.isEmpty();
  }

  /**
   * Notify all data listeners
   */
  private notifyDataListeners(): void {
    this.dataListeners.forEach((listener) => listener(this.memoryData));
  }

  /**
   * Broadcast to other tabs
   */
  private broadcastToOtherTabs(): void {
    this.crossTabSync.broadcast({
      type: "DATA_UPDATE",
      payload: this.memoryData,
    });
  }

  /**
   * Update GitHub token
   */
  updateToken(token: string): void {
    this.githubAPI.updateToken(token);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isOnline;
  }

  /**
   * Force immediate sync
   */
  async forceSync(): Promise<void> {
    this.updateSaveStatus("saving");
    try {
      await this.saveToGitHub();
      this.updateSaveStatus("saved");
      setTimeout(() => {
        if (this.saveStatus === "saved") {
          this.updateSaveStatus("idle");
        }
      }, 2000);
    } catch (error: any) {
      this.updateSaveStatus("error", error.message);
      throw error;
    }
  }
}

// Export singleton instance
export const githubDataManager = GitHubDataManager.getInstance();
