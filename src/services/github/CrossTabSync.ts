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
