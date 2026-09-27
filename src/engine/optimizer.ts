import type { Expr } from "./expr.ts";
import { createModifiers, FloatEvaluator, itemIndependentValue, type InputValues, type ItemModifiers, type StatGraph } from "./graph.ts";
import { GLOBAL_BONUS_ENCHANT_CAP, MAX_ENCHANT_LEVEL, type ItemCatalog } from "./loadout.ts";
import type { Attribute, EffectBlock, ItemDef, ItemSlot, Quality, SetDef } from "./model.ts";
import { ATTRIBUTES, ITEM_SLOTS, SLOT_CAPACITY } from "./model.ts";
import { analyzeRelevance, type RelevanceResult } from "./relevance.ts";

/** Enchanting is only possible on Legendary and Unique items (https://idlewizard.wiki.gg/wiki/Enchantments). */
const ENCHANTABLE: ReadonlySet<Quality> = new Set<Quality>(["Legendary", "Unique"]);

export const ENCHANT_LEVELS: readonly number[] = Array.from({ length: MAX_ENCHANT_LEVEL + 1 }, (_, i) => i);

/** Relative score changes below ×1.01 are treated as noise by `Optimizer.relevance`. */
export const DEFAULT_NOISE_THRESHOLD = Math.log10(1.01);

const EXHAUSTIVE_LIMIT = 2048;
const MAX_GREEDY_PASSES = 6;
const MAX_SUBSET_PIECES = 10;

export interface OptimizerProblem {
  graph: StatGraph;
  catalog: ItemCatalog;
  items: readonly ItemDef[];
  sets: readonly SetDef[];
  inputs?: InputValues;
  /** Assigned attribute points, checked against item requirements. */
  attributes?: Partial<Record<Attribute, number>>;
}

export type Pruning = "bot" | "none";

export interface OptimizerOptions {
  /** Owned items and their quality, by item key. Default: every non-Mythic item at its maximum quality. */
  owned?: Readonly<Record<string, Quality>>;
  excludedSlots?: readonly ItemSlot[];
  /** Global real enchant level for `optimize` (the sweep varies it). Items without an override use it. */
  enchant?: number;
  enchantOverrides?: Readonly<Record<string, number>>;
  legion?: boolean;
  /** Allow items that give every enchanted item bonus levels (Resonator Ring). Default true. */
  resonator?: boolean;
  /**
   * "bot" keeps, per slot, the BiS bot's standalone candidates plus the best replacements in a greedy set;
   * "none" searches every remaining item (exact under the monotonicity the bound assumes, but slower).
   */
  pruning?: Pruning;
  /**
   * Besides the greedy set's own items, keep items whose score in the greedy set is within this log10 margin of it
   * (default log10(1.05)). Also the margin for keeping set pieces from subsets close to the best subset.
   */
  marginalTolerance?: number;
  /**
   * Items kept per slot beyond its capacity from the ranking against the greedy set, regardless of margin (default 0).
   * Each one makes the exact search much larger; the pair polish covers these items more cheaply.
   */
  runnersUp?: number;
  /** Items per slot beyond its capacity that the pair polish re-chooses jointly for every pair of slots (default 0: off). */
  polishDepth?: number;
  /** Bound and leaf evaluations the exact search may spend per branch and level before giving up (default 200 000). */
  nodeBudget?: number;
}

export type ExclusionReason = "not-owned" | "mythic" | "excluded-slot" | "requirements" | "no-effect" | "resonator-disabled";

export interface ExcludedItem {
  key: string;
  name: string;
  reason: ExclusionReason;
}

export interface ChosenItem {
  key: string;
  name: string;
  slot: ItemSlot;
  quality: Quality;
  set: string | null;
  /** Real enchant level bought. */
  enchant: number;
  /** Real plus bonus levels (0 when not enchanted). */
  effectiveEnchant: number;
  /** log10(score with the item / score with its slot left empty). */
  contributionLog10: number;
}

export interface SearchStats {
  /** Items the exact search chose from. */
  candidates: number;
  /** Slot positions left to the exact search after fixing forced ones. */
  positions: number;
  leaves: number;
  bounds: number;
  evaluations: number;
  exhaustive: boolean;
  /** False when the node budget ran out: the set is the best found, not proven best among the candidates. */
  complete: boolean;
  ms: number;
}

export interface SetResult {
  items: ChosenItem[];
  scoreLog10: number;
  /** log10(score / score with no items). */
  gainLog10: number;
  /** Keys of the forced all-item bonus items of this branch (Resonator Ring), empty when excluded. */
  forced: string[];
  /** Items the exact search chose from, by key. */
  candidates: string[];
  stats: SearchStats;
}

export interface LevelResult {
  level: number;
  best: SetResult;
  branches: SetResult[];
  /** The best set differs from the previous level's. */
  changed: boolean;
}

export interface SweepResult {
  baselineLog10: number;
  excluded: ExcludedItem[];
  levels: LevelResult[];
  /** Levels where the best set changes, like the BiS bot's "Enchant N" rows. */
  changes: number[];
}

interface Delta {
  addI: number[];
  addV: number[];
  mulI: number[];
  mulV: number[];
  dyn: number[];
}

interface BlockInfo {
  delta: Delta;
  /** Numeric attribute bonuses by `ATTRIBUTES` index, or null when there are none. */
  attr: number[] | null;
  allBonus: number;
  slotBonus: [number, number][];
  selfBonus: number;
}

interface SetTierInfo extends BlockInfo {
  pieces: number;
}

interface SetInfo {
  def: SetDef;
  tiers: SetTierInfo[];
  maxPieces: number;
  /** Favourable parts of the tiers up to each piece count, for the optimistic bound. */
  favourable: { delta: Delta; ambiguous: boolean }[];
}

interface Cand extends BlockInfo {
  item: ItemDef;
  quality: Quality;
  slot: ItemSlot;
  slotIndex: number;
  set: number;
  reqs: [number, number][];
  enchCoord: number;
  enchLog: number;
  enchantable: boolean;
  /** Real enchant level at the level being optimized. */
  real: number;
  /** Standalone best-case gain (log10) at the level being optimized. */
  standalone: number;
}

interface Branch {
  forced: Cand[];
  pool: Cand[];
  open: Map<ItemSlot, number>;
  lowRaw: number;
  high: number;
  slotHigh: Float64Array;
}

interface Found {
  score: number;
  cands: Cand[];
}

const emptyDelta = (): Delta => ({ addI: [], addV: [], mulI: [], mulV: [], dyn: [] });
const isEmptyDelta = (d: Delta) => d.addI.length + d.mulI.length + d.dyn.length === 0;
const SLOT_INDEX = new Map(ITEM_SLOTS.map((s, i) => [s, i]));
const ATTR_INDEX = new Map(ATTRIBUTES.map((a, i) => [`Attr.${a}`, i]));

class Work {
  readonly mods: ItemModifiers;
  readonly count: Int32Array;

  constructor(graph: StatGraph) {
    this.mods = createModifiers(graph);
    this.count = new Int32Array(graph.dynamic.length);
  }

  reset(): void {
    this.mods.add.fill(0);
    this.mods.logMul.fill(0);
    this.mods.dynamic.fill(0);
    this.count.fill(0);
  }

  apply(d: Delta): void {
    const { add, logMul, dynamic } = this.mods;
    for (let j = 0; j < d.addI.length; j++) add[d.addI[j]] += d.addV[j];
    for (let j = 0; j < d.mulI.length; j++) logMul[d.mulI[j]] += d.mulV[j];
    for (const k of d.dyn) {
      this.count[k]++;
      dynamic[k] = 1;
    }
  }

  save(buf: Work): void {
    buf.mods.add.set(this.mods.add);
    buf.mods.logMul.set(this.mods.logMul);
    buf.mods.dynamic.set(this.mods.dynamic);
    buf.count.set(this.count);
  }

  restore(buf: Work): void {
    buf.save(this);
  }
}

function sameKeys(a: SetResult, b: SetResult): boolean {
  const ka = a.items.map((i) => i.key).sort();
  const kb = b.items.map((i) => i.key).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i]);
}

const beats = (a: number, b: number) => (b === -Infinity ? a > b : a > b + 1e-12 * Math.max(1, Math.abs(b)));

/**
 * Finds the item set with the highest score (in log10) at each enchant level, in the spirit of the BiS bot
 * (https://idle-wizard.fandom.com/wiki/BiS_Guide): filter, rank per slot, test set subsets, then an exact
 * branch-and-bound search. Items giving all items bonus enchant levels (Resonator Ring) are searched in
 * separate branches, forced in or excluded, because they change every other item's enchant level.
 */
export class Optimizer {
  readonly excluded: ExcludedItem[] = [];
  readonly baselineLog10: number;
  readonly legion: boolean;
  private readonly graph: StatGraph;
  private readonly inputs: InputValues;
  private readonly overrides: Readonly<Record<string, number>>;
  private readonly pruning: Pruning;
  private readonly marginalTolerance: number;
  private readonly nodeBudget: number;
  private readonly runnersUp: number;
  private readonly polishDepth: number;
  private readonly assigned: Float64Array;
  private readonly setInfo: SetInfo[];
  private readonly pool: Cand[];
  private readonly branchList: Branch[];
  private readonly ev: FloatEvaluator;
  private readonly evaluators = new Map<string, FloatEvaluator>();
  private readonly work: Work;
  private readonly addDir: Int8Array;
  private readonly mulDir: Int8Array;
  private readonly dynDir: Int8Array;
  private evaluations = 0;

  constructor(problem: OptimizerProblem, options: OptimizerOptions = {}) {
    const { graph, catalog } = problem;
    this.graph = graph;
    this.inputs = problem.inputs ?? {};
    this.overrides = options.enchantOverrides ?? {};
    this.pruning = options.pruning ?? "bot";
    this.marginalTolerance = options.marginalTolerance ?? Math.log10(1.05);
    this.nodeBudget = options.nodeBudget ?? 200_000;
    this.runnersUp = options.runnersUp ?? 0;
    this.polishDepth = options.polishDepth ?? 0;
    this.legion = options.legion ?? false;
    this.assigned = Float64Array.from(ATTRIBUTES, (a) => problem.attributes?.[a] ?? attributeInput(graph, this.inputs, a));
    this.work = new Work(graph);

    const formulaValue = itemIndependentValue(graph, this.inputs);
    const block = (b: EffectBlock, label: string): BlockInfo => blockInfo(b, graph, catalog, label, formulaValue);
    this.setInfo = problem.sets.map((def) => {
      const tiers = def.tiers.map((t) => ({ ...block(t, `${def.name} (${t.pieces})`), pieces: t.pieces }));
      return { def, tiers, maxPieces: Math.max(0, ...tiers.map((t) => t.pieces)), favourable: [] };
    });
    const setIndex = new Map(problem.sets.map((s, i) => [s.name, i]));

    const excludedSlots = new Set(options.excludedSlots ?? []);
    const excluded = (item: ItemDef, reason: ExclusionReason) => this.excluded.push({ key: item.key, name: item.name, reason });
    const owned: Cand[] = [];
    for (const item of problem.items) {
      const quality = options.owned ? options.owned[item.key] : item.mythic ? undefined : item.maxQuality;
      if (!quality) {
        excluded(item, !options.owned && item.mythic ? "mythic" : "not-owned");
        continue;
      }
      const tier = item.tiers.find((t) => t.quality === quality);
      if (!tier) throw new Error(`${item.name} has no ${quality} quality`);
      if (excludedSlots.has(item.slot)) {
        excluded(item, "excluded-slot");
        continue;
      }
      const info = block(tier, `${item.name} (${quality})`);
      if (info.allBonus > 0 && options.resonator === false) {
        excluded(item, "resonator-disabled");
        continue;
      }
      const enchStat = item.enchant?.stat ? graph.index.get(item.enchant.stat) : undefined;
      owned.push({
        ...info,
        item,
        quality,
        slot: item.slot,
        slotIndex: SLOT_INDEX.get(item.slot)!,
        set: item.set ? (setIndex.get(item.set) ?? -1) : -1,
        reqs: Object.entries(item.requirements).map(([a, v]) => [ATTRIBUTES.indexOf(a as Attribute), v!]),
        enchCoord: enchStat ?? -1,
        enchLog: item.enchant ? Math.log10(1 + item.enchant.perLevel) : 0,
        enchantable: enchStat !== undefined && ENCHANTABLE.has(quality),
        real: 0,
        standalone: 0,
      });
    }

    const required = new Set(owned.flatMap((c) => c.reqs.map(([a]) => a)));
    const reachable = owned.filter((c) => {
      const setMatters = c.set >= 0 && this.setInfo[c.set].tiers.some((t) => !isEmptyDelta(t.delta) || t.slotBonus.length > 0);
      const enabler = c.attr?.some((v, a) => v > 0 && required.has(a)) ?? false;
      const matters = !isEmptyDelta(c.delta) || c.enchantable || setMatters || c.allBonus > 0 || c.slotBonus.length > 0 || enabler;
      if (!matters) excluded(c.item, "no-effect");
      return matters;
    });
    this.pool = reachable.filter((c) => {
      const ok = c.reqs.every(([a, v]) => this.assigned[a] + optimisticAttribute(reachable, this.setInfo, a, c) >= v);
      if (!ok) excluded(c.item, "requirements");
      return ok;
    });

    this.ev = this.evaluator(this.pool, []);
    this.baselineLog10 = this.evaluate(this.ev, this.work.mods);
    [this.addDir, this.mulDir, this.dynDir] = this.directions();
    for (const s of this.setInfo) s.favourable = this.favourableTiers(s);
    this.branchList = this.makeBranches();
  }

  /** Best set at one global enchant level; `previous` warm-starts the search and sets `changed`. */
  optimizeLevel(level: number, previous?: LevelResult): LevelResult {
    for (const c of this.pool) c.real = this.realLevel(c, level);
    const branches = this.branchList.map((b, i) => this.optimizeBranch(b, previous?.branches[i]));
    const best = branches.reduce((a, b) => (beats(b.scoreLog10, a.scoreLog10) ? b : a));
    return { level, best, branches, changed: !previous || !sameKeys(previous.best, best) };
  }

  sweep(levels: readonly number[] = ENCHANT_LEVELS, onLevel?: (row: LevelResult, index: number) => void): SweepResult {
    const rows: LevelResult[] = [];
    for (const [i, level] of levels.entries()) {
      const row = this.optimizeLevel(level, rows[rows.length - 1]);
      rows.push(row);
      onLevel?.(row, i);
    }
    return this.sweepResult(rows);
  }

  sweepResult(rows: LevelResult[]): SweepResult {
    return { baselineLog10: this.baselineLog10, excluded: [...this.excluded], levels: rows, changes: rows.filter((r) => r.changed).map((r) => r.level) };
  }

  /** Exact score (log10) of a set of owned items at a global enchant level; -Infinity if a requirement is unmet. */
  scoreOf(keys: readonly string[], level: number): number {
    return this.scoreCands(this.ev, this.candsOf(keys, level));
  }

  /** Item modifiers of a set of owned items at a global enchant level. */
  modifiersFor(keys: readonly string[], level: number): ItemModifiers {
    this.fill(this.candsOf(keys, level));
    const m = this.work.mods;
    return { add: Float64Array.from(m.add), logMul: Float64Array.from(m.logMul), dynamic: Uint8Array.from(m.dynamic) };
  }

  /**
   * Input relevance against real candidate sets: the level's best set is the reference, and the other branch's best
   * and the best single-item swaps from the owned items are compared with it. Deviations up to `threshold` count as noise.
   */
  relevance(row: LevelResult, options: { threshold?: number; maxCandidates?: number } = {}): RelevanceResult {
    const bestKeys = row.best.items.map((i) => i.key);
    const sets = new Map<string, string[]>();
    const addSet = (keys: string[]) => sets.set([...keys].sort().join("|"), keys);
    for (const b of row.branches) addSet(b.items.map((i) => i.key));
    const bySlot = new Map<ItemSlot, ChosenItem[]>();
    for (const i of row.best.items) bySlot.set(i.slot, [...(bySlot.get(i.slot) ?? []), i]);
    const swaps: { keys: string[]; score: number; slot: ItemSlot }[] = [];
    for (const cand of this.pool) {
      const key = cand.item.key;
      if (bestKeys.includes(key) || (cand.allBonus > 0 && !row.best.forced.includes(key))) continue;
      const held = (bySlot.get(cand.slot) ?? []).filter((i) => !row.best.forced.includes(i.key));
      const open = SLOT_CAPACITY[cand.slot] - (bySlot.get(cand.slot)?.length ?? 0);
      const out = open > 0 ? null : held.reduce<ChosenItem | null>((w, i) => (!w || i.contributionLog10 < w.contributionLog10 ? i : w), null);
      if (open <= 0 && !out) continue;
      const keys = [...bestKeys.filter((k) => k !== out?.key), key];
      swaps.push({ keys, score: this.scoreOf(keys, row.level), slot: cand.slot });
    }
    const usable = swaps.filter((s) => Number.isFinite(s.score)).sort((a, b) => b.score - a.score);
    // The best alternative of every slot is kept, so inputs that only matter to an equipped item's own value
    // (e.g. Cataclysm's charges) are compared against a set without that item.
    const bestPerSlot = [...new Map([...usable].reverse().map((s) => [s.slot, s])).values()];
    const chosen = new Set(bestPerSlot);
    for (const s of usable) if (chosen.size < Math.max(options.maxCandidates ?? 40, bestPerSlot.length)) chosen.add(s);
    for (const s of chosen) addSet(s.keys);
    return analyzeRelevance(this.graph, {
      inputs: this.inputs,
      candidates: [...sets.values()].map((k) => this.modifiersFor(k, row.level)),
      reference: this.modifiersFor(bestKeys, row.level),
      threshold: options.threshold ?? DEFAULT_NOISE_THRESHOLD,
    });
  }

  private candsOf(keys: readonly string[], level: number): Cand[] {
    return keys.map((k) => {
      const c = this.pool.find((x) => x.item.key === k);
      if (!c) throw new Error(`${k} is not an optimizer candidate (not owned, filtered or unknown)`);
      return { ...c, real: this.realLevel(c, level) };
    });
  }

  private realLevel(c: Cand, level: number): number {
    if (!c.enchantable) return 0;
    const v = this.overrides[c.item.key] ?? level;
    return Math.max(0, Math.min(MAX_ENCHANT_LEVEL, Math.round(v)));
  }

  private evaluate(ev: FloatEvaluator, mods: ItemModifiers): number {
    this.evaluations++;
    return ev.scoreLog10(mods);
  }

  private evaluator(cands: readonly Cand[], forced: readonly Cand[]): FloatEvaluator {
    const add = new Set<number>();
    const mul = new Set<number>();
    const dyn = new Set<number>();
    const visit = (d: Delta) => {
      d.addI.forEach((i) => add.add(i));
      d.mulI.forEach((i) => mul.add(i));
      d.dyn.forEach((k) => dyn.add(k));
    };
    const sets = new Set<number>();
    for (const c of [...cands, ...forced]) {
      visit(c.delta);
      if (c.enchCoord >= 0) mul.add(c.enchCoord);
      if (c.set >= 0) sets.add(c.set);
    }
    for (const s of sets) for (const t of this.setInfo[s].tiers) visit(t.delta);
    const key = [[...add].sort().join(","), [...mul].sort().join(","), [...dyn].sort().join(",")].join("/");
    let ev = this.evaluators.get(key);
    if (!ev) {
      if (this.evaluators.size >= 64) this.evaluators.clear();
      ev = new FloatEvaluator(this.graph, this.inputs, { activeItems: { add, mul, dynamic: dyn }, incremental: true });
      this.evaluators.set(key, ev);
    }
    return ev;
  }

  /** Writes a set's modifiers into `work` (tiers, reached set tiers, enchant levels with all bonuses). */
  private fill(cands: readonly Cand[], fullSet = -1): number[] {
    const w = this.work;
    w.reset();
    const pieces = new Map<number, number>();
    let global = this.legion ? 1 : 0;
    const slotBonus = new Float64Array(ITEM_SLOTS.length);
    for (const c of cands) {
      w.apply(c.delta);
      if (c.set >= 0) pieces.set(c.set, (pieces.get(c.set) ?? 0) + 1);
      global += c.allBonus;
      for (const [s, l] of c.slotBonus) slotBonus[s] += l;
    }
    if (fullSet >= 0) pieces.set(fullSet, this.setInfo[fullSet].maxPieces);
    const reached: number[] = [];
    for (const [s, p] of pieces) {
      for (const t of this.setInfo[s].tiers) {
        if (t.pieces > p) continue;
        w.apply(t.delta);
        global += t.allBonus;
        for (const [slot, l] of t.slotBonus) slotBonus[slot] += l;
        reached.push(s, t.pieces);
      }
    }
    global = Math.min(GLOBAL_BONUS_ENCHANT_CAP, global);
    for (const c of cands) {
      if (c.real > 0 && c.enchCoord >= 0) w.mods.logMul[c.enchCoord] += (c.real + global + slotBonus[c.slotIndex] + c.selfBonus) * c.enchLog;
    }
    return reached;
  }

  private scoreCands(ev: FloatEvaluator, cands: readonly Cand[], fullSet = -1, checkRequirements = true): number {
    const reached = this.fill(cands, fullSet);
    if (checkRequirements && !this.feasible(cands, reached)) return -Infinity;
    return this.evaluate(ev, this.work.mods);
  }

  private feasible(cands: readonly Cand[], reached: readonly number[]): boolean {
    if (!cands.some((c) => c.reqs.length > 0)) return true;
    const total = Float64Array.from(this.assigned);
    for (const c of cands) if (c.attr) c.attr.forEach((v, a) => (total[a] += v));
    for (let j = 0; j < reached.length; j += 2) {
      const t = this.setInfo[reached[j]].tiers.find((x) => x.pieces === reached[j + 1])!;
      if (t.attr) t.attr.forEach((v, a) => (total[a] += v));
    }
    return cands.every((c) => c.reqs.every(([a, v]) => total[a] - (c.attr?.[a] ?? 0) >= v));
  }

  private effectiveLevels(cands: readonly Cand[]): number[] {
    const pieces = new Map<number, number>();
    let global = this.legion ? 1 : 0;
    const slotBonus = new Float64Array(ITEM_SLOTS.length);
    for (const c of cands) {
      if (c.set >= 0) pieces.set(c.set, (pieces.get(c.set) ?? 0) + 1);
      global += c.allBonus;
      for (const [s, l] of c.slotBonus) slotBonus[s] += l;
    }
    for (const [s, p] of pieces) {
      for (const t of this.setInfo[s].tiers) {
        if (t.pieces > p) continue;
        global += t.allBonus;
        for (const [slot, l] of t.slotBonus) slotBonus[slot] += l;
      }
    }
    global = Math.min(GLOBAL_BONUS_ENCHANT_CAP, global);
    return cands.map((c) => (c.real > 0 ? c.real + global + slotBonus[c.slotIndex] + c.selfBonus : 0));
  }

  /**
   * Direction in which each item coordinate moves the score (1 up, -1 down, 0 ambiguous), from finite steps at no
   * items, every candidate at once, and every candidate at maximum enchant. The bound assumes these hold everywhere.
   */
  private directions(): [Int8Array, Int8Array, Int8Array] {
    const n = this.graph.stats.length;
    const nd = this.graph.dynamic.length;
    const seen = [new Map<number, Set<number>>(), new Map<number, Set<number>>(), new Map<number, Set<number>>()];
    const steps = [new Map<number, [number, number]>(), new Map<number, [number, number]>()];
    const note = (kind: 0 | 1, i: number, v: number) => {
      const [lo, hi] = steps[kind].get(i) ?? [0, 0];
      steps[kind].set(i, [Math.min(lo, v), Math.max(hi, v)]);
    };
    const poolSets = new Set(this.pool.filter((c) => c.set >= 0).map((c) => c.set));
    const deltas = [...this.pool.map((c) => c.delta), ...[...poolSets].flatMap((s) => this.setInfo[s].tiers.map((t) => t.delta))];
    for (const d of deltas) {
      d.addI.forEach((i, j) => note(0, i, d.addV[j]));
      d.mulI.forEach((i, j) => note(1, i, d.mulV[j]));
    }
    for (const c of this.pool) if (c.enchantable) note(1, c.enchCoord, c.enchLog * (MAX_ENCHANT_LEVEL + GLOBAL_BONUS_ENCHANT_CAP));
    const dynUsed = new Set(deltas.flatMap((d) => d.dyn));

    const everything = (level: number): ItemModifiers => {
      const w = this.work;
      w.reset();
      for (const d of deltas) w.apply(d);
      for (const c of this.pool) if (c.enchantable && level > 0) w.mods.logMul[c.enchCoord] += level * c.enchLog;
      return { add: Float64Array.from(w.mods.add), logMul: Float64Array.from(w.mods.logMul), dynamic: Uint8Array.from(w.mods.dynamic) };
    };
    const points = [createModifiers(this.graph), everything(0), everything(MAX_ENCHANT_LEVEL + GLOBAL_BONUS_ENCHANT_CAP)];
    const record = (kind: number, i: number, response: number, step: number, at: number) => {
      if (!(Math.abs(response) > 1e-12 * Math.max(1, Math.abs(at)))) return;
      if (!seen[kind].has(i)) seen[kind].set(i, new Set());
      seen[kind].get(i)!.add(Math.sign(response) * Math.sign(step));
    };
    for (const p of points) {
      const at = this.evaluate(this.ev, p);
      for (const kind of [0, 1] as const) {
        const arr = kind === 0 ? p.add : p.logMul;
        for (const [i, [lo, hi]] of steps[kind]) {
          for (const v of [lo, hi]) {
            if (v === 0) continue;
            arr[i] += v;
            record(kind, i, this.evaluate(this.ev, p) - at, v, at);
            arr[i] -= v;
          }
        }
      }
      for (const k of dynUsed) {
        const was = p.dynamic[k];
        p.dynamic[k] = was ? 0 : 1;
        const other = this.evaluate(this.ev, p);
        p.dynamic[k] = was;
        record(2, k, was ? at - other : other - at, 1, at);
      }
    }
    const dir = (kind: number, size: number) => {
      const out = new Int8Array(size).fill(1);
      for (const [i, s] of seen[kind]) out[i] = s.size > 1 ? 0 : [...s][0];
      return out;
    };
    return [dir(0, n), dir(1, n), dir(2, nd)];
  }

  private favourableTiers(s: SetInfo): { delta: Delta; ambiguous: boolean }[] {
    const out: { delta: Delta; ambiguous: boolean }[] = [];
    for (let p = 0; p <= s.maxPieces; p++) {
      const delta = emptyDelta();
      let ambiguous = false;
      for (const t of s.tiers) {
        if (t.pieces > p) continue;
        const f = this.favourablePart(t.delta);
        ambiguous ||= f.ambiguous;
        delta.addI.push(...f.delta.addI);
        delta.addV.push(...f.delta.addV);
        delta.mulI.push(...f.delta.mulI);
        delta.mulV.push(...f.delta.mulV);
        delta.dyn.push(...f.delta.dyn);
      }
      out.push({ delta, ambiguous });
    }
    return out;
  }

  private favourablePart(d: Delta): { delta: Delta; ambiguous: boolean } {
    const out = emptyDelta();
    let ambiguous = false;
    d.addI.forEach((i, j) => {
      const v = d.addV[j];
      if (this.addDir[i] === 0) ambiguous ||= v !== 0;
      else if (v * this.addDir[i] > 0) {
        out.addI.push(i);
        out.addV.push(v);
      }
    });
    d.mulI.forEach((i, j) => {
      const v = d.mulV[j];
      if (this.mulDir[i] === 0) ambiguous ||= v !== 0;
      else if (v * this.mulDir[i] > 0) {
        out.mulI.push(i);
        out.mulV.push(v);
      }
    });
    for (const k of d.dyn) {
      if (this.dynDir[k] === 0) ambiguous = true;
      else if (this.dynDir[k] > 0) out.dyn.push(k);
    }
    return { delta: out, ambiguous };
  }

  private makeBranches(): Branch[] {
    const bonusItems = this.pool.filter((c) => c.allBonus > 0);
    const base = this.pool.filter((c) => c.allBonus === 0);
    const legion = this.legion ? 1 : 0;
    const poolSets = [...new Set(this.pool.filter((c) => c.set >= 0).map((c) => this.setInfo[c.set]))];
    const setAll = poolSets.reduce((s, x) => s + x.tiers.reduce((a, t) => a + t.allBonus, 0), 0);
    const slotHigh = (pool: Cand[]) => {
      const out = new Float64Array(ITEM_SLOTS.length);
      for (const c of pool) for (const [s, l] of c.slotBonus) out[s] += l;
      for (const s of poolSets) for (const t of s.tiers) for (const [slot, l] of t.slotBonus) out[slot] += l;
      return out;
    };
    const make = (forced: Cand[]): Branch => {
      const open = new Map<ItemSlot, number>();
      for (const slot of ITEM_SLOTS) {
        const n = SLOT_CAPACITY[slot] - forced.filter((c) => c.slot === slot).length;
        if (n > 0 && base.some((c) => c.slot === slot)) open.set(slot, n);
      }
      const lowRaw = legion + forced.reduce((s, c) => s + c.allBonus, 0);
      return {
        forced,
        pool: base.filter((c) => open.has(c.slot)),
        open,
        lowRaw,
        high: Math.min(GLOBAL_BONUS_ENCHANT_CAP, lowRaw + setAll),
        slotHigh: slotHigh([...forced, ...base]),
      };
    };
    return [make([]), ...bonusItems.map((b) => make([b]))];
  }

  private optimizeBranch(branch: Branch, warm?: SetResult): SetResult {
    const t0 = performance.now();
    const evals0 = this.evaluations;
    const { forced, pool, open } = branch;
    const forcedScore = this.scoreCands(this.ev, forced, -1, false);
    for (const c of pool) c.standalone = this.scoreCands(this.ev, [...forced, c], c.set, false) - forcedScore;
    const bySlot = new Map<ItemSlot, Cand[]>();
    for (const c of pool) bySlot.set(c.slot, [...(bySlot.get(c.slot) ?? []), c]);
    for (const list of bySlot.values()) list.sort((a, b) => b.standalone - a.standalone);

    const warmCands = warm ? this.warmCands(branch, warm) : null;
    const { config, score: greedyScore, marginal } = this.greedy(branch, bySlot, warmCands);
    const held = (slot: ItemSlot) => config.get(slot)!.filter((c): c is Cand => c !== null);
    let seed: Found = { score: greedyScore, cands: [...forced, ...[...config.keys()].flatMap(held)] };

    const finalists = new Map<ItemSlot, Set<Cand>>();
    if (this.pruning === "none") {
      for (const [slot, list] of bySlot) finalists.set(slot, new Set(list));
    } else {
      const botKeep = new Map<ItemSlot, Cand[]>();
      for (const [slot, list] of bySlot) {
        const n = open.get(slot)!;
        const bot: Cand[] = [];
        let nonSet = 0;
        for (const c of list) {
          if (!(c.standalone > 1e-12)) break;
          bot.push(c);
          if (c.set < 0 && ++nonSet >= n) break;
        }
        botKeep.set(slot, bot);
        const ranked = list.filter((c) => marginal.has(c) && Number.isFinite(marginal.get(c)!)).sort((a, b) => marginal.get(b)! - marginal.get(a)!);
        const near = ranked.filter((c, i) => i < n + this.runnersUp || marginal.get(c)! >= greedyScore - this.marginalTolerance);
        finalists.set(slot, new Set([...held(slot), ...near]));
      }
      const { best, winners } = this.subsetTest(branch, config, botKeep, finalists, marginal, bySlot);
      if (best && beats(best.score, seed.score)) seed = best;
      for (const [slot, bot] of botKeep) {
        for (const c of bot) if (c.set < 0 || winners.get(c.set)?.has(c) !== false) finalists.get(slot)!.add(c);
      }
      for (const c of seed.cands) if (!forced.includes(c)) finalists.get(c.slot)?.add(c);
      this.dropDominated(branch, finalists);
    }

    const stats: SearchStats = { candidates: 0, positions: 0, leaves: 0, bounds: 0, evaluations: 0, exhaustive: true, complete: true, ms: 0 };
    let best = seed;
    for (let round = 0; ; round++) {
      const found = this.exactSearch(branch, finalists, best);
      stats.positions = Math.max(stats.positions, found.stats.positions);
      stats.leaves += found.stats.leaves;
      stats.bounds += found.stats.bounds;
      stats.exhaustive &&= found.stats.exhaustive;
      stats.complete = found.stats.complete;
      best = found.best;
      if (this.pruning === "none" || round >= 3) break;
      const polished = this.greedy(branch, bySlot, best.cands);
      let next: Found | null = beats(polished.score, best.score)
        ? { score: polished.score, cands: [...forced, ...[...polished.config.values()].flat().filter((c): c is Cand => c !== null)] }
        : null;
      if (!next && this.polishDepth > 0) {
        const positions = [...open].map(([slot, n]) => {
          const ranked = (bySlot.get(slot) ?? [])
            .filter((c) => Number.isFinite(polished.marginal.get(c) ?? -Infinity))
            .sort((a, b) => polished.marginal.get(b)! - polished.marginal.get(a)!)
            .slice(0, n + this.polishDepth);
          const options: Cand[][] = [[]];
          ranked.forEach((c, i) => {
            options.push([c]);
            if (n > 1) for (const d of ranked.slice(i + 1)) options.push([c, d]);
          });
          return { slot, options };
        });
        const paired = this.pairSearch(this.ev, positions, forced, best);
        if (beats(paired.score, best.score)) next = paired;
      }
      if (!next) break;
      best = next;
      for (const c of best.cands) if (!forced.includes(c)) finalists.get(c.slot)?.add(c);
    }
    const candidates = [...new Set([...finalists.values()].flatMap((s) => [...s]))];
    stats.candidates = candidates.length;
    stats.evaluations = this.evaluations - evals0;
    stats.ms = performance.now() - t0;
    return this.setResult(best, forced, candidates, stats);
  }

  /**
   * Removes finalists that another finalist of the same slot beats on every coordinate the bound uses (and on
   * requirements, set membership and bonus levels), which is exact when the score is monotone in those coordinates.
   * Finger and Trophy items need two such dominators.
   */
  private dropDominated(branch: Branch, finalists: Map<ItemSlot, Set<Cand>>): void {
    const required = new Set(this.pool.flatMap((c) => c.reqs.map(([a]) => a)));
    const vector = (c: Cand) => {
      const add = new Map<number, number>();
      const mul = new Map<number, number>();
      c.delta.addI.forEach((i, j) => add.set(i, (add.get(i) ?? 0) + c.delta.addV[j]));
      c.delta.mulI.forEach((i, j) => mul.set(i, (mul.get(i) ?? 0) + c.delta.mulV[j]));
      if (c.real > 0) mul.set(c.enchCoord, (mul.get(c.enchCoord) ?? 0) + (c.real + c.selfBonus) * c.enchLog);
      return { add, mul, dyn: new Set(c.delta.dyn) };
    };
    const simple = (c: Cand) =>
      c.set < 0 &&
      c.allBonus === 0 &&
      c.slotBonus.length === 0 &&
      c.reqs.every(([a, v]) => this.assigned[a] >= v) &&
      (c.real === 0 || (branch.high === Math.min(GLOBAL_BONUS_ENCHANT_CAP, branch.lowRaw) && branch.slotHigh[c.slotIndex] === 0));
    const atLeast = (dir: Int8Array, a: Map<number, number>, b: Map<number, number>) => {
      for (const i of new Set([...a.keys(), ...b.keys()])) {
        const d = dir[i];
        const va = a.get(i) ?? 0;
        const vb = b.get(i) ?? 0;
        if (va === vb) continue;
        if (d === 0 || (vb - va) * d < 0) return false;
      }
      return true;
    };
    const dominates = (b: Cand, a: Cand, vb: ReturnType<typeof vector>, va: ReturnType<typeof vector>) => {
      if (!atLeast(this.addDir, va.add, vb.add) || !atLeast(this.mulDir, va.mul, vb.mul)) return false;
      for (const k of new Set([...va.dyn, ...vb.dyn])) {
        if (va.dyn.has(k) === vb.dyn.has(k)) continue;
        if (this.dynDir[k] === 0 || (vb.dyn.has(k) ? 1 : -1) * this.dynDir[k] < 0) return false;
      }
      for (const r of required) if ((b.attr?.[r] ?? 0) < (a.attr?.[r] ?? 0)) return false;
      return b.standalone >= a.standalone;
    };
    for (const [slot, set] of finalists) {
      const list = [...set].filter(simple);
      const vecs = new Map(list.map((c) => [c, vector(c)]));
      const need = branch.open.get(slot) ?? 1;
      for (const a of list) {
        const by = list.filter((b) => b !== a && set.has(b) && dominates(b, a, vecs.get(b)!, vecs.get(a)!));
        if (by.length >= need) set.delete(a);
      }
    }
  }

  private warmCands(branch: Branch, warm: SetResult): Cand[] | null {
    const out: Cand[] = [...branch.forced];
    for (const i of warm.items) {
      if (warm.forced.includes(i.key)) continue;
      const c = branch.pool.find((x) => x.item.key === i.key);
      if (!c) return null;
      out.push(c);
    }
    return out;
  }

  /** Coordinate ascent from `start` (or the standalone ranking); records each item's best score in its slot. */
  private greedy(branch: Branch, bySlot: Map<ItemSlot, Cand[]>, start: readonly Cand[] | null) {
    const { forced, open } = branch;
    const config = new Map<ItemSlot, (Cand | null)[]>();
    for (const [slot, n] of open) config.set(slot, Array(n).fill(null));
    const flat = () => {
      const out = [...forced];
      for (const list of config.values()) for (const c of list) if (c) out.push(c);
      return out;
    };
    const score = () => this.scoreCands(this.ev, flat());
    let cur = score();

    if (start) {
      for (const c of start) {
        const list = config.get(c.slot);
        const pos = list ? list.indexOf(null) : -1;
        if (list && pos >= 0 && !forced.includes(c)) list[pos] = c;
      }
      cur = score();
    }
    if (!start || cur === -Infinity) {
      for (const list of config.values()) list.fill(null);
      cur = score();
      for (const [slot, list] of config) {
        let pos = 0;
        for (const c of bySlot.get(slot) ?? []) {
          if (pos >= list.length || !(c.standalone > 1e-12)) break;
          list[pos] = c;
          const s = score();
          if (beats(s, cur)) {
            cur = s;
            pos++;
          } else list[pos] = null;
        }
      }
    }

    let marginal = new Map<Cand, number>();
    for (let pass = 0; pass < MAX_GREEDY_PASSES; pass++) {
      let changed = false;
      marginal = new Map();
      for (const [slot, list] of config) {
        for (let pos = 0; pos < list.length; pos++) {
          const held = list[pos];
          let best = cur;
          let bestC = held;
          if (held) marginal.set(held, Math.max(marginal.get(held) ?? -Infinity, cur));
          for (const c of [null, ...(bySlot.get(slot) ?? [])]) {
            if (c === held || (c && list.includes(c))) continue;
            list[pos] = c;
            const s = score();
            if (c) marginal.set(c, Math.max(marginal.get(c) ?? -Infinity, s));
            if (beats(s, best)) {
              best = s;
              bestC = c;
            }
          }
          list[pos] = bestC;
          if (bestC !== held) {
            changed = true;
            cur = best;
          }
        }
      }
      if (!changed) break;
    }
    return { config, score: cur, marginal };
  }

  /**
   * Every subset of each set's kept pieces against the best non-set alternatives in the greedy set. Returns the best
   * configuration found and, per tested set, the pieces of the subsets within the margin of that set's best subset.
   */
  private subsetTest(
    branch: Branch,
    config: Map<ItemSlot, (Cand | null)[]>,
    botKeep: Map<ItemSlot, Cand[]>,
    finalists: Map<ItemSlot, Set<Cand>>,
    marginal: Map<Cand, number>,
    bySlot: Map<ItemSlot, Cand[]>,
  ): { best: Found | null; winners: Map<number, Set<Cand>> } {
    const winners = new Map<number, Set<Cand>>();
    let best: Found | null = null;
    const kept = [...new Set([...[...botKeep.values()].flat(), ...[...finalists.values()].flatMap((s) => [...s])])];
    const setIds = [...new Set(kept.filter((c) => c.set >= 0).map((c) => c.set))];
    for (const s of setIds) {
      const pieces = kept.filter((c) => c.set === s);
      if (pieces.length < 2 || pieces.length > MAX_SUBSET_PIECES) continue;
      const without = new Map<ItemSlot, (Cand | null)[]>();
      for (const [slot, list] of config) {
        const alts = (bySlot.get(slot) ?? []).filter((c) => c.set !== s && marginal.has(c)).sort((a, b) => marginal.get(b)! - marginal.get(a)!);
        const next = list.filter((c) => c && c.set !== s) as (Cand | null)[];
        for (const a of alts) if (next.length < list.length && !next.includes(a)) next.push(a);
        while (next.length < list.length) next.push(null);
        without.set(slot, next);
      }
      const build = (subset: Cand[]): Cand[] | null => {
        const cfg = new Map([...without].map(([k, v]) => [k, [...v]]));
        for (const c of subset) {
          const list = cfg.get(c.slot)!;
          let pos = list.indexOf(null);
          if (pos < 0) {
            let worst = -1;
            list.forEach((x, i) => {
              if (x && !subset.includes(x) && (worst < 0 || (marginal.get(x) ?? -Infinity) < (marginal.get(list[worst]!) ?? -Infinity))) worst = i;
            });
            pos = worst;
          }
          if (pos < 0) return null;
          list[pos] = c;
        }
        return [...branch.forced, ...[...cfg.values()].flat().filter((c): c is Cand => c !== null)];
      };
      const tried: { subset: Cand[]; score: number }[] = [];
      let top = -Infinity;
      for (let mask = 0; mask < 1 << pieces.length; mask++) {
        const subset = pieces.filter((_, i) => mask & (1 << i));
        const cands = build(subset);
        if (!cands) continue;
        const sc = this.scoreCands(this.ev, cands);
        tried.push({ subset, score: sc });
        top = Math.max(top, sc);
        if (!best || beats(sc, best.score)) best = { score: sc, cands };
      }
      const win = new Set<Cand>();
      for (const t of tried) if (t.score >= top - this.marginalTolerance) t.subset.forEach((c) => win.add(c));
      winners.set(s, win);
    }
    return { best, winners };
  }

  /** Branch-and-bound over the finalists, with an optimistic bound from per-coordinate favourable extremes. */
  private exactSearch(branch: Branch, finalists: Map<ItemSlot, Set<Cand>>, seed: Found): { best: Found; stats: SearchStats } {
    const stats: SearchStats = { candidates: 0, positions: 0, leaves: 0, bounds: 0, evaluations: 0, exhaustive: false, complete: true, ms: 0 };
    const gLow = Math.min(GLOBAL_BONUS_ENCHANT_CAP, branch.lowRaw);
    const extraLevels = (c: Cand) => (c.real > 0 && c.enchCoord >= 0 ? branch.high - gLow + branch.slotHigh[c.slotIndex] : 0);
    const favourableExtra = (c: Cand) => {
      const ex = extraLevels(c) * c.enchLog;
      return ex * this.mulDir[c.enchCoord] > 0 ? ex : 0;
    };
    const extraAmbiguous = (c: Cand) => extraLevels(c) * c.enchLog !== 0 && this.mulDir[c.enchCoord] === 0;

    const base: Cand[] = [...branch.forced];
    const positions: { slot: ItemSlot; options: Cand[][] }[] = [];
    for (const [slot, n] of branch.open) {
      const cands = [...(finalists.get(slot) ?? [])].sort((a, b) => b.standalone - a.standalone);
      if (cands.length === 0) continue;
      if (cands.length <= n && cands.every((c) => this.alwaysHelps(c, extraAmbiguous(c)))) {
        base.push(...cands);
        continue;
      }
      const options: Cand[][] = [];
      if (n === 1) for (const c of cands) options.push([c]);
      else {
        for (let i = 0; i < cands.length; i++) for (let j = i + 1; j < cands.length; j++) options.push([cands[i], cands[j]]);
        for (const c of cands) options.push([c]);
        options.sort((a, b) => b.reduce((s, c) => s + c.standalone, 0) - a.reduce((s, c) => s + c.standalone, 0));
      }
      options.push([]);
      positions.push({ slot, options });
    }
    const P = positions.length;
    stats.positions = P;

    const ev = this.evaluator(
      [...finalists.values()].flatMap((s) => [...s]),
      base,
    );
    const n = this.graph.stats.length;
    const nd = this.graph.dynamic.length;
    const nSets = this.setInfo.length;
    const tmpAdd = new Float64Array(n);
    const tmpMul = new Float64Array(n);
    const lowLevels = (c: Cand) => (c.real > 0 && c.enchCoord >= 0 ? c.real + gLow + c.selfBonus : 0);
    const envelopes = positions.map((position) => {
      const add = new Float64Array(n);
      const mul = new Float64Array(n);
      const dyn = new Uint8Array(nd);
      const setMax = new Int32Array(nSets);
      let amb = false;
      for (const opt of position.options) {
        const touchedAdd = new Set<number>();
        const touchedMul = new Set<number>();
        const setCount = new Int32Array(nSets);
        for (const c of opt) {
          c.delta.addI.forEach((i, j) => ((tmpAdd[i] += c.delta.addV[j]), touchedAdd.add(i)));
          c.delta.mulI.forEach((i, j) => ((tmpMul[i] += c.delta.mulV[j]), touchedMul.add(i)));
          if (lowLevels(c) > 0) {
            tmpMul[c.enchCoord] += lowLevels(c) * c.enchLog + favourableExtra(c);
            touchedMul.add(c.enchCoord);
          }
          amb ||= extraAmbiguous(c);
          for (const k of c.delta.dyn) {
            if (this.dynDir[k] === 0) amb = true;
            else if (this.dynDir[k] > 0) dyn[k] = 1;
          }
          if (c.set >= 0) setCount[c.set]++;
        }
        for (const i of touchedAdd) {
          const v = tmpAdd[i];
          tmpAdd[i] = 0;
          if (this.addDir[i] === 0) amb ||= v !== 0;
          else add[i] = this.addDir[i] > 0 ? Math.max(add[i], v) : Math.min(add[i], v);
        }
        for (const i of touchedMul) {
          const v = tmpMul[i];
          tmpMul[i] = 0;
          if (this.mulDir[i] === 0) amb ||= v !== 0;
          else mul[i] = this.mulDir[i] > 0 ? Math.max(mul[i], v) : Math.min(mul[i], v);
        }
        for (let s = 0; s < nSets; s++) setMax[s] = Math.max(setMax[s], setCount[s]);
      }
      return { add, mul, dyn, setMax, amb };
    });

    // Positions that loosen the bound most are decided first, so deeper bounds are tight enough to prune.
    const slack = new Float64Array(P);
    {
      this.fill(seed.cands);
      const seedMods = new Work(this.graph);
      this.work.save(seedMods);
      const at = this.evaluate(ev, seedMods.mods);
      const probe = new Work(this.graph);
      positions.forEach((position, p) => {
        seedMods.save(probe);
        const m = probe.mods;
        for (const c of seed.cands) {
          if (c.slot !== position.slot || base.includes(c)) continue;
          c.delta.addI.forEach((i, j) => (m.add[i] -= c.delta.addV[j]));
          c.delta.mulI.forEach((i, j) => (m.logMul[i] -= c.delta.mulV[j]));
          if (lowLevels(c) > 0) m.logMul[c.enchCoord] -= lowLevels(c) * c.enchLog;
        }
        const e = envelopes[p];
        for (let i = 0; i < n; i++) {
          m.add[i] += e.add[i];
          m.logMul[i] += e.mul[i];
        }
        for (let k = 0; k < nd; k++) m.dynamic[k] |= e.dyn[k];
        slack[p] = e.amb ? Infinity : this.evaluate(ev, m) - at;
      });
    }
    const order = positions.map((_, p) => p).sort((a, b) => slack[b] - slack[a]);
    const sorted = order.map((p) => positions[p]);
    const sortedEnv = order.map((p) => envelopes[p]);
    positions.splice(0, P, ...sorted);

    const sufAdd = Array.from({ length: P + 1 }, () => new Float64Array(n));
    const sufMul = Array.from({ length: P + 1 }, () => new Float64Array(n));
    const sufDyn = Array.from({ length: P + 1 }, () => new Uint8Array(nd));
    const sufSet = Array.from({ length: P + 1 }, () => new Int32Array(nSets));
    const sufAmb = new Uint8Array(P + 1);
    for (let p = P - 1; p >= 0; p--) {
      const e = sortedEnv[p];
      const next = p + 1;
      for (let i = 0; i < n; i++) {
        sufAdd[p][i] = e.add[i] + sufAdd[next][i];
        sufMul[p][i] = e.mul[i] + sufMul[next][i];
      }
      for (let k = 0; k < nd; k++) sufDyn[p][k] = e.dyn[k] | sufDyn[next][k];
      for (let s = 0; s < nSets; s++) sufSet[p][s] = e.setMax[s] + sufSet[next][s];
      sufAmb[p] = e.amb || sufAmb[next] ? 1 : 0;
    }

    let leaves = 1;
    for (const p of positions) leaves *= p.options.length;
    const exhaustive = leaves <= EXHAUSTIVE_LIMIT;
    stats.exhaustive = exhaustive;
    const w = this.work;
    w.reset();
    const counts = new Int32Array(nSets);
    const extraMul = new Float64Array(n);
    const assigned: Cand[] = [];
    const push = (c: Cand) => {
      w.apply(c.delta);
      if (c.real > 0 && c.enchCoord >= 0) {
        w.mods.logMul[c.enchCoord] += (c.real + gLow + c.selfBonus) * c.enchLog;
        extraMul[c.enchCoord] += favourableExtra(c);
      }
      if (c.set >= 0) counts[c.set]++;
      assigned.push(c);
    };
    const pop = (c: Cand) => {
      if (c.real > 0 && c.enchCoord >= 0) extraMul[c.enchCoord] -= favourableExtra(c);
      if (c.set >= 0) counts[c.set]--;
      assigned.pop();
    };
    for (const c of base) push(c);
    const extrasAmbiguous = [...base, ...positions.flatMap((p) => p.options.flat())].some((c) => extraAmbiguous(c));

    const buffers = Array.from({ length: P + 1 }, () => new Work(this.graph));
    const scratch = new Work(this.graph);
    let best = seed;
    const slotAct = new Float64Array(ITEM_SLOTS.length);

    const leaf = () => {
      stats.leaves++;
      w.save(buffers[P]);
      let global = this.legion ? 1 : 0;
      slotAct.fill(0);
      for (const c of assigned) {
        global += c.allBonus;
        for (const [s, l] of c.slotBonus) slotAct[s] += l;
      }
      const reached: number[] = [];
      for (let s = 0; s < nSets; s++) {
        if (counts[s] === 0) continue;
        for (const t of this.setInfo[s].tiers) {
          if (t.pieces > counts[s]) continue;
          w.apply(t.delta);
          global += t.allBonus;
          for (const [slot, l] of t.slotBonus) slotAct[slot] += l;
          reached.push(s, t.pieces);
        }
      }
      global = Math.min(GLOBAL_BONUS_ENCHANT_CAP, global);
      for (const c of assigned) {
        const d = c.real > 0 && c.enchCoord >= 0 ? global - gLow + slotAct[c.slotIndex] : 0;
        if (d !== 0) w.mods.logMul[c.enchCoord] += d * c.enchLog;
      }
      if (this.feasible(assigned, reached)) {
        const s = this.evaluate(ev, w.mods);
        if (beats(s, best.score)) best = { score: s, cands: [...assigned] };
      }
      w.restore(buffers[P]);
    };

    const bound = (d: number): number => {
      if (sufAmb[d] || extrasAmbiguous) return Infinity;
      const m = scratch.mods;
      const add = sufAdd[d];
      const mul = sufMul[d];
      const dyn = sufDyn[d];
      for (let i = 0; i < n; i++) {
        m.add[i] = w.mods.add[i] + add[i];
        m.logMul[i] = w.mods.logMul[i] + extraMul[i] + mul[i];
      }
      for (let k = 0; k < nd; k++) m.dynamic[k] = w.mods.dynamic[k] | dyn[k];
      for (let s = 0; s < nSets; s++) {
        const maxP = Math.min(this.setInfo[s].maxPieces, counts[s] + sufSet[d][s]);
        if (maxP < 2) continue;
        const f = this.setInfo[s].favourable[maxP];
        if (f.ambiguous) return Infinity;
        f.delta.addI.forEach((i, j) => (m.add[i] += f.delta.addV[j]));
        f.delta.mulI.forEach((i, j) => (m.logMul[i] += f.delta.mulV[j]));
        for (const k of f.delta.dyn) m.dynamic[k] = 1;
      }
      stats.bounds++;
      return this.evaluate(ev, m);
    };

    const dfs = (d: number) => {
      if (stats.bounds + stats.leaves >= this.nodeBudget) {
        stats.complete = false;
        return;
      }
      if (d === P) return leaf();
      if (!exhaustive && !beats(bound(d), best.score)) return;
      w.save(buffers[d]);
      for (const opt of positions[d].options) {
        for (const c of opt) push(c);
        dfs(d + 1);
        for (let j = opt.length - 1; j >= 0; j--) pop(opt[j]);
        w.restore(buffers[d]);
      }
    };
    dfs(0);
    if (!stats.complete) best = this.pairSearch(ev, positions, base, best);
    return { best, stats };
  }

  /** Local search that re-chooses every pair of positions jointly until no pair improves the set. */
  private pairSearch(ev: FloatEvaluator, positions: { slot: ItemSlot; options: Cand[][] }[], base: readonly Cand[], start: Found): Found {
    let best = start;
    for (let improved = true; improved; ) {
      improved = false;
      for (let p = 0; p < positions.length && !improved; p++) {
        for (let q = p + 1; q < positions.length && !improved; q++) {
          const free = (c: Cand) => !base.includes(c) && (c.slot === positions[p].slot || c.slot === positions[q].slot);
          const rest = best.cands.filter((c) => !free(c));
          for (const a of positions[p].options) {
            for (const b of positions[q].options) {
              const cands = [...rest, ...a, ...b];
              const s = this.scoreCands(ev, cands);
              if (beats(s, best.score)) {
                best = { score: s, cands };
                improved = true;
              }
            }
          }
        }
      }
    }
    return best;
  }

  /** Adding the item can only raise the score (every coordinate favourable, its set's tiers too) and never blocks a set. */
  private alwaysHelps(c: Cand, extraAmbiguous: boolean): boolean {
    if (extraAmbiguous || c.allBonus > 0 || c.slotBonus.length > 0) return false;
    if (!c.reqs.every(([a, v]) => this.assigned[a] >= v)) return false;
    if (c.attr?.some((v) => v < 0)) return false;
    const deltas = [c.delta, ...(c.set >= 0 ? this.setInfo[c.set].tiers.map((t) => t.delta) : [])];
    for (const d of deltas) {
      const f = this.favourablePart(d);
      if (f.ambiguous || f.delta.addI.length !== d.addI.length || f.delta.mulI.length !== d.mulI.length || f.delta.dyn.length !== d.dyn.length) return false;
    }
    if (c.real > 0 && c.enchCoord >= 0 && c.enchLog * this.mulDir[c.enchCoord] <= 0) return false;
    return c.standalone > 1e-12;
  }

  private setResult(found: Found, forced: Cand[], candidates: Cand[], stats: SearchStats): SetResult {
    const cands = [...found.cands].sort((a, b) => a.slotIndex - b.slotIndex || a.item.name.localeCompare(b.item.name));
    const levels = this.effectiveLevels(cands);
    const items = cands.map(
      (c, i): ChosenItem => ({
        key: c.item.key,
        name: c.item.name,
        slot: c.slot,
        quality: c.quality,
        set: c.item.set,
        enchant: c.real,
        effectiveEnchant: levels[i],
        contributionLog10: found.score - this.scoreCands(this.ev, cands.filter((_, j) => j !== i)),
      }),
    );
    return {
      items,
      scoreLog10: found.score,
      gainLog10: found.score - this.baselineLog10,
      forced: forced.map((c) => c.item.key),
      candidates: candidates.map((c) => c.item.key),
      stats,
    };
  }
}

/** Best set at `options.enchant` (default 0), both Resonator branches searched. */
export function optimize(problem: OptimizerProblem, options: OptimizerOptions = {}): LevelResult {
  return new Optimizer(problem, options).optimizeLevel(options.enchant ?? 0);
}

export function enchantSweep(problem: OptimizerProblem, options: OptimizerOptions = {}, levels: readonly number[] = ENCHANT_LEVELS): SweepResult {
  return new Optimizer(problem, options).sweep(levels);
}

function attributeInput(graph: StatGraph, inputs: InputValues, a: Attribute): number {
  const id = `AttrPoints.${a}`;
  const v = inputs[id];
  if (typeof v === "number") return v;
  if (typeof v === "boolean") return Number(v);
  if (v !== undefined) return v.toNumber();
  const i = graph.index.get(id);
  const s = i === undefined ? undefined : graph.stats[i];
  return s?.base.kind === "input" ? s.base.spec.default : 0;
}

function blockInfo(b: EffectBlock, graph: StatGraph, catalog: ItemCatalog, label: string, formulaValue: (e: Expr) => number | undefined): BlockInfo {
  const delta = emptyDelta();
  let attr: number[] | null = null;
  for (const e of b.effects) {
    const a = ATTR_INDEX.get(e.stat);
    const points = a === undefined || e.op !== "add" ? undefined : typeof e.value === "number" ? e.value : formulaValue(e.value);
    if (a !== undefined && points !== undefined) {
      attr ??= ATTRIBUTES.map(() => 0);
      attr[a] += points;
    }
    if (typeof e.value === "number") {
      const i = graph.index.get(e.stat);
      if (i === undefined) continue;
      const s = graph.stats[i];
      if (e.op === "add") {
        if (!s.itemAdd) throw new Error(`${label}: ${e.stat} doesn't accept item additions`);
        delta.addI.push(i);
        delta.addV.push(e.value);
      } else {
        if (!s.itemMul) throw new Error(`${label}: ${e.stat} doesn't accept item multipliers`);
        delta.mulI.push(i);
        delta.mulV.push(Math.log10(Math.max(e.value, 1e-300)));
      }
    } else {
      const k = catalog.dynamicIndexOf(e);
      if (k === undefined) throw new Error(`${label}: formula effect on ${e.stat} isn't in the item catalog`);
      if (graph.dynamic[k].target >= 0) delta.dyn.push(k);
    }
  }
  let allBonus = 0;
  let selfBonus = 0;
  const slotBonus: [number, number][] = [];
  for (const bonus of b.bonusEnchant) {
    if (bonus.scope === "all") allBonus += bonus.levels;
    else if (bonus.scope === "self") selfBonus += bonus.levels;
    else slotBonus.push([SLOT_INDEX.get(bonus.scope)!, bonus.levels]);
  }
  return { delta, attr, allBonus, slotBonus, selfBonus };
}

/** Most attribute bonus other candidates and set tiers could add, for the requirement pre-filter. */
function optimisticAttribute(pool: readonly Cand[], sets: readonly SetInfo[], a: number, self: Cand): number {
  let total = 0;
  const perSlot = new Map<ItemSlot, number[]>();
  for (const c of pool) {
    if (c === self || !c.attr || c.attr[a] <= 0) continue;
    perSlot.set(c.slot, [...(perSlot.get(c.slot) ?? []), c.attr[a]]);
  }
  for (const [slot, values] of perSlot) {
    values.sort((x, y) => y - x);
    const room = SLOT_CAPACITY[slot] - (slot === self.slot ? 1 : 0);
    total += values.slice(0, room).reduce((s, v) => s + v, 0);
  }
  for (const s of sets) for (const t of s.tiers) if (t.attr && t.attr[a] > 0) total += t.attr[a];
  return total;
}
