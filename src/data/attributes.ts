import { f, ref, type Expr } from "../engine/expr.ts";
import type { Attribute, Effect, Source, StatDef, UnmodelledClause } from "../engine/model.ts";
import { ATTRIBUTES } from "../engine/model.ts";
import { constantStat, derivedStat, inputStat } from "../engine/stats.ts";

const PAGE = "https://idlewizard.wiki.gg/wiki/Attributes";
const VERIFIED: Source = { url: PAGE, verified: true };
const PERCENT_PERK: Source = {
  url: PAGE,
  verified: false,
  note: 'An "Increases X by N%" perk without "(additive)" is read as a multiplier ×(1 + N%).',
};
// Perk thresholds count item attribute bonuses: the Temporalist guide plans Intelligence 250 as 230 points plus Circlet Of Deep Thoughts' +20.
const THRESHOLD_NOTE = "https://idlewizard.wiki.gg/wiki/Temporalist_Guide_(e550%2B)";

/** Points the user assigns. */
export const attributePoints = (a: Attribute): string => `AttrPoints.${a}`;
/** Assigned points plus item bonuses; item requirements use this. */
export const attributeStat = (a: Attribute): string => `Attr.${a}`;
/** Assigned points plus item bonuses, up to the attribute cap; per-point bonuses and perks use this. */
export const attributeEffective = (a: Attribute): string => `AttrEffective.${a}`;
export const ATTRIBUTE_CAP = "Misc.AttributeCap";
const PARAGON = "https://idlewizard.wiki.gg/wiki/Paragon";
const perPoint = (a: Attribute): string => `AttrBonus.${a}`;

interface PerPoint {
  bonus: number;
  stat: string;
  label: string;
}

const PER_POINT: Record<Attribute, PerPoint> = {
  Intelligence: { bonus: 0.025, stat: "Mysteries.Power", label: "Mysteries power" },
  Insight: { bonus: 0.025, stat: "Void.ManaPerEntity", label: "Void mana per Entity" },
  Spellcraft: { bonus: 0.03, stat: "Spell.EvocationEfficiency", label: "Evocation efficiency" },
  Wisdom: { bonus: 0.025, stat: "Shards.PassiveGeneration", label: "passive Spell Shards generation" },
  Dominance: { bonus: 0.03, stat: "Click.AutoclickProfit", label: "autoclick profit" },
  Patience: { bonus: 0.025, stat: "Idle.Bonus", label: "Idle bonus" },
  Mastery: { bonus: 0.025, stat: "Hero.AbilityPower", label: "character ability power" },
  Empathy: { bonus: 0.025, stat: "Pet.AbilityPower", label: "pet ability power" },
  Versatility: { bonus: 0.018, stat: "Prod.Global", label: "profits" },
};

export const ATTRIBUTE_STATS: readonly StatDef[] = [
  inputStat(ATTRIBUTE_CAP, "Attribute cap", "Attributes", { default: 250, kind: "integer", min: 100, max: 250, hint: "100, raised by 25 at Paragon 6, 10, 12, 15, 21 and 24 (250)." }, {
    source: { url: PARAGON, verified: true },
  }),
  ...ATTRIBUTES.flatMap((a) => [
  inputStat(attributePoints(a), `${a} points assigned`, "Attributes", { default: 0, kind: "integer", min: 0, hint: "Points you assign; item attribute bonuses are added by the tool." }, {
    source: VERIFIED,
  }),
  derivedStat(attributeStat(a), `${a} (assigned + item bonuses)`, "Attributes", ref(attributePoints(a)), {
    source: {
      url: PAGE,
      verified: false,
      note: "Item attribute bonuses are assumed to count as points for per-point bonuses and perks (perk thresholds: see the Temporalist guide).",
    },
  }),
  derivedStat(attributeEffective(a), `${a} counted by bonuses and perks`, "Attributes", f(`min(${attributeStat(a)}, ${ATTRIBUTE_CAP})`), {
    source: {
      url: "https://idlewizard.wiki.gg/wiki/Shaman_Guide",
      verified: false,
      note:
        "Item attribute bonuses are assumed to stop at the attribute cap: the Shaman guide says Voidstrike Seal, Encircling Trophies and Bite Sleeves are best only \"before maxing out their respective attributes\", and the Temporalist guide needs just 240 points with Innate Aptitude's bonus.",
    },
  }),
  constantStat(perPoint(a), `${a} bonus per point`, "Attributes", PER_POINT[a].bonus, {
    description: `Each point multiplies ${PER_POINT[a].label} by (1 + this).`,
    source: VERIFIED,
  }),
  ]),
];

const perPointEffects: Effect[] = ATTRIBUTES.map((a) => ({
  stat: PER_POINT[a].stat,
  op: "mul",
  value: f(`(1 + ${perPoint(a)}) ^ ${attributeEffective(a)}`),
  label: `${a} points`,
  source: { ...VERIFIED, note: "Each assigned point gives a percentage boost, applied multiplicatively: (1 + B)^X." },
}));

type PerkOp = "mul" | "add";

interface Perk {
  points: number;
  text: string;
  stat: string;
  op: PerkOp;
  /** For "mul" the factor applied once the threshold is reached; for "add" the amount added. */
  value: string;
  source?: Source;
}

const LEVEL_REDUCTION: Source = {
  url: PAGE,
  verified: false,
  note: "Only phylacteries use it (the guides say level requirement reduction raises their power); spell, class and pet level requirements are not modelled.",
};

const log10p1 = (id: string) => `log10(${id} + 1)`;

const PERKS: Partial<Record<Attribute, Perk[]>> = {
  Intelligence: [
    { points: 25, text: "Increases Mysteries power by 2% (total of 5%)", stat: "Mysteries.Power", op: "add", value: "0.02", source: VERIFIED },
    { points: 50, text: "Increases Mysteries power by 2% (total of 7%)", stat: "Mysteries.Power", op: "add", value: "0.02", source: VERIFIED },
    { points: 75, text: "Reduces Level requirements by 1", stat: "Char.LevelRequirementReduction", op: "add", value: "1", source: LEVEL_REDUCTION },
    { points: 100, text: "Increases Mysteries power by 3% (total of 10%)", stat: "Mysteries.Power", op: "add", value: "0.03", source: VERIFIED },
    { points: 125, text: "Increases Mysteries' power by 5% (total of 15%)", stat: "Mysteries.Power", op: "add", value: "0.05", source: VERIFIED },
    {
      points: 150,
      text: "Increases profits for 0.5% per trained attribute point",
      stat: "Prod.Global",
      op: "mul",
      value: `1 + 0.005 * (${ATTRIBUTES.map(attributePoints).join(" + ")})`,
      source: { ...PERCENT_PERK, note: `${PERCENT_PERK.note} "Trained" points are read as assigned points (without item bonuses).` },
    },
    { points: 175, text: "Increases Mysteries power by 10% (total of 25%)", stat: "Mysteries.Power", op: "add", value: "0.10", source: VERIFIED },
    { points: 200, text: "Increases profits for 1.5% per unlocked Achievement", stat: "Prod.Global", op: "mul", value: "1 + 0.015 * Misc.AchievementsUnlocked" },
    { points: 225, text: "Increases Mysteries power by 10% (total of 35%)", stat: "Mysteries.Power", op: "add", value: "0.10", source: VERIFIED },
    { points: 250, text: "Increases profits by 0.65% × Bought upgrades", stat: "Prod.Global", op: "mul", value: "1 + 0.0065 * Misc.UpgradesBought" },
  ],
  Insight: [
    { points: 25, text: "Increases Void Mana profit by 12% (additive)", stat: "Void.ProfitPerPoint", op: "add", value: "0.12", source: VERIFIED },
    { points: 50, text: "Increases Void Mana profit by 10% (multiplier)", stat: "Void.ProfitPerPoint", op: "mul", value: "1.10", source: VERIFIED },
    { points: 75, text: "Increases Void Mana profit by 15% (additive)", stat: "Void.ProfitPerPoint", op: "add", value: "0.15", source: VERIFIED },
    {
      points: 150,
      text: "Increases profits by log10(Void Entities collected this Exile + 1) × 80%",
      stat: "Prod.Global",
      op: "mul",
      value: `1 + 0.8 * ${log10p1("Void.EntitiesThisExile")}`,
    },
    { points: 175, text: "Increases Void Mana profit by 20% (multiplier)", stat: "Void.ProfitPerPoint", op: "mul", value: "1.20", source: VERIFIED },
    {
      points: 200,
      text: "Increases Void Mana per Entity by log10(Void Entity life time (sec)) × 250%",
      stat: "Void.ManaPerEntity",
      op: "mul",
      value: "1 + 2.5 * log10(Void.EntityLifetime)",
    },
    { points: 225, text: "Increases Void Mana profit by 20% (multiplier)", stat: "Void.ProfitPerPoint", op: "mul", value: "1.20", source: VERIFIED },
    {
      points: 250,
      text: "Increases Void Mana per Entity by log10(Void Entity spawnrate) × 250%",
      stat: "Void.ManaPerEntity",
      op: "mul",
      value: "1 + 2.5 * log10(Void.EntitySpawnRate)",
    },
  ],
  Spellcraft: [
    { points: 25, text: "Increases incantation efficiency by 15%", stat: "Spell.IncantationEfficiency", op: "mul", value: "1.15" },
    { points: 50, text: "Increases summoning efficiency by 25%", stat: "Spell.SummoningEfficiency", op: "mul", value: "1.25" },
    { points: 75, text: "Increases incantation efficiency by 20%", stat: "Spell.IncantationEfficiency", op: "mul", value: "1.20" },
    { points: 100, text: "Increases summoning efficiency by 20%", stat: "Spell.SummoningEfficiency", op: "mul", value: "1.20" },
    { points: 125, text: "Increases incantation efficiency by 25%", stat: "Spell.IncantationEfficiency", op: "mul", value: "1.25" },
    { points: 150, text: "Increases profits by 50% × log10(Spells cast this Exile + 1)", stat: "Prod.Global", op: "mul", value: `1 + 0.5 * ${log10p1("Spell.CastsThisExile")}` },
    { points: 175, text: "Increases summoning efficiency by 30%", stat: "Spell.SummoningEfficiency", op: "mul", value: "1.30" },
    {
      points: 200,
      text: "Increases evocation efficiency by 150% × log10(Accumulated and Persistent spells cast this Exile + 1)",
      stat: "Spell.EvocationEfficiency",
      op: "mul",
      value: `1 + 1.5 * ${log10p1("Spell.AccumulatedCastsThisExile")}`,
    },
    { points: 225, text: "Increases incantation efficiency by 25%", stat: "Spell.IncantationEfficiency", op: "mul", value: "1.25" },
    {
      points: 250,
      text: "Increases profits by 100% × log10(Spells cast this Exile + 1)^1.05",
      stat: "Prod.Global",
      op: "mul",
      value: `1 + ${log10p1("Spell.CastsThisExile")} ^ 1.05`,
    },
  ],
  Wisdom: [
    { points: 25, text: "Reduces Spell costs by 10%", stat: "Spell.CostReduction", op: "add", value: "0.10" },
    { points: 50, text: "Increases Spell Shards earned per click by 10%", stat: "Shards.PerClick", op: "mul", value: "1.10" },
    { points: 75, text: "Increases Shard Pool efficiency by 10%", stat: "Shards.PoolEfficiency", op: "mul", value: "1.10" },
    { points: 100, text: "Reduces Spell costs by 10%", stat: "Spell.CostReduction", op: "add", value: "0.10" },
    { points: 125, text: "Increases Shard Pool efficiency by 10%", stat: "Shards.PoolEfficiency", op: "mul", value: "1.10" },
    {
      points: 150,
      text: "Increases profits by 150% × log10(Spell Shards collected this Exile + 1)^1.2",
      stat: "Prod.Global",
      op: "mul",
      value: `1 + 1.5 * ${log10p1("Shards.CollectedThisExile")} ^ 1.2`,
    },
    { points: 175, text: "Increases Spell Shards earned per click by 100%", stat: "Shards.PerClick", op: "mul", value: "2" },
    {
      points: 200,
      text: "Increases incantation efficiency by 15% × log10(Evocation Spells cast this Exile + 1)^1.25",
      stat: "Spell.IncantationEfficiency",
      op: "mul",
      value: `1 + 0.15 * ${log10p1("Spell.EvocationCastsThisExile")} ^ 1.25`,
    },
    { points: 225, text: "Reduces Spell costs by 10%", stat: "Spell.CostReduction", op: "add", value: "0.10" },
    {
      points: 250,
      text: "Increases profits by 125% × log10(Passive Spell Shards generation + 1)^1.25",
      stat: "Prod.Global",
      op: "mul",
      value: `1 + 1.25 * ${log10p1("Shards.PassiveGeneration")} ^ 1.25`,
    },
  ],
  Dominance: [
    { points: 25, text: "Increases critical profit by 100%", stat: "Click.CritProfit", op: "mul", value: "2", source: { ...VERIFIED, note: "Basic Mechanics: Dominance multiplies critical profit." } },
    { points: 50, text: "Increases critical chance by 5", stat: "Click.CritChance", op: "add", value: "5", source: VERIFIED },
    { points: 75, text: "Increases critical profit by 200%", stat: "Click.CritProfit", op: "mul", value: "3", source: { ...VERIFIED, note: "Basic Mechanics: Dominance multiplies critical profit." } },
    { points: 100, text: "Increases critical chance by 5", stat: "Click.CritChance", op: "add", value: "5", source: VERIFIED },
    { points: 125, text: "Increases critical rating by 500", stat: "Click.CritRating", op: "add", value: "500", source: VERIFIED },
    { points: 150, text: "Increases profits by 40% × log10(Autoclicks this Exile + 1)", stat: "Prod.Global", op: "mul", value: `1 + 0.4 * ${log10p1("Click.AutoclicksThisExile")}` },
    { points: 175, text: "Increases critical profit by 300%", stat: "Click.CritProfit", op: "mul", value: "4", source: { ...VERIFIED, note: "Basic Mechanics: Dominance multiplies critical profit." } },
    {
      points: 200,
      text: "Increases autoclick profits by 78% × log10(Autoclicks this Exile + 1)",
      stat: "Click.AutoclickProfit",
      op: "mul",
      value: `1 + 0.78 * ${log10p1("Click.AutoclicksThisExile")}`,
    },
    { points: 225, text: "Increases critical profit by 300%", stat: "Click.CritProfit", op: "mul", value: "4", source: { ...VERIFIED, note: "Basic Mechanics: Dominance multiplies critical profit." } },
    {
      points: 250,
      text: "Increases profits by 80% × log10(Autoclicks this Exile + 1)^1.1",
      stat: "Prod.Global",
      op: "mul",
      value: `1 + 0.8 * ${log10p1("Click.AutoclicksThisExile")} ^ 1.1`,
    },
  ],
  Patience: [
    { points: 75, text: "Grants 1 autoclick per second", stat: "Click.AutoclicksPerSecond", op: "add", value: "1", source: VERIFIED },
    {
      points: 125,
      text: "Reduces charging Spells' cost by 10%",
      stat: "Spell.ChargingCostReduction",
      op: "add",
      value: "0.10",
      source: { url: PAGE, verified: false, note: "Assumed to add up with the items' charging cost reductions (the Stance page says those are additive)." },
    },
    { points: 150, text: "Increases profits by 0.017% × total amount of sources", stat: "Prod.Global", op: "mul", value: "1 + 0.00017 * Misc.SourcesOwned" },
    {
      points: 175,
      text: "Reduces charging Spells' cost by 15%",
      stat: "Spell.ChargingCostReduction",
      op: "add",
      value: "0.15",
      source: { url: PAGE, verified: false, note: "Assumed to add up with the items' charging cost reductions (the Stance page says those are additive)." },
    },
    {
      points: 200,
      text: "Increases idle bonus by 100% × log1.6(Idle time this Exile, in seconds × 0.00025 + 1)",
      stat: "Idle.Bonus",
      op: "mul",
      value: "1 + log(1.6, Idle.TimeThisExile * 0.00025 + 1)",
    },
    { points: 250, text: "Increases profits by 0.0289% × total amount of sources", stat: "Prod.Global", op: "mul", value: "1 + 0.000289 * Misc.SourcesOwned" },
  ],
  Mastery: [
    { points: 25, text: "Increases character ability power growth rate by 25%", stat: "Hero.AbilityPowerGrowth", op: "mul", value: "1.25" },
    { points: 50, text: "Increases character experience gained from actions by 50%", stat: "Char.ExperienceFromActions", op: "mul", value: "1.5" },
    { points: 75, text: "Increases character experience from sources by 15%", stat: "Char.ExperienceFromSources", op: "mul", value: "1.15" },
    { points: 100, text: "Increases character ability power growth rate by 50%", stat: "Hero.AbilityPowerGrowth", op: "mul", value: "1.5" },
    { points: 125, text: "Reduces Level requirements by 1", stat: "Char.LevelRequirementReduction", op: "add", value: "1", source: LEVEL_REDUCTION },
    { points: 150, text: "Increases profits by 1.5% × character level", stat: "Prod.Global", op: "mul", value: "1 + 0.015 * Char.Level" },
    { points: 175, text: "Increases character experience from sources by 25%", stat: "Char.ExperienceFromSources", op: "mul", value: "1.25" },
    { points: 200, text: "Increases character ability power by 0.075% × achievement points", stat: "Hero.AbilityPower", op: "mul", value: "1 + 0.00075 * Misc.AchievementPoints" },
    { points: 225, text: "Increases character experience from sources by 25%", stat: "Char.ExperienceFromSources", op: "mul", value: "1.25" },
    { points: 250, text: "Increases profits by 3% × character level", stat: "Prod.Global", op: "mul", value: "1 + 0.03 * Char.Level" },
  ],
  Empathy: [
    { points: 25, text: "Increases pet experience gained by 100 (additively)", stat: "Pet.ExperienceFlat", op: "add", value: "100", source: VERIFIED },
    { points: 50, text: "Increases pet experience gained by 30%", stat: "Pet.ExperienceGain", op: "mul", value: "1.3" },
    { points: 75, text: "Increases pet ability charging speed by 5%", stat: "Pet.ChargeSpeed", op: "mul", value: "1.05" },
    { points: 100, text: "Increases pet experience gained by 30%", stat: "Pet.ExperienceGain", op: "mul", value: "1.3" },
    { points: 125, text: "Increases pet ability charging speed by 10%", stat: "Pet.ChargeSpeed", op: "mul", value: "1.10" },
    { points: 150, text: "Increases profits by 1.25% × pet level", stat: "Prod.Global", op: "mul", value: "1 + 0.0125 * Pet.Level" },
    { points: 175, text: "Increases pet experience gained by 30%", stat: "Pet.ExperienceGain", op: "mul", value: "1.3" },
    {
      points: 200,
      text: "Increases pet ability power by 100% × log1.6(current pet time × 0.0005 + 1)",
      stat: "Pet.AbilityPower",
      op: "mul",
      value: "1 + log(1.6, Pet.TimeCurrent * 0.0005 + 1)",
    },
    { points: 225, text: "Increases pet ability charging speed by 15%", stat: "Pet.ChargeSpeed", op: "mul", value: "1.15" },
    { points: 250, text: "Increases profits by 2.5% × pet level", stat: "Prod.Global", op: "mul", value: "1 + 0.025 * Pet.Level" },
  ],
};

export interface UnmodelledPerk extends UnmodelledClause {
  attribute: Attribute;
  points: number;
}

export const UNMODELLED_PERKS: readonly UnmodelledPerk[] = [
  { attribute: "Insight", points: 100, text: "Collecting a Void Entity makes the next one appear 2 seconds sooner", reason: "not-production", note: "Changes Void mana collection before the burst, which is an input." },
  { attribute: "Insight", points: 125, text: "Reduces Void Mana degeneration by 50%", reason: "not-production", note: "Changes Void mana collection before the burst, which is an input." },
  { attribute: "Patience", points: 25, text: "Reduces time without clicks before Idle mode activates by 5 sec", reason: "not-production" },
  { attribute: "Patience", points: 50, text: "First 3 clicks while in Idle mode don't reset Idle mode", reason: "not-production" },
  { attribute: "Patience", points: 100, text: "Ability to click without resetting Idle mode now replenishes once every minute", reason: "not-production" },
  { attribute: "Patience", points: 225, text: "Increases green catalysts power by 25% (additive)", reason: "mechanic", note: "Catalysts are not modelled." },
];

function perkValue(a: Attribute, perk: Perk): Expr {
  const reached = `ge(${attributeEffective(a)}, ${perk.points})`;
  return perk.op === "mul" ? f(`if(${reached}, ${perk.value}, 1)`) : f(`${reached} * (${perk.value})`);
}

const perkEffects: Effect[] = ATTRIBUTES.flatMap((a) =>
  (PERKS[a] ?? []).map((perk) => {
    const source = perk.source ?? PERCENT_PERK;
    return {
      stat: perk.stat,
      op: perk.op,
      value: perkValue(a, perk),
      label: `${a} ${perk.points}: ${perk.text}`,
      source: { ...source, note: [source.note, `Thresholds include item attribute bonuses (${THRESHOLD_NOTE}).`].filter(Boolean).join(" ") },
    } satisfies Effect;
  }),
);

export const ATTRIBUTE_EFFECTS: readonly Effect[] = [...perPointEffects, ...perkEffects];

export const ATTRIBUTE_PERKS = PERKS;
