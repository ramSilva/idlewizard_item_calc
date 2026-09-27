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

export type SpellBehavior = "Instant" | "Buff" | "Periodic" | "Augment";

export interface SpellDef {
  id: number;
  name: string;
  /** Identifier-safe name used in stat ids, e.g. `KelphiorsBlackBeam`. */
  key: string;
  school: "Evocation" | "Incantation" | "Summoning";
  accumulated: boolean;
  persistent: boolean;
  behavior: SpellBehavior | null;
  duration: number | null;
  description: string;
  math: string | null;
  classes: string[];
  source: Source;
}

/** A stream of autoclicks (a summon or a pet) and the mana each click earns. */
export interface AutoclickSource {
  label: string;
  perSecond: Expr;
  /** Mana per click, including click and autoclick profit, efficiency and criticals. */
  manaPerClick: Expr;
}

/** A part of a spell, pet or class ability that doesn't change any modelled stat. */
export interface UnmodelledPart {
  text: string;
  note: string;
}

/** Game behaviour of a spell while it is on the bar during the scored phase. */
export interface SpellBehaviour {
  spellId: number;
  /** Effects while the spell is active; persistent spells' passive parts are included (labelled "passive"). */
  effects: Effect[];
  /** Mana earned per cast (instant evocations) or per second while active (periodic evocations). */
  mana?: { perCast?: Expr; perSecond?: Expr };
  autoclicks?: AutoclickSource;
  voidManaPerSecond?: Expr;
  /** Per-spell inputs (casts, charges) and derived stats. */
  stats: StatDef[];
  /**
   * Stats a snapped cast freezes at cast time ("snapping": casting with one item set, then swapping).
   * When the spell is snapped, references to the key are replaced by the value's input stat.
   */
  snap?: Record<string, string>;
  unmodelled: UnmodelledPart[];
  source: Source;
}

export interface StanceDef {
  id: string;
  name: string;
  effects: Effect[];
  unmodelled: UnmodelledPart[];
  source: Source;
}

/** An input default with where the value comes from. */
export interface DefaultValue {
  value: number;
  source: Source;
}

export interface ClassDef {
  id: string;
  name: string;
  effects: Effect[];
  stances: StanceDef[];
  /** Class-specific stats; they replace generic, spell or pet stats with the same id. */
  stats: StatDef[];
  /** Spells whose effect lasts until Exile once cast (Augments), applied even when not on the bar. */
  augments: number[];
  /** Pets listed first in the picker, from the class guides. */
  pairedPets: string[];
  /** Burst setup from the class guide, used as the default selection. */
  defaultSpells: number[];
  defaultPet: string;
  defaultStance?: string;
  /** Spells the guide snaps before swapping to burst gear. */
  defaultSnapped: number[];
  defaultScore: string;
  /** Input defaults (attribute points, levels, counts), each with its source. */
  defaults: Record<string, DefaultValue>;
  /** Building that holds (almost) all production in the scored phase, by default. */
  mainBuilding: BuildingId;
  buildingNames: Partial<Record<BuildingId, string>>;
  unmodelled: UnmodelledPart[];
  source: Source;
}

export interface PetCast {
  spellId: number;
  /** Casts per second. */
  perSecond: Expr;
}

export interface PetDef {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  /** Set when the tier isn't stated by the pet's page. */
  tierSource?: Source;
  effects: Effect[];
  stats: StatDef[];
  autoclicks?: AutoclickSource;
  /** Spells the pet casts itself (Mechanos Apexis casts Kelphior's Black Beam). */
  casts?: PetCast[];
  /** Mana the pet yields by itself per second (Temporal Paradox). */
  manaPerSecond?: { value: Expr; source: Source };
  voidManaPerSecond?: Expr;
  defaults?: Record<string, DefaultValue>;
  unmodelled: UnmodelledPart[];
  source: Source;
}

export type BuildingId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
