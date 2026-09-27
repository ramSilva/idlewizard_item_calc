import type { Expr } from "./expr.ts";
import type { DynamicEffect, ItemEffectSpec, ModifierSpec } from "./graph.ts";
import type { Attribute, EffectBlock, ItemDef, ItemEffect, ItemSlot, Quality, SetDef, Source } from "./model.ts";
import { SLOT_CAPACITY } from "./model.ts";

/** Bonus enchant levels from "all items" sources (Resonator Ring, The Legion) are capped at 5 (https://idlewizard.wiki.gg/wiki/Items). */
export const GLOBAL_BONUS_ENCHANT_CAP = 5;
export const MAX_ENCHANT_LEVEL = 55;

export interface EquippedItem {
  item: ItemDef;
  /** Defaults to the item's maximum quality. */
  quality?: Quality;
  /** Real enchant levels bought (0–55). */
  enchant: number;
}

export interface LoadoutOptions {
  legion: boolean;
  sets: readonly SetDef[];
}

export interface ResolvedEffect {
  stat: string;
  op: "add" | "mul";
  value: ItemEffect["value"];
  from: string;
  kind: "tier" | "set" | "enchant";
  /** The item or set effect this came from; enchant effects have none. */
  effect?: ItemEffect;
  source: Source;
}

export interface ResolvedLoadout {
  effects: ResolvedEffect[];
  /** Effective enchant level per equipped item key (real + bonus levels, 0 when not enchanted). */
  enchantLevels: Record<string, number>;
  setPieces: Record<string, number>;
  globalBonusLevels: number;
}

export const LEGION_SOURCE: Source = {
  url: "https://idlewizard.wiki.gg/wiki/Enchantments",
  verified: true,
  note: "The Legion's reward gives all enchanted items +1 enchant level.",
};

const SET_CUMULATIVE: Source = {
  url: "https://idlewizard.wiki.gg/wiki/Module:Items",
  verified: false,
  note: "Set tiers are assumed to be cumulative: every tier up to the equipped piece count applies.",
};

export function validateLoadout(equipped: readonly EquippedItem[]): string[] {
  const problems: string[] = [];
  const perSlot = new Map<ItemSlot, number>();
  const seen = new Set<string>();
  for (const e of equipped) {
    if (seen.has(e.item.key)) problems.push(`${e.item.name} is equipped twice`);
    seen.add(e.item.key);
    perSlot.set(e.item.slot, (perSlot.get(e.item.slot) ?? 0) + 1);
    if (e.quality && !e.item.tiers.some((t) => t.quality === e.quality)) problems.push(`${e.item.name} has no ${e.quality} quality`);
    if (!Number.isInteger(e.enchant) || e.enchant < 0 || e.enchant > MAX_ENCHANT_LEVEL) problems.push(`${e.item.name}: enchant level ${e.enchant} is out of range`);
  }
  for (const [slot, n] of perSlot) if (n > SLOT_CAPACITY[slot]) problems.push(`${n} items in ${slot} (capacity ${SLOT_CAPACITY[slot]})`);
  return problems;
}

function tier(e: EquippedItem): EffectBlock {
  const q = e.quality ?? e.item.maxQuality;
  const t = e.item.tiers.find((x) => x.quality === q);
  if (!t) throw new Error(`${e.item.name} has no ${q} tier`);
  return t;
}

/** Tier, set and enchant effects of an equipped set, with bonus enchant levels applied. */
export function resolveLoadout(equipped: readonly EquippedItem[], options: LoadoutOptions): ResolvedLoadout {
  const problems = validateLoadout(equipped);
  if (problems.length) throw new Error(`Invalid loadout: ${problems.join("; ")}`);

  const effects: ResolvedEffect[] = [];
  const blocks: EffectBlock[] = [];
  for (const e of equipped) {
    const t = tier(e);
    blocks.push(t);
    for (const eff of t.effects) effects.push({ stat: eff.stat, op: eff.op, value: eff.value, from: e.item.key, kind: "tier", effect: eff, source: eff.source });
  }

  const setPieces: Record<string, number> = {};
  for (const e of equipped) if (e.item.set) setPieces[e.item.set] = (setPieces[e.item.set] ?? 0) + 1;
  for (const set of options.sets) {
    const pieces = setPieces[set.name] ?? 0;
    for (const t of set.tiers) {
      if (t.pieces > pieces) continue;
      blocks.push(t);
      for (const eff of t.effects) {
        effects.push({ stat: eff.stat, op: eff.op, value: eff.value, from: set.name, kind: "set", effect: eff, source: t.pieces < pieces ? SET_CUMULATIVE : eff.source });
      }
    }
  }

  let global = options.legion ? 1 : 0;
  const perSlot = new Map<ItemSlot, number>();
  for (const b of blocks) {
    for (const bonus of b.bonusEnchant) {
      if (bonus.scope === "all") global += bonus.levels;
      else if (bonus.scope !== "self") perSlot.set(bonus.scope, (perSlot.get(bonus.scope) ?? 0) + bonus.levels);
    }
  }
  const globalBonusLevels = Math.min(GLOBAL_BONUS_ENCHANT_CAP, global);

  const enchantLevels: Record<string, number> = {};
  for (const e of equipped) {
    const self = tier(e).bonusEnchant.filter((b) => b.scope === "self").reduce((s, b) => s + b.levels, 0);
    const level = e.enchant > 0 ? e.enchant + globalBonusLevels + (perSlot.get(e.item.slot) ?? 0) + self : 0;
    enchantLevels[e.item.key] = level;
    const ench = e.item.enchant;
    if (level > 0 && ench?.stat) {
      effects.push({ stat: ench.stat, op: "mul", value: (1 + ench.perLevel) ** level, from: e.item.key, kind: "enchant", source: ench.source });
    }
  }

  return { effects, enchantLevels, setPieces, globalBonusLevels };
}

/**
 * Declares every stat the given items and sets can touch, so one compiled graph serves all loadouts.
 * Formula-valued effects become dynamic effects, switched on per loadout.
 */
export class ItemCatalog {
  readonly spec: ItemEffectSpec;
  private readonly dynamicIndex = new Map<ItemEffect, number>();

  constructor(items: readonly ItemDef[], sets: readonly SetDef[]) {
    const add = new Set<string>();
    const mul = new Set<string>();
    const dynamic: DynamicEffect[] = [];
    const visit = (e: ItemEffect, label: string) => {
      if (typeof e.value === "number") (e.op === "add" ? add : mul).add(e.stat);
      else {
        this.dynamicIndex.set(e, dynamic.length);
        dynamic.push({ stat: e.stat, op: e.op, value: e.value, label });
      }
    };
    for (const item of items) {
      for (const t of item.tiers) for (const e of t.effects) visit(e, `${item.name} (${t.quality}): ${e.text}`);
      if (item.enchant?.stat) mul.add(item.enchant.stat);
    }
    for (const set of sets) for (const t of set.tiers) for (const e of t.effects) visit(e, `${set.name} (${t.pieces}): ${e.text}`);
    this.spec = { add: [...add], mul: [...mul], dynamic };
  }

  /** Index into `spec.dynamic` of a formula-valued item or set effect. */
  dynamicIndexOf(effect: ItemEffect): number | undefined {
    return this.dynamicIndex.get(effect);
  }

  /** Static sums/products per stat plus the dynamic effect indices, ready for `createModifiers`. */
  modifierSpec(resolved: ResolvedLoadout): ModifierSpec {
    const add: Record<string, number> = {};
    const mul: Record<string, number> = {};
    const dynamic: number[] = [];
    for (const r of resolved.effects) {
      if (typeof r.value !== "number") {
        const k = r.effect ? this.dynamicIndexOf(r.effect) : undefined;
        if (k === undefined) throw new Error(`Formula effect on ${r.stat} from ${r.from} is not in the catalog`);
        dynamic.push(k);
      } else if (r.op === "add") add[r.stat] = (add[r.stat] ?? 0) + r.value;
      else mul[r.stat] = (mul[r.stat] ?? 1) * r.value;
    }
    return { add, mul, dynamic };
  }
}

export interface UnmetRequirement {
  item: string;
  attribute: Attribute;
  required: number;
  available: number;
}

/**
 * Attribute bonuses of the other equipped items (and active set tiers) count toward an item's requirement
 * (https://idlewizard.wiki.gg/wiki/Attributes, Item Requirements). Formula-valued bonuses such as
 * Commissar's Torn Sleeve are not counted, since they need stat values.
 */
/** Attribute requirements an equipped set doesn't meet; `formulaValue` evaluates formula bonuses (e.g. Commissar's Torn Sleeve's pet-level bonus). */
export function unmetRequirements(
  equipped: readonly EquippedItem[],
  assigned: Partial<Record<Attribute, number>>,
  sets: readonly SetDef[],
  formulaValue: (e: Expr) => number | undefined = () => undefined,
): UnmetRequirement[] {
  const bonusFrom = (key: string | null, attribute: Attribute) => {
    const stat = `Attr.${attribute}`;
    let total = 0;
    for (const e of equipped) {
      if (e.item.key === key) continue;
      for (const eff of tier(e).effects) {
        if (eff.stat !== stat || eff.op !== "add") continue;
        total += typeof eff.value === "number" ? eff.value : (formulaValue(eff.value) ?? 0);
      }
    }
    const pieces: Record<string, number> = {};
    for (const e of equipped) if (e.item.set) pieces[e.item.set] = (pieces[e.item.set] ?? 0) + 1;
    for (const set of sets) {
      for (const t of set.tiers) {
        if (t.pieces > (pieces[set.name] ?? 0)) continue;
        for (const eff of t.effects) if (eff.stat === stat && eff.op === "add" && typeof eff.value === "number") total += eff.value;
      }
    }
    return total;
  };
  const out: UnmetRequirement[] = [];
  for (const e of equipped) {
    for (const [a, required] of Object.entries(e.item.requirements) as [Attribute, number][]) {
      const available = (assigned[a] ?? 0) + bonusFrom(e.item.key, a);
      if (available < required) out.push({ item: e.item.key, attribute: a, required, available });
    }
  }
  return out;
}
