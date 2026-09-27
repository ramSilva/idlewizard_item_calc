import type { Expr } from "./expr.ts";

export interface Source {
  url: string;
  verified: boolean;
  note?: string;
}

export type StatGroup = "Character" | "Pet" | "Attributes" | "Spells" | "Production" | "Clicks" | "Void" | "Items" | "Misc";

export interface InputSpec {
  default: number;
  kind: "number" | "integer" | "boolean";
  min?: number;
  max?: number;
  /** Values span many orders of magnitude; perturb multiplicatively and accept 1e300-style input. */
  logScale?: boolean;
  unit?: string;
  hint?: string;
}

/**
 * A stat's value is `(base + Σ additive effects) × Π multiplicative effects`.
 * The base is a user input, a constant, or a formula over other stats.
 */
export interface StatDef {
  id: string;
  label: string;
  group: StatGroup;
  description?: string;
  base?: number | Expr;
  input?: InputSpec;
  source?: Source;
}

export interface Effect {
  stat: string;
  op: "add" | "mul";
  /** For "mul" this is the factor itself (1.25 for +25%); for "add" the amount added to the base. */
  value: Expr;
  label: string;
  source: Source;
}

export const ATTRIBUTES = [
  "Intelligence",
  "Insight",
  "Spellcraft",
  "Wisdom",
  "Dominance",
  "Patience",
  "Mastery",
  "Empathy",
  "Versatility",
] as const;
export type Attribute = (typeof ATTRIBUTES)[number];

export const QUALITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Unique", "Mythic"] as const;
export type Quality = (typeof QUALITIES)[number];

export const ITEM_SLOTS = [
  "Head",
  "Hands",
  "Chest",
  "Feet",
  "Shoulder",
  "Neck",
  "Waist",
  "Wrist",
  "Back",
  "Legs",
  "Offhand",
  "Research",
  "Accessory",
  "Mount",
  "Phylactery",
  "Weapon",
  "Finger",
  "Trophy",
] as const;
export type ItemSlot = (typeof ITEM_SLOTS)[number];

export const SLOT_CAPACITY: Record<ItemSlot, number> = Object.fromEntries(
  ITEM_SLOTS.map((s) => [s, s === "Finger" || s === "Trophy" ? 2 : 1]),
) as Record<ItemSlot, number>;

/** Same semantics as `Effect`: "mul" values are the factor itself, "add" values are added to the stat's base. */
export interface ItemEffect {
  stat: string;
  op: "add" | "mul";
  value: number | Expr;
  /** The clause of the wiki text this effect was read from. */
  text: string;
  source: Source;
}

/**
 * Why a clause has no effect in the model:
 * - `not-production`: the stat can't change mana production in a scored phase (crafting, jars, offline, …).
 * - `mechanic`: needs a game mechanic the stat model doesn't have (abilities, building counts, cast counting, …).
 * - `mythic-random`: Mythic random bonuses and imbuements, which are rolled per item.
 * - `unparsed`: the text matched no rule; a coverage test lists these.
 */
export type UnmodelledReason = "not-production" | "mechanic" | "mythic-random" | "unparsed";

export interface UnmodelledClause {
  text: string;
  reason: UnmodelledReason;
  note?: string;
}

/** Free enchant levels granted to enchanted items (those with at least 1 real level). */
export interface BonusEnchant {
  /** "all" levels count toward the global cap of 5; slot- and self-scoped ones don't (see `resolveLoadout`). */
  scope: "all" | "self" | ItemSlot;
  levels: number;
  text: string;
  source: Source;
}

export interface EffectBlock {
  desc: string;
  effects: ItemEffect[];
  bonusEnchant: BonusEnchant[];
  unmodelled: UnmodelledClause[];
}

export interface ItemTier extends EffectBlock {
  quality: Quality;
}

export interface EnchantDef {
  desc: string;
  /** null when the enchant's stat isn't modelled (then `unmodelled` says why). */
  stat: string | null;
  /** Fractional bonus per level. Levels stack multiplicatively: the stat is multiplied by (1 + perLevel)^level. */
  perLevel: number;
  unmodelled?: UnmodelledClause;
  source: Source;
}

export interface ItemDef {
  key: string;
  /** Preset/guide id from `Module:Data/Items`; Mythic items have none. */
  id: number | null;
  name: string;
  slot: ItemSlot;
  set: string | null;
  startQuality: Quality;
  maxQuality: Quality;
  requirements: Partial<Record<Attribute, number>>;
  tiers: ItemTier[];
  enchant: EnchantDef | null;
  mythic: boolean;
  acquisition: string | null;
  details: string | null;
  source: Source;
}

export interface SetTier extends EffectBlock {
  pieces: number;
}

export interface SetDef {
  name: string;
  /** Item keys. */
  items: string[];
  tiers: SetTier[];
  source: Source;
}

export interface SpellDef {
  id: number;
  name: string;
  school: "Evocation" | "Incantation" | "Summoning";
  accumulated: boolean;
  persistent: boolean;
  description: string;
  math: string | null;
  classes: string[];
  source: Source;
}

/** Game behaviour of a spell while it is on the bar/active during the scored phase. */
export interface SpellBehaviour {
  spellId: number;
  effects: Effect[];
  /** Mana this spell produces, relative to production; used as a spell score. */
  mana?: { expr: Expr; label: string };
  inputs?: StatDef[];
  notes?: string[];
}

export interface StanceDef {
  id: string;
  name: string;
  effects: Effect[];
  source: Source;
}

export interface ClassDef {
  id: string;
  name: string;
  effects: Effect[];
  stances: StanceDef[];
  inputs: StatDef[];
  /** Pets listed first in the picker, from the class guide. */
  pairedPets: string[];
  /** Burst spell loadout from the class guide, used as the default selection. */
  defaultSpells: number[];
  defaultPet: string;
  defaultStance?: string;
  /** Default attribute points, from the class guide. */
  defaultAttributes: Partial<Record<Attribute, number>>;
  /** Building that holds (almost) all production in the scored phase, by default. */
  mainBuilding: BuildingId;
  buildingNames: Partial<Record<BuildingId, string>>;
  source: Source;
  notes?: string[];
}

export interface PetDef {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  effects: Effect[];
  inputs: StatDef[];
  /** Spells cast by the pet itself (e.g. Mechanos Apexis casts Kelphior's Black Beam). */
  castsSpells?: number[];
  source: Source;
  notes?: string[];
}

export type BuildingId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface ScoreDef {
  id: string;
  label: string;
  expr: Expr;
  description: string;
}
