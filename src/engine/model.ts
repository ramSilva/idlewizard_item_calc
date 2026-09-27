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

export interface ItemEffect {
  stat: string;
  op: "add" | "mul";
  value: number | Expr;
  text: string;
}

export interface ItemTier {
  quality: Quality;
  desc: string;
  effects: ItemEffect[];
  unmodelled: string[];
}

export interface EnchantDef {
  desc: string;
  stat: string | null;
  /** Fractional bonus per level; enchant levels stack multiplicatively: (1 + perLevel)^level. */
  perLevel: number;
  /** When set, the per-level factor is `perLevel` applied to this op on the stat instead of a multiplier. */
  op: "mul" | "add";
}

export interface ItemDef {
  key: string;
  id: number | null;
  name: string;
  slot: ItemSlot;
  set: string | null;
  startQuality: Quality;
  requirements: Partial<Record<Attribute, number>>;
  tiers: ItemTier[];
  enchant: EnchantDef | null;
  enchantText: string | null;
  mythic: boolean;
  details: string | null;
  source: Source;
}

export interface SetDef {
  name: string;
  items: string[];
  tiers: { pieces: number; desc: string; effects: ItemEffect[]; unmodelled: string[] }[];
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
