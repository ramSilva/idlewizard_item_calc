import { f, type Expr } from "../engine/expr.ts";
import type { AutoclickSource, Effect, PetCast, PetDef, Source, StatDef, UnmodelledPart } from "../engine/model.ts";
import { ATTRIBUTES } from "../engine/model.ts";
import { inputStat } from "../engine/stats.ts";
import { attributeStat } from "./attributes.ts";

const page = (name: string): string => `https://idlewizard.wiki.gg/wiki/${name.replace(/ /g, "_")}`;

const BINDINGS = {
  P: "Pet.AbilityPower",
  L: "Pet.Level",
  X: "Pet.ExperienceTotal",
  CP: "Click.ManaPerClick",
  AP: "Click.AutoclickProfit",
  CRIT: "Click.CritFactor",
  N: "Spell.ActiveSummons",
};

/** Hours of real pet time, softcapped after 14 days as on the Herald of Rot page. */
const HERALD_REAL_HOURS = "if(lt(Pet.RealTime / 3600, 336), Pet.RealTime / 3600, (336 ^ 6 + max(Pet.RealTime / 3600 - 336, 0) ^ 0.5) ^ (1 / 6))";
const HERALD_GAME_DAYS = "if(lt(Pet.TimeCurrent / 86400, 200), Pet.TimeCurrent / 86400, 200 + max(Pet.TimeCurrent / 86400 - 200, 0) ^ 0.5)";
const GIANT_HOURS = "if(lt(Pet.TimeCurrent / 3600, 336), Pet.TimeCurrent / 3600, (336 ^ 2 + max(Pet.TimeCurrent / 3600 - 336, 0) ^ 0.5) ^ 0.5)";
const ZOMBIE_HOURS = "if(lt(Pet.TimeCurrent / 3600, 336), Pet.TimeCurrent / 3600, 336 + max(Pet.TimeCurrent / 3600 - 336, 0) ^ 0.5)";
const MECHANOS_DAYS = "Pet.RealTime / 86400";

class PetBuilder {
  readonly effects: Effect[] = [];
  readonly stats: StatDef[] = [];
  readonly unmodelled: UnmodelledPart[] = [];
  readonly casts: PetCast[] = [];
  autoclicks?: AutoclickSource;
  voidManaPerSecond?: Expr;
  readonly source: Source;

  constructor(
    readonly name: string,
    readonly tier: 1 | 2 | 3,
  ) {
    this.source = { url: page(name), verified: true };
  }

  f(source: string): Expr {
    return f(source, BINDINGS);
  }

  effect(stat: string, op: "add" | "mul", formula: string, note?: string): this {
    this.effects.push({ stat, op, value: this.f(formula), label: this.name, source: note ? { ...this.source, verified: false, note } : this.source });
    return this;
  }

  clicks(perSecond: string, manaPerClick: string): this {
    this.autoclicks = { label: this.name, perSecond: this.f(perSecond), manaPerClick: this.f(manaPerClick) };
    return this;
  }

  /** All attributes except Versatility, like Greater Chimaera's and Ley Keeper's bonuses. */
  attributes(formula: string, note?: string): this {
    for (const a of ATTRIBUTES) if (a !== "Versatility") this.effect(attributeStat(a), "add", formula, note);
    return this;
  }

  stat(def: StatDef): this {
    this.stats.push(def);
    return this;
  }

  skip(text: string, note: string): this {
    this.unmodelled.push({ text, note });
    return this;
  }

  build(): PetDef {
    return {
      id: this.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: this.name,
      tier: this.tier,
      effects: this.effects,
      stats: this.stats,
      autoclicks: this.autoclicks,
      casts: this.casts.length ? this.casts : undefined,
      voidManaPerSecond: this.voidManaPerSecond,
      unmodelled: this.unmodelled,
      source: this.source,
    };
  }
}

const pet = (name: string, tier: 1 | 2 | 3, define: (b: PetBuilder) => PetBuilder): PetDef => define(new PetBuilder(name, tier)).build();

const SOURCES = "Granting mana sources over the run isn't modelled; source counts are inputs.";
const LEVEL_REDUCTION = "Level requirement reductions aren't modelled.";
const TEMPORARY_ATTRIBUTES = "Temporary attribute bonuses while the ability is active aren't modelled.";

export const PETS: readonly PetDef[] = [
  pet("Living Sin", 3, (b) =>
    b
      .effect("Prod.Global", "mul", "log10(X + 1) ^ 5 * P * L ^ 4 * 2 + 1", '"log10^5" is read as the logarithm raised to the 5th power.')
      .effect("Spell.EvocationEfficiency", "mul", "P ^ 0.35 * L ^ 2 * 0.001 + 1"),
  ),
  pet("Hungerer", 2, (b) =>
    b
      .effect("Mysteries.Power", "mul", "X ^ 0.4 * L * P ^ 0.9 * 100 + 1.5")
      .skip("Eats spell shards and consumes mana sources each second", SOURCES),
  ),
  pet("Pit Lord", 2, (b) =>
    b
      .effect("Prod.Global", "mul", "log10(X + 1) ^ 2 * P * L ^ 2.5 * 50000 + 1", '"log10^2" is read as the squared logarithm.')
      .effect("Spell.EvocationEfficiency", "mul", "log10(P + 1) * L * 0.025 + 1")
      .skip("Generates mana every 30 seconds equal to M^1.01 × (75 × log10(P) + 30)", "Needs absolute mana per second, which the relative model doesn't have."),
  ),
  pet("Greater Chimaera", 3, (b) =>
    b
      .effect("Prod.Global", "mul", "P * L * 5 + 1")
      .attributes("if(ge(floor(2 * L / 3 + 0.5) + 1, 151), floor((floor(2 * L / 3 + 0.5) - 149) ^ 0.5 + 0.5) + 150, floor(2 * L / 3 + 0.5) + 1)")
      .skip("Grants a mana source and spell shards on ability activation", SOURCES),
  ),
  pet("Simulacrum", 2, (b) => b.effect("Prod.Global", "mul", "L * P * 5 + 1").skip("Grants one mana source periodically", SOURCES)),
  pet("Mechanos Apexis", 3, (b) => {
    const t = MECHANOS_DAYS;
    b.effect(
      "Spell.EvocationEfficiency",
      "mul",
      `if(lt(${t}, 3), P * L ^ 1.25 * (${t} + 1) ^ 4 * 0.05 + 1, P * L ^ 1.25 * ((${t} - 2) ^ 5.25 + 256) * 0.05 + 1)`,
    ).effect("Spell.IncantationEfficiency", "mul", "L * 0.25 + 1");
    b.casts.push({ spellId: 3, perSecond: b.f(`Pet.ChargeSpeed / max(floor(max(1 - ${t}, 0) ^ 3 * 64) + 1, 1)`) });
    return b.skip(
      "Casts Kelphior's Black Beam every floor((1 − T)^3 × 64) + 1 seconds (minimum 1); activation speed is affected by pet ability charging speed",
      "Modelled as casts per second = charging speed / period; whether charging speed can push it past one cast per second isn't stated.",
    );
  }),
  pet("Archivist", 2, (b) =>
    b
      .effect("Spell.EvocationEfficiency", "mul", "P * L ^ 1.125 * 25 + 1")
      .effect("Spell.IncantationDuration", "mul", "log10(L ^ 2 * P) * (1 + L / 500) * 0.025 + 1")
      .effect("Prod.Global", "mul", "Misc.AchievementsUnlocked ^ 0.65 * (P ^ 0.15 * L / 50 + 1) * 0.25 + 1"),
  ),
  pet("Interrogator", 1, (b) =>
    b
      .effect("Spell.EvocationEfficiency", "mul", "L ^ 1.06 * P * 0.73 + 1")
      .effect("Spell.IncantationDuration", "mul", "log10(L ^ 2 * P) * 0.025 + 1"),
  ),
  pet("Ley Keeper", 2, (b) =>
    b
      .effect("Prod.Global", "mul", "Misc.LeastSourceCount ^ 0.5 * P ^ 0.25 + 1")
      .skip("Reduces level requirements by L_M × 0.45", LEVEL_REDUCTION)
      .skip("On ability activation, increases all attributes (except Versatility) by ⌊10L/11⌉ + 1", TEMPORARY_ATTRIBUTES),
  ),
  pet("Geode", 1, (b) =>
    b
      .skip("Reduces level requirements by L_M × 0.4", LEVEL_REDUCTION)
      .skip("On activation, increases all attributes (except Versatility) by ⌊L^0.75 × 0.8⌉ + 1", TEMPORARY_ATTRIBUTES),
  ),
  pet("Herald of Rot", 3, (b) =>
    b
      .clicks("1", "CP * AP * CRIT")
      .effect(
        "Prod.Global",
        "mul",
        `L + 30 ^ (0.69 * log10(Idle.Factor)) * (P ^ 0.5 + 1) * (${HERALD_REAL_HOURS}) ^ 6 * L / 100000 + 1`,
        "I = 1 + idle profit bonus / 100 is read as the idle multiplier in effect.",
      )
      .effect("Click.AutoclickProfit", "mul", "4 ^ N * L * (P ^ 0.4 + 1) / 4000000 + 1")
      .effect("Spell.SummoningEfficiency", "mul", `L * (P ^ 0.1 + 1) * (${HERALD_GAME_DAYS}) / 25000 + 1`, "Pet time in days is read as game time (including skipped time), per the Shaman Guide.")
      .effect("Shards.PoolEfficiency", "mul", "L ^ 2 * 0.1 + 1"),
  ),
  pet("Risen Giant", 2, (b) =>
    b
      .clicks("1", "CP * AP * (1 - 0.3 + 0.3 * 12)")
      .effect(
        "Prod.Global",
        "mul",
        `L * 10 * 30 ^ (0.6875 * log10(Idle.Factor)) * (P ^ 0.6 + 1) * (${GIANT_HOURS}) ^ 2 + 1`,
        "Pet time is read as game time (the Temporalist e300–e550 guide scales it with skipped time); I is the idle multiplier in effect.",
      )
      .effect("Shards.PoolEfficiency", "mul", "(Spell.SummoningEfficiency ^ 0.2 + 1) * (P ^ 0.01 + 1) * L * 0.05 + 1"),
  ),
  pet("Zombie", 1, (b) =>
    b
      .clicks("1", "CP / 2 * AP * (1 - 0.2 + 0.2 * 9)")
      .effect(
        "Prod.Global",
        "mul",
        `L / 5 * (1 + 30 ^ (0.6875 * log10(Idle.Factor)) * (${ZOMBIE_HOURS}) * (P ^ 0.6 + 1)) + 1`,
        "Pet time is read as game time (the Skipped Time page adds skipped time to pet game time); I is the idle multiplier in effect.",
      )
      .skip("Gains experience from autoclicks and each second in Idle Mode: (0.5 + F) × M", "Pet experience isn't part of any burst score."),
  ),
  pet("Ent", 2, (b) =>
    b
      .clicks("1 + floor(L / 20)", "2 ^ N * CP * AP * CRIT")
      .effect("Click.Profit", "mul", "2 ^ (L / 24) * P ^ 0.85 * L * 12.5 + 1")
      .effect("Spell.SummoningEfficiency", "mul", "(L / 2 * P ^ 0.3 + 1) ^ 0.5 + 1"),
  ),
  pet("Pixie", 1, (b) =>
    b
      .clicks("1 + floor(L / 20)", "CP * AP * (1 - Click.CritChanceTotal / 200 + Click.CritChanceTotal / 200 * Click.CritProfit / 100)")
      .effect("Click.Profit", "mul", "L * P + 1"),
  ),
  pet("Voidterror", 2, (b) => {
    b.voidManaPerSecond = b.f("Void.ManaPerEntity * P ^ 0.7 * L / 40 / 5 * Pet.ChargeSpeed");
    return b
      .effect("Void.ProfitPerPoint", "mul", "(Void.ManaThisExile + 1) ^ 0.21 * P ^ 0.9 * L / 150 + 2", '"Multiplies Void Mana Profit" is applied to the profit per Void mana point.')
      .skip("Minimum ability charge time is 0.1 seconds", "Void mana per second assumes the 5-second period divided by pet ability charging speed, without that floor.");
  }),
  pet("Arcanaworg", 2, (b) =>
    b
      .stat(
        inputStat("Shards.PerSecond", "Spell shards gained per second", "Misc", { default: 0, kind: "number", min: 0, logScale: true }, {
          source: { url: page("Arcanaworg"), verified: true },
        }),
      )
      .effect("Prod.Global", "mul", "Shards.PerSecond * P * L ^ 1.2 * 0.025 + 1")
      .skip("On ability activation, grants spell shards each second for 10 seconds", "Spell shards aren't modelled."),
  ),
];

const byId = new Map(PETS.map((p) => [p.id, p]));

export function petById(id: string): PetDef {
  const p = byId.get(id);
  if (!p) throw new Error(`Unknown pet ${id}`);
  return p;
}
