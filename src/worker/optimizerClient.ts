import type { LevelResult, SweepResult } from "../engine/optimizer.ts";
import type { RelevanceResult } from "../engine/relevance.ts";
import type { OptimizeRequest, WorkerRequest, WorkerResponse } from "./protocol.ts";

export interface OptimizeOutcome {
  result: SweepResult;
  relevance?: RelevanceResult;
  ms: number;
}

export interface OptimizeRun {
  /** Rejects with `OptimizeCancelled` after `cancel()` and with an Error if the worker reports one. */
  promise: Promise<OptimizeOutcome>;
  /** Stops the run before its next enchant level. */
  cancel(): void;
}

export class OptimizeCancelled extends Error {
  constructor() {
    super("Optimization cancelled");
  }
}

/** Minimal Worker surface, so tests can pass an in-process stand-in. */
export interface WorkerLike {
  postMessage(message: WorkerRequest): void;
  addEventListener(type: "message", listener: (event: MessageEvent<WorkerResponse>) => void): void;
  terminate(): void;
}

const createWorker = (): WorkerLike => new Worker(new URL("./optimizer.worker.ts", import.meta.url), { type: "module" }) as unknown as WorkerLike;

interface Pending {
  resolve: (o: OptimizeOutcome) => void;
  reject: (e: Error) => void;
  onProgress?: (row: LevelResult, done: number, total: number) => void;
}

/** Runs optimizations in a Web Worker; several runs can be queued, each identified by its own id. */
export class OptimizerClient {
  private readonly worker: WorkerLike;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;

  constructor(worker: WorkerLike = createWorker()) {
    this.worker = worker;
    this.worker.addEventListener("message", (event) => this.receive(event.data));
  }

  run(request: OptimizeRequest, onProgress?: Pending["onProgress"]): OptimizeRun {
    const id = this.nextId++;
    const promise = new Promise<OptimizeOutcome>((resolve, reject) => this.pending.set(id, { resolve, reject, onProgress }));
    this.worker.postMessage({ type: "run", id, request });
    return { promise, cancel: () => this.worker.postMessage({ type: "cancel", id }) };
  }

  /** Stops the worker immediately, rejecting every pending run. */
  terminate(): void {
    this.worker.terminate();
    for (const p of this.pending.values()) p.reject(new OptimizeCancelled());
    this.pending.clear();
  }

  private receive(message: WorkerResponse): void {
    const p = this.pending.get(message.id);
    if (!p) return;
    switch (message.type) {
      case "progress":
        p.onProgress?.(message.row, message.done, message.total);
        return;
      case "result":
        this.pending.delete(message.id);
        p.resolve({ result: message.result, relevance: message.relevance, ms: message.ms });
        return;
      case "cancelled":
        this.pending.delete(message.id);
        p.reject(new OptimizeCancelled());
        return;
      case "error":
        this.pending.delete(message.id);
        p.reject(new Error(message.message));
        return;
    }
  }
}
