import { GitHubConfig, DataState } from "./types";

export class GitHubAPIClient {
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  /**
   * Update the data file path
   */
  updateDataFilePath(newPath: string): void {
    this.config.path = newPath;
  }

  /**
   * Get current data file path
   */
  getCurrentPath(): string {
    return this.config.path;
  }

  async fetchData(): Promise<{ data: DataState; sha: string }> {
    if (!this.config.token) {
      throw new Error("GitHub token not configured");
    }

    // Add timestamp to prevent caching (query param method is CORS-safe)
    const cacheBuster = `&_t=${Date.now()}`;
    const url = `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${this.config.path}?ref=${this.config.branch}${cacheBuster}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: "application/vnd.github.v3+json",
      },
      // Use cache: 'no-store' to prevent browser caching (doesn't trigger CORS preflight)
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const result = await response.json();
    const content = atob(result.content.replace(/\n/g, ""));
    const rawData = JSON.parse(content);

    // Normalize data structure to ensure all required fields exist
    const data: DataState = {
      products: (rawData.products || []).map((p: any) => ({
        ...p,
        quantity: p.quantity !== undefined ? p.quantity : 0, // Migrate old products without quantity
        costPerBagUSD: p.costPerBagUSD !== undefined ? p.costPerBagUSD : 0 // Migrate old products without USD cost
      })),
      suppliers: rawData.suppliers || [],
      containers: (rawData.containers || []).map((c: any) => {
        // Calculate productsTotalEUR if missing
        const productsTotalEUR = c.productsTotalEUR ?? (c.products || []).reduce((sum: number, p: any) => sum + (p.lineTotal || 0), 0);
        const freightCostEUR = c.freightCostEUR || 0;
        const grandTotalEUR = c.grandTotalEUR ?? (productsTotalEUR + freightCostEUR);

        return {
          ...c,
          productsTotalEUR,
          grandTotalEUR,
          // Migrate old containers without payment tracking
          paymentAllocations: c.paymentAllocations || [],
          customsDutiesUSD: c.customsDutiesUSD || 0,
          totalEURPaid: c.totalEURPaid || 0,
          totalUSDPaid: c.totalUSDPaid || 0,
          totalCostUSD: c.totalCostUSD || 0,
          costPerBagUSD: c.costPerBagUSD || 0,
          paymentStatus: c.paymentStatus || 'unpaid',
          customsStatus: c.customsStatus || 'pending',
          containerStatus: c.containerStatus || 'open',
        };
      }),
      supplierLedger: rawData.supplierLedger || [],
      payments: rawData.payments || [],
      sales: rawData.sales || [],
      expenses: rawData.expenses || [],
      cashTransactions: rawData.cashTransactions || [],
      partners: rawData.partners || [],
      partnerTransactions: rawData.partnerTransactions || [],
      metadata: rawData.metadata,
    };

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
      console.error('❌ [API] GitHub API error:', error);
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

  /**
   * Check if a specific data file exists in the repository
   */
  async checkFileExists(filePath: string): Promise<boolean> {
    if (!this.config.token) {
      throw new Error("GitHub token not configured");
    }

    const url = `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${filePath}?ref=${this.config.branch}`;

    try {
      const response = await fetch(url, {
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

  /**
   * List files in a directory
   */
  async listFiles(directoryPath: string): Promise<string[]> {
    if (!this.config.token) {
      throw new Error("GitHub token not configured");
    }

    const url = `${this.config.apiBase}/repos/${this.config.owner}/${this.config.repo}/contents/${directoryPath}?ref=${this.config.branch}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        return [];
      }

      const files = await response.json();
      return Array.isArray(files)
        ? files.filter((f: any) => f.type === "file").map((f: any) => f.name)
        : [];
    } catch (e) {
      return [];
    }
  }
}
