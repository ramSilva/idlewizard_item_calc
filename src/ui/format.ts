import { toInfix } from "../engine/expr.ts";
import type { ItemEffect, UnmodelledReason } from "../engine/model.ts";
import type { StatRegistry } from "../engine/stats.ts";
import { formatNumber } from "./state.ts";

export { formatMultiplier } from "../data/optimizerReport.ts";

export const statLabel = (stats: StatRegistry | undefined, id: string): string => stats?.get(id)?.label ?? id;

/** "Evocation efficiency ×1.25" or "Idle bonus base +0.2"; formula values show as infix. */
export function effectSummary(e: ItemEffect, stats?: StatRegistry): string {
  const value = typeof e.value === "number" ? formatNumber(e.value) : toInfix(e.value);
  return e.op === "mul" ? `${statLabel(stats, e.stat)} ×${value}` : `${statLabel(stats, e.stat)} +${value}`;
}

export const UNMODELLED_LABELS: Record<UnmodelledReason, string> = {
  "not-production": "doesn't change burst mana",
  mechanic: "mechanic not modelled",
  "mythic-random": "Mythic random roll",
  unparsed: "not understood",
};

export const EXCLUSION_LABELS: Record<string, string> = {
  "not-owned": "Not owned",
  mythic: "Mythic (not owned by default)",
  "excluded-slot": "Slot excluded",
  requirements: "Attribute requirements can't be met",
  "no-effect": "No effect on this score",
  "resonator-disabled": "Resonator not allowed",
};
