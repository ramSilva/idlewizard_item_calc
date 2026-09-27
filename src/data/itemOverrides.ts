import { ATTRIBUTES } from "../engine/model.ts";
import type { UnmodelledClause } from "../engine/model.ts";
import { attributeStat } from "./attributes.ts";
import { overrideEffect, type BlockParts, type ClauseOverride, type OverrideContext } from "./itemText.ts";
import { buildingCount, buildingProfit } from "./stats.ts";

const N = String.raw`(\d*\.?\d+)`;
const rx = (source: string) => new RegExp(source, "i");

const AS_FRACTION =
  'The formula value is read as a fraction applied as ×(1 + value), like the Expedition Level items whose text spells out "(N% per Expedition Level)".';
const AS_FACTOR = 'A formula that carries its own "+ 1" is read as the factor itself.';
const BY = '"X by (formula)" is read as multiplying X by the formula\'s value.';
const ACTIVE = "Assumes the ability is active during the scored burst.";

/** Weapon "R" from the Details sections: (1 + 0.75 × Tier) / 4. */
const weaponR = (ctx: OverrideContext) => (1 + 0.75 * ctx.tier) / 4;

/** "X +a * (Q + 1)^(b), based on …" */
function powerOfCount(phrase: string, stat: string, quantity: string, statOfQuantity: string, basedOn: string): ClauseOverride {
  return {
    pattern: rx(`${phrase} \\+${N} \\* \\(${quantity} \\+ 1\\)\\^\\(${N}\\), based on ${basedOn}`),
    build: (m, ctx) => ({ effects: [overrideEffect(ctx, stat, "mul", `1 + ${m[1]} * (${statOfQuantity} + 1) ^ ${m[2]}`, AS_FRACTION)] }),
  };
}

/** The whole text of an item whose effect is an ability the stat model can't represent. */
function mechanic(note: string): ClauseOverride {
  return { pattern: /^.+$/, build: (_m, ctx) => ({ unmodelled: [{ text: ctx.text, reason: "mechanic", note }] }) };
}

function whole(build: (ctx: OverrideContext) => Partial<BlockParts>): ClauseOverride {
  return { pattern: /^.+$/, build: (_m, ctx) => build(ctx) };
}

const activation = (text: string, note = "Activated part of the ability; not modelled."): UnmodelledClause => ({ text, reason: "mechanic", note });

export const ITEM_OVERRIDES: Readonly<Record<string, readonly ClauseOverride[]>> = {
  "Pitch-black Cage": [
    powerOfCount("void mana per entity", "Void.ManaPerEntity", "bats", "Misc.BatsThisExile", "bats collected in this exile"),
  ],
  "Ceaseless Hunger": [
    powerOfCount("pet ability power", "Pet.AbilityPower", "void entities", "Void.EntitiesThisExile", "collected voids in this exile"),
  ],
  "Murmuring Spellbook": [powerOfCount("idle bonus", "Idle.Bonus", "spells", "Spell.CastsThisExile", "spell casts in this exile")],
  "Arcane Accelerator": [
    powerOfCount("evocation efficiency", "Spell.EvocationEfficiency", "catalysts", "Misc.CatalystShards", "catalyst shards collected"),
  ],
  "Black Vortex": [powerOfCount("void mana profits", "Void.ProfitPerPoint", "idle", "Idle.Bonus", "idle bonus")],
  "Commissar's Torn Sleeve": [
    {
      pattern: rx(`all attributes \\+${N} \\* pet level, based on pet level`),
      build: (m, ctx) => ({
        effects: ATTRIBUTES.map((a) =>
          overrideEffect(ctx, attributeStat(a), "add", `floor(${m[1]} * Pet.Level + 0.5)`, "Rounded to the nearest point, per the page's Notes (307 pet levels give +25).", true),
        ),
      }),
    },
  ],
  "Miniaturized Accelerator": [
    {
      pattern: rx(`all profits by \\(${N} \\* \\(catalysts \\+ 1\\)\\)\\^\\(${N}\\), based on catalyst shards amount`),
      build: (m, ctx) => ({ effects: [overrideEffect(ctx, "Prod.Global", "mul", `(${m[1]} * (Misc.CatalystShards + 1)) ^ ${m[2]}`, BY)] }),
    },
  ],
  "Enigmatic Parchment": [
    {
      pattern: rx(`character ability power by \\(${N} \\* \\(enchanting dust \\+ 1\\)\\)\\^\\(${N}\\), based on enchanting dust collected in this exile`),
      build: (m, ctx) => ({
        effects: [overrideEffect(ctx, "Hero.AbilityPower", "mul", `(${m[1]} * (Items.EnchantingDustThisExile + 1)) ^ ${m[2]}`, BY)],
      }),
    },
  ],
  "Collar Of Obedience": [
    {
      pattern: rx(`pet ability charging speed \\+${N} \\* log10\\(character ability power \\+ 1\\), based on character ability power`),
      build: (m, ctx) => ({ effects: [overrideEffect(ctx, "Pet.ChargeSpeed", "mul", `1 + ${m[1]} * log10(Hero.AbilityPower + 1)`, AS_FRACTION)] }),
    },
  ],
  "Symbol Of Authority": [
    {
      pattern: rx(`summoning efficiency \\+${N} \\* character level, based on character level`),
      build: (m, ctx) => ({ effects: [overrideEffect(ctx, "Spell.SummoningEfficiency", "mul", `1 + ${m[1]} * Char.Level`, AS_FRACTION)] }),
    },
  ],
  "Simple Memento": [
    {
      pattern: rx(`pet experience \\+${N} \\* log10\\(pet level \\+ 1\\)\\^\\(-1\\) \\+ 1\\. the bonus is stronger the lower the pet's level is, gradually decreasing as it gets higher`),
      build: (m, ctx) => ({ effects: [overrideEffect(ctx, "Pet.ExperienceGain", "mul", `${m[1]} * log10(Pet.Level + 1) ^ (-1) + 1`, AS_FACTOR)] }),
    },
  ],
  "Paukan, The Spider": [
    {
      pattern: rx(`pet experience gain \\+1\\+${N}\\*\\(autoclicks\\+1\\)\\^\\(${N}\\), based on currently performed autoclicks per second`),
      build: (m, ctx) => ({
        effects: [overrideEffect(ctx, "Pet.ExperienceGain", "mul", `1 + ${m[1]} * (Click.AutoclicksPerSecond + 1) ^ ${m[2]}`, AS_FACTOR)],
      }),
    },
  ],
  "Recaller Stone": [
    {
      pattern: rx(`divides summoning duration by log10\\(autoclicks \\+ 1\\)\\^\\(${N}\\) \\* ${N} \\+ 1`),
      build: (m, ctx) => ({
        effects: [
          overrideEffect(
            ctx,
            "Spell.SummoningDurationDivisor",
            "mul",
            `log10(Click.AutoclicksThisExile + 1) ^ ${m[1]} * ${m[2]} + 1`,
            '"Autoclicks" is read as autoclicks this Exile.',
          ),
        ],
      }),
    },
  ],
  Habitstone: [
    {
      pattern: rx(`incantation duration is divided \\+1 \\+ ${N}\\* log10\\(accumulated spells \\+ 1\\), based on accumulated and persistent spell casts in this exile`),
      build: (m, ctx) => ({
        effects: [overrideEffect(ctx, "Spell.IncantationDurationDivisor", "mul", `1 + ${m[1]} * log10(Spell.AccumulatedCastsThisExile + 1)`, AS_FACTOR)],
      }),
    },
  ],
  "Scales of Appraisal": [
    {
      pattern: rx(`experiment and crafting efficiency \\+1 \\+ ${N} \\* log10\\(experiments\\+1\\)\\^\\(0\\.5\\), based on experiments performed this realm`),
      build: (m, ctx) => ({
        effects: ["Items.ExperimentEfficiency", "Items.CraftingEfficiency"].map((s) =>
          overrideEffect(
            ctx,
            s,
            "mul",
            `1 + ${m[1]} * log10(Items.ExperimentsThisRealm + 1) ^ 0.5`,
            "The Enchantments page lists the Legendary bonus as 0.1 × log10(experiments this realm + 1)^0.5 experiment efficiency.",
            true,
          ),
        ),
      }),
    },
  ],
  "The Bond": [
    {
      pattern: rx(`pet ability power for tier 1 \\+${N}%, for tier 2 \\+${N}%`),
      build: (m, ctx) => ({
        effects: [
          overrideEffect(
            ctx,
            "Pet.AbilityPower",
            "mul",
            `if(lt(Pet.Tier, 1.5), ${1 + Number(m[1]) / 100}, if(lt(Pet.Tier, 2.5), ${1 + Number(m[2]) / 100}, 1))`,
            "Read as multipliers, like other percentage item bonuses.",
          ),
        ],
      }),
    },
  ],
  "The Rubedo Engine": [
    {
      pattern: rx(String.raw`all accumulated and persistents spells' casts are counted twice for the purpose of spells' cast count \(both active and passive part for persistents\)`),
      build: (_m, ctx) => ({ effects: [overrideEffect(ctx, "Spell.AccumulatedCastCountFactor", "mul", 2)] }),
    },
  ],
  "Ritual Disk": [
    {
      pattern: rx(String.raw`all augment spell casts are counted twice for the purpose of spells' cast count\. affects all sources of excess casts as well`),
      build: (_m, ctx) => ({ effects: [overrideEffect(ctx, "Spell.AugmentCastCountFactor", "mul", 2)] }),
    },
  ],
  "The Magnifier": [
    {
      pattern: rx(String.raw`each persistent spell cast counts twice for the purpose of the spell's active part accumulation`),
      build: (_m, ctx) => ({ effects: [overrideEffect(ctx, "Spell.PersistentActiveAccumulationFactor", "mul", 2)] }),
    },
  ],

  "Chiropteric Rod": [
    whole((ctx) => ({
      effects: [overrideEffect(ctx, "Prod.Global", "mul", `Misc.BatsThisExile ^ ${weaponR(ctx) + 1} + 1`, undefined)],
      unmodelled: [activation("Can be activated to spawn a Bat.", "Spawning bats only matters through the bats-collected input.")],
    })),
  ],
  "Head Of The All-Eater": [
    whole((ctx) => ({
      effects: [
        overrideEffect(
          ctx,
          "Prod.Global",
          "mul",
          "(log10(Misc.MaxManaAccrued + 1) * 0.025 + 1) * (log10(Void.ManaAccrued ^ 0.85 + 1) + 1) * (log10(Click.AutoclicksAccrued ^ 1.8 + Spell.CastsAccrued ^ 1.5 + Void.EntitiesAccrued ^ 2 + 1) ^ 2 + 1)",
          'The Details formula\'s "log10^2" is read as the squared logarithm.',
        ),
      ],
    })),
  ],
  Thunderbird: [
    whole((ctx) => ({
      effects: [
        overrideEffect(
          ctx,
          "Spell.EvocationEfficiency",
          "mul",
          `(Weapon.ThunderbirdCharges ^ 1.5 * Misc.Arcanasprings + 1) ^ ${weaponR(ctx)} / 5 + 1`,
          `${ACTIVE} Charges are an input (each Evocation cast other than Lightning Bolt spends one).`,
        ),
      ],
    })),
  ],
  "Reality Prism": [
    whole((ctx) => {
      const r = weaponR(ctx);
      return {
        effects: [
          overrideEffect(
            ctx,
            "Spell.KelphiorsBlackBeamEfficiency",
            "mul",
            `Misc.LeyApexes ^ ${2 * r} * 10 + 1 + 1`,
            "Assumes the charges are at their maximum B^(2R) × 10 + 1 (each Kelphior's Black Beam cast doubles them).",
          ),
        ],
      };
    }),
  ],
  "Philosopher's Stone": [
    whole((ctx) => {
      const n = `(Misc.Laboratories + 1) ^ ${weaponR(ctx) * 0.065}`;
      return {
        effects: (["Evocation", "Incantation", "Summoning"] as const).map((s) =>
          overrideEffect(ctx, `Spell.${s}Efficiency`, "mul", `(${n}) ^ (5 - Elixir.${s}Ingredients)`),
        ),
      };
    }),
  ],
  "Black Blade": [
    whole((ctx) => ({
      effects: [
        overrideEffect(ctx, "Prod.Global", "mul", `(Misc.LiquidShadow ^ 0.5 * Misc.ShadowCoals) ^ ${weaponR(ctx)} * 0.001 + 1`, `${ACTIVE} (it lasts 60 seconds).`),
      ],
    })),
  ],
  "Shard Of A Lost Dimension": [
    whole((ctx) => {
      const r = weaponR(ctx);
      return {
        effects: [
          overrideEffect(
            ctx,
            "Void.ManaPerEntity",
            "mul",
            `(floor(log10(Void.Mana + 1)) * ${r} + 1) * Misc.Voidgates ^ ${r} * 0.0025 + 1`,
            `${ACTIVE} (it lasts 10 seconds).`,
          ),
        ],
      };
    }),
  ],
  "Enchanting Membrane": [
    whole((ctx) => ({
      effects: [
        overrideEffect(ctx, "Items.EnchantingDustIncome", "mul", (5 ** (ctx.tier * 0.25 + 1) * 1.4) / 100 + 1, "Details: 5^R × 1.4 / 100 + 1 with R = Tier × 0.25 + 1 (35% at Legendary, as on the Enchantments page).", true),
      ],
      unmodelled: [activation("Can be activated to earn additional enchanting dust after experiments.")],
    })),
  ],
  "Branch of the Great Cycle": [
    whole((ctx) => {
      const r = weaponR(ctx);
      return {
        effects: [
          overrideEffect(
            ctx,
            "Weapon.BranchClickMultiplier",
            "add",
            `Weapon.BranchCharges * ${r} * Spell.SummoningEfficiency ^ ${1 + 0.5 * r} * 100 + 1`,
            "Per-click factor of the 10-second activation from the Details; the activation's 10 clicks are counted by the Shaman burst score.",
            true,
          ),
        ],
        unmodelled: [activation("Charges with autoclicks while Rules of Nature is active.", "Charges are an input (maximum 2,000,000).")],
      };
    }),
  ],
  Cataclysm: [
    whole((ctx) => ({
      effects: [
        overrideEffect(
          ctx,
          buildingProfit(6),
          "mul",
          `1 + Weapon.CataclysmCharges / max(${buildingCount(6)}, 1)`,
          "Temporary Hellholes equal to the charges consumed; assumes Hellholes' production is proportional to the amount owned and that the ability is active during the burst.",
        ),
      ],
      unmodelled: [activation("Charges from Fire spells during its charging period.", "Charges are an input.")],
    })),
  ],
  "Heart of the Grave": [mechanic("Adds pet played time over the run; pet time is an input.")],
  Redeemer: [mechanic("Hallowed Clicks are not modelled.")],
  "Temporal Stabilizer": [mechanic("Changes time skipped by Wormhole over the run; skipped time is an input.")],
  Berzerker: [mechanic("Grants incantation spellcasts from Furious Strike over the run; cast counts are inputs.")],
  Spellstealer: [mechanic("Counterspell and Debilitate are not modelled.")],
  "The Accumulator": [mechanic("Adds the Ritual of Potency spell; spell availability is not modelled.")],
  "Shadow-Scryer's Crystal Ball": [mechanic("Shortens active spell durations; spell timing is not modelled.")],
  "Broomstaff Of Klevdariah": [mechanic("Buffs are not modelled.")],
};
