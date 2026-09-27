import { describe, expect, it } from "vitest";
import { f } from "../engine/expr.ts";
import { compileGraph, createModifiers, FloatEvaluator, type InputValues, type ModifierSpec } from "../engine/graph.ts";
import { ATTRIBUTES } from "../engine/model.ts";
import { ATTRIBUTE_EFFECTS, ATTRIBUTE_PERKS, attributePoints, UNMODELLED_PERKS } from "./attributes.ts";
import { createGenericRegistry } from "./stats.ts";

const registry = createGenericRegistry();

function statValue(stat: string, inputs: InputValues, items?: ModifierSpec): number {
  const graph = compileGraph({
    stats: registry,
    effects: ATTRIBUTE_EFFECTS,
    score: f(stat),
    items: items ? { add: Object.keys(items.add ?? {}) } : undefined,
  });
  const ev = new FloatEvaluator(graph, inputs);
  return 10 ** ev.scoreLog10(items ? createModifiers(graph, items) : undefined);
}

describe("attribute per-point bonuses and perks", () => {
  it("lists every perk from 25 to 250 points for each attribute except Versatility", () => {
    for (const a of ATTRIBUTES) {
      const points = [...(ATTRIBUTE_PERKS[a] ?? []).map((p) => p.points), ...UNMODELLED_PERKS.filter((p) => p.attribute === a).map((p) => p.points)].sort((x, y) => x - y);
      expect(points, a).toEqual(a === "Versatility" ? [] : [25, 50, 75, 100, 125, 150, 175, 200, 225, 250]);
    }
  });

  it("Intelligence perks add to the 3% per Mystery and points multiply it", () => {
    const power = (int: number) => statValue("Mysteries.Power", { [attributePoints("Intelligence")]: int });
    expect(power(0)).toBeCloseTo(0.03, 12);
    expect(power(24)).toBeCloseTo(0.03 * 1.025 ** 24, 12);
    expect(power(25)).toBeCloseTo(0.05 * 1.025 ** 25, 12);
    expect(power(100)).toBeCloseTo(0.1 * 1.025 ** 100, 10);
  });

  it("counts item attribute bonuses toward thresholds (Int 230 + Circlet's 20 reaches the 35% total)", () => {
    const withCirclet = statValue("Mysteries.Power", { [attributePoints("Intelligence")]: 230 }, { add: { "Attr.Intelligence": 20 } });
    expect(withCirclet).toBeCloseTo(0.35 * 1.025 ** 250, 6);
  });

  it("Spellcraft incantation perks and per-point Evocation stack multiplicatively", () => {
    const inputs = { [attributePoints("Spellcraft")]: 225 };
    expect(statValue("Spell.IncantationEfficiency", inputs)).toBeCloseTo(1.15 * 1.2 * 1.25 * 1.25, 12);
    expect(statValue("Spell.SummoningEfficiency", inputs)).toBeCloseTo(1.25 * 1.2 * 1.3, 12);
    const evo = statValue("Spell.EvocationEfficiency", { ...inputs, "Spell.AccumulatedCastsThisExile": 999 });
    expect(evo).toBeCloseTo(1.03 ** 225 * (1 + 1.5 * 3), 6);
  });

  it("Dominance multiplies critical profit and adds critical chance and rating", () => {
    const inputs = { [attributePoints("Dominance")]: 225, "Click.CritProfitBase": 100, "Click.CritChance": 10 };
    expect(statValue("Click.CritProfit", inputs)).toBeCloseTo((100 + 500) * 2 * 3 * 4 * 4, 6);
    expect(statValue("Click.CritChance", inputs)).toBeCloseTo(20, 12);
    expect(statValue("Click.AutoclickProfit", inputs)).toBeCloseTo(1.03 ** 225, 6);
  });

  it("Intelligence 150 counts assigned points of every attribute, not item bonuses", () => {
    const inputs = { [attributePoints("Intelligence")]: 150, [attributePoints("Patience")]: 100 };
    const profits = statValue("Prod.Global", inputs, { add: { "Attr.Patience": 50 } });
    expect(profits).toBeCloseTo(1 + 0.005 * 250, 9);
  });

  it("Insight mixes additive and multiplicative Void mana profit perks", () => {
    expect(statValue("Void.ProfitPerPoint", { [attributePoints("Insight")]: 75, "Void.ProfitPerPoint": 1 })).toBeCloseTo((1 + 0.12 + 0.15) * 1.1, 12);
  });

  it("Mastery and Empathy scale CAP, PAP and profits from their inputs", () => {
    const m = { [attributePoints("Mastery")]: 250, "Misc.AchievementPoints": 1000, "Char.Level": 200 };
    expect(statValue("Hero.AbilityPower", m)).toBeCloseTo(1.025 ** 250 * (1 + 0.75), 4);
    expect(statValue("Prod.Global", m)).toBeCloseTo((1 + 0.015 * 200) * (1 + 0.03 * 200), 9);
    const e = { [attributePoints("Empathy")]: 200, "Pet.TimeCurrent": 2000 };
    expect(statValue("Pet.AbilityPower", e)).toBeCloseTo(1.025 ** 200 * (1 + Math.log(2) / Math.log(1.6)), 4);
  });

  it("Versatility multiplies profits by 1.8% per point", () => {
    expect(statValue("Prod.Global", { [attributePoints("Versatility")]: 10 })).toBeCloseTo(1.018 ** 10, 12);
  });

  it("carries a source on every perk and a note on every unverified one", () => {
    for (const e of ATTRIBUTE_EFFECTS) {
      expect(e.source.url).toMatch(/Attributes/);
      if (!e.source.verified) expect(e.source.note, e.label).toBeTruthy();
    }
  });
});
