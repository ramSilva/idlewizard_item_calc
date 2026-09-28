// Golden tests against the Oni, Shaman and Temporalist guides (validation/golden-report.md explains every known
// mismatch). They pin the current match so that model changes show up as a diff in these lists.
import { describe, expect, it } from "vitest";
import { FloatEvaluator, type InputValues } from "../engine/graph.ts";
import { buildModel, defaultSelection, loadoutModifiers, type BuiltModel } from "../data/buildModel.ts";
import { catalystTie, experienceElasticity, GUIDE_CASES, GUIDE_VARIANTS, perLevelGain, presetLoadout, TEMPORALIST_ENCHANT_PRIORITY } from "../data/golden.ts";
import { itemByName } from "../data/items.ts";
import { createOptimizer } from "../data/optimize.ts";
import { comparePreset } from "../data/optimizerReport.ts";

interface Expected {
  /** Preset items the optimizer doesn't pick; each is classified in validation/golden-report.md. */
  missing: string[];
  /** Upper bound on log10(best / preset) under the model. */
  maxGapLog10: number;
}

const EXPECTED: Record<string, Record<string, Expected>> = {
  oni: {
    "LS 13+5": { missing: ["Conjured Ragecrown", "Boots Of Eastern Blessings", "The Amplifier", "Incantations Restructuring", "Spellweaving Kilt", "Spell Vault"], maxGapLog10: 1 },
    "LS 17+5": { missing: ["Boots Of Eastern Blessings", "Incantations Restructuring", "Spellweaving Kilt", "Spell Vault"], maxGapLog10: 1 },
    "LS 39+5": { missing: ["Incantations Restructuring", "Spellweaving Kilt", "Spell Vault"], maxGapLog10: 1 },
  },
  "oni-spellcraft": {
    "LS 13+5": { missing: ["Conjured Ragecrown", "Boots Of Eastern Blessings", "The Amplifier", "Incantations Restructuring", "Spell Vault"], maxGapLog10: 1.5 },
    "LS 17+5": { missing: ["Boots Of Eastern Blessings", "Incantations Restructuring", "Spell Vault"], maxGapLog10: 1.5 },
    "LS 39+5": { missing: ["Incantations Restructuring", "Spell Vault"], maxGapLog10: 1 },
  },
  shaman: {
    "20+5": { missing: ["Morbid Loop", "Chemical Toolbelt", "Falconer's Warm Cape", "Rugged Wristcoat"], maxGapLog10: 4 },
    "28+5": { missing: ["Morbid Loop", "Chemical Toolbelt", "Rugged Wristcoat"], maxGapLog10: 2.5 },
  },
  "shaman-maxed": {
    "20+5": { missing: ["Falconer's Warm Cape"], maxGapLog10: 0.6 },
    "28+5": { missing: [], maxGapLog10: 1e-9 },
  },
  temporalist: {
    "11+5": { missing: ["Conjured Ragecrown", "Gemshoes", "Collar Of Obedience", "Murmuring Spellbook"], maxGapLog10: 2 },
    "15+5": { missing: ["Gemshoes", "Murmuring Spellbook"], maxGapLog10: 1.5 },
    "22+5": { missing: ["Murmuring Spellbook"], maxGapLog10: 1 },
    "34+5": { missing: ["Miniaturized Accelerator", "The Amplifier", "Murmuring Spellbook", "Destabilized Evocations"], maxGapLog10: 1.5 },
  },
};

const models = new Map<string, BuiltModel>();
const model = (classId: string) => {
  if (!models.has(classId)) models.set(classId, buildModel(defaultSelection(classId), { relevance: false }));
  return models.get(classId)!;
};

describe.each(GUIDE_VARIANTS.map((v) => [v.id, v] as const))("guide presets: %s", (_id, variant) => {
  const guide = GUIDE_CASES.find((c) => c.classId === variant.classId)!;

  it.each(guide.presets.map((p) => [p.label, p] as const))("%s", (label, preset) => {
    const m = model(variant.classId);
    const opt = createOptimizer(m, variant.inputs);
    const row = opt.optimizeLevel(preset.enchant);
    const c = comparePreset(opt, m, row, preset.code, variant.inputs);
    const expected = EXPECTED[variant.id][label];
    expect(row.best.stats.complete).toBe(true);
    expect(c.onlyPreset.sort()).toEqual([...expected.missing].sort());
    expect(c.gapLog10).toBeLessThanOrEqual(expected.maxGapLog10);
    if (c.unmetRequirements.length === 0) expect(c.gapLog10).toBeGreaterThanOrEqual(-1e-9);
  });
});

// The guide's per-enchant numbers are "exact profit bonus per enchant". Burst-only items must match closely; items the
// guide also counts in other phases (snap sets, Void mana) only match on their burst part, Incantation^4.
describe("Temporalist enchant priority", () => {
  const guide = GUIDE_CASES.find((c) => c.classId === "temporalist")!;
  const m = model("temporalist");
  const legion = true;

  it.each(TEMPORALIST_ENCHANT_PRIORITY.map((e) => [e.item, e] as const))("%s", (_item, e) => {
    const p = guide.presets.find((x) => x.label === e.preset)!;
    const ours = Math.log(perLevelGain(m, presetLoadout(p.code, p.enchant), e.item, legion));
    if (!e.otherPhases) {
      expect(Math.abs(ours - Math.log(1 + e.guide))).toBeLessThanOrEqual(0.02 * Math.log(1 + e.guide) + 1e-6);
    } else {
      expect(ours).toBeCloseTo(4 * Math.log(1 + itemByName(e.item)!.enchant!.perLevel), 2);
    }
  });

  it("puts the Lucky Amulet / Miniaturized Accelerator tie within ×5 of the guide's catalyst counts, with a similar slope", () => {
    const p = guide.presets.find((x) => x.label === "15+5")!;
    const tie = (level: number) => catalystTie(m, presetLoadout(p.code, level), "Miniaturized Accelerator", "Lucky Amulet", legion);
    const [low, high] = [tie(1), tie(40)];
    expect(Math.abs(Math.log10(low / 1.6e8))).toBeLessThan(Math.log10(5));
    expect(Math.abs(Math.log10(high / 3.2e10))).toBeLessThan(Math.log10(5));
    expect(Math.log10(high / low)).toBeCloseTo(Math.log10(3.2e10 / 1.6e8), 0);
  });
});

// "Char EXP" scalings: Oni 0.3923 (Source Memetics table), Shaman 0.88 and Temporalist 1.34 (burst columns). Ours are
// higher because the level-proportional terms (hero abilities, Mastery perks) shrink only at higher levels than the
// default; phylacteries' compounding (1 + x)^level gives the level-independent part.
describe("character experience scaling", () => {
  const CASES: [string, string, number, number][] = [
    ["oni", "LS 17+5", 0.3923, 0.3],
    ["shaman", "20+5", 0.88, 0.3],
    ["temporalist", "15+5", 1.34, 0.2],
  ];
  it.each(CASES)("%s %s", (classId, label, guideValue, tolerance) => {
    const p = GUIDE_CASES.find((c) => c.classId === classId)!.presets.find((x) => x.label === label)!;
    const ours = experienceElasticity(model(classId), presetLoadout(p.code, p.enchant), true);
    expect(Math.abs(ours - guideValue)).toBeLessThanOrEqual(tolerance);
  });

  it("drops well below the guide's value without the phylactery's compounding", () => {
    const p = GUIDE_CASES.find((c) => c.classId === "shaman")!.presets[0];
    const m = model("shaman");
    const loadout = presetLoadout(p.code, p.enchant).filter((e) => e.item.slot !== "Phylactery");
    expect(experienceElasticity(m, loadout, true)).toBeLessThan(0.6);
  });
});

describe("snapped spells", () => {
  const elasticityOfInput = (m: BuiltModel, id: string, inputs: InputValues = {}) => {
    const p = GUIDE_CASES.find((c) => c.classId === "temporalist")!.presets[1];
    const mods = loadoutModifiers(m, presetLoadout(p.code, p.enchant), true);
    const base = Number(m.stats.get(id)!.input!.default);
    const at = (x: number) => new FloatEvaluator(m.graph, { ...inputs, [id]: x }).scoreLog10(mods);
    return (at(base * 1.01) - at(base / 1.01)) / (2 * Math.log10(1.01));
  };

  it("scales Stabilize The Flow with its snapped Incantation like the guide's snap-only items (~1)", () => {
    expect(elasticityOfInput(model("temporalist"), "Spell.StabilizeTheFlow.SnappedIncantationEfficiency")).toBeCloseTo(1, 1);
  });

  it("gives Gem Resonance's snapped Incantation almost no weight (the guide implies ~1.12; see the report)", () => {
    expect(elasticityOfInput(model("temporalist"), "Spell.GemResonance.SnappedIncantationEfficiency")).toBeLessThan(0.1);
  });
});
