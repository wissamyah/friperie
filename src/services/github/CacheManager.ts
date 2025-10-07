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
