import type { ModelSelection } from "../data/buildModel.ts";
import type { SerializedInputs } from "../data/optimize.ts";
import type { LevelResult, OptimizerOptions, SweepResult } from "../engine/optimizer.ts";
import type { RelevanceResult } from "../engine/relevance.ts";

export interface OptimizeRequest {
  selection: ModelSelection;
  inputs?: SerializedInputs;
  options?: OptimizerOptions;
  /** Global enchant levels to optimize (default 0–55). */
  levels?: number[];
  /** Run the ranking relevance against the best sets at this level (it must be one of `levels`). */
  relevanceLevel?: number;
}

export type WorkerRequest = { type: "run"; id: number; request: OptimizeRequest } | { type: "cancel"; id: number };

export type WorkerResponse =
  | { type: "progress"; id: number; done: number; total: number; row: LevelResult }
  | { type: "result"; id: number; result: SweepResult; relevance?: RelevanceResult; ms: number }
  | { type: "cancelled"; id: number }
  | { type: "error"; id: number; message: string };
