import { add, mul, num, ref, type Expr } from "../engine/expr.ts";
import { compileGraph, createModifiers, FloatEvaluator, type InputValues, type ItemModifiers, type StatGraph } from "../engine/graph.ts";
import { ItemCatalog, resolveLoadout, type EquippedItem } from "../engine/loadout.ts";
import type { AutoclickSource, ClassDef, Effect, PetDef, SpellBehaviour, SpellDef, StanceDef, StatDef, UnmodelledPart } from "../engine/model.ts";
import { analyzeRelevance, type RelevanceResult } from "../engine/relevance.ts";
import { constantStat, derivedStat, StatRegistry } from "../engine/stats.ts";
import { classById } from "./classes.ts";
import { ITEMS, SETS } from "./items.ts";
import { petById } from "./pets.ts";
import { SCORES, spellScores, type ScoreContext, type ScoreDef } from "./scores.ts";
import { behaviourOf } from "./spellBehaviours.ts";
import { spellById, spellStat } from "./spells.ts";
import { GENERIC_EFFECTS, GENERIC_STATS } from "./stats.ts";

export const MAX_SPELLS = 6;

export interface ModelSelection {
  classId: string;
  petId: string;
  /** Up to six spell ids on the bar. */
  spells: number[];
  stance?: string;
  /** Burst in Idle mode (default true). */
  idle?: boolean;
  /** Spells cast with another item set and kept for the burst (defaults to the class guide's). */
  snapped?: number[];
  scoreId?: string;
}

export interface BuiltModel {
  selection: Required<Omit<ModelSelection, "stance">> & { stance?: string };
  cls: ClassDef;
  pet: PetDef;
  stance?: StanceDef;
  spells: SpellDef[];
  stats: StatRegistry;
  effects: Effect[];
  score: { def: ScoreDef; expr: Expr };
  /** Every score this selection can produce. */
  scores: ScoreDef[];
  catalog: ItemCatalog;
  graph: StatGraph;
  relevance: RelevanceResult | null;
  unmodelled: (UnmodelledPart & { from: string })[];
}

export interface BuildOptions {
  /** Skip the relevance analysis (it evaluates the score many times). */
  relevance?: boolean;
}

let catalog: ItemCatalog | null = null;
export const itemCatalog = (): ItemCatalog => (catalog ??= new ItemCatalog(ITEMS, SETS));

export function defaultSelection(classId: string): ModelSelection {
  const cls = classById(classId);
  return { classId, petId: cls.defaultPet, spells: [...cls.defaultSpells], stance: cls.defaultStance, idle: true, snapped: [...cls.defaultSnapped], scoreId: cls.defaultScore };
}

function substitute(e: Expr, map: Readonly<Record<string, string>>): Expr {
  switch (e.t) {
    case "num":
      return e;
    case "ref":
      return map[e.id] ? ref(map[e.id]) : e;
    case "neg":
      return { t: "neg", a: substitute(e.a, map) };
    case "bin":
      return { ...e, a: substitute(e.a, map), b: substitute(e.b, map) };
    case "fn":
      return { ...e, args: e.args.map((a) => substitute(a, map)) };
  }
}

function snappedBehaviour(b: SpellBehaviour): SpellBehaviour {
  const map = b.snap ?? {};
  const sub = (e: Expr | undefined) => (e ? substitute(e, map) : e);
  return {
    ...b,
    effects: b.effects.map((e) => ({ ...e, value: substitute(e.value, map), label: `${e.label}, snapped` })),
    mana: b.mana && { perCast: sub(b.mana.perCast), perSecond: sub(b.mana.perSecond) },
    voidManaPerSecond: sub(b.voidManaPerSecond),
  };
}

const sum = (xs: Expr[]): Expr => (xs.length ? add(...xs) : num(0));

class StatCollector {
  private readonly defs = new Map<string, StatDef>();

  constructor(generic: readonly StatDef[]) {
    for (const d of generic) this.defs.set(d.id, d);
  }

  /** Spell and pet stats must be new (or the same object when shared). */
  add(defs: readonly StatDef[], from: string): void {
    for (const d of defs) {
      const prev = this.defs.get(d.id);
      if (prev && prev !== d) throw new Error(`${from} redefines stat ${d.id}`);
      this.defs.set(d.id, d);
    }
  }

  /** Class stats replace anything with the same id (e.g. Temporalist's Ley Apexes are its Singletons). */
  replace(defs: readonly StatDef[]): void {
    for (const d of defs) this.defs.set(d.id, d);
  }

  registry(): StatRegistry {
    return new StatRegistry(this.defs.values());
  }
}

function validate(sel: ModelSelection, cls: ClassDef): void {
  if (sel.spells.length > MAX_SPELLS) throw new Error(`At most ${MAX_SPELLS} spells can be selected`);
  if (new Set(sel.spells).size !== sel.spells.length) throw new Error("A spell is selected twice");
  for (const id of sel.spells) {
    const s = spellById(id);
    if (!s.classes.includes(cls.name)) throw new Error(`${s.name} isn't a ${cls.name} spell`);
  }
  if (sel.stance && !cls.stances.some((s) => s.id === sel.stance)) throw new Error(`${cls.name} has no stance ${sel.stance}`);
  for (const id of sel.snapped ?? []) if (!behaviourOf(id).snap) throw new Error(`${spellById(id).name} has nothing to snap`);
}

/**
 * Assembles the stats, effects and score of a class + pet + spell selection into one compiled graph
 * (with every item's effects declared), then runs required-input discovery and the relevance filter.
 */
export function buildModel(selection: ModelSelection, options: BuildOptions = {}): BuiltModel {
  const cls = classById(selection.classId);
  validate(selection, cls);
  const pet = petById(selection.petId);
  const stance = cls.stances.find((s) => s.id === selection.stance);
  const snapped = new Set(selection.snapped ?? cls.defaultSnapped);
  const spells = selection.spells.map(spellById);
  const active = [...new Set([...selection.spells, ...cls.augments])].map((id) => {
    const b = behaviourOf(id);
    return snapped.has(id) && selection.spells.includes(id) ? snappedBehaviour(b) : b;
  });

  const stats = new StatCollector(GENERIC_STATS);
  for (const b of active) stats.add(b.stats, spellById(b.spellId).name);
  stats.add(pet.stats, pet.name);
  stats.replace([constantStat("Pet.Tier", "Pet tier", "Pet", pet.tier, { source: pet.source })]);

  const autoclicks: AutoclickSource[] = [...active.flatMap((b) => (b.autoclicks ? [b.autoclicks] : [])), ...(pet.autoclicks ? [pet.autoclicks] : [])];
  const summons = spells.filter((s) => s.school === "Summoning").length;
  const derived: StatDef[] = [
    constantStat("Spell.ActiveSummons", "Active Summoning spells", "Spells", summons, { source: { url: "https://idlewizard.wiki.gg/wiki/Herald_of_Rot", verified: true } }),
    derivedStat("Click.SpellAutoclicksPerSecond", "Autoclicks per second from summons and the pet", "Clicks", sum(autoclicks.map((a) => a.perSecond)), {
      source: { url: "https://idlewizard.wiki.gg/wiki/Module:Data/Spells", verified: true },
    }),
    derivedStat("Click.AutoclickManaPerSecond", "Autoclick mana per second from summons and the pet", "Clicks", sum(autoclicks.map((a) => mul(a.perSecond, a.manaPerClick))), {
      source: { url: "https://idlewizard.wiki.gg/wiki/Module:Data/Spells", verified: true },
    }),
  ];

  const manaPerCast = new Map<number, string>();
  const manaPerSecond = new Map<number, string>();
  for (const b of active) {
    const s = spellById(b.spellId);
    if (b.mana?.perCast) {
      manaPerCast.set(s.id, spellStat(s, "ManaPerCast"));
      derived.push(derivedStat(spellStat(s, "ManaPerCast"), `${s.name}: mana per cast`, "Spells", b.mana.perCast, { source: b.source }));
    }
    if (b.mana?.perSecond) {
      manaPerSecond.set(s.id, spellStat(s, "ManaPerSecond"));
      derived.push(derivedStat(spellStat(s, "ManaPerSecond"), `${s.name}: mana per second`, "Spells", b.mana.perSecond, { source: b.source }));
    }
  }

  let petCastMana: string | null = null;
  if (pet.casts?.length) {
    const terms: Expr[] = [];
    for (const c of pet.casts) {
      const b = behaviourOf(c.spellId);
      if (!b.mana?.perCast) continue;
      if (!active.includes(b)) stats.add(b.stats, `${pet.name}'s ${spellById(c.spellId).name}`);
      terms.push(mul(c.perSecond, b.mana.perCast));
    }
    if (terms.length) {
      petCastMana = "Pet.CastManaPerSecond";
      derived.push(derivedStat(petCastMana, `Mana per second from spells ${pet.name} casts`, "Pet", sum(terms), { source: pet.source }));
    }
  }

  const voidSources = [...active.flatMap((b) => (b.voidManaPerSecond ? [b.voidManaPerSecond] : [])), ...(pet.voidManaPerSecond ? [pet.voidManaPerSecond] : [])];
  derived.push(derivedStat("Void.ManaPerSecond", "Void mana per second", "Void", sum(voidSources), { source: { url: "https://idlewizard.wiki.gg/wiki/Module:Data/Spells", verified: true } }));

  stats.add(derived, "model builder");
  stats.replace(cls.stats);

  const ctx: ScoreContext = { cls, pet, spells, manaPerCast, manaPerSecond, petCastMana, autoclicks: autoclicks.length > 0, voidMana: voidSources.length > 0 };
  const scores = [...SCORES, ...spellScores(ctx)].filter((s) => s.build(ctx) !== null);
  const scoreId = selection.scoreId ?? cls.defaultScore;
  const scoreDef = scores.find((s) => s.id === scoreId);
  if (!scoreDef) throw new Error(`Score ${scoreId} isn't available for this selection (available: ${scores.map((s) => s.id).join(", ")})`);

  let registry = stats.registry();
  const defaults: Record<string, number> = { "Idle.Active": selection.idle === false ? 0 : 1 };
  for (const [id, d] of [...Object.entries(cls.defaults), ...Object.entries(pet.defaults ?? {})]) {
    if (registry.get(id)?.input) defaults[id] = d.value;
  }
  registry = registry.withInputDefaults(defaults);

  const effects: Effect[] = [...GENERIC_EFFECTS, ...cls.effects, ...(stance?.effects ?? []), ...pet.effects, ...active.flatMap((b) => b.effects)];
  const itemCat = itemCatalog();
  const expr = scoreDef.build(ctx)!;
  const graph = compileGraph({ stats: registry, effects, score: expr, items: itemCat.spec });

  const unmodelled = [
    ...cls.unmodelled.map((u) => ({ ...u, from: cls.name })),
    ...(stance?.unmodelled ?? []).map((u) => ({ ...u, from: `${stance!.name} Stance` })),
    ...pet.unmodelled.map((u) => ({ ...u, from: pet.name })),
    ...active.flatMap((b) => b.unmodelled.map((u) => ({ ...u, from: spellById(b.spellId).name }))),
  ];

  return {
    selection: {
      classId: cls.id,
      petId: pet.id,
      spells: [...selection.spells],
      stance: stance?.id,
      idle: selection.idle !== false,
      snapped: [...snapped].filter((id) => selection.spells.includes(id)),
      scoreId,
    },
    cls,
    pet,
    stance,
    spells,
    stats: registry,
    effects,
    score: { def: scoreDef, expr },
    scores,
    catalog: itemCat,
    graph,
    relevance: options.relevance === false ? null : analyzeRelevance(graph),
    unmodelled,
  };
}

/** Item modifiers for a loadout, e.g. a guide preset. */
export function loadoutModifiers(model: BuiltModel, equipped: readonly EquippedItem[], legion: boolean): ItemModifiers {
  return createModifiers(model.graph, model.catalog.modifierSpec(resolveLoadout(equipped, { legion, sets: SETS })));
}

/** d ln(score) / d ln(stat) around a loadout, by scaling the stat like an item multiplier would. */
export function elasticity(model: BuiltModel, stat: string, base: ItemModifiers, inputs: InputValues = {}, step = 0.01): number {
  const i = model.graph.index.get(stat);
  if (i === undefined) return 0;
  if (!model.graph.stats[i].itemMul) throw new Error(`${stat} doesn't take item multipliers`);
  const ev = new FloatEvaluator(model.graph, inputs);
  const at = (d: number) => {
    const m: ItemModifiers = { add: base.add, logMul: Float64Array.from(base.logMul), dynamic: base.dynamic };
    m.logMul[i] += d;
    return ev.scoreLog10(m);
  };
  return (at(step) - at(-step)) / (2 * step);
}
