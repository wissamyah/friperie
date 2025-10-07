# GitHub-Based Data Persistence Architecture - Complete White-Label Guide (Non-Optimistic Version)

## 📋 Generic Architecture Overview

This architecture uses GitHub as a cloud database for React applications with **save-first, update-after** pattern for data integrity. It works for **any** type of data structure you need to manage.

### Visual Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                         │
│              (Your UI Layer - Any Components)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Custom Domain Hooks                        │
│         (useEntityA, useEntityB, useEntityC, etc.)          │
│              Built on top of useGitHubData                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                 useGitHubData Hook                          │
│         (Generic base hook for all data operations)         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              GitHubDataManager (Singleton)                  │
│           Central orchestrator for all operations           │
└─┬───────────┬───────────┬───────────┬────────────┬──────────┘
  │           │           │           │            │
  ↓           ↓           ↓           ↓            ↓
┌─────┐  ┌────────┐  ┌──────┐  ┌─────────┐  ┌──────────┐
│Cache│  │Offline │  │Cross │  │GitHub   │  │Data      │
│Mgr  │  │Queue   │  │Tab   │  │API      │  │Merger    │
│     │  │Mgr     │  │Sync  │  │Client   │  │          │
└─────┘  └────────┘  └──────┘  └────┬────┘  └──────────┘
                                     │
                                     ↓
                              ┌──────────────┐
                              │   GitHub     │
                              │   data.json  │
                              └──────────────┘
```

---

## 🎯 Core Architectural Principles

### 1. **Single Source of Truth**

- All data stored in **one JSON file** on GitHub
- GitHub repository acts as your cloud database
- No traditional database server needed

### 2. **In-Memory First**

- Data lives in memory (`memoryData` object)
- Ultra-fast reads (no network calls)
- Writes happen synchronously with user feedback

### 3. **Save-First Updates (Non-Optimistic)**

- Save to GitHub FIRST, then update UI
- User sees loading state during save
- No data loss on unexpected refresh
- Guaranteed data persistence

### 4. **Eventual Consistency**

- Local changes sync to GitHub immediately
- Conflicts auto-resolved via merging
- All devices eventually see same data

### 5. **Offline-First**

- App works without internet
- Operations queued automatically
- Auto-sync when connection restored

---

## 📦 File Structure (Generic Template)

```
src/
├── services/
│   ├── githubStorage.ts           # Authentication & token management
│   ├── githubDataManager.ts       # Main orchestrator (Singleton)
│   └── github/
│       ├── types.ts               # TypeScript interfaces for your data
│       ├── GitHubAPIClient.ts     # Direct GitHub API communication
│       ├── CacheManager.ts        # In-memory cache with TTL
│       ├── OfflineQueueManager.ts # Queue for offline operations
│       ├── CrossTabSync.ts        # Browser tab synchronization
│       └── DataMerger.ts          # Conflict resolution logic
│
├── hooks/
│   ├── useGitHubData.ts          # Generic base hook (never modify)
│   ├── useSaveStatus.ts          # Track save status across app
│   ├── useEntityA.ts              # Domain-specific hook #1
│   ├── useEntityB.ts              # Domain-specific hook #2
│   └── useEntityC.ts              # Domain-specific hook #3
│
├── contexts/
│   ├── DataContext.tsx            # Global data provider
│   └── SaveStatusContext.tsx      # Global save status tracking
│
├── components/
│   ├── ErrorBoundary.tsx          # Error boundary for data operations
│   ├── SaveStatusIndicator.tsx    # Shows "Saving...", "Saved", etc.
│   └── [Your UI components]       # Use hooks to access data
│
└── App.tsx                        # Main app with providers
```

---

## 🔧 Step-by-Step Implementation Guide

### Step 1: Define Your Data Schema

Create `src/services/github/types.ts`:

```typescript
// Define your data types
export interface EntityA {
  id: string;
  // Your fields here
  createdAt: string;
  updatedAt: string;
}

export interface EntityB {
  id: string;
  // Your fields here
  createdAt: string;
  updatedAt: string;
}

export interface EntityC {
  id: string;
  // Your fields here
  createdAt: string;
  updatedAt: string;
}

// The complete data state (ALL your data types)
export interface DataState {
  entityA: EntityA[];
  entityB: EntityB[];
  entityC: EntityC[];
  // Add all your data types here
  metadata?: {
    lastUpdated: string;
    version: string;
  };
}

// GitHub configuration
export interface GitHubConfig {
  owner: string; // Your GitHub username
  repo: string; // Your data repository name
  path: string; // Path to data.json (e.g., 'data/data.json')
  branch: string; // Usually 'main'
  token: string | null; // Personal access token
  apiBase: string; // 'https://api.github.com'
}

// Operation types for offline queue
export type OperationType = "create" | "update" | "delete" | "batch";

export interface QueuedOperation {
  id: string;
  type: OperationType;
  dataType: keyof DataState;
  data: any;
  timestamp: number;
}

// Save status types
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface SaveStatusState {
  status: SaveStatus;
  lastSaved: string | null;
  error: string | null;
}
```

---

### Step 2: Copy Core Services (No Modifications Needed)

These files are **100% reusable** across any project. Copy them as-is:

#### **CacheManager.ts** - In-Memory Cache

```typescript
export class CacheManager {
  private cache: Map<string, { value: any; expiry: number }> = new Map();

  set(key: string, value: any, ttl: number = 300000): void {
    const expiry = ttl === Infinity ? Infinity : Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (item.expiry !== Infinity && Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}
```

#### **OfflineQueueManager.ts** - Offline Operations Queue

```typescript
import { QueuedOperation } from "./types";

export class OfflineQueueManager {
  private queue: QueuedOperation[] = [];

  add(dataType: string, operationType: string, data: any): void {
    const operation: QueuedOperation = {
      id: `${Date.now()}-${Math.random()}`,
      type: operationType as any,
      dataType: dataType as any,
      data,
      timestamp: Date.now(),
    };
    this.queue.push(operation);
  }

  getAll(): QueuedOperation[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue = [];
  }

  remove(operationId: string): void {
    this.queue = this.queue.filter((op) => op.id !== operationId);
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
```

#### **CrossTabSync.ts** - Browser Tab Synchronization

```typescript
export class CrossTabSync {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(data: any) => void> = new Set();
  private channelName: string;

  constructor(channelName: string = "data-sync") {
    this.channelName = channelName;
    this.initialize();
  }

  private initialize(): void {
    try {
      // Try BroadcastChannel first (modern browsers)
      this.channel = new BroadcastChannel(this.channelName);
      this.channel.onmessage = (event) => {
        this.notifyListeners(event.data);
      };
    } catch (e) {
      // Fallback to localStorage events for older browsers
      window.addEventListener("storage", (event) => {
        if (event.key === this.channelName && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            this.notifyListeners(data);
          } catch (e) {
            console.error("Failed to parse sync data:", e);
          }
        }
      });
    }
  }

  broadcast(data: any): void {
    try {
      if (this.channel) {
        this.channel.postMessage(data);
      } else {
        // Fallback to localStorage
        localStorage.setItem(this.channelName, JSON.stringify(data));
        localStorage.removeItem(this.channelName); // Trigger event
      }
    } catch (e) {
      console.error("Failed to broadcast data:", e);
    }
  }

  subscribe(listener: (data: any) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(data: any): void {
    this.listeners.forEach((listener) => listener(data));
  }

  destroy(): void {
    if (this.channel) {
      this.channel.close();
    }
    this.listeners.clear();
  }
}
```

#### **GitHubAPIClient.ts** - GitHub API Communication

```typescript
import { GitHubConfig, DataState } from "./types";

export class GitHubAPIClient {
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  async fetchData(): Promise<{ data: DataState; sha: string }> {
    if (!this.config.token) {
      throw new Error("GitHub token not configured");
    }

    const url = `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.path}?ref=${this.config.branch}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const result = await response.json();
    const content = atob(result.content.replace(/\n/g, ""));
    const data = JSON.parse(content);

    return {
      data,
      sha: result.sha,
    };
  }

  async saveData(data: DataState, sha?: string): Promise<string> {
    if (!this.config.token) {
      throw new Error("GitHub token not configured");
    }

    // Add metadata
    const dataWithMetadata = {
      ...data,
      metadata: {
        lastUpdated: new Date().toISOString(),
        version: "1.0.0",
      },
    };

    const content = btoa(JSON.stringify(dataWithMetadata, null, 2));
    const url = `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.path}`;

    const body: any = {
      message: `Update data - ${new Date().toISOString()}`,
      content,
      branch: this.config.branch,
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      if (
        response.status === 409 ||
        error.message?.includes("does not match")
      ) {
        throw new Error("SHA_CONFLICT");
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const result = await response.json();
    return result.content.sha;
  }

  async verifyToken(): Promise<boolean> {
    if (!this.config.token) return false;

    try {
      const response = await fetch(`${this.config.apiBase}/user`, {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch("https://api.github.com", {
        method: "HEAD",
      });
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  updateToken(token: string): void {
    this.config.token = token;
  }
}
```

---

### Step 3: Create DataMerger (Customize for Your Data Types)

**DataMerger.ts** - Only file you need to customize per project:

```typescript
import { DataState } from "./types";

export class DataMerger {
  /**
   * Merges two data states, with local changes taking precedence
   */
  mergeDataStates(remote: DataState, local: DataState): DataState {
    return {
      // Add all your data types here
      entityA: this.mergeArrays(remote.entityA || [], local.entityA || []),
      entityB: this.mergeArrays(remote.entityB || [], local.entityB || []),
      entityC: this.mergeArrays(remote.entityC || [], local.entityC || []),
      // ...add all your entity types

      metadata: local.metadata || remote.metadata,
    };
  }

  /**
   * Merges two arrays by ID, local items override remote items
   */
  private mergeArrays<T extends { id: string }>(remote: T[], local: T[]): T[] {
    const merged = new Map<string, T>();

    // Add all remote items
    remote.forEach((item) => merged.set(item.id, item));

    // Override with local items (local wins)
    local.forEach((item) => merged.set(item.id, item));

    return Array.from(merged.values());
  }

  /**
   * Returns empty data state
   */
  getDefaultDataState(): DataState {
    return {
      entityA: [],
      entityB: [],
      entityC: [],
      // ...add all your entity types with empty arrays
    };
  }
}
```

---

### Step 4: Create GitHubDataManager (Non-Optimistic Version)

**githubDataManager.ts** - The central orchestrator with save-first pattern:

```typescript
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
    // **CUSTOMIZE THIS** - Your GitHub configuration
    const config: GitHubConfig = {
      owner: "YOUR_GITHUB_USERNAME",
      repo: "YOUR_DATA_REPO_NAME",
      path: "data/data.json",
      branch: "main",
      token: null,
      apiBase: "https://api.github.com",
    };

    this.githubAPI = new GitHubAPIClient(config);
    this.cacheManager = new CacheManager();
    this.offlineQueue = new OfflineQueueManager();
    this.crossTabSync = new CrossTabSync("my-app-sync"); // **CUSTOMIZE** channel name
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

    // Periodic connection check
    setInterval(() => this.checkConnection(), 30000);
  }

  private async checkConnection(): Promise<void> {
    this.isOnline = await this.githubAPI.checkConnection();
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
   * This is the key difference from optimistic updates
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

    // SAVE FIRST to GitHub
    this.updateSaveStatus("saving");

    try {
      // Update memory BEFORE save (for immediate access during save)
      this.memoryData[type] = data;

      // Save to GitHub
      await this.saveToGitHub();

      // Update UI AFTER successful save
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

    // Process all queued updates
    for (const { type, data } of this.batchUpdateQueue) {
      this.memoryData[type] = data;
    }

    this.updateSaveStatus("saving");

    try {
      // Save all changes together
      await this.saveToGitHub();

      // Notify listeners once after save
      this.notifyDataListeners();
      this.broadcastToOtherTabs();

      this.updateSaveStatus("saved");

      setTimeout(() => {
        if (this.saveStatus === "saved") {
          this.updateSaveStatus("idle");
        }
      }, 2000);
    } catch (error: any) {
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
    if (this.saveLock) {
      throw new Error("Save already in progress");
    }
    this.saveLock = true;

    try {
      let sha = this.cacheManager.get("github_sha");

      if (!sha) {
        await this.loadAllData(true, true);
        sha = this.cacheManager.get("github_sha");
      }

      const newSha = await this.githubAPI.saveData(this.memoryData, sha);
      this.cacheManager.set("github_sha", newSha, Infinity);
      this.cacheManager.delete("github_data");
      this.pendingSaves.clear();
    } catch (error: any) {
      if (error.message === "SHA_CONFLICT") {
        await this.handleShaConflict();
      } else {
        console.error("Save failed:", error);
        throw error;
      }
    } finally {
      this.saveLock = false;
    }
  }

  /**
   * Handle SHA conflict (merge and retry)
   */
  private async handleShaConflict(): Promise<void> {
    const localData = { ...this.memoryData };

    const remoteData = await this.loadAllData(true, true);
    const freshSha = this.cacheManager.get("github_sha");

    this.memoryData = this.dataMerger.mergeDataStates(remoteData, localData);

    const newSha = await this.githubAPI.saveData(this.memoryData, freshSha);
    this.cacheManager.set("github_sha", newSha, Infinity);

    this.notifyDataListeners();
    this.broadcastToOtherTabs();
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
```

---

### Step 5: Create Save Status Context

**SaveStatusContext.tsx** - Global save status tracking:

```typescript
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { githubDataManager } from "../services/githubDataManager";
import { SaveStatus } from "../services/github/types";

interface SaveStatusContextType {
  status: SaveStatus;
  error: string | null;
  lastSaved: string | null;
  hasPendingSaves: boolean;
}

const SaveStatusContext = createContext<SaveStatusContextType | undefined>(
  undefined
);

export const SaveStatusProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [hasPendingSaves, setHasPendingSaves] = useState(false);

  useEffect(() => {
    // Subscribe to save status changes
    const unsubscribe = githubDataManager.subscribeToSaveStatus(
      (newStatus, newError) => {
        setStatus(newStatus);
        setError(newError || null);

        if (newStatus === "saved") {
          setLastSaved(new Date().toISOString());
        }
      }
    );

    // Check for pending saves periodically
    const interval = setInterval(() => {
      setHasPendingSaves(githubDataManager.hasPendingSaves());
    }, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <SaveStatusContext.Provider
      value={{ status, error, lastSaved, hasPendingSaves }}
    >
      {children}
    </SaveStatusContext.Provider>
  );
};

export const useSaveStatusContext = () => {
  const context = useContext(SaveStatusContext);
  if (!context) {
    throw new Error(
      "useSaveStatusContext must be used within SaveStatusProvider"
    );
  }
  return context;
};
```

---

### Step 6: Create Save Status Indicator Component

**SaveStatusIndicator.tsx** - Visual feedback component:

```typescript
import React from "react";
import { useSaveStatusContext } from "../contexts/SaveStatusContext";

export const SaveStatusIndicator: React.FC = () => {
  const { status, error, lastSaved } = useSaveStatusContext();

  const getStatusConfig = () => {
    switch (status) {
      case "saving":
        return {
          color: "#2196f3",
          bgColor: "#e3f2fd",
          icon: "⏳",
          text: "Saving...",
        };
      case "saved":
        return {
          color: "#4caf50",
          bgColor: "#e8f5e9",
          icon: "✓",
          text: "All changes saved",
        };
      case "error":
        return {
          color: "#f44336",
          bgColor: "#ffebee",
          icon: "⚠️",
          text: `Save failed: ${error || "Unknown error"}`,
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();

  if (!config) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        padding: "12px 20px",
        backgroundColor: config.bgColor,
        color: config.color,
        borderRadius: "8px",
        border: `1px solid ${config.color}`,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "14px",
        fontWeight: "500",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        zIndex: 9999,
      }}
    >
      <span>{config.icon}</span>
      <span>{config.text}</span>
      {lastSaved && status === "saved" && (
        <span style={{ fontSize: "12px", opacity: 0.7 }}>
          ({new Date(lastSaved).toLocaleTimeString()})
        </span>
      )}
    </div>
  );
};
```

---

### Step 7: Create useGitHubData Hook with Action Loading

**useGitHubData.ts** - Base hook with loading states:

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { githubDataManager } from "../services/githubDataManager";
import { DataState } from "../services/github/types";

type DataType = keyof DataState;

interface UseGitHubDataOptions {
  dataType: DataType;
  immediate?: boolean;
}

interface UseGitHubDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  updateData: (newData: T[]) => Promise<void>;
  refresh: () => Promise<void>;
  forceSync: () => Promise<void>;
  isOnline: boolean;
}

export function useGitHubData<T = any>({
  dataType,
  immediate = true,
}: UseGitHubDataOptions): UseGitHubDataReturn<T> {
  const [localData, setLocalData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    githubDataManager.getConnectionStatus()
  );

  const unsubscribeDataRef = useRef<(() => void) | null>(null);

  // Subscribe to data changes
  useEffect(() => {
    unsubscribeDataRef.current = githubDataManager.subscribeToData(
      (allData: DataState) => {
        setLocalData(allData[dataType] as T[]);
        setLoading(false);
      }
    );

    // Initial load
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const currentData = githubDataManager.getData(dataType) as T[];
        setLocalData(currentData);

        if (immediate && currentData.length === 0) {
          await githubDataManager.loadAllData();
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    return () => {
      if (unsubscribeDataRef.current) {
        unsubscribeDataRef.current();
      }
    };
  }, [dataType, immediate]);

  // Monitor connection status
  useEffect(() => {
    const checkConnection = () => {
      setIsOnline(githubDataManager.getConnectionStatus());
    };

    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", checkConnection);

    return () => {
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", checkConnection);
    };
  }, []);

  const updateData = useCallback(
    async (newData: T[]) => {
      try {
        await githubDataManager.updateData(dataType, newData);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [dataType]
  );

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      await githubDataManager.loadAllData(false, true);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const forceSync = useCallback(async () => {
    try {
      await githubDataManager.forceSync();
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  return {
    data: localData,
    loading,
    error,
    updateData,
    refresh,
    forceSync,
    isOnline,
  };
}
```

---

### Step 8: Create Domain-Specific Hooks with Action Loading States

**Template for any entity hook:**

```typescript
import { useCallback, useState } from "react";
import { useGitHubData } from "./useGitHubData";
import { githubDataManager } from "../services/githubDataManager";

// **CUSTOMIZE** - Your entity interface
interface YourEntity {
  id: string;
  // Add your fields
  createdAt: string;
  updatedAt: string;
}

export const useYourEntity = () => {
  const {
    data: items,
    loading,
    error,
    updateData: updateItems,
    isOnline,
    refresh,
    forceSync,
  } = useGitHubData<YourEntity>({
    dataType: "entityA", // **CUSTOMIZE** - Match your DataState key
    immediate: true,
  });

  // Action loading states
  const [actionLoading, setActionLoading] = useState<{
    action: string;
    id?: string;
  } | null>(null);

  // Helper: Generate unique ID
  const generateId = () =>
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Helper: Check if specific action is loading
  const isActionLoading = (action: string, id?: string) => {
    if (!actionLoading) return false;
    return (
      actionLoading.action === action &&
      (id === undefined || actionLoading.id === id)
    );
  };

  // CREATE operation
  const createItem = useCallback(
    async (itemData: Omit<YourEntity, "id" | "createdAt" | "updatedAt">) => {
      setActionLoading({ action: "create" });

      try {
        const newItem: YourEntity = {
          ...itemData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // If creating this item requires updating other entities, use batch mode:
        githubDataManager.startBatchUpdate();
        await updateItems([...items, newItem]);
        // await updateOtherEntity(...); // If needed
        await githubDataManager.endBatchUpdate();

        return { success: true, data: newItem };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [items, updateItems]
  );

  // READ operation (items are already available via useGitHubData)
  const getItemById = useCallback(
    (id: string) => {
      return items.find((item) => item.id === id);
    },
    [items]
  );

  // UPDATE operation
  const updateItem = useCallback(
    async (id: string, updates: Partial<YourEntity>) => {
      setActionLoading({ action: "update", id });

      try {
        const updatedItems = items.map((item) =>
          item.id === id
            ? { ...item, ...updates, updatedAt: new Date().toISOString() }
            : item
        );

        await updateItems(updatedItems);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [items, updateItems]
  );

  // DELETE operation
  const deleteItem = useCallback(
    async (id: string) => {
      setActionLoading({ action: "delete", id });

      try {
        const filteredItems = items.filter((item) => item.id !== id);
        await updateItems(filteredItems);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [items, updateItems]
  );

  // BATCH DELETE
  const deleteMultiple = useCallback(
    async (ids: string[]) => {
      setActionLoading({ action: "delete-multiple" });

      try {
        const filteredItems = items.filter((item) => !ids.includes(item.id));
        await updateItems(filteredItems);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [items, updateItems]
  );

  return {
    // Data
    items,
    loading,
    error,
    isOnline,

    // Action loading states
    actionLoading,
    isActionLoading,

    // Operations
    createItem,
    getItemById,
    updateItem,
    deleteItem,
    deleteMultiple,

    // Utilities
    refresh,
    forceSync,
  };
};
```

---

### Step 9: Create Error Boundaries

**ErrorBoundary.tsx** - General error boundary:

```typescript
import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: "20px",
            margin: "20px",
            border: "1px solid #ff4444",
            borderRadius: "8px",
            backgroundColor: "#fff5f5",
          }}
        >
          <h2 style={{ color: "#d32f2f", marginTop: 0 }}>
            Something went wrong
          </h2>
          <p style={{ color: "#666" }}>
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: "8px 16px",
              backgroundColor: "#2196f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**DataErrorBoundary.tsx** - Specialized for data operations:

```typescript
import React, { ReactNode } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

interface Props {
  children: ReactNode;
}

export const DataErrorBoundary: React.FC<Props> = ({ children }) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Data operation error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  };

  const fallback = (
    <div
      style={{
        padding: "24px",
        margin: "20px",
        border: "2px solid #ff9800",
        borderRadius: "8px",
        backgroundColor: "#fff8e1",
      }}
    >
      <h3 style={{ color: "#e65100", marginTop: 0 }}>
        ⚠️ Data Operation Failed
      </h3>
      <p style={{ color: "#666", marginBottom: "16px" }}>
        We encountered an issue while processing your data. This could be due
        to:
      </p>
      <ul style={{ color: "#666", marginBottom: "16px" }}>
        <li>Network connectivity issues</li>
        <li>GitHub API rate limits</li>
        <li>Invalid authentication token</li>
        <li>Data synchronization conflicts</li>
      </ul>
      <p style={{ color: "#666", marginBottom: "16px" }}>
        Your changes may not have been saved. Please try refreshing the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: "10px 20px",
          backgroundColor: "#ff9800",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        Refresh Page
      </button>
    </div>
  );

  return (
    <ErrorBoundary fallback={fallback} onError={handleError}>
      {children}
    </ErrorBoundary>
  );
};
```

---

### Step 10: Create DataContext

**DataContext.tsx** - Global data provider:

```typescript
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { githubDataManager } from "../services/githubDataManager";
import { DataState } from "../services/github/types";

interface DataContextType {
  data: DataState;
  refreshKey: number;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<DataState>(() => ({
    // **CUSTOMIZE** - Initialize with your entity types
    entityA: [],
    entityB: [],
    entityC: [],
  }));

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Subscribe to data changes
    const unsubscribeData = githubDataManager.subscribeToData(
      (newData: DataState) => {
        setData({ ...newData });
        setRefreshKey((prev) => prev + 1);
      }
    );

    // Load initial data
    const loadInitialData = async () => {
      const currentData: DataState = {
        // **CUSTOMIZE** - Load all your entity types
        entityA: githubDataManager.getData("entityA"),
        entityB: githubDataManager.getData("entityB"),
        entityC: githubDataManager.getData("entityC"),
      };
      setData(currentData);
    };

    loadInitialData();

    return () => {
      unsubscribeData();
    };
  }, []);

  return (
    <DataContext.Provider value={{ data, refreshKey }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within DataProvider");
  }
  return context;
};
```

---

### Step 11: Wrap Your App with All Providers

**App.tsx** - Complete setup with save-first pattern and data loss prevention:

```typescript
import { useState, useEffect } from "react";
import { DataProvider } from "./contexts/DataContext";
import { SaveStatusProvider } from "./contexts/SaveStatusContext";
import { DataErrorBoundary } from "./components/DataErrorBoundary";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SaveStatusIndicator } from "./components/SaveStatusIndicator";
import { githubDataManager } from "./services/githubDataManager";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // Prevent data loss on refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (githubDataManager.hasPendingSaves()) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("github_token");

      if (token) {
        githubDataManager.updateToken(token);
        setIsAuthenticated(true);
        await githubDataManager.loadAllData();
      } else {
        setShowAuthModal(true);
      }
    } catch (error) {
      console.error("Authentication check failed:", error);
      setShowAuthModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = async (token: string) => {
    try {
      localStorage.setItem("github_token", token);
      githubDataManager.updateToken(token);
      setIsAuthenticated(true);
      setShowAuthModal(false);
      await githubDataManager.loadAllData();
    } catch (error) {
      console.error("Authentication failed:", error);
      alert("Failed to authenticate. Please check your token and try again.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <AuthModal onSuccess={handleAuthSuccess} />;
  }

  return (
    <ErrorBoundary>
      <SaveStatusProvider>
        <DataProvider>
          <DataErrorBoundary>
            <YourMainApp />
            <SaveStatusIndicator />
          </DataErrorBoundary>
        </DataProvider>
      </SaveStatusProvider>
    </ErrorBoundary>
  );
}

export default App;
```

---

### Step 12: Use in Components with Loading States

**Example component with action loading states:**

```typescript
import { useState } from "react";
import { useYourEntity } from "../hooks/useYourEntity";
import { DataErrorBoundary } from "../components/DataErrorBoundary";
import { useSaveStatusContext } from "../contexts/SaveStatusContext";

function YourComponent() {
  const {
    items,
    loading,
    error,
    createItem,
    updateItem,
    deleteItem,
    isOnline,
    isActionLoading,
  } = useYourEntity();

  const { status: saveStatus } = useSaveStatusContext();
  const [newItemData, setNewItemData] = useState({
    /* your fields */
  });

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorMessage message={error} />;

  const handleCreate = async () => {
    const result = await createItem(newItemData);

    if (result.success) {
      setNewItemData({
        /* reset */
      });
      alert("Item created successfully!");
    } else {
      alert(`Failed to create item: ${result.error}`);
    }
  };

  const handleUpdate = async (id: string, updates: any) => {
    const result = await updateItem(id, updates);

    if (!result.success) {
      alert(`Failed to update: ${result.error}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure?")) return;

    const result = await deleteItem(id);

    if (!result.success) {
      alert(`Failed to delete: ${result.error}`);
    }
  };

  return (
    <div>
      {/* Offline indicator */}
      {!isOnline && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            padding: "10px",
            marginBottom: "20px",
          }}
        >
          ⚠️ You're offline. Changes will sync when you reconnect.
        </div>
      )}

      {/* Create form */}
      <div style={{ marginBottom: "20px" }}>
        <input
          value={newItemData.title}
          onChange={(e) =>
            setNewItemData({ ...newItemData, title: e.target.value })
          }
          placeholder="Item title..."
          disabled={isActionLoading("create")}
        />
        <button
          onClick={handleCreate}
          disabled={isActionLoading("create") || saveStatus === "saving"}
          style={{
            padding: "8px 16px",
            backgroundColor: isActionLoading("create") ? "#ccc" : "#2196f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isActionLoading("create") ? "not-allowed" : "pointer",
          }}
        >
          {isActionLoading("create") ? "⏳ Creating..." : "+ Add Item"}
        </button>
      </div>

      {/* Items list */}
      <div>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              marginBottom: "10px",
              opacity:
                isActionLoading("update", item.id) ||
                isActionLoading("delete", item.id)
                  ? 0.6
                  : 1,
            }}
          >
            <span style={{ flex: 1 }}>{item.title}</span>

            <button
              onClick={() =>
                handleUpdate(item.id, {
                  /* updates */
                })
              }
              disabled={
                isActionLoading("update", item.id) || saveStatus === "saving"
              }
              style={{
                padding: "6px 12px",
                backgroundColor: "#4caf50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isActionLoading("update", item.id)
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {isActionLoading("update", item.id) ? "⏳" : "✏️ Edit"}
            </button>

            <button
              onClick={() => handleDelete(item.id)}
              disabled={
                isActionLoading("delete", item.id) || saveStatus === "saving"
              }
              style={{
                padding: "6px 12px",
                backgroundColor: "#f44336",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: isActionLoading("delete", item.id)
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {isActionLoading("delete", item.id) ? "⏳" : "🗑️ Delete"}
            </button>
          </div>
        ))}
      </div>

      {/* Manual sync button */}
      {isOnline && (
        <button
          onClick={() => githubDataManager.forceSync()}
          disabled={saveStatus === "saving"}
          style={{
            marginTop: "20px",
            padding: "8px 16px",
            backgroundColor: "#ff9800",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: saveStatus === "saving" ? "not-allowed" : "pointer",
          }}
        >
          {saveStatus === "saving" ? "⏳ Syncing..." : "🔄 Sync Now"}
        </button>
      )}
    </div>
  );
}

// Wrap with error boundary
export default function YourComponentWithErrorBoundary() {
  return (
    <DataErrorBoundary>
      <YourComponent />
    </DataErrorBoundary>
  );
}
```

---

## 🎯 Key Differences from Optimistic Version

### 1. **Save Flow**

```typescript
// OLD (Optimistic):
// 1. Update UI immediately ⚡
// 2. Save in background
// 3. Rollback on error

// NEW (Save-First):
// 1. Show loading state
// 2. Save to GitHub first 💾
// 3. Update UI after success ✅
// 4. Rollback on error
```

### 2. **User Experience**

```typescript
// User clicks "Add Item"
// - Button shows "Creating..." (disabled)
// - Save status shows "Saving..."
// - After save completes: Button enabled, shows "Item created!"
// - No data loss on refresh during save
```

### 3. **Data Integrity**

```typescript
// Benefits:
// ✅ No data loss on unexpected refresh
// ✅ User knows exactly when data is saved
// ✅ Clear feedback on save success/failure
// ✅ Can prevent page close during save

// Trade-offs:
// ⏱️ User waits ~500ms-2s for each action
// 🔄 Need loading states on all buttons
```

---

## 🚀 Critical Enhancements Included

### 1. **Prevent Data Loss on Refresh**

```typescript
// Warns user before leaving with unsaved changes
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (githubDataManager.hasPendingSaves()) {
      e.preventDefault();
      e.returnValue = "You have unsaved changes!";
    }
  };
  window.addEventListener("beforeunload", handleBeforeUnload);
}, []);
```

### 2. **Save Status Indicator**

- Shows "Saving...", "All changes saved", "Save failed"
- Fixed position indicator (bottom-right)
- Auto-hides after 2 seconds on success

### 3. **Action-Specific Loading States**

```typescript
// Track which specific action is loading
const [actionLoading, setActionLoading] = useState<{
  action: string;
  id?: string;
} | null>(null);

// Check if specific button should be disabled
isActionLoading("create"); // Creating
isActionLoading("update", item.id); // Updating specific item
isActionLoading("delete", item.id); // Deleting specific item
```

### 4. **Manual Sync Button**

```typescript
<button onClick={() => githubDataManager.forceSync()}>
  {saveStatus === "saving" ? "⏳ Syncing..." : "🔄 Sync Now"}
</button>
```

### 5. **Offline Queue Status**

```typescript
// Check if there are pending offline operations
const hasPendingSaves = githubDataManager.hasPendingSaves();
```

### 6. **Global Save Status**

- Available via `useSaveStatusContext()`
- Synced across all components
- Real-time updates

---

## 🎨 Complete Example: Todo App (Save-First Version)

### 1. Define Types

```typescript
// types.ts
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DataState {
  todos: Todo[];
}
```

### 2. Update DataMerger

```typescript
// DataMerger.ts
mergeDataStates(remote: DataState, local: DataState): DataState {
  return {
    todos: this.mergeArrays(remote.todos || [], local.todos || [])
  };
}

getDefaultDataState(): DataState {
  return { todos: [] };
}
```

### 3. Create Hook

```typescript
// useTodos.ts
export const useTodos = () => {
  const {
    data: todos,
    loading,
    error,
    updateData: updateTodos,
    isOnline,
  } = useGitHubData<Todo>({ dataType: "todos", immediate: true });

  const [actionLoading, setActionLoading] = useState<{
    action: string;
    id?: string;
  } | null>(null);

  const isActionLoading = (action: string, id?: string) => {
    if (!actionLoading) return false;
    return (
      actionLoading.action === action &&
      (id === undefined || actionLoading.id === id)
    );
  };

  const addTodo = useCallback(
    async (title: string) => {
      setActionLoading({ action: "add" });

      try {
        const newTodo: Todo = {
          id: `${Date.now()}-${Math.random()}`,
          title,
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await updateTodos([...todos, newTodo]);
        return { success: true, data: newTodo };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [todos, updateTodos]
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      setActionLoading({ action: "toggle", id });

      try {
        const updated = todos.map((todo) =>
          todo.id === id
            ? {
                ...todo,
                completed: !todo.completed,
                updatedAt: new Date().toISOString(),
              }
            : todo
        );
        await updateTodos(updated);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [todos, updateTodos]
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      setActionLoading({ action: "delete", id });

      try {
        await updateTodos(todos.filter((t) => t.id !== id));
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      } finally {
        setActionLoading(null);
      }
    },
    [todos, updateTodos]
  );

  return {
    todos,
    loading,
    error,
    isOnline,
    actionLoading,
    isActionLoading,
    addTodo,
    toggleTodo,
    deleteTodo,
  };
};
```

### 4. Use in Component

```typescript
function TodoList() {
  const {
    todos,
    loading,
    error,
    addTodo,
    toggleTodo,
    deleteTodo,
    isOnline,
    isActionLoading,
  } = useTodos();

  const [newTodoTitle, setNewTodoTitle] = useState("");
  const { status: saveStatus } = useSaveStatusContext();

  if (loading) return <div>Loading todos...</div>;
  if (error) return <div style={{ color: "red" }}>Error: {error}</div>;

  const handleAdd = async () => {
    if (!newTodoTitle.trim()) return;

    const result = await addTodo(newTodoTitle);
    if (result.success) {
      setNewTodoTitle("");
    } else {
      alert(`Failed: ${result.error}`);
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      {!isOnline && (
        <div
          style={{
            backgroundColor: "#fff3cd",
            padding: "12px",
            borderRadius: "4px",
            marginBottom: "20px",
          }}
        >
          ⚠️ Offline - Changes will sync when reconnected
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
          placeholder="What needs to be done?"
          onKeyPress={(e) => e.key === "Enter" && handleAdd()}
          disabled={isActionLoading("add")}
          style={{
            flex: 1,
            padding: "10px",
            fontSize: "16px",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        />
        <button
          onClick={handleAdd}
          disabled={isActionLoading("add") || saveStatus === "saving"}
          style={{
            padding: "10px 20px",
            backgroundColor: isActionLoading("add") ? "#ccc" : "#2196f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isActionLoading("add") ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {isActionLoading("add") ? "⏳ Adding..." : "+ Add"}
        </button>
      </div>

      {todos.map((todo) => (
        <div
          key={todo.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "8px",
            opacity:
              isActionLoading("toggle", todo.id) ||
              isActionLoading("delete", todo.id)
                ? 0.5
                : 1,
          }}
        >
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
            disabled={
              isActionLoading("toggle", todo.id) || saveStatus === "saving"
            }
            style={{ cursor: "pointer" }}
          />
          <span
            style={{
              flex: 1,
              textDecoration: todo.completed ? "line-through" : "none",
              color: todo.completed ? "#999" : "#333",
            }}
          >
            {todo.title}
          </span>
          <button
            onClick={() => deleteTodo(todo.id)}
            disabled={
              isActionLoading("delete", todo.id) || saveStatus === "saving"
            }
            style={{
              padding: "6px 12px",
              backgroundColor: isActionLoading("delete", todo.id)
                ? "#ccc"
                : "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isActionLoading("delete", todo.id)
                ? "not-allowed"
                : "pointer",
            }}
          >
            {isActionLoading("delete", todo.id) ? "⏳" : "🗑️"}
          </button>
        </div>
      ))}

      {todos.length === 0 && (
        <div style={{ textAlign: "center", color: "#999", padding: "40px" }}>
          No todos yet. Add one above!
        </div>
      )}
    </div>
  );
}

export default function TodoListWithErrorBoundary() {
  return (
    <DataErrorBoundary>
      <TodoList />
    </DataErrorBoundary>
  );
}
```

---

## 📚 Summary

This architecture provides:

✅ **Save-First Pattern** - No data loss on refresh  
✅ **Action Loading States** - Clear feedback on every action  
✅ **Save Status Indicator** - Global save status visibility  
✅ **Data Loss Prevention** - Warning before page close  
✅ **Manual Sync** - User control over when to save  
✅ **Cloud sync** via GitHub (no backend needed)  
✅ **Offline support** with automatic queue  
✅ **Multi-device sync** with conflict resolution  
✅ **Cross-tab sync** in same browser  
✅ **Type-safe** TypeScript throughout  
✅ **Production-ready error handling** with error boundaries  
✅ **Free** - GitHub API is free for personal use

**Trade-offs:**

- User waits for each save operation (~500ms-2s)
- More complex UI with loading states
- Requires proper loading state management
- Not suitable for high-traffic apps (GitHub rate limits: 5000 requests/hour)
