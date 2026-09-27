import { describe, expect, it } from "vitest";
import { defaultSelection } from "../data/buildModel.ts";
import { OptimizeCancelled, OptimizerClient, type WorkerLike } from "./optimizerClient.ts";
import { OptimizerHost } from "./optimizerHost.ts";
import type { WorkerRequest, WorkerResponse } from "./protocol.ts";

/** Runs the host in-process; messages are structured-cloned both ways, as `postMessage` would. */
class InProcessWorker implements WorkerLike {
  readonly sent: WorkerResponse[] = [];
  private readonly listeners: ((event: MessageEvent<WorkerResponse>) => void)[] = [];
  private readonly host = new OptimizerHost((m) => {
    const copy = structuredClone(m);
    this.sent.push(copy);
    setTimeout(() => this.listeners.forEach((l) => l({ data: copy } as MessageEvent<WorkerResponse>)), 0);
  });

  postMessage(message: WorkerRequest): void {
    void this.host.handle(structuredClone(message));
  }

  addEventListener(_: "message", listener: (event: MessageEvent<WorkerResponse>) => void): void {
    this.listeners.push(listener);
  }

  terminate(): void {}
}

describe("optimizer worker protocol", () => {
  it("streams one progress message per level, then the sweep and the relevance", async () => {
    const worker = new InProcessWorker();
    const client = new OptimizerClient(worker);
    const progress: number[] = [];
    const run = client.run({ selection: defaultSelection("oni"), levels: [0, 17], relevanceLevel: 17 }, (row, done, total) => progress.push(row.level, done, total));
    const outcome = await run.promise;
    expect(progress).toEqual([0, 1, 2, 17, 2, 2]);
    expect(outcome.result.levels.map((r) => r.level)).toEqual([0, 17]);
    expect(outcome.result.levels[1].best.items.length).toBeGreaterThan(15);
    expect(outcome.relevance!.inputs.some((i) => i.id === "Mysteries.Count" && !i.shown)).toBe(true);
    expect(worker.sent.map((m) => m.type)).toEqual(["progress", "progress", "result"]);
  });

  it("stops before the next level when cancelled", async () => {
    const worker = new InProcessWorker();
    const client = new OptimizerClient(worker);
    let cancel = () => {};
    const run = client.run({ selection: defaultSelection("oni"), levels: [0, 1, 2, 3, 4, 5] }, (_, done) => {
      if (done === 1) cancel();
    });
    cancel = run.cancel;
    await expect(run.promise).rejects.toBeInstanceOf(OptimizeCancelled);
    expect(worker.sent.filter((m) => m.type === "progress").length).toBeLessThan(6);
    expect(worker.sent.at(-1)!.type).toBe("cancelled");
  });

  it("reports errors, such as a spell the class doesn't have", async () => {
    const client = new OptimizerClient(new InProcessWorker());
    const run = client.run({ selection: { ...defaultSelection("oni"), spells: [73] }, levels: [0] });
    await expect(run.promise).rejects.toThrow(/isn't a Oni spell/);
  });

  it("accepts Decimal inputs as strings", async () => {
    const client = new OptimizerClient(new InProcessWorker());
    const run = client.run({ selection: defaultSelection("temporalist"), inputs: { "Mysteries.Count": "1e400" }, levels: [10] });
    const { result } = await run.promise;
    expect(Number.isFinite(result.levels[0].best.scoreLog10)).toBe(true);
  });
});
