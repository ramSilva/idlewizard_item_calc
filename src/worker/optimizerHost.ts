import { buildModel } from "../data/buildModel.ts";
import { createOptimizer, deserializeInputs } from "../data/optimize.ts";
import { ENCHANT_LEVELS, type LevelResult } from "../engine/optimizer.ts";
import type { OptimizeRequest, WorkerRequest, WorkerResponse } from "./protocol.ts";

/** Yields to the event loop so a queued cancel message is handled between levels. */
const yieldToEvents = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * The worker's message handling, independent of the Worker global so it runs in tests. Runs are processed one level
 * at a time; a cancel takes effect before the next level.
 */
export class OptimizerHost {
  private readonly cancelled = new Set<number>();

  constructor(private readonly post: (message: WorkerResponse) => void) {}

  handle(message: WorkerRequest): Promise<void> {
    if (message.type === "cancel") {
      this.cancelled.add(message.id);
      return Promise.resolve();
    }
    return this.run(message.id, message.request);
  }

  private async run(id: number, request: OptimizeRequest): Promise<void> {
    const t0 = performance.now();
    try {
      const model = buildModel(request.selection, { relevance: false });
      const inputs = deserializeInputs(request.inputs);
      const optimizer = createOptimizer(model, inputs, request.options);
      const levels = request.levels ?? ENCHANT_LEVELS;
      const rows: LevelResult[] = [];
      for (const [i, level] of levels.entries()) {
        await yieldToEvents();
        if (this.cancelled.delete(id)) {
          this.post({ type: "cancelled", id });
          return;
        }
        const row = optimizer.optimizeLevel(level, rows[rows.length - 1]);
        rows.push(row);
        this.post({ type: "progress", id, done: i + 1, total: levels.length, row });
      }
      const relevanceRow = request.relevanceLevel === undefined ? undefined : rows.find((r) => r.level === request.relevanceLevel);
      if (request.relevanceLevel !== undefined && !relevanceRow) throw new Error(`Relevance level ${request.relevanceLevel} isn't among the optimized levels`);
      const relevance = relevanceRow ? optimizer.relevance(relevanceRow) : undefined;
      this.post({ type: "result", id, result: optimizer.sweepResult(rows), relevance, ms: performance.now() - t0 });
    } catch (err) {
      this.post({ type: "error", id, message: err instanceof Error ? err.message : String(err) });
    } finally {
      this.cancelled.delete(id);
    }
  }
}
