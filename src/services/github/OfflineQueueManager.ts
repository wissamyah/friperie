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
