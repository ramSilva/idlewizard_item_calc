import { describe, expect, it } from "vitest";
import { f, type Expr } from "./expr.ts";
import { compileGraph, createModifiers, type GraphSpec, type ItemEffectSpec } from "./graph.ts";
import type { Effect, InputSpec, StatDef } from "./model.ts";
import { analyzeRelevance, decomposeLogScore, sampleValues } from "./relevance.ts";
import { derivedStat, inputStat, multiplierStat } from "./stats.ts";

const SRC = { url: "test", verified: true };
const input = (id: string, value: number, extra: Partial<InputSpec> = {}): StatDef =>
  inputStat(id, id, "Misc", { default: value, kind: "number", ...extra });
const mulEffect = (stat: string, value: Expr): Effect => ({ stat, op: "mul", value, label: `mul ${stat}`, source: SRC });

function relevance(spec: GraphSpec) {
  const result = analyzeRelevance(compileGraph(spec));
  return Object.fromEntries(result.inputs.map((r) => [r.id, r]));
}

const profits = multiplierStat("Prod.Global", "Profits", "Production");
const evo = multiplierStat("Spell.Evo", "Evocation", "Spells");

describe("structural relevance", () => {
  it("hides a blanket multiplier on all profits", () => {
    const r = relevance({
      stats: [profits, input("In.ProfitBoost", 2, { logScale: true })],
      effects: [mulEffect("Prod.Global", f("In.ProfitBoost"))],
      score: f("Prod.Global"),
      items: { mul: ["Prod.Global"] },
    });
    expect(r["In.ProfitBoost"]).toMatchObject({ shown: false, method: "structural" });
    expect(r["In.ProfitBoost"].reason).toMatch(/scales every item set's score equally/);
  });

  it("hides an input used only in the exponent of an item-independent base", () => {
    const r = relevance({
      stats: [profits, input("In.Base", 3), input("In.Exp", 2), input("In.Exp2", 5)],
      score: f("In.Base ^ In.Exp * 2 ^ In.Exp2 * Prod.Global"),
      items: { mul: ["Prod.Global"] },
    });
    for (const id of ["In.Base", "In.Exp", "In.Exp2"]) expect(r[id]).toMatchObject({ shown: false, method: "structural" });
  });

  it("hides everything when no item reaches the score", () => {
    const r = relevance({ stats: [profits, input("In.A", 2)], score: f("Prod.Global * In.A"), items: { mul: [] } });
    expect(r["In.A"]).toMatchObject({ shown: false, method: "structural" });
    expect(r["In.A"].reason).toMatch(/No item/);
  });

  it("decomposes stat references into base and multiplier terms", () => {
    const graph = compileGraph({
      stats: [profits, input("Pet.Power", 10, { logScale: true }), input("In.Boost", 2)],
      effects: [mulEffect("Prod.Global", f("In.Boost")), mulEffect("Prod.Global", f("Pet.Power + 1"))],
      score: f("Prod.Global"),
      items: { mul: ["Pet.Power"] },
    });
    const terms = decomposeLogScore(graph).map((t) => ({ label: t.label, itemDependent: t.itemDependent }));
    expect(terms).toEqual([
      { label: "In.Boost", itemDependent: false },
      { label: "(Pet.Power + 1)", itemDependent: true },
    ]);
  });
});

describe("numeric relevance", () => {
  const livingSin: GraphSpec = {
    stats: [
      profits,
      evo,
      input("Pet.AbilityPower", 1e6, { logScale: true }),
      input("Pet.Level", 100, { kind: "integer", min: 1, logScale: true }),
      input("In.ProfitBoost", 2, { logScale: true }),
    ],
    effects: [
      mulEffect("Spell.Evo", f("P ^ 0.35 * L ^ 2 * 0.001 + 1", { P: "Pet.AbilityPower", L: "Pet.Level" })),
      mulEffect("Prod.Global", f("In.ProfitBoost")),
    ],
    score: f("Spell.Evo * Prod.Global"),
    items: { mul: ["Pet.AbilityPower", "Prod.Global"] },
  };

  it("shows inputs that sit in a sum next to an item-affected stat", () => {
    const r = relevance(livingSin);
    expect(r["Pet.Level"]).toMatchObject({ shown: true, method: "numeric" });
    expect(r["Pet.AbilityPower"]).toMatchObject({ shown: true, method: "numeric" });
    expect(r["Pet.Level"].reason).toMatch(/Changes how much items are worth/);
    expect(r["In.ProfitBoost"]).toMatchObject({ shown: false, method: "structural" });
  });

  it("shows an input in the exponent of an item-dependent base", () => {
    const r = relevance({
      stats: [profits, evo, input("In.Exp", 2)],
      score: f("Spell.Evo ^ In.Exp * Prod.Global"),
      items: { mul: ["Spell.Evo", "Prod.Global"] },
    });
    expect(r["In.Exp"]).toMatchObject({ shown: true, method: "numeric" });
  });

  it("hides a mixed input whose effect cancels out between item sets", () => {
    const r = relevance({
      stats: [profits, evo, input("In.X", 3, { logScale: true })],
      score: f("In.X * Prod.Global + In.X * Spell.Evo"),
      items: { mul: ["Spell.Evo", "Prod.Global"] },
    });
    expect(r["In.X"]).toMatchObject({ shown: false, method: "numeric" });
    expect(r["In.X"].reason).toMatch(/same factor/);
  });

  it("shows an input that items add to, but hides it when items only multiply it", () => {
    const stats = [profits, input("Pet.Level", 50, { kind: "integer", min: 1 })];
    const score = f("Pet.Level ^ 2 * Prod.Global");
    const added = relevance({ stats, score, items: { add: ["Pet.Level"], mul: ["Prod.Global"] } });
    const multiplied = relevance({ stats, score, items: { mul: ["Pet.Level", "Prod.Global"] } });
    expect(added["Pet.Level"]).toMatchObject({ shown: true, method: "numeric" });
    expect(multiplied["Pet.Level"]).toMatchObject({ shown: false, method: "structural" });
  });

  it("shows a toggle that gates an item-affected factor, but not the gated base value", () => {
    const r = relevance({
      stats: [
        profits,
        input("Idle.Active", 1, { kind: "boolean" }),
        input("Idle.Bonus", 5, { min: 1, logScale: true }),
        derivedStat("Idle.Factor", "idle", "Misc", f("if(Idle.Active, Idle.Bonus, 1)")),
      ],
      effects: [mulEffect("Prod.Global", f("Idle.Factor"))],
      score: f("Prod.Global"),
      items: { mul: ["Idle.Bonus", "Prod.Global"] },
    });
    expect(r["Idle.Active"]).toMatchObject({ shown: true, method: "numeric" });
    expect(r["Idle.Bonus"]).toMatchObject({ shown: false, method: "numeric" });
  });

  it("follows dynamic item effects into the inputs they read", () => {
    const items: ItemEffectSpec = { mul: ["Prod.Global"], dynamic: [{ stat: "Attr.Mastery", op: "add", value: f("5 * Pet.Level") }] };
    const r = relevance({
      stats: [profits, input("Pet.Level", 20, { kind: "integer", min: 1 }), input("Attr.Mastery", 100, { kind: "integer", min: 0 })],
      score: f("1.025 ^ Attr.Mastery * Prod.Global"),
      items,
    });
    expect(r["Pet.Level"]).toMatchObject({ shown: true, method: "numeric" });
    expect(r["Attr.Mastery"]).toMatchObject({ shown: false, method: "numeric" });
  });

  it("uses caller-provided candidate sets", () => {
    const graph = compileGraph(livingSin);
    const onlyProfits = createModifiers(graph, { mul: { "Prod.Global": 10 } });
    const r = analyzeRelevance(graph, { candidates: [onlyProfits] });
    expect(r.inputs.find((x) => x.id === "Pet.Level")).toMatchObject({ shown: false, method: "numeric" });
  });
});

describe("sampleValues", () => {
  it("spans orders of magnitude for log-scale inputs and respects bounds", () => {
    expect(sampleValues({ default: 1, kind: "number", logScale: true, min: 0.01 }, 100)).toEqual([0.01, 0.1, 10, 100, 1000, 1e5, 1e8]);
    expect(sampleValues({ default: 0, kind: "integer", min: 0, max: 10 }, 3)).toEqual([0, 3, 5, 8, 10]);
    expect(sampleValues({ default: 0, kind: "boolean" }, 1)).toEqual([0, 1]);
    expect(sampleValues({ default: 0, kind: "number" }, 0)).toEqual([0, 1, 10, 100]);
  });
});
