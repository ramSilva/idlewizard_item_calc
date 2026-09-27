import { f } from "../engine/expr.ts";
import type { Attribute, ClassDef, DefaultValue, Effect, Source, StanceDef } from "../engine/model.ts";
import { derivedStat } from "../engine/stats.ts";
import { attributePoints } from "./attributes.ts";
import { spellStat, spellById } from "./spells.ts";
import { buildingCount, buildingShare } from "./stats.ts";

const wiki = (page: string): string => `https://idlewizard.wiki.gg/wiki/${page}`;
const ONI_PAGE: Source = { url: wiki("Oni"), verified: true };
const SHAMAN_PAGE: Source = { url: wiki("Shaman"), verified: true };
const TEMPORALIST_PAGE: Source = { url: wiki("Temporalist"), verified: true };
const STANCE_PAGE: Source = { url: wiki("Stance"), verified: true };
const ONI_GUIDE = wiki("Oni_Guide");
const SHAMAN_GUIDE = wiki("Shaman_Guide");
const TEMPORALIST_GUIDE = wiki("Temporalist_Guide_(e550%2B)");

const BINDINGS = {
  C: "Hero.AbilityPower",
  G: "Hero.AbilityPowerGrowth",
  L: "Char.Level",
  PetL: "Pet.Level",
  PetT: "Pet.TimeCurrent",
  I: f("Spell.IncantationCastsThisExile + 1"),
  S: "Time.SkippedYears",
  X: "Char.ExperienceTotal",
};

function effect(stat: string, formula: string, label: string, source: Source): Effect {
  return { stat, op: "mul", value: f(formula, BINDINGS), label, source };
}

const fromGuide = (url: string, value: number, note?: string): DefaultValue => ({ value, source: note ? { url, verified: true, note } : { url, verified: true } });
const inferred = (url: string, value: number, note: string): DefaultValue => ({ value, source: { url, verified: false, note } });
const placeholder = (value: number, note: string, url = "https://idlewizard.wiki.gg/wiki/Basic_Mechanics"): DefaultValue => ({
  value,
  source: { url, verified: false, note: `Placeholder magnitude, not stated by a guide: ${note}` },
});

function attributeDefaults(url: string, points: Partial<Record<Attribute, number>>): Record<string, DefaultValue> {
  return Object.fromEntries(Object.entries(points).map(([a, v]) => [attributePoints(a as Attribute), fromGuide(url, v)]));
}

const castsOf = (id: number): string => spellStat(spellById(id), "CastsThisExile");
const chargesOf = (id: number): string => spellStat(spellById(id), "Charges");
const snappedOf = (id: number, stat: string): string => spellStat(spellById(id), `Snapped${stat}`);

/** Numbers above ~1e308 don't fit an input's default; the Mysteries count only shifts every set's score equally at this size. */
const LATE_MYSTERIES = placeholder(1e300, "e550+ Mysteries (the guides' range) exceed a number input's range; any huge value ranks sets the same.");

const ONI_STANCES: StanceDef[] = [
  {
    id: "meditation",
    name: "Meditation",
    effects: [],
    unmodelled: [
      {
        text: "Charges shardless spells each second by log10(1 + (I+1)·G·C·L²) × 1% + 6%",
        note: "Charging over the run isn't modelled; charges and casts are inputs.",
      },
    ],
    source: STANCE_PAGE,
  },
  {
    id: "defense",
    name: "Defense",
    effects: [effect("Spell.IncantationDurationDivisor", "log10(1 + (I + 1) * G * C * L ^ 2) + 1", "Defense Stance", ONI_PAGE)],
    unmodelled: [{ text: "Makes Furious Strike instant", note: "Cast timing isn't modelled." }],
    source: ONI_PAGE,
  },
  {
    id: "berserk",
    name: "Berserk",
    effects: [effect("Spell.EvocationEfficiency", "(I + 1) * C ^ 0.5 * L * G / 10000 + 1", "Berserk Stance", ONI_PAGE)],
    unmodelled: [],
    source: ONI_PAGE,
  },
];

export const ONI: ClassDef = {
  id: "oni",
  name: "Oni",
  effects: [
    effect("Pet.AbilityPower", "(PetT * G / 3600 + 1) ^ 0.5 * PetL ^ 0.8 * C ^ 0.5 * L / 4000000000 + 1", "Oni hero ability (pet ability power)", ONI_PAGE),
    effect("Spell.IncantationEfficiency", "((I + 1) * L * G ^ 0.5 / 100) ^ 0.65 / 250000 + 1", "Oni hero ability (Incantation efficiency)", ONI_PAGE),
  ],
  stances: ONI_STANCES,
  stats: [],
  augments: [],
  pairedPets: ["living-sin", "hungerer", "interrogator", "archivist", "ley-keeper", "ent", "pixie", "voidterror", "greater-chimaera", "simulacrum", "geode", "pit-lord"],
  defaultSpells: [60, 6, 88, 89, 107, 86],
  defaultPet: "living-sin",
  defaultStance: "berserk",
  defaultSnapped: [],
  defaultScore: "oni-burst",
  defaults: {
    ...attributeDefaults(ONI_GUIDE, { Intelligence: 200, Insight: 60, Spellcraft: 125, Patience: 50, Mastery: 200, Empathy: 125 }),
    [buildingShare(6)]: fromGuide(ONI_GUIDE, 1, "The burst buys Hellholes (Circles of Power) and Anointed Ashes boosts them; assumed to hold all production."),
    "Items.LegionReward": fromGuide(ONI_GUIDE, 1, 'Burst tabs like "Living Sin 17+5" add 5 bonus levels: Resonator Ring +4 and The Legion +1.'),
    [chargesOf(86)]: fromGuide(ONI_GUIDE, 1e9, "Stack Furious Strike charges before the burst; they cap at 1e9."),
    "Pet.Level": inferred(ONI_GUIDE, 600, "Commissar's Torn Sleeve gives 2 perks (50–74 attribute points, 0.08 per pet level) in the guide's late burst."),
    "Pet.MaxLevelThisExile": inferred(wiki("Living_Sin"), 1000, "Living Sin unlocks at highest pet level 1000 this Exile; Interrogator box levelling raises it for Possessed Blade."),
    "Pet.TimeCurrent": placeholder(86400, "one day with the burst pet.", ONI_GUIDE),
    "Pet.ExperienceTotal": placeholder(1e20, "total Living Sin/Hungerer experience.", ONI_GUIDE),
    "Char.Level": placeholder(1000, "character level at the guide's burst.", ONI_GUIDE),
    "Hero.AbilityPower": placeholder(1e6, "CAP before items and attributes.", ONI_GUIDE),
    "Hero.AbilityPowerGrowth": placeholder(10, "CAP growth rate.", ONI_GUIDE),
    "Spell.IncantationCastsThisExile": placeholder(1e8, "incantations stacked with Berzerker in the buildup phase.", ONI_GUIDE),
    [castsOf(60)]: placeholder(1e7, "Ritual Of Power casts stacked in buildup.", ONI_GUIDE),
    [castsOf(88)]: placeholder(1e7, "Iron Blood casts stacked in buildup.", ONI_GUIDE),
    [castsOf(89)]: placeholder(1e7, "Enhanced Strength casts stacked in buildup.", ONI_GUIDE),
    "Spell.EvocationEfficiency": placeholder(1e3, "Evocation efficiency from upgrades and other unmodelled sources.", ONI_GUIDE),
    "Spell.IncantationEfficiency": placeholder(1e3, "Incantation efficiency from upgrades and other unmodelled sources.", ONI_GUIDE),
    [buildingCount(6)]: placeholder(1e4, "Hellholes owned at the burst.", ONI_GUIDE),
    "Weapon.CataclysmCharges": placeholder(1e5, "Cataclysm charges (temporary Hellholes) from the charging phase.", wiki("Cataclysm")),
    "Mysteries.Count": LATE_MYSTERIES,
    "Void.Mana": placeholder(1e10, "Void mana collected with Voidterror before the burst.", ONI_GUIDE),
    "Idle.Bonus": placeholder(100, "idle bonus before items and attributes.", ONI_GUIDE),
    "Expeditions.Level": placeholder(50, "expedition level (Anima Core is in the burst presets).", wiki("Expeditions")),
  },
  mainBuilding: 6,
  buildingNames: { 3: "Monuments", 4: "Grim Trophies", 6: "Hellholes" },
  unmodelled: [],
  source: ONI_PAGE,
};

const SHAMAN_TIME = "if(lt(1 + Char.ClassTimeHours * G, 720), Char.ClassTimeHours * G, 719 + max(Char.ClassTimeHours * G - 719, 0) ^ 0.9)";
const SHAMAN_AUTOCLICKS = "if(lt(Click.AutoclicksThisExile, 70000000), Click.AutoclicksThisExile, (Click.AutoclicksThisExile - 70000000) ^ 0.75 + 70000000)";

export const SHAMAN: ClassDef = {
  id: "shaman",
  name: "Shaman",
  effects: [
    effect("Idle.Bonus", `((${SHAMAN_TIME}) + 1) ^ 2 / 1000 * C ^ 0.3 * L ^ 1.6 + L + 1`, "Shaman hero ability (Idle bonus)", SHAMAN_PAGE),
    effect(
      "Spell.SummoningEfficiency",
      `(1 + (${SHAMAN_AUTOCLICKS}) * G ^ 0.25 / 10000) ^ 0.85 * C ^ 0.155 * L ^ 0.31 / 400 + 1`,
      "Shaman hero ability (Summoning efficiency)",
      SHAMAN_PAGE,
    ),
    effect("Idle.Bonus", "10 * Click.SpellAutoclicksPerSecond ^ 0.5 + 1", "Shaman Idle bar bonus", {
      ...SHAMAN_PAGE,
      verified: false,
      note: '"Autoclicks currently performed" is read as the autoclicks per second of the selected summons and the pet.',
    }),
  ],
  stances: [],
  stats: [],
  augments: [],
  pairedPets: ["herald-of-rot", "risen-giant", "ley-keeper", "voidterror", "ent", "pixie"],
  defaultSpells: [18, 92, 105, 16, 23, 7],
  defaultPet: "herald-of-rot",
  defaultSnapped: [],
  defaultScore: "shaman-burst",
  defaults: {
    ...attributeDefaults(SHAMAN_GUIDE, { Intelligence: 150, Insight: 90, Spellcraft: 175, Wisdom: 0, Dominance: 75, Patience: 200, Mastery: 100, Empathy: 175 }),
    [buildingShare(2)]: {
      value: 1,
      source: {
        url: SHAMAN_GUIDE,
        verified: false,
        note: "Assumed: the burst casts Dreaded Script Of Harvest (Forbidden Tomes profit) and uses Warbanner Fragment (Grimoire profit).",
      },
    },
    "Items.LegionReward": fromGuide(SHAMAN_GUIDE, 1, 'Burst tabs like "Enchant 20+5" add 5 bonus levels: Resonator Ring +4 and The Legion +1.'),
    [buildingCount(4)]: inferred(SHAMAN_GUIDE, 20000, "The summon table lists about 80 Summon Evergrowing Forest clicks (Trees of Life × 0.004)."),
    "Weapon.BranchCharges": fromGuide(wiki("Branch_of_the_Great_Cycle"), 2e6, "Charged to its maximum in the Branch Charging phase."),
    "Pet.TimeCurrent": fromGuide(SHAMAN_GUIDE, 200 * 86400, "Long exiles reach Herald of Rot's 200-day game-time softcap."),
    "Pet.RealTime": fromGuide(SHAMAN_GUIDE, 14 * 86400, "Herald of Rot's first softcap is at 14 days of pet real time."),
    "Char.ClassTimeHours": inferred(SHAMAN_GUIDE, 86, "Long exiles: about 80 hours of pet time stacking plus buildup."),
    "Click.AutoclicksThisExile": placeholder(1e12, "autoclicks this Exile (the class ability softcaps at 7e7; the guide mentions 1e12 for a realm).", SHAMAN_GUIDE),
    "Pet.Level": placeholder(300, "Herald of Rot level at the burst.", SHAMAN_GUIDE),
    "Char.Level": placeholder(1000, "character level at the burst.", SHAMAN_GUIDE),
    "Hero.AbilityPower": placeholder(1e6, "CAP before items and attributes.", SHAMAN_GUIDE),
    "Hero.AbilityPowerGrowth": placeholder(10, "CAP growth rate.", SHAMAN_GUIDE),
    "Spell.SummoningEfficiency": {
      value: 3e19,
      source: {
        url: SHAMAN_GUIDE,
        verified: false,
        note: "Calibrated so the burst preset gives about 76 Summon Centipede Swarm clicks per second (log10(Summon) ≈ 30), as in the guide's summon table.",
      },
    },
    "Spell.IncantationEfficiency": placeholder(1e3, "Incantation efficiency from upgrades and other unmodelled sources.", SHAMAN_GUIDE),
    [castsOf(16)]: placeholder(1e5, "Summon Deepwood Stalker casts this Exile.", SHAMAN_GUIDE),
    "Click.CritChance": placeholder(10, "base crit chance in %.", SHAMAN_GUIDE),
    "Click.CritProfitBase": placeholder(200, "base crit profit in %.", SHAMAN_GUIDE),
    "Mysteries.Count": LATE_MYSTERIES,
    "Void.Mana": placeholder(1e10, "Void mana collected before the burst.", SHAMAN_GUIDE),
    "Idle.Bonus": placeholder(100, "idle bonus before items, attributes and the class ability.", SHAMAN_GUIDE),
    "Expeditions.Level": placeholder(50, "expedition level (Binding Sigil is in the burst presets).", wiki("Expeditions")),
    "Misc.CatalystShards": inferred(TEMPORALIST_GUIDE, 2e9, "Miniaturized Accelerator beats Lucky Amulet above ~1.6e8–3.2e10 catalysts (Temporalist guide); the Shaman burst uses it."),
  },
  mainBuilding: 2,
  buildingNames: { 2: "Forbidden Tomes", 4: "Trees of Life", 5: "Witching Cauldrons" },
  unmodelled: [],
  source: SHAMAN_PAGE,
};

const TEMPORALIST_TIME = "if(lt(Char.ClassTimeHours, 720), Char.ClassTimeHours, 720 + max(Char.ClassTimeHours - 719, 0) ^ 0.9)";

export const TEMPORALIST: ClassDef = {
  id: "temporalist",
  name: "Temporalist",
  effects: [
    effect("Prod.Global", `((${TEMPORALIST_TIME}) ^ 2.15 * (S * G / 16000) ^ 1.78 + 1) * (X / 10000000 + 1) * C ^ 0.5 * L / 10000000000 + 1`, "Temporalist hero ability (profits)", {
      ...TEMPORALIST_PAGE,
      verified: false,
      note: '"Character Time" is read as time played as this class this Exile.',
    }),
    effect("Spell.EvocationEfficiency", `((${TEMPORALIST_TIME}) ^ 0.5 / 40 * (S * G / 16000) ^ 1.15 + 1) * C ^ 0.5 * L / 5000000 + 1`, "Temporalist hero ability (Evocation efficiency)", {
      ...TEMPORALIST_PAGE,
      verified: false,
      note: '"Character Time" is read as time played as this class this Exile.',
    }),
  ],
  stances: [],
  stats: [
    derivedStat("Misc.LeyApexes", "Ley Apexes owned (Ley Temporal Singletons)", "Production", f(buildingCount(8)), {
      source: { ...TEMPORALIST_PAGE, note: "The Ley Temporal Singleton combines Prodigy's Ley Apex and Chronomancer's Temporal Anchor and replaces The Nexus." },
    }),
    derivedStat("Misc.TemporalAnchors", "Temporal Anchors owned (Ley Temporal Singletons)", "Production", f(buildingCount(8)), {
      source: { ...TEMPORALIST_PAGE, note: "The Ley Temporal Singleton combines Prodigy's Ley Apex and Chronomancer's Temporal Anchor and replaces The Nexus." },
    }),
  ],
  augments: [93],
  pairedPets: ["mechanos-apexis", "risen-giant", "greater-chimaera", "pixie", "simulacrum", "arcanaworg", "ley-keeper"],
  defaultSpells: [73, 57, 61, 17, 69, 4],
  defaultPet: "mechanos-apexis",
  defaultSnapped: [69, 4],
  defaultScore: "temporalist-burst",
  defaults: {
    ...attributeDefaults(TEMPORALIST_GUIDE, { Intelligence: 155, Insight: 140, Spellcraft: 250, Wisdom: 200, Dominance: 0, Patience: 150, Mastery: 250, Empathy: 175 }),
    [buildingShare(8)]: {
      value: 1,
      source: {
        url: TEMPORALIST_PAGE.url,
        verified: false,
        note: "Assumed: Ley Temporal Singletons (The Nexus's replacement) hold the production; the guide's burst also carries Mana Gems profit items, so this may be wrong.",
      },
    },
    "Items.LegionReward": fromGuide(TEMPORALIST_GUIDE, 1, 'Burst tabs like "Enchant 15+5" add 5 bonus levels: Resonator Ring +4 and The Legion +1.'),
    [snappedOf(69, "MaxDistortion")]: fromGuide(TEMPORALIST_GUIDE, 30, "The snap phase waits for 30x Time Distortion before casting Stabilize The Flow."),
    [snappedOf(69, "IncantationEfficiency")]: placeholder(1e30, "Incantation efficiency of the snap set.", TEMPORALIST_GUIDE),
    [snappedOf(4, "IncantationEfficiency")]: placeholder(1e30, "Incantation efficiency of the snap set.", TEMPORALIST_GUIDE),
    "Pet.RealTime": inferred(TEMPORALIST_GUIDE, 3 * 86400, "Mechanos Apexis's Kelphior's Black Beam cast rate maxes after 24 hours; long exiles."),
    "Char.ClassTimeHours": inferred(TEMPORALIST_GUIDE, 72, "Long exiles (the class scales with time); three days assumed."),
    "Time.SkippedYears": placeholder(1e6, "skipped time; Mechanos Apexis unlocks at 1e12 skipped time (about 3e4 years if in seconds).", wiki("Mechanos_Apexis")),
    "Char.ExperienceTotal": placeholder(1e12, "total character experience.", TEMPORALIST_GUIDE),
    "Char.Level": placeholder(2000, "character level at the burst.", TEMPORALIST_GUIDE),
    "Pet.Level": placeholder(300, "Mechanos Apexis level at the burst.", TEMPORALIST_GUIDE),
    "Hero.AbilityPower": placeholder(1e6, "CAP before items and attributes.", TEMPORALIST_GUIDE),
    "Hero.AbilityPowerGrowth": placeholder(10, "CAP growth rate.", TEMPORALIST_GUIDE),
    [buildingCount(8)]: placeholder(5000, "Ley Temporal Singletons owned (sources are maxed at the start).", TEMPORALIST_GUIDE),
    [castsOf(93)]: placeholder(1e6, "Quasi-incantation casts this Exile (the guide's main time scaling).", TEMPORALIST_GUIDE),
    [castsOf(57)]: placeholder(1e6, "Ley Overdrive casts this Exile.", TEMPORALIST_GUIDE),
    [castsOf(61)]: placeholder(1e7, "True Sorcery casts this Exile.", TEMPORALIST_GUIDE),
    [castsOf(17)]: placeholder(1e4, "Superposition casts this Exile (the guide barely stacks it).", TEMPORALIST_GUIDE),
    "Spell.EvocationEfficiency": placeholder(1e3, "Evocation efficiency from upgrades and other unmodelled sources.", TEMPORALIST_GUIDE),
    "Spell.IncantationEfficiency": placeholder(1e3, "Incantation efficiency from upgrades and other unmodelled sources.", TEMPORALIST_GUIDE),
    "Misc.CatalystShards": inferred(TEMPORALIST_GUIDE, 2e9, "Miniaturized Accelerator beats Lucky Amulet above ~1.6e8–3.2e10 catalysts; the 15+5 burst uses it."),
    "Spell.CastsThisExile": placeholder(1e8, "spells cast this Exile (Murmuring Spellbook is in the burst presets).", TEMPORALIST_GUIDE),
    "Mysteries.Count": LATE_MYSTERIES,
    "Void.Mana": placeholder(1e10, "Void mana collected with Void Radiance before the burst.", TEMPORALIST_GUIDE),
    "Idle.Bonus": placeholder(100, "idle bonus before items and attributes.", TEMPORALIST_GUIDE),
    "Expeditions.Level": placeholder(50, "expedition level (Anima Core is in the burst presets).", wiki("Expeditions")),
  },
  mainBuilding: 8,
  buildingNames: { 8: "Ley Temporal Singletons" },
  unmodelled: [
    { text: "Compressed Time (maximum L × 7.5)", note: "Compressed Time isn't modelled." },
    { text: "Time Distortion speeds up game time (not spell durations, Mechanos Apexis or weapon charging)", note: "Time over the run isn't modelled; times are inputs." },
  ],
  source: TEMPORALIST_PAGE,
};

const CHRONOMANCER_PAGE: Source = { url: wiki("Chronomancer"), verified: true };
const CHRONOMANCER_GUIDE = "https://idle-wizard.fandom.com/wiki/Chronomancer_Guide_Updated";
const chronomancerSection = (heading: string): string => `${CHRONOMANCER_GUIDE}#${heading.replace(/ /g, "_")}`;
const CHRONO_ATTRIBUTES = chronomancerSection("Attributes");
const CHRONO_LEVELS = chronomancerSection("Phase 1: Build up Levels");
const CHRONO_STACKING = chronomancerSection("Phase 2: Build up Superposition and Ritual of Power");
const CHRONO_PREBURST = chronomancerSection("Phase 3: PreBurst");
const CHRONO_BURST = chronomancerSection("Phase 4: Bursting");
const HOURS_PER_YEAR = 365 * 24;

export const CHRONOMANCER: ClassDef = {
  id: "chronomancer",
  name: "Chronomancer",
  effects: [
    effect("Prod.Global", `L ^ 2 * C * ((Char.ClassTimeHours + S * ${HOURS_PER_YEAR}) * G) ^ 0.64 * 0.25 + 1`, "Chronomancer hero ability (Sources profit)", {
      ...CHRONOMANCER_PAGE,
      verified: false,
      note: 'The page gives no units for T and S; both are taken in hours, and "Character Play Time" is read as time played as this class this Exile.',
    }),
  ],
  stances: [],
  stats: [
    derivedStat("Misc.TemporalAnchors", "Temporal Anchors owned", "Production", f(buildingCount(8)), {
      source: { ...CHRONOMANCER_PAGE, note: "Temporal Anchor is Chronomancer's unique source and replaces The Nexus." },
    }),
  ],
  augments: [101],
  pairedPets: ["risen-giant", "archivist", "pixie", "geode", "simulacrum", "zombie"],
  defaultSpells: [65, 17, 73, 60, 4, 69],
  defaultPet: "risen-giant",
  defaultSnapped: [69],
  defaultScore: "chronomancer-burst",
  defaults: {
    ...attributeDefaults(CHRONO_ATTRIBUTES, { Intelligence: 25, Insight: 25, Wisdom: 25, Patience: 40, Mastery: 25 }),
    ...Object.fromEntries(
      (["Spellcraft", "Dominance", "Empathy"] as const).map((a) => [attributePoints(a), inferred(CHRONO_ATTRIBUTES, 0, "Not listed in the guide's attribute points.")]),
    ),
    [buildingShare(8)]: {
      value: 1,
      source: { url: CHRONOMANCER_PAGE.url, verified: false, note: "Assumed: Temporal Anchors (The Nexus's replacement) hold the production; the burst also casts Gem Resonance (Mana Gems)." },
    },
    [snappedOf(69, "MaxDistortion")]: inferred(
      CHRONO_PREBURST,
      10,
      "The pre-burst casts Temporal Distortion until Stabilize The Flow is cast; 10x is the class page's base maximum (items and an upgrade raise it to 30x).",
    ),
    [snappedOf(69, "IncantationEfficiency")]: placeholder(1e3, "Incantation efficiency of the pre-burst set that casts Stabilize The Flow.", CHRONO_PREBURST),
    "Char.ClassTimeHours": inferred(CHRONOMANCER_GUIDE, 10, "The guide gives a run duration of 10 minutes to 10 hours; the upper end is used."),
    "Mysteries.Count": inferred(CHRONOMANCER_GUIDE, 1e150, "The guide covers e90–e220+ Mysteries."),
    "Time.SkippedYears": placeholder(1, "time skipped with Wormhole in phases 1 and 2.", CHRONO_STACKING),
    "Pet.TimeCurrent": inferred(
      CHRONO_STACKING,
      HOURS_PER_YEAR * 3600,
      "Risen Giant scales with the pet game time gained from Wormhole, so its pet time matches the skipped-time default.",
    ),
    [castsOf(17)]: placeholder(1e5, "Superposition casts stacked in phase 2.", CHRONO_STACKING),
    [castsOf(60)]: placeholder(1e5, "Ritual Of Power casts stacked in phase 2.", CHRONO_STACKING),
    [castsOf(101)]: placeholder(100, "Time Helix casts from phase 2's second spell set.", CHRONO_STACKING),
    "Spell.CastsThisExile": placeholder(1e7, "spells cast this Exile (phases 1 and 2 cast recklessly).", CHRONO_STACKING),
    "Char.Level": placeholder(1000, "character level after the level buildup.", CHRONO_LEVELS),
    "Pet.Level": placeholder(300, "Risen Giant level at the burst.", CHRONO_BURST),
    "Hero.AbilityPower": placeholder(1e6, "CAP before items and attributes.", CHRONO_BURST),
    "Hero.AbilityPowerGrowth": placeholder(10, "CAP growth rate.", CHRONO_BURST),
    [buildingCount(8)]: placeholder(3000, "Temporal Anchors owned (unlocking the class takes 1500 of The Nexus).", CHRONOMANCER_PAGE.url),
    "Spell.EvocationEfficiency": placeholder(1e3, "Evocation efficiency from upgrades and other unmodelled sources.", CHRONO_BURST),
    "Spell.IncantationEfficiency": placeholder(1e3, "Incantation efficiency from upgrades and other unmodelled sources.", CHRONO_BURST),
    "Void.Mana": placeholder(1e10, "Void mana gathered with Void Radiance in the pre-burst.", CHRONO_PREBURST),
    "Idle.Bonus": placeholder(100, "idle bonus before items and attributes (the guide's Patience note relies on Risen Giant's idle scaling).", CHRONO_ATTRIBUTES),
    "Expeditions.Level": placeholder(50, "expedition level.", wiki("Expeditions")),
  },
  mainBuilding: 8,
  buildingNames: { 8: "Temporal Anchors" },
  unmodelled: [
    { text: "Compressed Time (maximum L × 5)", note: "Compressed Time isn't modelled." },
    { text: "Time Distortion speeds up game time (not spell durations or weapon charging)", note: "Time over the run isn't modelled; times are inputs." },
  ],
  source: CHRONOMANCER_PAGE,
};

export const CLASSES: readonly ClassDef[] = [ONI, SHAMAN, TEMPORALIST, CHRONOMANCER];

export function classById(id: string): ClassDef {
  const c = CLASSES.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown class ${id}`);
  return c;
}
