import { f, type Expr } from "../engine/expr.ts";
import type { AutoclickSource, Effect, Source, SpellBehaviour, SpellDef, StatDef, UnmodelledPart } from "../engine/model.ts";
import { inputStat } from "../engine/stats.ts";
import { SPELL_SOURCE, spellById, spellStat } from "./spells.ts";
import { buildingCount, buildingProfit } from "./stats.ts";

const unverified = (note: string): Source => ({ ...SPELL_SOURCE, verified: false, note });

const BINDINGS = {
  E: "Spell.EvocationEfficiency",
  I: "Spell.IncantationEfficiency",
  S: "Spell.SummoningEfficiency",
  M: "Prod.Total",
  L: "Char.Level",
  A: "Click.AutoclicksThisExile",
  K: "Spell.AutoclicksFromSpells",
  AP: "Click.AutoclickProfit",
  CP: "Click.ManaPerClick",
  CRIT: "Click.CritFactor",
};

const SECONDS_PER_YEAR = 365 * 86400;

const CAST_COUNT_HINT = "The count the game shows: casts made while The Rubedo Engine (accumulated and persistent spells) or Ritual Disk (augments) was worn already count twice.";
// Read as doubling at cast time: the guides wear Ritual Disk and Rubedo while stacking casts but burst with whichever
// enchant is stronger (Oni: Disk, Temporalist: Rubedo), the Temporalist guide values Ritual Disk only for its snap-set
// enchant, and Rubedo's page says it doesn't affect external casts.
const CAST_COUNT_SOURCE: Source = {
  ...SPELL_SOURCE,
  verified: false,
  note: "The Rubedo Engine and Ritual Disk are read as doubling casts when they are made, so they don't change a burst's cast counts.",
};

type Crit = "character" | "none" | { chance: number; profit: number };

/** Expected-value factor of a click's criticals; fixed stats are the spell's own chance and profit in %. */
function critExpr(crit: Crit): string {
  if (crit === "character") return "CRIT";
  if (crit === "none") return "1";
  const c = crit.chance / 100;
  return String(1 - c + (c * crit.profit) / 100);
}

class SpellBuilder {
  readonly effects: Effect[] = [];
  readonly stats: StatDef[] = [];
  readonly unmodelled: UnmodelledPart[] = [];
  mana?: SpellBehaviour["mana"];
  autoclicks?: AutoclickSource;
  voidManaPerSecond?: Expr;
  snap?: Record<string, string>;
  private readonly local: Record<string, string> = {};

  constructor(readonly spell: SpellDef) {}

  f(source: string): Expr {
    return f(source, { ...BINDINGS, ...this.local });
  }

  /** The spell's cast count this Exile as the game shows it (The Rubedo Engine and Ritual Disk double casts made while worn). */
  casts(): this {
    const id = spellStat(this.spell, "CastsThisExile");
    this.stats.push(
      inputStat(id, `${this.spell.name}: casts this Exile`, "Spells", { default: 0, kind: "number", min: 0, logScale: true, hint: CAST_COUNT_HINT }, { source: CAST_COUNT_SOURCE }),
    );
    this.local.C = id;
    return this;
  }

  /** Casts this Realm (persistent spells' passive parts), as the game counts them. */
  realmCasts(): this {
    const id = spellStat(this.spell, "CastsThisRealm");
    this.stats.push(
      inputStat(id, `${this.spell.name}: casts this Realm`, "Spells", { default: 0, kind: "number", min: 0, logScale: true, hint: CAST_COUNT_HINT }, { source: CAST_COUNT_SOURCE }),
    );
    this.local.R = id;
    return this;
  }

  charges(max?: number): this {
    const s = this.spell;
    const id = spellStat(s, "Charges");
    // The charged spells' Math has a floor(k × (Charges − 1)) + 1 factor, which is 0 at 0 charges and would zero the score.
    this.stats.push(inputStat(id, `${s.name}: charges`, "Spells", { default: 1, kind: "number", min: 0, max, logScale: true }, { source: SPELL_SOURCE }));
    this.local.Q = id;
    return this;
  }

  /** An input frozen at cast time when the spell is snapped. */
  snapped(stat: string, label: string, defaultValue = 1): this {
    const id = spellStat(this.spell, `Snapped${stat.split(".").pop()}`);
    this.stats.push(
      inputStat(id, `${this.spell.name}: ${label} when it was cast (snapped)`, "Spells", { default: defaultValue, kind: "number", min: 0, logScale: true }, {
        source: { url: "https://idlewizard.wiki.gg/wiki/Snap", verified: false, note: "The Temporalist e550+ guide describes snapping: the spell keeps the efficiency it was cast with." },
      }),
    );
    this.snap = { ...this.snap, [stat]: id };
    return this;
  }

  effect(stat: string, op: "add" | "mul", formula: string, part?: string, note?: string): this {
    this.effects.push({
      stat,
      op,
      value: this.f(formula),
      label: part ? `${this.spell.name} (${part})` : this.spell.name,
      source: note ? unverified(note) : SPELL_SOURCE,
    });
    return this;
  }

  manaPerCast(formula: string): this {
    this.mana = { ...this.mana, perCast: this.f(formula) };
    return this;
  }

  manaPerSecond(formula: string): this {
    this.mana = { ...this.mana, perSecond: this.f(formula) };
    return this;
  }

  /** Autoclicks of a summon: "Mana = ClickProfit × Summon × AutoclickProfit" per click unless `perClick` says otherwise. */
  clicks(perSecond: string, crit: Crit, perClick = "CP * S * AP"): this {
    this.autoclicks = {
      label: this.spell.name,
      perSecond: this.f(`(${perSecond}) * K`),
      manaPerClick: this.f(`${perClick} * ${critExpr(crit)}`),
    };
    return this;
  }

  voidMana(formula: string): this {
    this.voidManaPerSecond = this.f(formula);
    return this;
  }

  skip(text: string, note: string): this {
    this.unmodelled.push({ text, note });
    return this;
  }

  /** Marks the mana/autoclick reading as unverified. */
  note(text: string): this {
    this.sourceNote = text;
    return this;
  }

  private sourceNote?: string;

  build(): SpellBehaviour {
    return {
      spellId: this.spell.id,
      effects: this.effects,
      mana: this.mana,
      autoclicks: this.autoclicks,
      voidManaPerSecond: this.voidManaPerSecond,
      stats: this.stats,
      snap: this.snap,
      unmodelled: this.unmodelled,
      source: this.sourceNote ? unverified(this.sourceNote) : SPELL_SOURCE,
    };
  }
}

const PET_XP = "Pet experience isn't part of any burst score.";
const SHARDS = "Spell shards aren't modelled.";

const DEFINITIONS: Record<number, (b: SpellBuilder) => SpellBuilder> = {
  // Evocations
  0: (b) => b.manaPerCast("E * M * 30"),
  2: (b) =>
    b
      .manaPerCast("M * E * 30")
      .clicks("4", "none", "CP * log10(E * 0.01 + 1) * AP")
      .note("Its autoclicks' crit stats aren't stated; assumed to have none.")
      .skip("PetXp = (1 + FixedXp) × PetXpMultiplier", PET_XP),
  3: (b) =>
    b
      .manaPerCast("(L + 2.5) * E * M * 8 * Spell.KelphiorsBlackBeamEfficiency")
      .note("Kelphior's Black Beam efficiency (Reality Prism) is assumed to multiply the mana it earns."),
  59: (b) =>
    b
      .charges()
      .manaPerCast("(floor(0.15 * (Q - 1)) + 1) * E * M * 20")
      .note('The Math omits Mana/s, which the description ("20 sec of production") implies; the tool includes it.'),
  64: (b) =>
    b
      .casts()
      .manaPerSecond("M * E * (C * 0.01 + 1) * 20")
      .skip("PetXp = (CharLvl × (Evocation^0.5 + 1) + FixedXp) × PetXpMultiplier", PET_XP),
  65: (b) => b.manaPerCast("(L + 10) * E * M * 20").skip("CompressedTime = CharLvl × 0.2 + 100", "Compressed Time isn't modelled."),
  66: (b) =>
    b
      .skip("TimeSkipped = (log10(Evocation) × 0.75 + 1) × Charlvl × 0.5 + 10", "Skipped time is an input.")
      .skip("Stops all active spells, increasing casts as if completed (Skipped Time page)", "Casts are inputs; Wormhole isn't cast in the scored burst."),
  67: (b) => b.skip("TimeDistortion = log10(Evocation) × 0.05 + 0.25", "Time Distortion gained over the run; Stabilize The Flow uses the maximum."),
  68: (b) => b.skip("Instantly refreshes the duration on all active spells", "Spell durations aren't modelled (every selected spell is assumed active)."),
  71: (b) => b.skip("Entities = ⌊log10(Evocation) × 2 + 1⌋ × (⌊Charges × 0.02⌉ + 1)", "Void Entities collected are an input."),
  86: (b) =>
    b
      .charges(1e9)
      .manaPerCast("(floor(0.1 * (Q - 1)) + 1) * E * M * 100")
      .skip("Consumes 10% of charges left on use", "Charges are an input (up to 1e9)."),
  87: (b) =>
    b
      .realmCasts()
      .effect("Hero.AbilityPower", "mul", "R * 0.01 + 1", "passive")
      .skip("FSPercentGiven = CastsThisExile × 0.1% + log10(Evocation) × 1.5% + 1%", "Furious Strike charges are an input."),
  91: (b) => b.skip("SpellShards = (CastsThisExile + 1000) × Evocation^0.1", SHARDS),
  104: (b) => b.skip("Shards = (CharLvl × 1.25 + 25) × Evocation^0.075", SHARDS),
  110: (b) => b.skip("TimeSkipped = (log10(Evocation) × 0.5 + 1) × Charlvl × 0.5 + 20", "Skipped time is an input."),

  // Incantations
  4: (b) =>
    b
      .snapped("Spell.IncantationEfficiency", "Incantation efficiency")
      .effect(
        buildingProfit(1),
        "mul",
        `1 + floor(max(floor(250 - log10(Mysteries.Count + 1) * 3.5 + 0.5), 100) * (log10(I) * 1.6 + 1) + 0.5) / max(${buildingCount(1)}, 1)`,
        undefined,
        "Temporary Mana Gems are assumed to raise Mana Gems' production in proportion to the amount owned; gem-count upgrades aren't modelled.",
      ),
  5: (b) => b.effect(buildingProfit(4), "mul", "(A + 1) ^ 0.5 * I ^ 1.2 + 1", undefined, "Trees of Life are Shaman's Enchanted Trees (building 4), per the Shaman page."),
  6: (b) => b.effect(buildingProfit(6), "mul", "((Pet.Level + 1) * 0.25) ^ 1.25 * I ^ 1.6 + 1", undefined, "Hellholes are Oni's Circles of Power (building 6), per the Oni page."),
  7: (b) =>
    b.effect(
      buildingProfit(2),
      "mul",
      "(Idle.Factor + 1) ^ 0.43 * I ^ 0.92 * 0.85 + 1",
      undefined,
      'Forbidden Tomes are Shaman\'s Grimoires (building 2), per the Shaman page; "IdleBonusMulti" is read as the idle multiplier in effect.',
    ),
  17: (b) =>
    b
      .casts()
      .effect(
        "Prod.Global",
        "mul",
        `(((Time.SkippedYears * ${SECONDS_PER_YEAR} * 60 + 1) * 1.25) ^ 0.5 * I + 1) * (log10(C + 1) ^ 0.85 + 1)`,
        undefined,
        'Skipped time converted with 365-day years; "log^0.85" read as the logarithm raised to 0.85.',
      ),
  30: (b) =>
    b
      .effect("Void.EntitySpawnRate", "mul", "I ^ 0.9 + 1")
      .effect("Void.EntityLifetime", "mul", "I ^ 0.5 + 1"),
  33: (b) => b.skip("TimePerCollection = F(MaxPetLvl) / (1 + log(1 + CastsThisExile / 10000))", "Void Entity collection over the run isn't modelled."),
  34: (b) => b.voidMana("I ^ 1.2 * Void.ActiveTraps * Void.ManaPerEntity / 30"),
  40: (b) =>
    b
      .effect("Click.Profit", "mul", "I + 1")
      .effect("Click.CritChance", "add", "(log10(I) * 0.9 + 1) * 3", "crit chance", "Adds percentage points to crit chance.")
      .effect("Click.CritProfit", "mul", "I * 0.5 + 1", "crit profit"),
  50: (b) => b.effect("Prod.Global", "mul", "((Misc.SourcesOwned + 1) * 0.1) ^ 0.34 * I + 1", undefined, '"BoughtSources" is read as total mana sources owned.'),
  52: (b) => b.effect("Prod.Global", "mul", "((Misc.SourcesOwned + 1) * 0.5) ^ 0.45 * I + 1", undefined, '"BoughtSources" is read as total mana sources owned.'),
  57: (b) => b.casts().effect("Prod.Global", "mul", "(Misc.LeyApexes * I * 3 / 4000 + 1) * (((C + 1) / 10) ^ 0.75 + 1)"),
  58: (b) =>
    b
      .effect("Spell.EvocationEfficiency", "mul", "L * I ^ 1.2 * 0.028 + 1")
      .skip("PZChargesGranted = 2 / (PZCurrentCharges + 1) × random(0.5, 1.5)", "Plague Zombie charges are an input."),
  60: (b) => b.casts().effect("Prod.Global", "mul", "((C + 1) * 0.9) ^ 0.45 * I + 1"),
  61: (b) =>
    b
      .casts()
      .realmCasts()
      .effect("Prod.Global", "mul", "(C + 1) ^ 0.85 * I + 1", "active")
      .effect("Char.ExperienceFromSources", "mul", "((R + 1) / 1000) ^ 0.35 + 1", "passive"),
  63: (b) => b.casts().effect("Pet.ExperienceGain", "mul", "(C + 1) ^ 0.41 * I * 0.55 + 1"),
  69: (b) =>
    b
      .snapped("Spell.IncantationEfficiency", "Incantation efficiency")
      .snapped("Time.MaxDistortion", "Time Distortion consumed", 10)
      .effect("Prod.Global", "mul", "Time.MaxDistortion ^ (1 + 0.1 * Time.MaxDistortion) * I * 2.5 + 1", undefined, "Assumes the cast consumes the maximum Time Distortion."),
  70: (b) =>
    b
      .casts()
      .realmCasts()
      .effect("Click.AutoclickProfit", "mul", "(I * 0.2) * C + 1", "active")
      .effect("Pet.ExperienceFlat", "add", "R * 0.02", "passive"),
  72: (b) =>
    b
      .casts()
      .realmCasts()
      .effect("Prod.Global", "mul", "(C + 1) ^ 0.85 * I * 0.75 + 1", "active")
      .effect("Spell.ChargeSpeed", "mul", "((R + 1) * 0.001) ^ 0.5 + 1", "passive"),
  73: (b) => b.effect("Hero.AbilityPower", "mul", "Misc.TemporalAnchors * I * 0.15 + 1"),
  88: (b) => b.casts().effect("Hero.AbilityPower", "mul", "((C + 1) * 0.005) ^ 1.18 * I + 1"),
  89: (b) => b.casts().effect("Prod.Global", "mul", "((C + 1) * 0.005) ^ 1.2 * I + 1"),
  90: (b) => b.effect("Spell.EvocationEfficiency", "mul", "(L + 1) ^ 1.28 * I * 0.25 + 1"),
  93: (b) => b.casts().effect("Spell.IncantationEfficiency", "mul", "((C + 1) / 400) ^ 1.5 + 1"),
  101: (b) =>
    b
      .casts()
      .effect("Prod.Global", "mul", "C * (log10(I) * 0.95 + 1) * 0.9 + 1", undefined, "Incantation efficiency is read as the current value; the Math doesn't say it's fixed at cast.")
      .skip("Resets Character Experience, Mana, Void Mana, and various Exile statistics", "Resets over the run aren't modelled; the affected totals are inputs."),
  107: (b) => b.effect("Spell.EvocationEfficiency", "mul", "(Pet.MaxLevelThisExile + 1) ^ 0.8 * I ^ 1.3 + 1"),
  111: (b) =>
    b
      .casts()
      .effect(
        "Prod.Global",
        "mul",
        "(C + 1) ^ 0.8 * I * 0.5 * min(Weapon.RitualOfPotencyGranted, 1) + 1",
        undefined,
        '"RealCastsThisExile" is read as the cast count input; the Math doesn\'t say whether casts added by The Accumulator\'s activation count as real.',
      ),
  117: (b) =>
    b
      .effect("Pet.AbilityPower", "mul", `(${buildingCount(6)} + 1) ^ 0.3 * I ^ 0.75 * 0.9 + 1`)
      .skip("10 times a second earns 4 sec of production, based on amount of Mysteries", "The Math gives no formula for this mana."),

  // Summons
  10: (b) =>
    b
      .casts()
      .clicks("5", "none")
      .effect("Shards.PoolCapacity", "mul", "1 + (1 + 0.8 * log10(S)) * (C / 10000) ^ 0.45"),
  11: (b) =>
    b
      .casts()
      .clicks("8", "none")
      .note("Its autoclicks' crit stats aren't stated; assumed to have none.")
      .effect("Pet.ExperienceGain", "mul", "max(C ^ 0.4 * (1 + log10(S) / 2), 1)", undefined, "The Math has no + 1; the bonus is assumed never to reduce pet experience.")
      .skip("PetXp = (1 + FixedXp) × PetXpMultiplier", PET_XP),
  16: (b) =>
    b
      .casts()
      .clicks("0.5", "character", "CP * S * AP * 10")
      .effect("Click.AutoclickProfit", "mul", "(C * 0.1 + 1) * (L * S ^ 0.9 * 1.5 + 1)"),
  18: (b) =>
    b
      .clicks(`floor(${buildingCount(4)} * 0.004 + 0.5)`, "character")
      .effect("Prod.Global", "mul", `(${buildingCount(4)} + 1) ^ 0.74 * S ^ 0.9 + 1`, undefined, "Trees of Life are Shaman's Enchanted Trees (building 4), per the Shaman page."),
  21: (b) =>
    b
      .casts()
      .clicks("10", { chance: 5, profit: 750 })
      .effect("Spell.ChargeSpeed", "mul", "1 + (1 + 0.5 * log10(S)) * (C / 1000) ^ 0.35"),
  22: (b) =>
    b
      .clicks("12", "character")
      .effect("Click.CritChance", "add", "(log10(S) * 0.075 + 1) * 20", undefined, "Adds percentage points to crit chance."),
  23: (b) => b.clicks("16", { chance: 15, profit: 400 }).effect("Idle.Bonus", "mul", "S ^ 0.8 * 1.5"),
  25: (b) =>
    b
      .casts()
      .clicks("15", { chance: 10, profit: 1200 })
      .effect("Pet.ExperienceGain", "mul", "1 + (1 + 0.95 * log10(S)) * (C / 100) ^ 0.5"),
  26: (b) => b.clicks("16", { chance: 10, profit: 900 }).effect("Shards.PassiveGeneration", "mul", "S ^ 0.2 + 1"),
  28: (b) =>
    b
      .casts()
      .clicks("14", "none")
      .note("Its autoclicks' crit stats aren't stated; assumed to have none.")
      .effect("Spell.EvocationEfficiency", "mul", "max((C / 1000) ^ 1.1 * S, 1)", undefined, "The Math has no + 1; the bonus is assumed never to reduce Evocation efficiency.")
      .skip("PetXp = (1 + FixedXp) × PetXpMultiplier", PET_XP),
  29: (b) =>
    b
      .clicks("5", "character")
      .effect("Shards.PoolEfficiency", "mul", "S * 5")
      .skip("Autoclicks 10 times per second (description)", "The Math says 5 clicks per second; the Math is used."),
  92: (b) =>
    b
      .clicks("floor(log10(S + 1) * 2.5 + 1)", "character")
      .effect(
        "Click.ManaPerClick",
        "mul",
        "1 + A * S ^ 0.9 * 0.0001",
        undefined,
        '"ClickProfit = Mana/s × ClickProfitPerManaProduction × (…)" is read as adding that multiple of the production-based click value; click profit is assumed to multiply it as well.',
      ),
  105: (b) =>
    b
      .clicks("6", "character")
      .effect("Click.CritRating", "add", "(A + 1) ^ 0.75 * S ^ 0.7 + 1", "crit rating")
      .effect("Prod.Global", "mul", "S ^ 0.7 * 1.5"),
};

export const SPELL_BEHAVIOURS: ReadonlyMap<number, SpellBehaviour> = new Map(
  Object.entries(DEFINITIONS).map(([id, define]) => {
    const spell = spellById(Number(id));
    return [spell.id, define(new SpellBuilder(spell)).build()];
  }),
);

export function behaviourOf(spellId: number): SpellBehaviour {
  const b = SPELL_BEHAVIOURS.get(spellId);
  if (!b) throw new Error(`Spell ${spellById(spellId).name} (${spellId}) has no encoded behaviour`);
  return b;
}
