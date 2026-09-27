import Decimal from "break_eternity.js";
import { toInfix, type Expr } from "./expr.ts";
import {
  createModifiers,
  exprInputs,
  exprItemDependent,
  FloatEvaluator,
  type InputValue,
  type InputValues,
  type ItemModifiers,
  type StatGraph,
} from "./graph.ts";
import type { InputSpec } from "./model.ts";

/** One additive term of log10(score). Terms no item can change shift every set's score equally. */
export interface LogTerm {
  label: string;
  itemDependent: boolean;
  inputs: string[];
}

export interface InputRelevance {
  id: string;
  label: string;
  group: string;
  shown: boolean;
  method: "structural" | "numeric";
  reason: string;
  /** Largest change (in log10 units) of any set's score relative to the no-item baseline while varying the input. */
  maxDeviation?: number;
}

export interface RelevanceOptions {
  /** Current input values; variations are centred on them. Missing inputs use their defaults. */
  inputs?: InputValues;
  /** Item modifier sets to compare. Defaults to synthetic sets that exercise every item-affected stat. */
  candidates?: ItemModifiers[];
  /** Tolerance on log10 score differences, relative to max(1, |difference|). */
  epsilon?: number;
}

export interface RelevanceResult {
  inputs: InputRelevance[];
  terms: LogTerm[];
}

interface Term {
  label: string;
  itemDependent: boolean;
  inputs: Set<number>;
}

export function analyzeRelevance(graph: StatGraph, options: RelevanceOptions = {}): RelevanceResult {
  const terms = decomposeLogScore(graph);
  const kept = new Set<number>();
  const dropped = new Set<number>();
  for (const t of terms) t.inputs.forEach((i) => (t.itemDependent ? kept : dropped).add(i));
  const anyItemTerm = terms.some((t) => t.itemDependent);

  const evaluator = new FloatEvaluator(graph, options.inputs ?? {});
  const candidates = options.candidates ?? syntheticCandidates(graph);
  const epsilon = options.epsilon ?? 1e-9;

  const inputs = graph.inputs.map((i): InputRelevance => {
    const s = graph.stats[i];
    const base = { id: s.id, label: s.def.label, group: s.def.group };
    if (!anyItemTerm) {
      return { ...base, shown: false, method: "structural", reason: "No item can change the score, so every item set ranks the same." };
    }
    if (!kept.has(i)) {
      return {
        ...base,
        shown: false,
        method: "structural",
        reason: "Only feeds factors of the score that no item changes, so it scales every item set's score equally.",
      };
    }
    return { ...base, ...numericCheck(evaluator, i, candidates, epsilon) };
  });

  return {
    inputs,
    terms: terms.map((t) => ({
      label: t.label,
      itemDependent: t.itemDependent,
      inputs: [...t.inputs].map((i) => graph.stats[i].id),
    })),
  };
}

/**
 * Splits log10(score) into additive terms: products and quotients split, a power with an
 * item-independent exponent keeps splitting its base (the exponent's inputs scale those terms),
 * and a stat reference splits into its base-plus-additions term and one term per multiplier.
 * Anything else (sums, item-dependent exponents, functions) is one opaque term.
 */
export function decomposeLogScore(graph: StatGraph): Term[] {
  const out: Term[] = [];
  const opaque = (e: Expr, scale: Set<number>) => {
    out.push({ label: toInfix(e), itemDependent: exprItemDependent(graph, e), inputs: exprInputs(graph, e, new Set(scale)) });
  };

  const visitStat = (index: number, scale: Set<number>) => {
    const s = graph.stats[index];
    const dynAdd = s.dynamic.filter((k) => graph.dynamic[k].op === "add");
    const dynMul = s.dynamic.filter((k) => graph.dynamic[k].op === "mul");
    const summed = s.adds.length > 0 || s.itemAdd || dynAdd.length > 0;

    if (!summed) {
      if (s.base.kind === "input") out.push({ label: s.id, itemDependent: false, inputs: new Set([...scale, index]) });
      else if (s.base.kind === "expr") visit(s.base.expr, scale);
    } else {
      const inputs = new Set(scale);
      if (s.base.kind === "input") inputs.add(index);
      if (s.base.kind === "expr") exprInputs(graph, s.base.expr, inputs);
      for (const e of s.adds) exprInputs(graph, e.value, inputs);
      for (const k of dynAdd) exprInputs(graph, graph.dynamic[k].value, inputs);
      const itemDependent =
        s.itemAdd ||
        dynAdd.length > 0 ||
        (s.base.kind === "expr" && exprItemDependent(graph, s.base.expr)) ||
        s.adds.some((e) => exprItemDependent(graph, e.value));
      out.push({ label: `base + additions of ${s.id}`, itemDependent, inputs });
    }

    for (const e of s.muls) visit(e.value, scale);
    if (s.itemMul) out.push({ label: `item multipliers on ${s.id}`, itemDependent: true, inputs: new Set(scale) });
    for (const k of dynMul) {
      out.push({ label: `dynamic item multiplier on ${s.id}`, itemDependent: true, inputs: exprInputs(graph, graph.dynamic[k].value, new Set(scale)) });
    }
  };

  const visit = (e: Expr, scale: Set<number>): void => {
    switch (e.t) {
      case "num":
        return;
      case "ref":
        return visitStat(graph.index.get(e.id)!, scale);
      case "neg":
        return visit(e.a, scale);
      case "bin":
        if (e.op === "*" || e.op === "/") {
          visit(e.a, scale);
          visit(e.b, scale);
          return;
        }
        if (e.op === "^" && !exprItemDependent(graph, e.b)) {
          visit(e.a, exprInputs(graph, e.b, new Set(scale)));
          return;
        }
        return opaque(e, scale);
      case "fn":
        if (e.fn === "sqrt") return visit(e.args[0], scale);
        return opaque(e, scale);
    }
  };

  visit(graph.score, new Set());
  return out;
}

const SYNTHETIC_ADDS = [1, 10, 100];
const SYNTHETIC_LOG_MULS = [Math.log10(1.5), 2];

/** One modifier set per item-affected stat and magnitude, each dynamic effect alone, and all at once. */
export function syntheticCandidates(graph: StatGraph): ItemModifiers[] {
  const out: ItemModifiers[] = [];
  const all = createModifiers(graph);
  for (const s of graph.stats) {
    if (s.itemAdd) {
      for (const v of SYNTHETIC_ADDS) {
        const m = createModifiers(graph);
        m.add[s.index] = v;
        out.push(m);
      }
      all.add[s.index] = SYNTHETIC_ADDS[1];
    }
    if (s.itemMul) {
      for (const v of SYNTHETIC_LOG_MULS) {
        const m = createModifiers(graph);
        m.logMul[s.index] = v;
        out.push(m);
      }
      all.logMul[s.index] = 1;
    }
  }
  graph.dynamic.forEach((d, k) => {
    if (d.target < 0) return;
    const m = createModifiers(graph);
    m.dynamic[k] = 1;
    out.push(m);
    all.dynamic[k] = 1;
  });
  if (out.length > 1) out.push(all);
  return out;
}

function numericCheck(
  ev: FloatEvaluator,
  input: number,
  candidates: ItemModifiers[],
  epsilon: number,
): Pick<InputRelevance, "shown" | "method" | "reason" | "maxDeviation"> {
  const s = ev.graph.stats[input];
  const spec = (s.base as { spec: InputSpec }).spec;
  const original = ev.inputValues()[s.id];
  const current = original === undefined ? spec.default : typeof original === "boolean" ? Number(original) : original;
  const values = sampleValues(spec, current);

  const empty = createModifiers(ev.graph);
  // Ratios are undefined where a score is zero or can't be evaluated, so those points are skipped.
  const diffs = (): number[] => {
    const base = ev.scoreLog10(empty);
    return candidates.map((m) => {
      const l = ev.scoreLog10(m);
      return Number.isFinite(base) && Number.isFinite(l) ? l - base : NaN;
    });
  };

  const perValue = values.map((v) => {
    ev.setInput(s.id, v);
    return diffs();
  });
  ev.setInput(s.id, current);

  let compared = 0;
  let maxDeviation = 0;
  for (let j = 0; j < candidates.length; j++) {
    const column = perValue.map((d) => d[j]).filter((x) => !Number.isNaN(x));
    if (column.length < 2) continue;
    compared++;
    const lo = Math.min(...column);
    const hi = Math.max(...column);
    if (hi - lo > epsilon * Math.max(1, Math.abs(lo), Math.abs(hi))) maxDeviation = Math.max(maxDeviation, hi - lo);
  }

  const range = `${formatValue(values[0])} to ${formatValue(values[values.length - 1])}`;
  if (compared === 0) {
    return {
      shown: true,
      method: "numeric",
      reason: `Couldn't compare item sets while varying it from ${range}, so it's shown to be safe.`,
    };
  }
  if (maxDeviation === 0) {
    return {
      shown: false,
      method: "numeric",
      reason: `Varying it from ${range} changes every item set's score by the same factor.`,
      maxDeviation,
    };
  }
  const change = Number.isFinite(10 ** maxDeviation) ? ` by up to ×${formatValue(10 ** maxDeviation)}` : "";
  return {
    shown: true,
    method: "numeric",
    reason: `Changes how much items are worth: varying it from ${range} moves the gap between item sets${change}.`,
    maxDeviation,
  };
}

const LOG_FACTORS = [1e-6, 1e-3, 0.1, 1, 10, 1e3, 1e6];
const LINEAR_FACTORS = [0, 0.5, 1, 2, 4];

export function sampleValues(spec: InputSpec, current: InputValue): InputValue[] {
  if (spec.kind === "boolean") return [0, 1];
  const lo = spec.min ?? -Infinity;
  const hi = spec.max ?? Infinity;
  let raw: InputValue[];
  if (spec.logScale) {
    const pivot = Decimal.gt(current, 0) ? new Decimal(current) : new Decimal(1);
    raw = LOG_FACTORS.map((k) => pivot.mul(k)).map((d) => (Math.abs(d.log10().toNumber()) < 300 ? d.toNumber() : d));
  } else if (Number.isFinite(lo) && Number.isFinite(hi)) {
    raw = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + (hi - lo) * t);
  } else {
    const c = typeof current === "number" ? current : current.toNumber();
    raw = c === 0 ? [0, 1, 10, 100] : LINEAR_FACTORS.map((k) => c * k);
  }
  raw.push(current);
  const clamped = raw.map((v) => {
    if (typeof v !== "number") return v;
    const x = Math.min(hi, Math.max(lo, v));
    return spec.kind === "integer" ? Math.round(x) : x;
  });
  const seen = new Set<string>();
  return clamped
    .filter((v) => {
      const key = new Decimal(v).toString();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Decimal.cmp(a, b));
}

function formatValue(v: InputValue): string {
  const d = new Decimal(v);
  const n = d.toNumber();
  if (Number.isFinite(n) && Math.abs(n) < 1e6 && (n === 0 || Math.abs(n) >= 1e-3)) return String(Number(n.toPrecision(4)));
  return d.toStringWithDecimalPlaces(3);
}
