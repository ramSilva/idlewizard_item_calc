import Decimal from "break_eternity.js";
import type { InputValues } from "../engine/graph.ts";
import { ATTRIBUTES, type Attribute } from "../engine/model.ts";
import { Optimizer, type OptimizerOptions, type OptimizerProblem } from "../engine/optimizer.ts";
import { attributePoints } from "./attributes.ts";
import type { BuiltModel } from "./buildModel.ts";
import { ITEMS, SETS } from "./items.ts";

/** Inputs as they cross a worker boundary or a URL: Decimal values travel as strings such as "1e500". */
export type SerializedInputs = Record<string, number | string | boolean>;

export function deserializeInputs(inputs: SerializedInputs = {}): InputValues {
  return Object.fromEntries(Object.entries(inputs).map(([k, v]) => [k, typeof v === "string" ? new Decimal(v) : v]));
}

export function serializeInputs(inputs: InputValues = {}): SerializedInputs {
  const out: SerializedInputs = {};
  for (const [k, v] of Object.entries(inputs)) if (v !== undefined) out[k] = v instanceof Decimal ? v.toString() : v;
  return out;
}

const numberOf = (v: InputValues[string]): number | undefined =>
  v === undefined ? undefined : typeof v === "boolean" ? Number(v) : typeof v === "number" ? v : v.toNumber();

/** The model's graph and the full item database, with assigned attribute points from the inputs or the class defaults. */
export function optimizerProblem(model: BuiltModel, inputs: InputValues = {}): OptimizerProblem {
  const attributes: Partial<Record<Attribute, number>> = {};
  for (const a of ATTRIBUTES) {
    const id = attributePoints(a);
    attributes[a] = numberOf(inputs[id]) ?? model.stats.get(id)?.input?.default ?? 0;
  }
  return { graph: model.graph, catalog: model.catalog, items: ITEMS, sets: SETS, inputs, attributes };
}

/** An optimizer for a built model; The Legion defaults to the model's `Items.LegionReward` input. */
export function createOptimizer(model: BuiltModel, inputs: InputValues = {}, options: OptimizerOptions = {}): Optimizer {
  const legion = options.legion ?? Boolean(numberOf(inputs["Items.LegionReward"]) ?? model.stats.get("Items.LegionReward")?.input?.default ?? 0);
  return new Optimizer(optimizerProblem(model, inputs), { ...options, legion });
}
