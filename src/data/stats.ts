import { f, ref } from "../engine/expr.ts";
import type { Attribute, BuildingId, Effect, Source, StatDef } from "../engine/model.ts";
import { ATTRIBUTES } from "../engine/model.ts";
import { constantStat, derivedStat, inputStat, multiplierStat, StatRegistry } from "../engine/stats.ts";

const ATTRIBUTES_PAGE: Source = { url: "https://idlewizard.wiki.gg/wiki/Attributes", verified: true };
const MECHANICS: Source = { url: "https://idlewizard.wiki.gg/wiki/Basic_Mechanics", verified: true };
const ENCHANTMENTS: Source = { url: "https://idlewizard.wiki.gg/wiki/Enchantments", verified: true };
const unverified = (source: Source, note: string): Source => ({ ...source, verified: false, note });

export const BUILDINGS: Record<BuildingId, string> = {
  1: "Mana Gems",
  2: "Grimoires",
  3: "Spell Fountains",
  4: "Enchanted Trees",
  5: "Alchemy Desks",
  6: "Circles Of Power",
  7: "Dimensional Rifts",
  8: "Nexi",
};
const BUILDING_IDS = Object.keys(BUILDINGS).map(Number) as BuildingId[];

export const attributeStat = (a: Attribute): string => `Attr.${a}`;
export const buildingProfit = (b: BuildingId): string => `Building.${b}.Profit`;
export const buildingShare = (b: BuildingId): string => `Building.${b}.Share`;

const spells: StatDef[] = [
  multiplierStat("Spell.EvocationEfficiency", "Evocation efficiency", "Spells", { source: ATTRIBUTES_PAGE }),
  multiplierStat("Spell.IncantationEfficiency", "Incantation efficiency", "Spells", { source: ATTRIBUTES_PAGE }),
  multiplierStat("Spell.SummoningEfficiency", "Summoning efficiency", "Spells", { source: ATTRIBUTES_PAGE }),
];

const character: StatDef[] = [
  inputStat("Char.Level", "Character level", "Character", { default: 1, kind: "integer", min: 1, logScale: true }, { source: MECHANICS }),
  inputStat(
    "Hero.AbilityPower",
    "Character ability power (CAP) before item bonuses",
    "Character",
    { default: 1, kind: "number", min: 0, logScale: true, hint: "Enter CAP without the bonuses of the items being optimized." },
    { source: unverified(MECHANICS, "What the entered value must exclude is decided when attribute and item effects are encoded.") },
  ),
  inputStat(
    "Hero.AbilityPowerGrowth",
    "CAP growth rate before item bonuses",
    "Character",
    { default: 1, kind: "number", min: 0, logScale: true },
    { source: unverified(ATTRIBUTES_PAGE, "Named by the Mastery perks; its base value is not documented.") },
  ),
  multiplierStat("Char.ExperienceGain", "Character experience gained", "Character", { source: ATTRIBUTES_PAGE }),
];

const pet: StatDef[] = [
  inputStat("Pet.Level", "Pet level", "Pet", { default: 1, kind: "integer", min: 1, logScale: true }, { source: MECHANICS }),
  inputStat(
    "Pet.AbilityPower",
    "Pet ability power (PAP) before item bonuses",
    "Pet",
    { default: 1, kind: "number", min: 0, logScale: true, hint: "Enter PAP without the bonuses of the items being optimized." },
    { source: unverified(MECHANICS, "What the entered value must exclude is decided when attribute and item effects are encoded.") },
  ),
  multiplierStat("Pet.ExperienceGain", "Pet experience gained", "Pet", { source: ATTRIBUTES_PAGE }),
];

const attributes: StatDef[] = ATTRIBUTES.map((a) =>
  inputStat(
    attributeStat(a),
    `${a} points assigned`,
    "Attributes",
    { default: 0, kind: "integer", min: 0, hint: "Points you assign; item attribute bonuses are added on top." },
    { source: ATTRIBUTES_PAGE },
  ),
);

const production: StatDef[] = [
  multiplierStat("Prod.Global", "Profits (all sources)", "Production", { source: MECHANICS }),
  ...BUILDING_IDS.flatMap((b) => [
    multiplierStat(buildingProfit(b), `${BUILDINGS[b]} profit`, "Production", { source: MECHANICS }),
    inputStat(
      buildingShare(b),
      `${BUILDINGS[b]} share of production`,
      "Production",
      { default: 0, kind: "number", min: 0, max: 1, unit: "fraction" },
      { source: unverified(MECHANICS, "Class encodings default the main building to 1 (assumption).") },
    ),
  ]),
  derivedStat(
    "Prod.Total",
    "Mana production",
    "Production",
    f(`Prod.Global * (${BUILDING_IDS.map((b) => `${buildingShare(b)} * ${buildingProfit(b)}`).join(" + ")})`),
    { source: unverified(MECHANICS, "Production modelled as global profits times the share-weighted building profits.") },
  ),
];

const mysteries: StatDef[] = [
  inputStat("Mysteries.Count", "Mysteries", "Production", { default: 0, kind: "number", min: 0, logScale: true }, { source: MECHANICS }),
  constantStat("Mysteries.Power", "Profit per Mystery", "Production", 0.03, {
    description: "Base 3% per Mystery; Intelligence and some pets raise it.",
    source: MECHANICS,
  }),
  derivedStat("Mysteries.Factor", "Mysteries profit multiplier", "Production", f("1 + Mysteries.Count * Mysteries.Power"), {
    source: unverified(MECHANICS, 'Reads "3% per Mystery" as additive: 1 + Mysteries × power.'),
  }),
];

const voidMana: StatDef[] = [
  inputStat("Void.Mana", "Void mana collected at burst time", "Void", { default: 0, kind: "number", min: 0, logScale: true }, { source: MECHANICS }),
  inputStat(
    "Void.ProfitPerPoint",
    "Profit per Void mana point before item bonuses",
    "Void",
    { default: 1, kind: "number", min: 0, logScale: true, unit: "fraction" },
    { source: unverified(MECHANICS, "Shown in More Statistics; the base value is not documented, default 1 (100%) is a placeholder.") },
  ),
  multiplierStat("Void.ManaPerEntity", "Void mana per Entity", "Void", { source: ATTRIBUTES_PAGE }),
  derivedStat("Void.Factor", "Void mana profit multiplier", "Void", f("1 + Void.Mana * Void.ProfitPerPoint"), {
    source: unverified(MECHANICS, "Production × (1 + VM × profit per point)."),
  }),
];

const idle: StatDef[] = [
  inputStat("Idle.Active", "Burst in Idle mode", "Misc", { default: 1, kind: "boolean" }, {
    source: { ...MECHANICS, note: "The wiki recommends always bursting in Idle mode." },
  }),
  inputStat(
    "Idle.Bonus",
    "Idle bonus multiplier before item bonuses",
    "Misc",
    { default: 1, kind: "number", min: 1, logScale: true },
    { source: unverified(MECHANICS, "Treated as a production multiplier while Idle mode is active.") },
  ),
  derivedStat("Idle.Factor", "Idle mode production multiplier", "Misc", f("if(Idle.Active, Idle.Bonus, 1)"), {
    source: unverified(MECHANICS, "Idle bonus applies only in Idle mode."),
  }),
];

const clicks: StatDef[] = [
  multiplierStat("Click.Profit", "Click profit", "Clicks", { source: MECHANICS }),
  multiplierStat("Click.AutoclickProfit", "Autoclick profit", "Clicks", { source: ATTRIBUTES_PAGE }),
  inputStat("Click.AutoclicksPerSecond", "Autoclicks per second", "Clicks", { default: 0, kind: "number", min: 0 }, { source: ATTRIBUTES_PAGE }),
  inputStat("Click.CritChance", "Critical chance before Critical rating", "Clicks", { default: 0, kind: "number", min: 0, max: 100, unit: "%" }, { source: MECHANICS }),
  inputStat("Click.CritRating", "Critical rating", "Clicks", { default: 0, kind: "number", min: 0, logScale: true }, { source: MECHANICS }),
  inputStat("Click.CritProfitBase", "Base critical profit before Critical rating", "Clicks", { default: 0, kind: "number", min: 0, logScale: true, unit: "%" }, {
    source: MECHANICS,
  }),
  derivedStat("Click.CritProfit", "Critical profit", "Clicks", f("Click.CritProfitBase + Click.CritRating"), {
    description: "In %. Critical rating R adds R% to base critical profit, before multipliers.",
    source: MECHANICS,
  }),
  derivedStat("Click.CritChanceTotal", "Critical chance", "Clicks", f("min(100, Click.CritChance + log10(max(Click.CritRating, 1)))"), {
    description: "Critical rating R adds log10(R)% to critical chance.",
    source: unverified(MECHANICS, "Capping the chance at 100% is an assumption."),
  }),
  derivedStat("Click.CritFactor", "Expected click value multiplier from criticals", "Clicks", f("1 - c / 100 + c / 100 * Click.CritProfit / 100", { c: "Click.CritChanceTotal" }), {
    source: unverified(MECHANICS, "Assumes a critical click earns (critical profit / 100%) times a normal click."),
  }),
];

const items: StatDef[] = [
  inputStat("Items.LegionReward", "The Legion reward unlocked", "Items", { default: 0, kind: "boolean", hint: "+1 bonus enchant level on enchanted items." }, {
    description:
      "Consumed when building item modifiers, not by stat formulas. Bonus levels are capped at 5 and need at least 1 real enchant level (https://idlewizard.wiki.gg/wiki/Items).",
    source: unverified(ENCHANTMENTS, "Whether slot-specific bonus levels (Power Armor, Raiments) share the cap of 5 is unverified."),
  }),
];

export const GENERIC_STATS: readonly StatDef[] = [
  ...spells,
  ...character,
  ...pet,
  ...attributes,
  ...production,
  ...mysteries,
  ...voidMana,
  ...idle,
  ...clicks,
  ...items,
];

export const GENERIC_EFFECTS: readonly Effect[] = [
  { stat: "Prod.Global", op: "mul", value: ref("Mysteries.Factor"), label: "Mysteries", source: MECHANICS },
  { stat: "Prod.Global", op: "mul", value: ref("Void.Factor"), label: "Void mana", source: unverified(MECHANICS, "See Void.Factor.") },
  { stat: "Prod.Global", op: "mul", value: ref("Idle.Factor"), label: "Idle mode", source: unverified(MECHANICS, "See Idle.Factor.") },
];

export function createGenericRegistry(): StatRegistry {
  return new StatRegistry(GENERIC_STATS);
}
