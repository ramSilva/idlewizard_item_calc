import type { WorkerLike } from "./optimizerClient.ts";
import { OptimizerHost } from "./optimizerHost.ts";
import type { WorkerRequest, WorkerResponse } from "./protocol.ts";

/** Runs the host on the calling thread; messages are structured-cloned both ways, as `postMessage` would. */
export class InProcessWorker implements WorkerLike {
  readonly sent: WorkerResponse[] = [];
  readonly received: WorkerRequest[] = [];
  private readonly listeners: ((event: MessageEvent<WorkerResponse>) => void)[] = [];
  private terminated = false;
  private readonly host = new OptimizerHost((m) => {
    if (this.terminated) return;
    const copy = structuredClone(m);
    this.sent.push(copy);
    setTimeout(() => this.listeners.forEach((l) => l({ data: copy } as MessageEvent<WorkerResponse>)), 0);
  });

  postMessage(message: WorkerRequest): void {
    this.received.push(message);
    void this.host.handle(structuredClone(message));
  }

  addEventListener(_: "message", listener: (event: MessageEvent<WorkerResponse>) => void): void {
    this.listeners.push(listener);
  }

  terminate(): void {
    this.terminated = true;
  }
}
