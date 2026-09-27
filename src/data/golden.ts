import { FloatEvaluator, type InputValues } from "../engine/graph.ts";
import type { EquippedItem } from "../engine/loadout.ts";
import type { ItemDef, Quality } from "../engine/model.ts";
import type { SetResult } from "../engine/optimizer.ts";
import { loadoutModifiers, type BuiltModel } from "./buildModel.ts";
import { itemByKey, itemByName, presetItems } from "./items.ts";

const ENCHANTABLE: readonly Quality[] = ["Legendary", "Unique"];

export interface GuidePreset {
  label: string;
  /** Real enchant level the tab is labelled with ("17+5" → 17). */
  enchant: number;
  code: string;
}

export interface GuideCase {
  classId: string;
  source: string;
  presets: GuidePreset[];
}

// Burst presets from the guides' GuideBox `items` parameters (ids from Module:Data/Items). Tabs are labelled
// "N+5": enchant N plus Resonator Ring +4 and The Legion +1.
export const GUIDE_CASES: readonly GuideCase[] = [
  {
    classId: "oni",
    source: "https://idlewizard.wiki.gg/wiki/Oni_Guide",
    presets: [
      { label: "LS 13+5", enchant: 13, code: "104;113;6;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509" },
      { label: "LS 17+5", enchant: 17, code: "104;113;1;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509" },
      { label: "LS 39+5", enchant: 39, code: "104;113;1;29;18;31;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509" },
    ],
  },
  {
    classId: "shaman",
    source: "https://idlewizard.wiki.gg/wiki/Shaman_Guide",
    presets: [
      { label: "20+5", enchant: 20, code: "108;113;4;20;12;33;47;61;59;87;73;1001;206;306;418;406;94;2005;3004;507" },
      { label: "28+5", enchant: 28, code: "108;113;4;20;12;33;47;61;59;88;73;1001;206;306;418;406;94;2005;3004;507" },
    ],
  },
  {
    classId: "temporalist",
    source: "https://idlewizard.wiki.gg/wiki/Temporalist_Guide_(e550%2B)",
    presets: [
      { label: "11+5", enchant: 11, code: "104;113;6;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508" },
      { label: "15+5", enchant: 15, code: "104;113;1;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508" },
      { label: "22+5", enchant: 22, code: "104;113;1;29;14;36;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508" },
      { label: "34+5", enchant: 34, code: "104;113;1;29;14;36;48;67;59;84;76;1005;207;300;411;408;92;2003;3005;508" },
    ],
  },
];

export interface GuideVariant {
  id: string;
  classId: string;
  description: string;
  source: string;
  inputs: Record<string, number>;
}

// The class defaults use each guide's starting attribute table; the presets were evidently computed further along it
// (Oni's preset needs 250 Spellcraft, Shaman's skips the items the guide says win only before attributes are maxed).
export const GUIDE_VARIANTS: readonly GuideVariant[] = [
  { id: "oni", classId: "oni", description: "Class defaults (the guide's Minimum attributes)", source: "https://idlewizard.wiki.gg/wiki/Oni_Guide#Attribute_Points", inputs: {} },
  {
    id: "oni-spellcraft",
    classId: "oni",
    description: 'Spellcraft 200: the first step of the guide\'s "2 Perk" priority column ("200 (250) Spellcraft")',
    source: "https://idlewizard.wiki.gg/wiki/Oni_Guide#Priority",
    inputs: { "AttrPoints.Spellcraft": 200 },
  },
  { id: "shaman", classId: "shaman", description: "Class defaults (the guide's e550 starting attributes)", source: "https://idlewizard.wiki.gg/wiki/Shaman_Guide#E550_myst_variation", inputs: {} },
  {
    id: "shaman-maxed",
    classId: "shaman",
    description:
      "Dominance, Empathy and Patience at 250 and Mastery 200 (250 with Rugged Wristcoat): the burst note says Voidstrike Seal, Encircling Trophies and Bite Sleeves are best only before those attributes are maxed",
    source: "https://idlewizard.wiki.gg/wiki/Shaman_Guide#Burst",
    inputs: { "AttrPoints.Dominance": 250, "AttrPoints.Empathy": 250, "AttrPoints.Patience": 250, "AttrPoints.Mastery": 200 },
  },
  { id: "temporalist", classId: "temporalist", description: "Class defaults (the guide's attributes)", source: "https://idlewizard.wiki.gg/wiki/Temporalist_Guide_(e550%2B)#Attribute_Points", inputs: {} },
];

export interface EnchantPriority {
  item: string;
  /** "Exact profit bonus per enchant" from the guide's Enchant Priority table, as a fraction. */
  guide: number;
  /** Tab whose preset contains the item (the check scores one extra level of it there). */
  preset: string;
  /** Phases the guide's number includes beyond the burst, which the burst score doesn't model. */
  otherPhases?: string;
}

// https://idlewizard.wiki.gg/wiki/Temporalist_Guide_(e550%2B)#Enchant_Priority, items that are in a burst preset.
// Incantation enchants also count in the snap sets (Stabilize The Flow ~Inc^1, Gem Resonance ~Inc^1.12: Artificer's
// Shoulderpads, a Gem Snap-only item, is listed at 1.04^1.12) and the Void mana phase (~Inc^1.2).
export const TEMPORALIST_ENCHANT_PRIORITY: readonly EnchantPriority[] = [
  { item: "Reality Prism", guide: 0.4292, preset: "22+5", otherPhases: "Stabilize The Flow and Gem Resonance snap sets and the Void mana set also carry it (1.05^7.32 ≈ burst 4 + snaps 2.12 + Void mana 1.2)." },
  { item: "The Clockcarers", guide: 0.3, preset: "22+5" },
  { item: "Chronoboost Ring", guide: 0.3, preset: "22+5" },
  { item: "Tranquil Spaulders", guide: 0.25, preset: "22+5" },
  { item: "Bite Sleeves", guide: 0.2, preset: "22+5" },
  { item: "Destabilized Evocations", guide: 0.2, preset: "22+5" },
  { item: "Collar Of Obedience", guide: 0.2, preset: "22+5" },
  { item: "Circlet Of Deep Thoughts", guide: 0.25, preset: "22+5" },
  { item: "Seclusion Shell", guide: 0.25, preset: "22+5" },
  { item: "Folds of Magma", guide: 0.2, preset: "22+5" },
  { item: "Boots Of Concentration", guide: 0.25, preset: "22+5" },
  { item: "Flaming Cape", guide: 0.2, preset: "22+5" },
  { item: "Murmuring Spellbook", guide: 0.2, preset: "22+5" },
  { item: "Necrotic Powerstone", guide: 0.2, preset: "22+5" },
  { item: "Miniaturized Accelerator", guide: 0.2, preset: "22+5" },
  { item: "Gemshoes", guide: 0.2, preset: "15+5" },
  { item: "Fiery Grips", guide: 0.2, preset: "15+5" },
  { item: "The Amplifier", guide: 0.2838, preset: "34+5", otherPhases: "Also in the Gem Resonance snap set (1.05^5.12 ≈ burst 4 + Gem Resonance 1.12)." },
  { item: "The Rubedo Engine", guide: 0.125, preset: "22+5" },
  { item: "Robust Tangerine Phylactery", guide: 0.1, preset: "22+5" },
  { item: "Anima Core", guide: 0.0867, preset: "22+5", otherPhases: "Listed with the snap-only Incantation items (1.04^2.12); it is also in every burst preset, where Incantation scales ~4." },
];

/** Items at maximum quality; only Legendary/Unique items whose enchant reaches a stat get the real level. */
export function equipAt(items: readonly ItemDef[], level: number): EquippedItem[] {
  return items.map((item) => ({ item, enchant: ENCHANTABLE.includes(item.maxQuality) && item.enchant?.stat ? level : 0 }));
}

export const presetLoadout = (code: string, level: number): EquippedItem[] => equipAt(presetItems(code), level);

export const setItems = (set: SetResult): ItemDef[] => set.items.map((i) => itemByKey(i.key)!);

export function loadoutScore(model: BuiltModel, equipped: readonly EquippedItem[], legion: boolean, inputs: InputValues = {}): number {
  return new FloatEvaluator(model.graph, inputs).scoreLog10(loadoutModifiers(model, equipped, legion));
}

export interface ItemGain {
  name: string;
  slot: string;
  /** log10 of the score ratio. */
  log10: number;
}

/** log10(score with the item / without it) for every item of a loadout. */
export function removalGains(model: BuiltModel, equipped: readonly EquippedItem[], legion: boolean, inputs: InputValues = {}): ItemGain[] {
  const full = loadoutScore(model, equipped, legion, inputs);
  return equipped.map((e, i) => ({
    name: e.item.name,
    slot: e.item.slot,
    log10: full - loadoutScore(model, equipped.filter((_, j) => j !== i), legion, inputs),
  }));
}

export interface SwapGain {
  out: string;
  in: string;
  slot: string;
  log10: number;
}

/** For every item of `other` missing from `base`: log10(score after swapping it into `base` / score of `base`). */
export function swapGains(
  model: BuiltModel,
  base: readonly EquippedItem[],
  other: readonly EquippedItem[],
  legion: boolean,
  inputs: InputValues = {},
): SwapGain[] {
  const baseScore = loadoutScore(model, base, legion, inputs);
  const baseKeys = new Set(base.map((e) => e.item.key));
  const out: SwapGain[] = [];
  const replaced = new Set<string>();
  for (const e of other) {
    if (baseKeys.has(e.item.key)) continue;
    const victim = base.find((b) => b.item.slot === e.item.slot && !replaced.has(b.item.key) && !other.some((o) => o.item.key === b.item.key));
    replaced.add(victim?.item.key ?? "");
    const swapped = [...base.filter((b) => b !== victim), e];
    out.push({ out: victim?.item.name ?? "(empty)", in: e.item.name, slot: e.item.slot, log10: loadoutScore(model, swapped, legion, inputs) - baseScore });
  }
  return out;
}

/** Wizard XP per level grows 1.09× (Basic Mechanics), so a level is worth ln(1.09) of ln(total XP). */
const LN_XP_PER_LEVEL = Math.log(1.09);

/**
 * d ln(score) / d ln(total character XP), the guides' "Char EXP" scaling: character levels (by a central difference of
 * one level) plus any direct use of total XP (Temporalist's hero ability).
 */
export function experienceElasticity(model: BuiltModel, equipped: readonly EquippedItem[], legion: boolean, inputs: InputValues = {}): number {
  const mods = loadoutModifiers(model, equipped, legion);
  const level = Number(inputs["Char.Level"] ?? model.stats.get("Char.Level")!.input!.default);
  const at = (extra: InputValues) => new FloatEvaluator(model.graph, { ...inputs, ...extra }).scoreLog10(mods) * Math.LN10;
  const perLevel = (at({ "Char.Level": level + 1 }) - at({ "Char.Level": level - 1 })) / 2;
  let direct = 0;
  if (model.graph.index.has("Char.ExperienceTotal")) {
    const xp = Number(inputs["Char.ExperienceTotal"] ?? model.stats.get("Char.ExperienceTotal")!.input!.default);
    direct = (at({ "Char.ExperienceTotal": xp * 1.01 }) - at({ "Char.ExperienceTotal": xp / 1.01 })) / (2 * Math.log(1.01));
  }
  return perLevel / LN_XP_PER_LEVEL + direct;
}

/** Catalyst shards at which swapping `challenger` for `holder` ties, by bisection over log10 shards (NaN if no tie in range). */
export function catalystTie(
  model: BuiltModel,
  equipped: readonly EquippedItem[],
  holder: string,
  challenger: string,
  legion: boolean,
  inputs: InputValues = {},
): number {
  const other = itemByName(challenger)!;
  const i = equipped.findIndex((e) => e.item.name === holder);
  const swapped = equipped.map((e, j) => (j === i ? { ...e, item: other } : e));
  const diff = (log10: number) => {
    const at = { ...inputs, "Misc.CatalystShards": 10 ** log10 };
    return loadoutScore(model, equipped, legion, at) - loadoutScore(model, swapped, legion, at);
  };
  let lo = 0;
  let hi = 300;
  if (Math.sign(diff(lo)) === Math.sign(diff(hi))) return NaN;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(diff(mid)) === Math.sign(diff(lo))) lo = mid;
    else hi = mid;
  }
  return 10 ** ((lo + hi) / 2);
}

/** Score ratio per extra enchant level of one item in a loadout, at the loadout's level: (score at level + 1) / score. */
export function perLevelGain(model: BuiltModel, equipped: readonly EquippedItem[], itemName: string, legion: boolean, inputs: InputValues = {}): number {
  const item = itemByName(itemName);
  if (!item) throw new Error(`Unknown item ${itemName}`);
  const at = (delta: number) =>
    loadoutScore(
      model,
      equipped.map((e) => (e.item.key === item.key ? { ...e, enchant: e.enchant + delta } : e)),
      legion,
      inputs,
    );
  if (!equipped.some((e) => e.item.key === item.key)) throw new Error(`${itemName} is not in the loadout`);
  return 10 ** (at(1) - at(0));
}
