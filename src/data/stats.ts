import { f, ref } from "../engine/expr.ts";
import type { BuildingId, Effect, InputSpec, Source, StatDef, StatGroup } from "../engine/model.ts";
import { additiveStat, constantStat, derivedStat, inputStat, multiplierStat, StatRegistry } from "../engine/stats.ts";
import { ATTRIBUTE_EFFECTS, ATTRIBUTE_STATS } from "./attributes.ts";

export { attributePoints, attributeStat } from "./attributes.ts";

const ATTRIBUTES_PAGE: Source = { url: "https://idlewizard.wiki.gg/wiki/Attributes", verified: true };
const MECHANICS: Source = { url: "https://idlewizard.wiki.gg/wiki/Basic_Mechanics", verified: true };
const ENCHANTMENTS: Source = { url: "https://idlewizard.wiki.gg/wiki/Enchantments", verified: true };
const ITEM_DATA: Source = { url: "https://idlewizard.wiki.gg/wiki/Module:Data/Items", verified: true };
const EXPEDITIONS: Source = { url: "https://idlewizard.wiki.gg/wiki/Expeditions", verified: true };
const COLLECTIBLES: Source = { url: "https://idlewizard.wiki.gg/wiki/Collectibles", verified: true };
const CATALYSTS: Source = { url: "https://idlewizard.wiki.gg/wiki/Catalysts", verified: true };
const CHRONOMANCER: Source = { url: "https://idlewizard.wiki.gg/wiki/Chronomancer", verified: true };
const STANCE: Source = { url: "https://idlewizard.wiki.gg/wiki/Stance", verified: true };
const SPELL_DATA: Source = { url: "https://idlewizard.wiki.gg/wiki/Module:Data/Spells", verified: true };
const unverified = (source: Source, note: string): Source => ({ ...source, verified: false, note });

const BEFORE_BONUSES = "Enter the value without the bonuses of items and attributes; the tool applies those itself.";

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

export const buildingProfit = (b: BuildingId): string => `Building.${b}.Profit`;
export const buildingShare = (b: BuildingId): string => `Building.${b}.Share`;
export const buildingCount = (b: BuildingId): string => `Building.${b}.Count`;

const count = (id: string, label: string, group: StatGroup, source: Source, spec: Partial<InputSpec> = {}): StatDef =>
  inputStat(id, label, group, { default: 0, kind: "number", min: 0, logScale: true, ...spec }, { source });

const OTHER_SOURCES = "Enter the value without items, attributes, class, pet and spells; the tool applies those itself. Upgrades, memetics, challenges and other sources the tool doesn't model belong in this value.";

const efficiency = (school: "Evocation" | "Incantation" | "Summoning"): StatDef =>
  inputStat(
    `Spell.${school}Efficiency`,
    `${school} efficiency from sources the tool doesn't model`,
    "Spells",
    { default: 1, kind: "number", min: 0, logScale: true, hint: OTHER_SOURCES },
    { source: unverified(MECHANICS, "Everything except items, attributes, class, pet and spells is lumped into this input.") },
  );

const spells: StatDef[] = [
  efficiency("Evocation"),
  efficiency("Incantation"),
  efficiency("Summoning"),
  multiplierStat("Spell.EvocationDuration", "Evocation duration multiplier", "Spells", { source: ITEM_DATA }),
  multiplierStat("Spell.IncantationDuration", "Incantation duration multiplier", "Spells", { source: ITEM_DATA }),
  multiplierStat("Spell.EvocationDurationDivisor", "Evocation duration divisor", "Spells", { source: ITEM_DATA }),
  multiplierStat("Spell.IncantationDurationDivisor", "Incantation duration divisor", "Spells", { source: ITEM_DATA }),
  multiplierStat("Spell.SummoningDurationDivisor", "Summoning duration divisor", "Spells", {
    source: unverified(ITEM_DATA, "Several divisors are assumed to multiply with each other."),
  }),
  additiveStat("Spell.CostReduction", "Spell cost reduction", "Spells", {
    description: "Fraction of spell costs removed.",
    source: unverified(ITEM_DATA, "Assumed to add up across items and Wisdom perks."),
  }),
  additiveStat("Spell.ChargingCostReduction", "Charging spells' cost reduction", "Spells", {
    description: "Fraction of charging spells' cost removed.",
    source: { ...STANCE, note: "The Stance page says Grasp Of The Grave and Spell Helix reduce it additively." },
  }),
  multiplierStat("Spell.ChargeSpeed", "Charge-based spell charging speed", "Spells", {
    source: { ...STANCE, note: "The Stance page says Temporal Scabbard's enchant multiplies charging speed." },
  }),
  additiveStat("Spell.AccumulatedStartingCasts", "Accumulated spells' starting casts", "Spells", {
    source: unverified(ITEM_DATA, "Flat bonuses add up; percentage bonuses are assumed to multiply the sum."),
  }),
  multiplierStat("Spell.AccumulatedCastGain", "Accumulated casts gain", "Spells", { source: ITEM_DATA }),
  multiplierStat("Spell.MaxCastRate", "Maximum cast rate of spells per second", "Spells", { source: ITEM_DATA }),
  multiplierStat("Spell.AutoclicksFromSpells", "Autoclick amount from spells", "Spells", { source: ITEM_DATA }),
  multiplierStat("Spell.AccumulatedCastCountFactor", "Cast count multiplier for accumulated and persistent spells", "Spells", {
    description: "The Rubedo Engine counts these casts twice as they are made; cast counts are inputs, so no score reads this.",
    source: ITEM_DATA,
  }),
  multiplierStat("Spell.AugmentCastCountFactor", "Cast count multiplier for augment spells", "Spells", {
    description: "Ritual Disk counts these casts twice as they are made; cast counts are inputs, so no score reads this.",
    source: ITEM_DATA,
  }),
  multiplierStat("Spell.PersistentActiveAccumulationFactor", "Persistent spells' active-part accumulation per cast", "Spells", {
    description: "The Magnifier makes each persistent cast count twice for the active part.",
    source: ITEM_DATA,
  }),
  multiplierStat("Spell.KelphiorsBlackBeamEfficiency", "Kelphior's Black Beam efficiency", "Spells", {
    source: { url: "https://idlewizard.wiki.gg/wiki/Reality_Prism", verified: true },
  }),
  count("Spell.CastsThisExile", "Spells cast this Exile", "Spells", ATTRIBUTES_PAGE),
  count("Spell.AccumulatedCastsThisExile", "Accumulated and persistent spells cast this Exile", "Spells", ATTRIBUTES_PAGE),
  count("Spell.EvocationCastsThisExile", "Evocation spells cast this Exile", "Spells", ATTRIBUTES_PAGE),
  count("Spell.IncantationCastsThisExile", "Incantation spells cast this Exile", "Spells", { url: "https://idlewizard.wiki.gg/wiki/Oni", verified: true }),
];

const character: StatDef[] = [
  inputStat("Char.Level", "Character level", "Character", { default: 1, kind: "integer", min: 1, logScale: true }, { source: MECHANICS }),
  inputStat(
    "Char.LevelRequirementReduction",
    "Level requirement reduction without items",
    "Character",
    { default: 0, kind: "integer", min: 0, hint: "From Renown, challenges and pets such as Ley Keeper or Geode; items and attribute perks are added by the tool." },
    { source: MECHANICS },
  ),
  derivedStat("Char.PhylacteryLevel", "Character level that phylacteries scale from", "Character", f("Char.Level + Char.LevelRequirementReduction"), {
    source: unverified(
      { url: "https://idlewizard.wiki.gg/wiki/Shaman_Guide", verified: true },
      'Phylacteries "scale multiplicatively from Character level"; the Shaman guide says level reduction also counts (Eerie Turquoise), and other guides use Ley Keeper\'s level reduction to boost phylacteries. Read as level + reduction.',
    ),
  }),
  inputStat(
    "Hero.AbilityPower",
    "Character ability power (CAP) without item and attribute bonuses",
    "Character",
    { default: 1, kind: "number", min: 0, logScale: true, hint: BEFORE_BONUSES },
    { source: unverified(MECHANICS, "Mastery points and perks and item bonuses are applied by the tool; everything else is part of this input.") },
  ),
  inputStat(
    "Hero.AbilityPowerGrowth",
    "CAP growth rate without item and attribute bonuses",
    "Character",
    { default: 1, kind: "number", min: 0, logScale: true, hint: BEFORE_BONUSES },
    { source: unverified(ATTRIBUTES_PAGE, "Named by the Mastery perks; its base value is not documented.") },
  ),
  count("Char.ExperienceTotal", "Total character experience", "Character", { url: "https://idlewizard.wiki.gg/wiki/Temporalist", verified: true }),
  count("Char.ClassTimeHours", "Time played as this class this Exile (hours)", "Character", unverified(
    { url: "https://idlewizard.wiki.gg/wiki/Shaman", verified: true },
    'Shaman\'s "time spent as Shaman this Exile" and Temporalist\'s "Character Time" are assumed to be the same quantity.',
  ), { unit: "h" }),
  count("Time.SkippedYears", "Skipped time this Exile (years)", "Character", { url: "https://idlewizard.wiki.gg/wiki/Temporalist", verified: true }, { unit: "years" }),
  multiplierStat("Char.ExperienceFromActions", "Character experience gained from actions", "Character", { source: MECHANICS }),
  multiplierStat("Char.ExperienceFromSources", "Character experience gained from mana sources", "Character", { source: MECHANICS }),
  count("Misc.AchievementsUnlocked", "Achievements unlocked", "Character", ATTRIBUTES_PAGE, { kind: "integer", logScale: false }),
  count("Misc.AchievementPoints", "Achievement points", "Character", ATTRIBUTES_PAGE, { kind: "integer", logScale: false }),
  count("Misc.UpgradesBought", "Upgrades bought", "Character", ATTRIBUTES_PAGE, { kind: "integer", logScale: false }),
];

const pet: StatDef[] = [
  inputStat("Pet.Level", "Pet level", "Pet", { default: 1, kind: "integer", min: 1, logScale: true }, { source: MECHANICS }),
  inputStat(
    "Pet.AbilityPower",
    "Pet ability power (PAP) without item and attribute bonuses",
    "Pet",
    { default: 1, kind: "number", min: 0, logScale: true, hint: BEFORE_BONUSES },
    { source: unverified(MECHANICS, "Empathy points and perks and item bonuses are applied by the tool; everything else is part of this input.") },
  ),
  multiplierStat("Pet.ExperienceGain", "Pet experience gained", "Pet", { source: ATTRIBUTES_PAGE }),
  additiveStat("Pet.ExperienceFlat", "Flat pet experience bonus", "Pet", {
    description: 'The "+N (additively)" / "(base) +N" pet experience bonuses.',
    source: unverified(ATTRIBUTES_PAGE, "How the flat bonus combines with the percentage bonuses is not documented."),
  }),
  multiplierStat("Pet.ChargeSpeed", "Pet ability charging speed", "Pet", { source: ATTRIBUTES_PAGE }),
  inputStat("Pet.Tier", "Pet tier", "Pet", { default: 1, kind: "integer", min: 1, max: 3 }, {
    source: unverified(ITEM_DATA, "Named by The Bond; pet encodings are expected to set it."),
  }),
  count("Pet.TimeCurrent", "Current pet time (seconds)", "Pet", unverified(ATTRIBUTES_PAGE, "The Empathy 200 perk doesn't state the unit; seconds assumed. Includes time skipped (game time)."), {
    unit: "s",
  }),
  count("Pet.RealTime", "Current pet real time (seconds)", "Pet", { url: "https://idlewizard.wiki.gg/wiki/Mechanos_Apexis", verified: true }, {
    unit: "s",
    hint: "Real time with this pet, without skipped time.",
  }),
  count("Pet.ExperienceTotal", "Total pet experience", "Pet", { url: "https://idlewizard.wiki.gg/wiki/Living_Sin", verified: true }),
  count("Pet.MaxLevelThisExile", "Highest pet level this Exile", "Pet", SPELL_DATA, {
    kind: "integer",
  }),
];

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
    count(buildingCount(b), `${BUILDINGS[b]} owned`, "Production", MECHANICS, { kind: "integer" }),
  ]),
  derivedStat(
    "Prod.Total",
    "Mana production",
    "Production",
    f(`Prod.Global * (${BUILDING_IDS.map((b) => `${buildingShare(b)} * ${buildingProfit(b)}`).join(" + ")})`),
    { source: unverified(MECHANICS, "Production modelled as global profits times the share-weighted building profits.") },
  ),
  count("Misc.SourcesOwned", "Total amount of mana sources owned", "Production", ATTRIBUTES_PAGE),
  count("Misc.LeastSourceCount", "Amount of your least profitable mana source", "Production", { url: "https://idlewizard.wiki.gg/wiki/Ley_Keeper", verified: true }),
  count("Misc.TemporalAnchors", "Temporal Anchors owned", "Production", SPELL_DATA),
];

const mysteries: StatDef[] = [
  inputStat("Mysteries.Count", "Mysteries", "Production", { default: 0, kind: "number", min: 0, logScale: true }, { source: MECHANICS }),
  constantStat("Mysteries.Power", "Profit per Mystery", "Production", 0.03, {
    description: "Base 3% per Mystery; Intelligence perks and \"(base)\" item bonuses add to it, Intelligence points and other bonuses multiply it.",
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
    "Profit per Void mana point without item and attribute bonuses",
    "Void",
    { default: 1, kind: "number", min: 0, logScale: true, unit: "fraction", hint: BEFORE_BONUSES },
    { source: unverified(MECHANICS, "Shown in More Statistics; the base value is not documented, default 1 (100%) is a placeholder.") },
  ),
  multiplierStat("Void.ManaPerEntity", "Void mana per Entity multiplier", "Void", { source: ATTRIBUTES_PAGE }),
  additiveStat("Void.ManaPerEntityFlat", "Flat Void mana per Entity bonus", "Void", {
    source: unverified(ITEM_DATA, "Nether's Embrace's \"+300\"; how it combines with the multiplier is not documented."),
  }),
  derivedStat("Void.Factor", "Void mana profit multiplier", "Void", f("1 + Void.Mana * Void.ProfitPerPoint"), {
    source: unverified(MECHANICS, "Production × (1 + VM × profit per point)."),
  }),
  inputStat("Void.EntityLifetime", "Void entity lifetime without item bonuses (seconds)", "Void", { default: 1, kind: "number", min: 1, logScale: true, unit: "s" }, {
    source: ATTRIBUTES_PAGE,
  }),
  inputStat("Void.EntitySpawnRate", "Void entity spawn rate without item bonuses", "Void", { default: 1, kind: "number", min: 1, logScale: true }, {
    source: unverified(ATTRIBUTES_PAGE, "The Insight 250 perk doesn't state the unit of the spawn rate."),
  }),
  count("Void.EntitiesThisExile", "Void entities collected this Exile", "Void", ATTRIBUTES_PAGE),
  count("Void.ManaThisExile", "All Void mana earned this Exile", "Void", { url: "https://idlewizard.wiki.gg/wiki/Voidterror", verified: true }),
  count("Void.ActiveTraps", "Active Void Traps", "Void", SPELL_DATA, { kind: "integer" }),
];

const idle: StatDef[] = [
  inputStat("Idle.Active", "Burst in Idle mode", "Misc", { default: 1, kind: "boolean" }, {
    source: { ...MECHANICS, note: "The wiki recommends always bursting in Idle mode." },
  }),
  inputStat(
    "Idle.Bonus",
    "Idle bonus multiplier without item and attribute bonuses",
    "Misc",
    { default: 1, kind: "number", min: 1, logScale: true, hint: BEFORE_BONUSES },
    { source: unverified(MECHANICS, "Treated as a production multiplier while Idle mode is active.") },
  ),
  derivedStat("Idle.Factor", "Idle mode production multiplier", "Misc", f("if(Idle.Active, Idle.Bonus, 1)"), {
    source: unverified(MECHANICS, "Idle bonus applies only in Idle mode."),
  }),
  count("Idle.TimeThisExile", "Idle time this Exile (seconds)", "Misc", ATTRIBUTES_PAGE, { unit: "s" }),
];

const clicks: StatDef[] = [
  multiplierStat("Click.Profit", "Click profit", "Clicks", { source: MECHANICS }),
  multiplierStat("Click.AutoclickProfit", "Autoclick profit", "Clicks", { source: ATTRIBUTES_PAGE }),
  inputStat("Click.AutoclicksPerSecond", "Autoclicks per second without item and attribute bonuses", "Clicks", { default: 0, kind: "number", min: 0 }, {
    source: ATTRIBUTES_PAGE,
  }),
  inputStat("Click.CritChance", "Critical chance without Critical rating, items and attributes", "Clicks", { default: 0, kind: "number", min: 0, max: 100, unit: "%" }, {
    source: MECHANICS,
  }),
  inputStat("Click.CritRating", "Critical rating without item and attribute bonuses", "Clicks", { default: 0, kind: "number", min: 0, logScale: true }, {
    source: MECHANICS,
  }),
  inputStat("Click.CritProfitBase", "Base critical profit before Critical rating", "Clicks", { default: 0, kind: "number", min: 0, logScale: true, unit: "%" }, {
    source: MECHANICS,
  }),
  derivedStat("Click.CritProfit", "Critical profit", "Clicks", f("Click.CritProfitBase + Click.CritRating"), {
    description: "In %. Critical rating R adds R% to base critical profit, before multiplication by spells or Dominance.",
    source: MECHANICS,
  }),
  derivedStat("Click.CritChanceTotal", "Critical chance", "Clicks", f("min(100, Click.CritChance + log10(max(Click.CritRating, 1)))"), {
    description: "Critical rating R adds log10(R)% to critical chance.",
    source: unverified(MECHANICS, "Capping the chance at 100% is an assumption."),
  }),
  derivedStat("Click.CritFactor", "Expected click value multiplier from criticals", "Clicks", f("1 - c / 100 + c / 100 * Click.CritProfit / 100", { c: "Click.CritChanceTotal" }), {
    source: unverified(MECHANICS, "Assumes a critical click earns (critical profit / 100%) times a normal click."),
  }),
  multiplierStat("Click.HallowedProfit", "Hallowed click profit", "Clicks", { source: ITEM_DATA }),
  inputStat(
    "Click.ProductionShare",
    "Mana per click as a share of mana per second, without item bonuses",
    "Clicks",
    { default: 1, kind: "number", min: 0, logScale: true, unit: "fraction", hint: BEFORE_BONUSES },
    {
      description:
        'Items add "N% of your Mana per second" to it; Summon Centipede Swarm scales it ("ClickProfitPerManaProduction"). Flat click mana is not modelled.',
      source: unverified(
        { url: "https://idlewizard.wiki.gg/wiki/Module:Data/Spells", verified: true },
        "Clicks are modelled as worth a share of mana per second; the base share isn't documented and the default 1 (100%) is a placeholder.",
      ),
    },
  ),
  derivedStat("Click.ManaPerClick", "Mana per click before autoclick profit and criticals", "Clicks", f("Click.Profit * Prod.Total * Click.ProductionShare"), {
    source: unverified(MECHANICS, "Assumes click profit multiplies the production-based click value."),
  }),
  count("Click.AutoclicksThisExile", "Autoclicks this Exile", "Clicks", ATTRIBUTES_PAGE),
];

const shards: StatDef[] = [
  inputStat("Shards.PassiveGeneration", "Passive spell shard generation without item and attribute bonuses", "Misc", { default: 0, kind: "number", min: 0, logScale: true }, {
    source: unverified(ATTRIBUTES_PAGE, "The Wisdom 250 perk doesn't state the unit (per second assumed)."),
  }),
  multiplierStat("Shards.PoolEfficiency", "Shard pool efficiency", "Misc", { source: ATTRIBUTES_PAGE }),
  multiplierStat("Shards.PoolCapacity", "Shard pool capacity", "Misc", { source: ITEM_DATA }),
  multiplierStat("Shards.PerClick", "Spell shards earned per click", "Misc", { source: ATTRIBUTES_PAGE }),
  count("Shards.CollectedThisExile", "Spell shards collected this Exile", "Misc", ATTRIBUTES_PAGE),
];

const time: StatDef[] = [
  constantStat("Time.MaxDistortion", "Maximum Time Distortion", "Misc", 10, {
    description: "Maximum of 10x, raised by items and an upgrade.",
    source: CHRONOMANCER,
  }),
  multiplierStat("Time.CompressedTimeGain", "Compressed Time gained per tick", "Misc", { source: ITEM_DATA }),
];

const items: StatDef[] = [
  inputStat("Items.LegionReward", "The Legion reward unlocked", "Items", { default: 0, kind: "boolean", hint: "+1 bonus enchant level on enchanted items." }, {
    description:
      "Consumed when building item modifiers, not by stat formulas. Bonus levels are capped at 5 and need at least 1 real enchant level (https://idlewizard.wiki.gg/wiki/Items).",
    source: unverified(ENCHANTMENTS, "Whether slot-specific bonus levels (Power Armor, Raiments) share the cap of 5 is unverified."),
  }),
  multiplierStat("Items.EnchantingDustIncome", "Enchanting dust income", "Items", {
    source: { ...ENCHANTMENTS, note: "Edust income bonuses are multiplicative unless stated otherwise." },
  }),
  multiplierStat("Items.ExperimentEfficiency", "Experiment efficiency", "Items", { source: ENCHANTMENTS }),
  multiplierStat("Items.CraftingEfficiency", "Crafting efficiency", "Items", { source: ITEM_DATA }),
  multiplierStat("Items.WeaponChargeSpeed", "Weapon charging speed", "Items", { source: ITEM_DATA }),
  count("Items.EnchantingDustThisExile", "Enchanting dust collected this Exile", "Items", ITEM_DATA),
  count("Items.ExperimentsThisRealm", "Experiments performed this Realm", "Items", ENCHANTMENTS),
  inputStat("Expeditions.Level", "Expedition level", "Items", { default: 0, kind: "integer", min: 0, max: 100 }, {
    source: { ...EXPEDITIONS, note: "A single wizard-wide expedition level; maximum 100." },
  }),
  count("Misc.BatsThisExile", "Bats collected this Exile", "Items", COLLECTIBLES),
  count("Misc.CatalystShards", "Catalyst shards collected", "Items", unverified(CATALYSTS, "Arcane Accelerator says \"collected\", Miniaturized Accelerator says \"amount\"; assumed to be the same number.")),
];

const WEAPON = (page: string, note?: string): Source =>
  note ? { url: `https://idlewizard.wiki.gg/wiki/${page}`, verified: false, note } : { url: `https://idlewizard.wiki.gg/wiki/${page}`, verified: true };

const weapons: StatDef[] = [
  count("Weapon.ThunderbirdCharges", "Thunderbird charges", "Items", WEAPON("Thunderbird"), { max: 10000 }),
  count("Misc.Arcanasprings", "Arcanasprings owned", "Items", WEAPON("Thunderbird")),
  count("Misc.LeyApexes", "Ley Apexes owned", "Items", WEAPON("Reality_Prism")),
  count("Misc.Laboratories", "Laboratories owned", "Items", WEAPON("Philosopher's_Stone")),
  ...(["Evocation", "Incantation", "Summoning"] as const).map((s) =>
    inputStat(`Elixir.${s}Ingredients`, `${s} ingredients in the cauldron`, "Items", { default: 0, kind: "integer", min: 0, max: 5 }, {
      source: WEAPON("Philosopher's_Stone"),
    }),
  ),
  count("Misc.LiquidShadow", "Liquid Shadow held", "Items", WEAPON("Black_Blade")),
  count("Misc.ShadowCoals", "Shadow Coals owned", "Items", WEAPON("Black_Blade")),
  count("Misc.Voidgates", "Voidgates owned", "Items", WEAPON("Shard_Of_A_Lost_Dimension")),
  count("Misc.MaxManaAccrued", "Maximum mana accrued", "Items", WEAPON("Head_Of_The_All-Eater", "The page doesn't say over which period the \"accrued\" totals count.")),
  count("Void.ManaAccrued", "Void mana accrued", "Items", WEAPON("Head_Of_The_All-Eater", "See Maximum mana accrued.")),
  count("Click.AutoclicksAccrued", "Autoclicks accrued", "Items", WEAPON("Head_Of_The_All-Eater", "See Maximum mana accrued.")),
  count("Spell.CastsAccrued", "Spellcasts accrued", "Items", WEAPON("Head_Of_The_All-Eater", "See Maximum mana accrued.")),
  count("Void.EntitiesAccrued", "Void entities accrued", "Items", WEAPON("Head_Of_The_All-Eater", "See Maximum mana accrued.")),
  count("Weapon.BranchCharges", "Branch of the Great Cycle charges", "Items", WEAPON("Branch_of_the_Great_Cycle"), { max: 2e6 }),
  additiveStat("Weapon.BranchClickMultiplier", "Branch of the Great Cycle per-click profit multiplier", "Items", {
    description: "(C × R × S^(1 + 0.5R) × 100 + 1) from the weapon's Details; 0 when Branch isn't equipped.",
    source: WEAPON("Branch_of_the_Great_Cycle"),
  }),
  count("Weapon.CataclysmCharges", "Cataclysm charges (temporary Hellholes when activated)", "Items", WEAPON("Cataclysm")),
];

export const GENERIC_STATS: readonly StatDef[] = [
  ...spells,
  ...character,
  ...pet,
  ...ATTRIBUTE_STATS,
  ...production,
  ...mysteries,
  ...voidMana,
  ...idle,
  ...clicks,
  ...shards,
  ...time,
  ...items,
  ...weapons,
];

export const PRODUCTION_EFFECTS: readonly Effect[] = [
  { stat: "Prod.Global", op: "mul", value: ref("Mysteries.Factor"), label: "Mysteries", source: MECHANICS },
  { stat: "Prod.Global", op: "mul", value: ref("Void.Factor"), label: "Void mana", source: unverified(MECHANICS, "See Void.Factor.") },
  { stat: "Prod.Global", op: "mul", value: ref("Idle.Factor"), label: "Idle mode", source: unverified(MECHANICS, "See Idle.Factor.") },
];

export const GENERIC_EFFECTS: readonly Effect[] = [...PRODUCTION_EFFECTS, ...ATTRIBUTE_EFFECTS];

export function createGenericRegistry(): StatRegistry {
  return new StatRegistry(GENERIC_STATS);
}
