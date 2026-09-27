import { describe, expect, it } from "vitest";
import { createGenericRegistry, PRODUCTION_EFFECTS } from "../data/stats.ts";
import { f } from "./expr.ts";
import { compileGraph, FloatEvaluator } from "./graph.ts";
import { inputStat, multiplierStat, StatRegistry } from "./stats.ts";

describe("stat registry", () => {
  it("rejects duplicate, malformed and contradictory definitions", () => {
    const r = new StatRegistry([multiplierStat("Test.A", "A", "Misc")]);
    expect(() => r.add(multiplierStat("Test.A", "A again", "Misc"))).toThrow(/already registered/);
    expect(() => r.add(multiplierStat("NoDot", "x", "Misc"))).toThrow(/Namespace.Name/);
    expect(() => r.add({ id: "Test.Both", label: "x", group: "Misc", base: 1, input: { default: 1, kind: "number" } })).toThrow(/both/);
  });

  it("extends and overrides input defaults without mutating the original", () => {
    const r = new StatRegistry([inputStat("Test.In", "in", "Misc", { default: 1, kind: "number" })]);
    const extended = r.extend(multiplierStat("Test.B", "B", "Misc"));
    const tuned = extended.withInputDefaults({ "Test.In": 5 });
    expect(r.has("Test.B")).toBe(false);
    expect(extended.require("Test.In").input?.default).toBe(1);
    expect(tuned.require("Test.In").input?.default).toBe(5);
    expect(() => r.withInputDefaults({ "Test.Missing": 1 })).toThrow(/Unknown stat/);
    expect(() => extended.withInputDefaults({ "Test.B": 1 })).toThrow(/not an input/);
  });
});

describe("generic stats", () => {
  it("compile into a production graph with the expected required inputs", () => {
    const registry = createGenericRegistry().withInputDefaults({
      "Building.6.Share": 1,
      "Mysteries.Count": 1e10,
      "Void.Mana": 2,
      "Idle.Bonus": 3,
    });
    const graph = compileGraph({ stats: registry, effects: PRODUCTION_EFFECTS, score: f("Prod.Total * Click.CritFactor") });
    const inputs = graph.inputs.map((i) => graph.stats[i].id).sort();
    expect(inputs).toEqual(
      [
        ...[1, 2, 3, 4, 5, 6, 7, 8].map((b) => `Building.${b}.Share`),
        "Click.CritChance",
        "Click.CritProfitBase",
        "Click.CritRating",
        "Idle.Active",
        "Idle.Bonus",
        "Mysteries.Count",
        "Void.Mana",
        "Void.ProfitPerPoint",
      ].sort(),
    );
    const ev = new FloatEvaluator(graph);
    expect(10 ** ev.scoreLog10()).toBeCloseTo((1 + 1e10 * 0.03) * (1 + 2 * 1) * 3, 0);
    ev.setInputs({ "Click.CritChance": 50, "Click.CritProfitBase": 300, "Idle.Active": false });
    expect(10 ** ev.scoreLog10()).toBeCloseTo((1 + 1e10 * 0.03) * 3 * (0.5 + 0.5 * 3), 0);
  });

  it("carry a source on every stat and a note on every unverified one", () => {
    for (const s of createGenericRegistry()) {
      expect(s.source, s.id).toBeDefined();
      if (!s.source!.verified) expect(s.source!.note, s.id).toBeTruthy();
    }
  });
});
