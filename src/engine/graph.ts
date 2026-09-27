import Decimal from "break_eternity.js";
import { refsOf, toInfix, type BinaryOp, type Expr, type FnName } from "./expr.ts";
import type { Effect, InputSpec, StatDef } from "./model.ts";

/** An item effect whose value is a formula over other stats; switched on per evaluation. */
export interface DynamicEffect {
  stat: string;
  op: "add" | "mul";
  value: Expr;
  label?: string;
}

/** Which stats item sets can change. Static modifiers are plain numbers supplied per evaluation. */
export interface ItemEffectSpec {
  add?: readonly string[];
  mul?: readonly string[];
  dynamic?: readonly DynamicEffect[];
}

export interface GraphSpec {
  stats: Iterable<StatDef>;
  effects?: readonly Effect[];
  score: Expr;
  items?: ItemEffectSpec;
}

export type GraphIssue =
  | { kind: "unknown-ref"; id: string; from: string }
  | { kind: "unknown-target"; id: string; from: string }
  | { kind: "cycle"; path: string[] }
  | { kind: "missing-input"; id: string };

export class GraphError extends Error {
  constructor(readonly issues: GraphIssue[]) {
    super(`Invalid stat graph:\n${issues.map(describeIssue).join("\n")}`);
  }
}

export function describeIssue(issue: GraphIssue): string {
  switch (issue.kind) {
    case "unknown-ref":
      return `${issue.from} references unknown stat ${issue.id}`;
    case "unknown-target":
      return `${issue.from} targets unknown stat ${issue.id}`;
    case "cycle":
      return `dependency cycle: ${issue.path.join(" -> ")}`;
    case "missing-input":
      return `stat ${issue.id} has no base value and no InputSpec`;
  }
}

export type StatBase = { kind: "input"; spec: InputSpec } | { kind: "const"; value: number } | { kind: "expr"; expr: Expr };

export interface CompiledStat {
  id: string;
  /** Position in `StatGraph.stats`; dependencies always have a smaller index. */
  index: number;
  def: StatDef;
  base: StatBase;
  adds: Effect[];
  muls: Effect[];
  /** Indices into `StatGraph.dynamic` of the dynamic item effects targeting this stat. */
  dynamic: number[];
  deps: number[];
  itemAdd: boolean;
  itemMul: boolean;
  /** Some item set can change this stat's value, directly or through a dependency. */
  itemDependent: boolean;
  /** Indices of the input stats this stat's value depends on, including itself. */
  inputs: ReadonlySet<number>;
}

export interface CompiledDynamic extends DynamicEffect {
  /** Stat index of the target, or -1 when the target doesn't reach the score. */
  target: number;
}

export interface StatGraph {
  /** Reachable stats in topological order. */
  stats: CompiledStat[];
  index: ReadonlyMap<string, number>;
  score: Expr;
  /** Indices of stats whose base is a user input. */
  inputs: number[];
  /** Same order as `ItemEffectSpec.dynamic`, so gates line up with the caller's list. */
  dynamic: CompiledDynamic[];
  /** Declared item-affected stats that can't reach the score. */
  inertItemStats: string[];
}

export function compileGraph(spec: GraphSpec): StatGraph {
  const { graph, issues } = tryCompileGraph(spec);
  if (!graph) throw new GraphError(issues);
  return graph;
}

export function tryCompileGraph(spec: GraphSpec): { graph: StatGraph | null; issues: GraphIssue[] } {
  const defs = new Map<string, StatDef>();
  for (const d of spec.stats) defs.set(d.id, d);
  const issues: GraphIssue[] = [];

  const adds = new Map<string, Effect[]>();
  const muls = new Map<string, Effect[]>();
  for (const e of spec.effects ?? []) {
    if (!defs.has(e.stat)) {
      issues.push({ kind: "unknown-target", id: e.stat, from: `effect "${e.label}"` });
      continue;
    }
    const bucket = e.op === "add" ? adds : muls;
    if (!bucket.has(e.stat)) bucket.set(e.stat, []);
    bucket.get(e.stat)!.push(e);
  }

  const itemAdd = new Set(spec.items?.add ?? []);
  const itemMul = new Set(spec.items?.mul ?? []);
  for (const id of [...itemAdd, ...itemMul]) {
    if (!defs.has(id)) issues.push({ kind: "unknown-target", id, from: "item effects" });
  }
  const dynamicSpecs = spec.items?.dynamic ?? [];
  const dynamicByStat = new Map<string, number[]>();
  dynamicSpecs.forEach((d, k) => {
    if (!defs.has(d.stat)) {
      issues.push({ kind: "unknown-target", id: d.stat, from: `dynamic item effect "${d.label ?? toInfix(d.value)}"` });
      return;
    }
    if (!dynamicByStat.has(d.stat)) dynamicByStat.set(d.stat, []);
    dynamicByStat.get(d.stat)!.push(k);
  });

  const depIds = (id: string): { ref: string; from: string }[] => {
    const def = defs.get(id)!;
    const out: { ref: string; from: string }[] = [];
    const collect = (e: Expr, from: string) => refsOf(e).forEach((ref) => out.push({ ref, from }));
    if (!def.input && def.base !== undefined && typeof def.base !== "number") collect(def.base, `base of ${id}`);
    for (const e of [...(adds.get(id) ?? []), ...(muls.get(id) ?? [])]) collect(e.value, `effect "${e.label}" on ${id}`);
    for (const k of dynamicByStat.get(id) ?? []) collect(dynamicSpecs[k].value, `dynamic item effect on ${id}`);
    return out;
  };

  const order: string[] = [];
  const state = new Map<string, "visiting" | "done">();
  const stack: string[] = [];
  const visit = (id: string) => {
    const st = state.get(id);
    if (st === "done") return;
    if (st === "visiting") {
      issues.push({ kind: "cycle", path: [...stack.slice(stack.indexOf(id)), id] });
      return;
    }
    state.set(id, "visiting");
    stack.push(id);
    for (const { ref, from } of depIds(id)) {
      if (!defs.has(ref)) issues.push({ kind: "unknown-ref", id: ref, from });
      else visit(ref);
    }
    stack.pop();
    state.set(id, "done");
    order.push(id);
  };
  for (const ref of refsOf(spec.score)) {
    if (!defs.has(ref)) issues.push({ kind: "unknown-ref", id: ref, from: "score" });
    else visit(ref);
  }

  for (const id of order) {
    const def = defs.get(id)!;
    if (!def.input && def.base === undefined) issues.push({ kind: "missing-input", id });
  }
  if (issues.length > 0) return { graph: null, issues };

  const index = new Map(order.map((id, i) => [id, i]));
  const stats: CompiledStat[] = [];
  for (const [i, id] of order.entries()) {
    const def = defs.get(id)!;
    const base: StatBase = def.input
      ? { kind: "input", spec: def.input }
      : typeof def.base === "number"
        ? { kind: "const", value: def.base }
        : { kind: "expr", expr: def.base! };
    const deps = [...new Set(depIds(id).map((d) => index.get(d.ref)!))];
    const dynamic = dynamicByStat.get(id) ?? [];
    const inputs = new Set<number>(def.input ? [i] : []);
    for (const d of deps) stats[d].inputs.forEach((x) => inputs.add(x));
    const direct = itemAdd.has(id) || itemMul.has(id) || dynamic.length > 0;
    stats.push({
      id,
      index: i,
      def,
      base,
      adds: adds.get(id) ?? [],
      muls: muls.get(id) ?? [],
      dynamic,
      deps,
      itemAdd: itemAdd.has(id),
      itemMul: itemMul.has(id),
      itemDependent: direct || deps.some((d) => stats[d].itemDependent),
      inputs,
    });
  }

  return {
    graph: {
      stats,
      index,
      score: spec.score,
      inputs: stats.filter((s) => s.base.kind === "input").map((s) => s.index),
      dynamic: dynamicSpecs.map((d) => ({ ...d, target: index.get(d.stat) ?? -1 })),
      inertItemStats: [...new Set([...itemAdd, ...itemMul])].filter((id) => !index.has(id)),
    },
    issues,
  };
}

export function statIndex(graph: StatGraph, id: string): number {
  return graph.index.get(id) ?? -1;
}

export function exprItemDependent(graph: StatGraph, e: Expr): boolean {
  for (const ref of refsOf(e)) if (graph.stats[graph.index.get(ref)!].itemDependent) return true;
  return false;
}

export function exprInputs(graph: StatGraph, e: Expr, out = new Set<number>()): Set<number> {
  for (const ref of refsOf(e)) graph.stats[graph.index.get(ref)!].inputs.forEach((x) => out.add(x));
  return out;
}

/** Per-evaluation item effects: indexed by stat index (`add`, `logMul`) and dynamic effect index (`dynamic`). */
export interface ItemModifiers {
  add: Float64Array;
  logMul: Float64Array;
  dynamic: Uint8Array;
}

export interface ModifierSpec {
  add?: Record<string, number>;
  /** Multiplicative factors, e.g. 1.25 for +25%. */
  mul?: Record<string, number>;
  dynamic?: readonly number[];
}

export function createModifiers(graph: StatGraph, spec: ModifierSpec = {}): ItemModifiers {
  const n = graph.stats.length;
  const mods: ItemModifiers = {
    add: new Float64Array(n),
    logMul: new Float64Array(n),
    dynamic: new Uint8Array(graph.dynamic.length),
  };
  const target = (id: string, op: "add" | "mul"): number => {
    const i = graph.index.get(id);
    if (i === undefined) {
      if (graph.inertItemStats.includes(id)) return -1;
      throw new Error(`${id} is not an item-affected stat of this graph`);
    }
    const s = graph.stats[i];
    if (!(op === "add" ? s.itemAdd : s.itemMul)) throw new Error(`${id} does not accept item "${op}" modifiers`);
    return i;
  };
  for (const [id, v] of Object.entries(spec.add ?? {})) {
    const i = target(id, "add");
    if (i >= 0) mods.add[i] += v;
  }
  for (const [id, v] of Object.entries(spec.mul ?? {})) {
    const i = target(id, "mul");
    if (i >= 0) mods.logMul[i] += Math.log10(v);
  }
  for (const k of spec.dynamic ?? []) {
    if (k < 0 || k >= mods.dynamic.length) throw new Error(`dynamic effect ${k} out of range`);
    mods.dynamic[k] = 1;
  }
  return mods;
}

export type InputValue = number | Decimal;
export type InputValues = Record<string, InputValue | boolean | undefined>;

function inputValue(s: CompiledStat, values: InputValues): InputValue {
  const v = values[s.id];
  if (v === undefined) return (s.base as { spec: InputSpec }).spec.default;
  if (typeof v === "boolean") return v ? 1 : 0;
  return v;
}

export interface EvalResult {
  /** log10 of |score|; -Infinity for a zero score, NaN when undefined. */
  log10: number;
  sign: number;
  /** True when the float path overflowed and the score came from the Decimal evaluator. */
  fallback: boolean;
  /** Exact value, only present after a fallback (it may be too large for `log10` to be finite). */
  decimal?: Decimal;
}

export function resultToDecimal(r: EvalResult): Decimal {
  if (r.decimal) return r.decimal;
  if (r.sign === 0) return new Decimal(0);
  return Decimal.pow(10, r.log10).mul(r.sign);
}

// Signed-log arithmetic: every node returns log10|x| and leaves sign(x) in `S`. `BAD` records an
// overflow of the log itself or a domain error, which sends the evaluation to the Decimal path.
// Module-level state is safe because evaluation is synchronous and never re-entered.
let S = 0;
let BAD = false;

type FNode = () => number;

function fail(): number {
  BAD = true;
  S = 0;
  return NaN;
}

function toPlain(s: number, l: number): number {
  return s === 0 ? 0 : s * 10 ** l;
}

function setPlain(x: number): number {
  if (x !== x) return fail();
  S = x > 0 ? 1 : x < 0 ? -1 : 0;
  return Math.log10(Math.abs(x));
}

function addLog(sa: number, la: number, sb: number, lb: number): number {
  if (sa === 0) {
    S = sb;
    return lb;
  }
  if (sb === 0) {
    S = sa;
    return la;
  }
  if (la === Infinity || lb === Infinity) return fail();
  const [hi, lo, shi] = la >= lb ? [la, lb, sa] : [lb, la, sb];
  const d = 10 ** (lo - hi);
  if (sa === sb) {
    S = sa;
    return hi + Math.log1p(d) / Math.LN10;
  }
  if (d === 1) {
    S = 0;
    return -Infinity;
  }
  S = shi;
  return hi + Math.log1p(-d) / Math.LN10;
}

function cmpLog(sa: number, la: number, sb: number, lb: number): number {
  if (sa !== sb) return sa - sb;
  if (sa === 0 || la === lb) return 0;
  return sa > 0 ? la - lb : lb - la;
}

interface FloatCtx {
  lg: Float64Array;
  sg: Float64Array;
  index: ReadonlyMap<string, number>;
}

function compileFloat(e: Expr, ctx: FloatCtx): FNode {
  switch (e.t) {
    case "num": {
      const l = Math.log10(Math.abs(e.v));
      const s = Math.sign(e.v);
      return () => {
        S = s;
        return l;
      };
    }
    case "ref": {
      const i = ctx.index.get(e.id)!;
      const { lg, sg } = ctx;
      return () => {
        S = sg[i];
        return lg[i];
      };
    }
    case "neg": {
      const a = compileFloat(e.a, ctx);
      return () => {
        const l = a();
        S = -S;
        return l;
      };
    }
    case "bin":
      return compileBinary(e.op, compileFloat(e.a, ctx), compileFloat(e.b, ctx), e.b.t === "num" ? e.b.v : null);
    case "fn":
      return compileFn(
        e.fn,
        e.args.map((x) => compileFloat(x, ctx)),
      );
  }
}

function compileBinary(op: BinaryOp, a: FNode, b: FNode, constB: number | null): FNode {
  switch (op) {
    case "+":
      return () => {
        const la = a();
        const sa = S;
        const lb = b();
        return addLog(sa, la, S, lb);
      };
    case "-":
      return () => {
        const la = a();
        const sa = S;
        const lb = b();
        return addLog(sa, la, -S, lb);
      };
    case "*":
      return () => {
        const la = a();
        const sa = S;
        const lb = b();
        S *= sa;
        return S === 0 ? -Infinity : la + lb;
      };
    case "/":
      return () => {
        const la = a();
        const sa = S;
        const lb = b();
        if (S === 0) return fail();
        S *= sa;
        return S === 0 ? -Infinity : la - lb;
      };
    case "^":
      return () => {
        const la = a();
        const sa = S;
        let y: number;
        if (constB === null) {
          const lb = b();
          y = toPlain(S, lb);
        } else y = constB;
        if (!Number.isFinite(y)) return fail();
        if (sa === 0) {
          if (y > 0) return -Infinity;
          if (y === 0) {
            S = 1;
            return 0;
          }
          return fail();
        }
        if (sa < 0) {
          if (!Number.isInteger(y)) return fail();
          S = y % 2 === 0 ? 1 : -1;
        } else S = 1;
        const l = y * la;
        if (l !== l || l === Infinity) return fail();
        return l;
      };
  }
}

function compileFn(fn: FnName, args: FNode[]): FNode {
  const [a, b, c] = args;
  switch (fn) {
    case "log10":
      return () => {
        const l = a();
        if (S <= 0 || l === Infinity) return fail();
        return setPlain(l);
      };
    case "ln":
      return () => {
        const l = a();
        if (S <= 0 || l === Infinity) return fail();
        return setPlain(l * Math.LN10);
      };
    case "log":
      return () => {
        const lBase = a();
        const sBase = S;
        const lx = b();
        if (S <= 0 || sBase <= 0 || lx === Infinity || lBase === Infinity || lBase === 0) return fail();
        return setPlain(lx / lBase);
      };
    case "sqrt":
      return () => {
        const l = a();
        if (S < 0) return fail();
        return S === 0 ? -Infinity : l / 2;
      };
    case "max":
    case "min": {
      const wantMax = fn === "max";
      return () => {
        const la = a();
        const sa = S;
        const lb = b();
        const sb = S;
        const aWins = (cmpLog(sa, la, sb, lb) >= 0) === wantMax;
        S = aWins ? sa : sb;
        return aWins ? la : lb;
      };
    }
    case "ge":
    case "lt": {
      const wantGe = fn === "ge";
      return () => {
        const la = a();
        const sa = S;
        const lb = b();
        const holds = (cmpLog(sa, la, S, lb) >= 0) === wantGe;
        S = holds ? 1 : 0;
        return holds ? 0 : -Infinity;
      };
    }
    case "if":
      return () => {
        a();
        return S !== 0 ? b() : c();
      };
    case "floor":
      return () => {
        const l = a();
        // Above 2^53 every double is already an integer.
        if (l >= 15.96) return l;
        return setPlain(Math.floor(toPlain(S, l)));
      };
    case "abs":
      return () => {
        const l = a();
        S = Math.abs(S);
        return l;
      };
  }
}

type StatStep = (mods: ItemModifiers) => void;

function compileStatStep(s: CompiledStat, graph: StatGraph, ctx: FloatCtx, inLg: Float64Array, inSg: Float64Array): StatStep {
  const i = s.index;
  const { lg, sg } = ctx;
  const base: FNode =
    s.base.kind === "input"
      ? () => {
          S = inSg[i];
          return inLg[i];
        }
      : compileFloat(s.base.kind === "const" ? { t: "num", v: s.base.value } : s.base.expr, ctx);
  const adds = s.adds.map((e) => compileFloat(e.value, ctx));
  const muls = s.muls.map((e) => compileFloat(e.value, ctx));
  const dynAdd = s.dynamic.filter((k) => graph.dynamic[k].op === "add").map((k) => [k, compileFloat(graph.dynamic[k].value, ctx)] as const);
  const dynMul = s.dynamic.filter((k) => graph.dynamic[k].op === "mul").map((k) => [k, compileFloat(graph.dynamic[k].value, ctx)] as const);
  const { itemAdd, itemMul } = s;
  return (mods) => {
    let l = base();
    let sign = S;
    for (const n of adds) {
      const la = n();
      l = addLog(sign, l, S, la);
      sign = S;
    }
    if (itemAdd && mods.add[i] !== 0) {
      const v = mods.add[i];
      l = addLog(sign, l, Math.sign(v), Math.log10(Math.abs(v)));
      sign = S;
    }
    for (const [k, n] of dynAdd) {
      if (!mods.dynamic[k]) continue;
      const la = n();
      l = addLog(sign, l, S, la);
      sign = S;
    }
    for (const n of muls) {
      const la = n();
      sign *= S;
      l += la;
    }
    if (itemMul) l += mods.logMul[i];
    for (const [k, n] of dynMul) {
      if (!mods.dynamic[k]) continue;
      const la = n();
      sign *= S;
      l += la;
    }
    if (sign === 0) l = -Infinity;
    else if (l !== l || l === Infinity) BAD = true;
    lg[i] = l;
    sg[i] = sign;
  };
}

/** The item modifier entries a caller will ever set (stat indices for `add`/`logMul`, effect indices for `dynamic`). */
export interface ActiveItemCoordinates {
  add: Iterable<number>;
  mul: Iterable<number>;
  dynamic: Iterable<number>;
}

export interface FloatEvaluatorOptions {
  /**
   * Stats that only depend on item modifiers outside this set are cached like item-independent ones.
   * Every modifier passed to the evaluator must then be zero (or off) outside the set.
   */
  activeItems?: ActiveItemCoordinates;
  /** Recompute only item-dependent stats whose modifiers or dependencies changed since the previous evaluation. */
  incremental?: boolean;
}

/**
 * Fast evaluator in signed log10 space, so magnitudes far beyond 1e308 stay on the float path.
 * Item-independent stats are cached until an input changes. Whenever the float path can't
 * represent a value (the log itself overflows, or a domain error), the score is recomputed
 * with the Decimal evaluator.
 */
export class FloatEvaluator {
  private readonly lg: Float64Array;
  private readonly sg: Float64Array;
  private readonly inLg: Float64Array;
  private readonly inSg: Float64Array;
  private readonly values: InputValues = {};
  private readonly staticSteps: StatStep[] = [];
  private readonly itemSteps: StatStep[] = [];
  private readonly scoreNode: FNode;
  private readonly empty: ItemModifiers;
  private dirty = true;
  private staticBad = false;
  private readonly incremental: IncrementalState | null;

  constructor(
    readonly graph: StatGraph,
    inputs: InputValues = {},
    options: FloatEvaluatorOptions = {},
  ) {
    const n = graph.stats.length;
    this.lg = new Float64Array(n);
    this.sg = new Float64Array(n);
    this.inLg = new Float64Array(n);
    this.inSg = new Float64Array(n);
    const ctx: FloatCtx = { lg: this.lg, sg: this.sg, index: graph.index };
    const dependent = activeDependence(graph, options.activeItems);
    for (const s of graph.stats) {
      const step = compileStatStep(s, graph, ctx, this.inLg, this.inSg);
      (dependent[s.index] ? this.itemSteps : this.staticSteps).push(step);
    }
    this.incremental = options.incremental ? incrementalState(graph, dependent) : null;
    this.scoreNode = compileFloat(graph.score, ctx);
    this.empty = createModifiers(graph);
    this.setInputs(inputs);
  }

  setInputs(values: InputValues): void {
    Object.assign(this.values, values);
    for (const i of this.graph.inputs) {
      const v = inputValue(this.graph.stats[i], this.values);
      if (typeof v === "number") {
        this.inLg[i] = v !== v ? NaN : setPlain(v);
        this.inSg[i] = v !== v ? 1 : S;
      } else {
        this.inLg[i] = v.abs().log10().toNumber();
        this.inSg[i] = v.sign;
      }
    }
    this.dirty = true;
  }

  setInput(id: string, value: InputValue | boolean): void {
    this.setInputs({ [id]: value });
  }

  inputValues(): InputValues {
    return { ...this.values };
  }

  scoreLog10(mods: ItemModifiers = this.empty): number {
    const l = this.run(mods);
    if (!BAD && l === l && l !== Infinity) return l;
    return decimalLog10(evaluateDecimal(this.graph, this.values, mods).score);
  }

  evaluate(mods: ItemModifiers = this.empty): EvalResult {
    const l = this.run(mods);
    if (!BAD && l === l && l !== Infinity) return { log10: l, sign: S, fallback: false };
    const d = evaluateDecimal(this.graph, this.values, mods).score;
    return { log10: decimalLog10(d), sign: d.sign, fallback: true, decimal: d };
  }

  /** log10|value| of a stat from the last evaluation (not refreshed by a Decimal fallback). */
  statLog10(id: string): number {
    return this.lg[this.graph.index.get(id)!];
  }

  statSign(id: string): number {
    return this.sg[this.graph.index.get(id)!];
  }

  private run(mods: ItemModifiers): number {
    const fresh = this.dirty;
    if (this.dirty) {
      BAD = false;
      for (const step of this.staticSteps) step(this.empty);
      this.staticBad = BAD;
      this.dirty = false;
    }
    const inc = this.incremental;
    if (!inc) {
      BAD = this.staticBad;
      for (const step of this.itemSteps) step(mods);
      return this.scoreNode();
    }
    const { lg, sg } = this;
    const all = fresh || !inc.valid;
    let bad = this.staticBad;
    for (let j = 0; j < this.itemSteps.length; j++) {
      const t = inc.targets[j];
      let changed = all;
      if (!changed && t.add >= 0 && mods.add[t.add] !== inc.add[t.add]) changed = true;
      if (!changed && t.mul >= 0 && mods.logMul[t.mul] !== inc.logMul[t.mul]) changed = true;
      if (!changed) for (const k of t.dynamic) if (mods.dynamic[k] !== inc.dynamic[k]) changed = true;
      if (!changed) for (const d of t.deps) if (inc.changed[d]) changed = true;
      if (!changed) {
        inc.changed[j] = 0;
        bad ||= inc.bad[j] === 1;
        continue;
      }
      const before = lg[t.stat];
      const beforeSign = sg[t.stat];
      BAD = false;
      this.itemSteps[j](mods);
      inc.bad[j] = BAD ? 1 : 0;
      bad ||= BAD;
      inc.changed[j] = all || lg[t.stat] !== before || sg[t.stat] !== beforeSign ? 1 : 0;
    }
    for (const i of inc.addCoords) inc.add[i] = mods.add[i];
    for (const i of inc.mulCoords) inc.logMul[i] = mods.logMul[i];
    inc.dynamic.set(mods.dynamic);
    inc.valid = true;
    BAD = bad;
    return this.scoreNode();
  }
}

interface IncrementalState {
  valid: boolean;
  /** Per item step: its stat, direct item coordinates, and the item steps it depends on. */
  targets: { stat: number; add: number; mul: number; dynamic: number[]; deps: number[] }[];
  addCoords: number[];
  mulCoords: number[];
  add: Float64Array;
  logMul: Float64Array;
  dynamic: Uint8Array;
  changed: Uint8Array;
  bad: Uint8Array;
}

function incrementalState(graph: StatGraph, dependent: boolean[]): IncrementalState {
  const stepOf = new Map<number, number>();
  const targets: IncrementalState["targets"] = [];
  for (const s of graph.stats) {
    if (!dependent[s.index]) continue;
    stepOf.set(s.index, targets.length);
    targets.push({
      stat: s.index,
      add: s.itemAdd ? s.index : -1,
      mul: s.itemMul ? s.index : -1,
      dynamic: s.dynamic,
      deps: s.deps.filter((d) => stepOf.has(d)).map((d) => stepOf.get(d)!),
    });
  }
  const n = graph.stats.length;
  return {
    valid: false,
    targets,
    addCoords: targets.filter((t) => t.add >= 0).map((t) => t.add),
    mulCoords: targets.filter((t) => t.mul >= 0).map((t) => t.mul),
    add: new Float64Array(n),
    logMul: new Float64Array(n),
    dynamic: new Uint8Array(graph.dynamic.length),
    changed: new Uint8Array(targets.length),
    bad: new Uint8Array(targets.length),
  };
}

function activeDependence(graph: StatGraph, active: ActiveItemCoordinates | undefined): boolean[] {
  if (!active) return graph.stats.map((s) => s.itemDependent);
  const add = new Set(active.add);
  const mul = new Set(active.mul);
  const dynamic = new Set(active.dynamic);
  const out: boolean[] = [];
  for (const s of graph.stats) {
    out.push(
      (s.itemAdd && add.has(s.index)) || (s.itemMul && mul.has(s.index)) || s.dynamic.some((k) => dynamic.has(k)) || s.deps.some((d) => out[d]),
    );
  }
  return out;
}

function decimalLog10(d: Decimal): number {
  if (d.sign === 0) return -Infinity;
  return d.abs().log10().toNumber();
}

export interface DecimalEvaluation {
  score: Decimal;
  stat(id: string): Decimal;
}

/** Reference evaluator: straightforward interpretation with break_eternity `Decimal`. */
export function evaluateDecimal(graph: StatGraph, inputs: InputValues = {}, mods?: ItemModifiers): DecimalEvaluation {
  const vals: Decimal[] = [];
  const ev = (e: Expr): Decimal => evalDecimalExpr(e, (id) => vals[graph.index.get(id)!]);
  for (const s of graph.stats) {
    let v =
      s.base.kind === "input"
        ? new Decimal(inputValue(s, inputs))
        : s.base.kind === "const"
          ? new Decimal(s.base.value)
          : ev(s.base.expr);
    for (const e of s.adds) v = v.add(ev(e.value));
    if (mods && s.itemAdd && mods.add[s.index] !== 0) v = v.add(mods.add[s.index]);
    for (const k of s.dynamic) if (mods?.dynamic[k] && graph.dynamic[k].op === "add") v = v.add(ev(graph.dynamic[k].value));
    for (const e of s.muls) v = v.mul(ev(e.value));
    if (mods && s.itemMul && mods.logMul[s.index] !== 0) v = v.mul(Decimal.pow(10, mods.logMul[s.index]));
    for (const k of s.dynamic) if (mods?.dynamic[k] && graph.dynamic[k].op === "mul") v = v.mul(ev(graph.dynamic[k].value));
    vals.push(v);
  }
  return { score: ev(graph.score), stat: (id) => vals[graph.index.get(id)!] };
}

export function evalDecimalExpr(e: Expr, lookup: (id: string) => Decimal): Decimal {
  const ev = (x: Expr) => evalDecimalExpr(x, lookup);
  switch (e.t) {
    case "num":
      return new Decimal(e.v);
    case "ref":
      return lookup(e.id);
    case "neg":
      return ev(e.a).neg();
    case "bin": {
      const a = ev(e.a);
      const b = ev(e.b);
      switch (e.op) {
        case "+":
          return a.add(b);
        case "-":
          return a.sub(b);
        case "*":
          return a.mul(b);
        case "/":
          return a.div(b);
        case "^":
          return Decimal.pow(a, b);
      }
      break;
    }
    case "fn": {
      if (e.fn === "if") return ev(e.args[0]).sign !== 0 ? ev(e.args[1]) : ev(e.args[2]);
      const [a, b] = e.args.map(ev);
      switch (e.fn) {
        case "log10":
          return a.log10();
        case "ln":
          return a.ln();
        case "log":
          return Decimal.log(b, a);
        case "sqrt":
          // break_eternity 2.1's sqrt returns NaN below ~1e-15; pow(x, 0.5) is correct there.
          return a.sign < 0 ? new Decimal(NaN) : Decimal.pow(a, 0.5);
        case "max":
          return Decimal.max(a, b);
        case "min":
          return Decimal.min(a, b);
        case "ge":
          return new Decimal(a.gte(b) ? 1 : 0);
        case "lt":
          return new Decimal(a.lt(b) ? 1 : 0);
        case "floor":
          return a.floor();
        case "abs":
          return a.abs();
      }
    }
  }
  throw new Error(`unhandled expression ${toInfix(e)}`);
}
