import Decimal from "break_eternity.js";
import { describe, expect, it } from "vitest";
import { bin, f, call, num, ref, type Expr } from "./expr.ts";
import {
  compileGraph,
  createModifiers,
  evaluateDecimal,
  FloatEvaluator,
  GraphError,
  resultToDecimal,
  tryCompileGraph,
  type GraphSpec,
  type InputValues,
} from "./graph.ts";
import type { Effect, InputSpec, StatDef } from "./model.ts";
import { derivedStat, inputStat, multiplierStat } from "./stats.ts";

const SRC = { url: "test", verified: true };
const input = (id: string, value: number, extra: Partial<InputSpec> = {}): StatDef =>
  inputStat(id, id, "Misc", { default: value, kind: "number", ...extra });
const effect = (stat: string, op: "add" | "mul", value: Expr | string): Effect => ({
  stat,
  op,
  value: typeof value === "string" ? f(value) : value,
  label: `${op} ${stat}`,
  source: SRC,
});

function expectAgreement(spec: GraphSpec, inputs: InputValues = {}, modSpec?: Parameters<typeof createModifiers>[1]) {
  const graph = compileGraph(spec);
  const mods = createModifiers(graph, modSpec);
  const fast = new FloatEvaluator(graph, inputs).evaluate(mods);
  const exact = evaluateDecimal(graph, inputs, mods).score;
  expect(fast.sign).toBe(exact.sign);
  if (exact.sign !== 0) {
    const expected = exact.abs().log10().toNumber();
    expect(Math.abs(fast.log10 - expected)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(expected)));
  }
  return fast;
}

describe("graph compilation", () => {
  it("orders stats topologically and lists reachable inputs only", () => {
    const graph = compileGraph({
      stats: [
        input("In.A", 2),
        input("In.Unused", 1),
        input("In.Eff", 3),
        derivedStat("Test.B", "B", "Misc", f("In.A * 2")),
        derivedStat("Test.C", "C", "Misc", f("Test.B + In.A")),
        multiplierStat("Test.Unused", "unused", "Misc"),
      ],
      effects: [effect("Test.B", "mul", "In.Eff")],
      score: f("Test.C"),
    });
    const ids = graph.stats.map((s) => s.id);
    for (const s of graph.stats) for (const d of s.deps) expect(d).toBeLessThan(s.index);
    expect(ids).not.toContain("Test.Unused");
    expect(graph.inputs.map((i) => graph.stats[i].id).sort()).toEqual(["In.A", "In.Eff"]);
    expect([...graph.stats[graph.index.get("Test.C")!].inputs].map((i) => graph.stats[i].id).sort()).toEqual(["In.A", "In.Eff"]);
  });

  it("detects cycles through bases and effects", () => {
    const { graph, issues } = tryCompileGraph({
      stats: [derivedStat("Test.A", "A", "Misc", f("Test.B + 1")), multiplierStat("Test.B", "B", "Misc")],
      effects: [effect("Test.B", "mul", "Test.A")],
      score: f("Test.A"),
    });
    expect(graph).toBeNull();
    expect(issues).toEqual([{ kind: "cycle", path: ["Test.A", "Test.B", "Test.A"] }]);
    expect(() =>
      compileGraph({ stats: [derivedStat("Test.A", "A", "Misc", f("Test.A"))], score: f("Test.A") }),
    ).toThrow(GraphError);
  });

  it("reports unknown references, unknown targets and stats without a base or input", () => {
    const { issues } = tryCompileGraph({
      stats: [derivedStat("Test.A", "A", "Misc", f("Test.Missing * Test.NoBase")), { id: "Test.NoBase", label: "x", group: "Misc" }],
      effects: [effect("Test.Nowhere", "add", "1")],
      score: f("Test.A * Score.Missing"),
      items: { mul: ["Items.Missing"] },
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        { kind: "unknown-target", id: "Test.Nowhere", from: 'effect "add Test.Nowhere"' },
        { kind: "unknown-target", id: "Items.Missing", from: "item effects" },
        { kind: "unknown-ref", id: "Test.Missing", from: "base of Test.A" },
        { kind: "unknown-ref", id: "Score.Missing", from: "score" },
        { kind: "missing-input", id: "Test.NoBase" },
      ]),
    );
  });

  it("tracks item dependence and inert item stats", () => {
    const graph = compileGraph({
      stats: [input("In.A", 2), multiplierStat("Test.M", "M", "Misc"), derivedStat("Test.D", "D", "Misc", f("Test.M + In.A")), multiplierStat("Test.Off", "off", "Misc")],
      score: f("Test.D * In.A"),
      items: { mul: ["Test.M", "Test.Off"] },
    });
    const dep = (id: string) => graph.stats[graph.index.get(id)!].itemDependent;
    expect(dep("Test.M")).toBe(true);
    expect(dep("Test.D")).toBe(true);
    expect(dep("In.A")).toBe(false);
    expect(graph.inertItemStats).toEqual(["Test.Off"]);
    expect(() => createModifiers(graph, { add: { "Test.M": 1 } })).toThrow(/does not accept item "add"/);
    expect(() => createModifiers(graph, { mul: { "In.A": 2 } })).toThrow();
    expect(createModifiers(graph, { mul: { "Test.Off": 2 } }).logMul.every((x) => x === 0)).toBe(true);
  });
});

describe("evaluation", () => {
  it("computes (base + adds) × muls with static and dynamic item modifiers", () => {
    const spec: GraphSpec = {
      stats: [input("In.Base", 2), input("In.Y", 3), derivedStat("Test.X", "X", "Misc", f("In.Base"))],
      effects: [effect("Test.X", "add", "3"), effect("Test.X", "mul", "4")],
      score: f("Test.X"),
      items: {
        add: ["Test.X"],
        mul: ["Test.X"],
        dynamic: [
          { stat: "Test.X", op: "add", value: f("In.Y * 2") },
          { stat: "Test.X", op: "mul", value: f("In.Y") },
        ],
      },
    };
    const graph = compileGraph(spec);
    const ev = new FloatEvaluator(graph);
    const score = (m: Parameters<typeof createModifiers>[1]) => 10 ** ev.scoreLog10(createModifiers(graph, m));
    expect(score({})).toBeCloseTo(20, 10);
    expect(score({ add: { "Test.X": 5 } })).toBeCloseTo(40, 10);
    expect(score({ add: { "Test.X": 5 }, mul: { "Test.X": 1.5 } })).toBeCloseTo(60, 10);
    expect(score({ dynamic: [0] })).toBeCloseTo((5 + 6) * 4, 10);
    expect(score({ dynamic: [0, 1] })).toBeCloseTo((5 + 6) * 4 * 3, 10);
    expect(ev.statLog10("Test.X")).toBeCloseTo(Math.log10(132), 10);
    expectAgreement(spec, {}, { add: { "Test.X": 5 }, mul: { "Test.X": 1.5 }, dynamic: [0, 1] });
  });

  it("gives the same scores with active-coordinate caching and incremental re-evaluation", () => {
    const graph = compileGraph({
      stats: [
        input("In.A", 2),
        input("In.B", 7),
        multiplierStat("Test.M", "M", "Misc"),
        multiplierStat("Test.N", "N", "Misc"),
        derivedStat("Test.S", "S", "Misc", f("In.B")),
        derivedStat("Test.Mix", "Mix", "Misc", f("max(Test.M * In.A, Test.S) + Test.N ^ 0.5")),
      ],
      score: f("Test.Mix * Test.S * Test.N"),
      items: { add: ["Test.S"], mul: ["Test.M", "Test.N"], dynamic: [{ stat: "Test.M", op: "mul", value: f("1 + Test.S / 10") }] },
    });
    const m = graph.index.get("Test.M")!;
    const n = graph.index.get("Test.N")!;
    const s = graph.index.get("Test.S")!;
    const plain = new FloatEvaluator(graph);
    const incremental = new FloatEvaluator(graph, {}, { incremental: true, activeItems: { add: [s], mul: [m, n], dynamic: [0] } });
    const narrow = new FloatEvaluator(graph, {}, { activeItems: { add: [], mul: [m], dynamic: [] } });
    let seed = 7;
    const next = () => ((seed = (seed * 16807) % 2147483647), seed / 2147483647);
    for (let k = 0; k < 200; k++) {
      const mods = createModifiers(graph);
      mods.logMul[m] = next() < 0.5 ? 0 : next() * 2;
      mods.logMul[n] = next() < 0.5 ? 0 : next();
      mods.add[s] = next() < 0.5 ? 0 : next() * 20;
      mods.dynamic[0] = next() < 0.5 ? 1 : 0;
      expect(incremental.scoreLog10(mods)).toBeCloseTo(plain.scoreLog10(mods), 12);
      if (k === 100) {
        for (const ev of [plain, incremental, narrow]) ev.setInput("In.B", 3);
      }
      const onlyM = createModifiers(graph);
      onlyM.logMul[m] = mods.logMul[m];
      expect(narrow.scoreLog10(onlyM)).toBeCloseTo(plain.scoreLog10(onlyM), 12);
    }
  });

  it("recomputes cached item-independent stats when an input changes", () => {
    const graph = compileGraph({
      stats: [input("In.A", 2), derivedStat("Test.Sq", "sq", "Misc", f("In.A ^ 2")), multiplierStat("Test.M", "M", "Misc")],
      score: f("Test.Sq * Test.M"),
      items: { mul: ["Test.M"] },
    });
    const ev = new FloatEvaluator(graph);
    expect(10 ** ev.scoreLog10()).toBeCloseTo(4, 10);
    ev.setInput("In.A", 5);
    expect(10 ** ev.scoreLog10(createModifiers(graph, { mul: { "Test.M": 2 } }))).toBeCloseTo(50, 10);
    expect(ev.inputValues()).toEqual({ "In.A": 5 });
  });

  it("agrees with Decimal on every operator, including negatives and comparisons", () => {
    const stats = [input("In.A", 7.5), input("In.B", -3), input("In.C", 0.25), input("In.Flag", 1, { kind: "boolean" })];
    const formulas = [
      "In.A - In.B * 2",
      "In.B - In.A",
      "In.B ^ 3",
      "In.A / In.B",
      "-In.A + 1",
      "log10(In.A) * ln(In.A) + log(3, In.A)",
      "sqrt(In.A) + abs(In.B) + floor(In.A) + floor(In.B)",
      "max(In.A, In.B) + min(In.A, In.B) * 10",
      "ge(In.A, In.B) + lt(In.A, In.B) * 3 + ge(In.B, In.B)",
      "if(In.Flag, In.A, In.B) * if(In.Flag - 1, 5, 7)",
      "In.C ^ In.A + In.A ^ In.C",
      "(In.A - 7.5) * In.B + 2",
      "(In.A * 1e200) ^ 3 - (In.A * 1e200) ^ 3 * 0.5",
    ];
    for (const formula of formulas) expectAgreement({ stats, score: f(formula) });
  });

  it("agrees with Decimal on random positive formulas", () => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    const leaves = ["In.A", "In.B", "In.C"];
    const gen = (depth: number): Expr => {
      if (depth === 0 || rand() < 0.2) return rand() < 0.6 ? ref(leaves[Math.floor(rand() * 3)]) : num(Number((rand() * 10 + 0.1).toFixed(3)));
      const r = rand();
      if (r < 0.25) return bin("+", gen(depth - 1), gen(depth - 1));
      if (r < 0.5) return bin("*", gen(depth - 1), gen(depth - 1));
      if (r < 0.6) return bin("/", gen(depth - 1), gen(depth - 1));
      if (r < 0.75) return bin("^", gen(depth - 1), num(Number((rand() * 4 - 1).toFixed(2))));
      if (r < 0.85) return call(rand() < 0.5 ? "max" : "min", gen(depth - 1), gen(depth - 1));
      // log10(1 + tiny) would compare against Decimal's rounding, see the log1p test below.
      if (r < 0.95) return call("log10", bin("+", num(2), gen(depth - 1)));
      return call("sqrt", gen(depth - 1));
    };
    const stats = [input("In.A", 3.7), input("In.B", 1e150, { logScale: true }), input("In.C", 0.02)];
    for (let k = 0; k < 300; k++) expectAgreement({ stats, score: gen(5) });
  });

  it("keeps precision in 1 + tiny, where Decimal rounds to 1", () => {
    const graph = compileGraph({ stats: [input("In.X", 3.7e-150)], score: f("log10(1 + In.X)") });
    expect(new FloatEvaluator(graph).scoreLog10()).toBeCloseTo(Math.log10(3.7e-150 / Math.LN10), 9);
    expect(evaluateDecimal(graph).score.toNumber()).toBe(0);
  });

  it("takes square roots of tiny values on both paths", () => {
    const r = expectAgreement({ stats: [input("In.X", 1e-100)], score: f("sqrt(In.X)") });
    expect(r.log10).toBeCloseTo(-50, 9);
  });

  it("stays on the float path for results far above 1e308", () => {
    const stats = [input("In.P", 1e300, { logScale: true })];
    const r = expectAgreement({ stats, score: f("In.P ^ 10 * 3") });
    expect(r.fallback).toBe(false);
    expect(r.log10).toBeCloseTo(3000 + Math.log10(3), 9);

    const huge = expectAgreement({ stats, score: f("In.P * In.P + In.P ^ 3") }, { "In.P": Decimal.pow(10, 800) });
    expect(huge.fallback).toBe(false);
    expect(huge.log10).toBeCloseTo(2400, 9);
    expect(resultToDecimal(huge).log10().toNumber()).toBeCloseTo(2400, 9);
  });

  it("falls back to Decimal when the float path can't represent an intermediate value", () => {
    const stats = [input("In.E", 400)];
    const graph = compileGraph({ stats, score: f("log10(log10(2 ^ (10 ^ In.E)))") });
    const r = new FloatEvaluator(graph).evaluate();
    expect(r.fallback).toBe(true);
    expect(10 ** r.log10).toBeCloseTo(400 + Math.log10(Math.log10(2)), 9);

    const tower = new FloatEvaluator(compileGraph({ stats, score: f("2 ^ (10 ^ In.E)") })).evaluate();
    expect(tower.fallback).toBe(true);
    expect(tower.log10).toBe(Infinity);
    expect(tower.decimal!.log10().log10().toNumber()).toBeCloseTo(400 + Math.log10(Math.log10(2)), 9);
  });

  it("marks undefined results as NaN on both paths", () => {
    const stats = [input("In.Z", 0)];
    for (const formula of ["1 / In.Z", "log10(In.Z - 1)", "(In.Z - 2) ^ 0.5"]) {
      const graph = compileGraph({ stats, score: f(formula) });
      const r = new FloatEvaluator(graph).evaluate();
      expect(r.fallback).toBe(true);
      expect(r.log10).toBeNaN();
      expect(evaluateDecimal(graph).score.toNumber()).toBeNaN();
    }
  });

  it("returns -Infinity for a zero score without falling back", () => {
    const graph = compileGraph({ stats: [input("In.Z", 0)], score: f("In.Z * 5") });
    const r = new FloatEvaluator(graph).evaluate();
    expect(r).toEqual({ log10: -Infinity, sign: 0, fallback: false });
  });
});
