import { FloatEvaluator, type InputValues } from "../engine/graph.ts";
import { unmetRequirements } from "../engine/loadout.ts";
import type { Quality } from "../engine/model.ts";
import type { LevelResult, Optimizer, SetResult, SweepResult } from "../engine/optimizer.ts";
import { loadoutModifiers, type BuiltModel } from "./buildModel.ts";
import { presetItems, SETS } from "./items.ts";
import { optimizerProblem } from "./optimize.ts";

const ENCHANTABLE: readonly Quality[] = ["Legendary", "Unique"];

/** "×12.3" below a million, "×1.23e45" above; "required" when removing the item breaks a requirement. */
export function formatMultiplier(log10: number): string {
  if (log10 === Infinity) return "required";
  if (!Number.isFinite(log10)) return String(log10);
  if (Math.abs(log10) < 6) return `×${Number((10 ** log10).toPrecision(3))}`;
  const exp = Math.floor(log10);
  return `×${(10 ** (log10 - exp)).toFixed(2)}e${exp}`;
}

export interface PresetComparison {
  level: number;
  preset: string[];
  best: string[];
  shared: string[];
  onlyPreset: string[];
  onlyBest: string[];
  /** log10(best / preset) under the model; Infinity-free because both sets are scored the same way. */
  gapLog10: number;
  presetScoreLog10: number;
  unmetRequirements: string[];
}

/** The optimizer's best set at a level against a guide preset (all items at maximum quality and that real enchant level). */
export function comparePreset(opt: Optimizer, model: BuiltModel, row: LevelResult, preset: string, inputs: InputValues = {}): PresetComparison {
  const items = presetItems(preset);
  const keys = items.map((i) => i.key);
  const problem = optimizerProblem(model, inputs);
  const unmet = unmetRequirements(
    items.map((item) => ({ item, enchant: row.level })),
    problem.attributes ?? {},
    SETS,
  );
  const equipped = items.map((item) => ({ item, enchant: ENCHANTABLE.includes(item.maxQuality) && item.enchant?.stat ? row.level : 0 }));
  const presetScore = new FloatEvaluator(model.graph, inputs).scoreLog10(loadoutModifiers(model, equipped, opt.legion));
  const names = new Map(items.map((i) => [i.key, i.name]));
  for (const i of row.best.items) names.set(i.key, i.name);
  const best = row.best.items.map((i) => i.key);
  const name = (k: string) => names.get(k)!;
  return {
    level: row.level,
    preset: keys.map(name),
    best: best.map(name),
    shared: best.filter((k) => keys.includes(k)).map(name),
    onlyPreset: keys.filter((k) => !best.includes(k)).map(name),
    onlyBest: best.filter((k) => !keys.includes(k)).map(name),
    gapLog10: row.best.scoreLog10 - presetScore,
    presetScoreLog10: presetScore,
    unmetRequirements: unmet.map((u) => `${name(u.item)} needs ${u.required} ${u.attribute} (has ${u.available})`),
  };
}

function setLines(set: SetResult): string[] {
  return set.items.map((i) => {
    const ench = i.enchant > 0 ? ` +${i.enchant}${i.effectiveEnchant !== i.enchant ? ` (${i.effectiveEnchant})` : ""}` : "";
    return `    ${i.slot.padEnd(10)} ${`${i.name}${ench}`.padEnd(40)} ${formatMultiplier(i.contributionLog10)}`;
  });
}

/** Text report of a sweep: every level where the best set changes (or every level), with each item's contribution. */
export function sweepReport(result: SweepResult, options: { allLevels?: boolean } = {}): string {
  const out: string[] = [];
  const rows = options.allLevels ? result.levels : result.levels.filter((r) => r.changed);
  for (const r of rows) {
    const other = r.branches.find((b) => b !== r.best);
    const vs = other ? `, other branch ${formatMultiplier(other.scoreLog10 - r.best.scoreLog10)}` : "";
    const s = r.best.stats;
    out.push(
      `Enchant ${r.level}${r.best.forced.length ? ` (forced: ${r.best.forced.join(", ")})` : ""}: ${formatMultiplier(r.best.gainLog10)} vs no items${vs}` +
        ` [${s.candidates} candidates, ${s.positions} searched slots, ${s.leaves} leaves, ${s.bounds} bounds, ${s.ms.toFixed(0)} ms${s.complete ? "" : ", budget exhausted"}]`,
    );
    out.push(...setLines(r.best));
  }
  const unchanged = result.levels.filter((r) => !r.changed).map((r) => r.level);
  if (!options.allLevels && unchanged.length) out.push(`(best set unchanged at the other levels: ${unchanged.length} of ${result.levels.length})`);
  const excluded = new Map<string, number>();
  for (const e of result.excluded) excluded.set(e.reason, (excluded.get(e.reason) ?? 0) + 1);
  out.push(`Excluded items: ${[...excluded].map(([r, n]) => `${r} ${n}`).join(", ") || "none"}`);
  return out.join("\n");
}

export function presetReport(c: PresetComparison): string {
  return [
    `Guide preset at enchant ${c.level}: ${c.shared.length}/${c.preset.length} items shared; best set is ${formatMultiplier(c.gapLog10)} the preset under the model`,
    `  only in preset: ${c.onlyPreset.join(", ") || "-"}`,
    `  only in best:   ${c.onlyBest.join(", ") || "-"}`,
    ...(c.unmetRequirements.length ? [`  preset requirements unmet at the model's attributes: ${c.unmetRequirements.join("; ")}`] : []),
  ].join("\n");
}
