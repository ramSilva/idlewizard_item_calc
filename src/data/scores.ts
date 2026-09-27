import { f, ref, type Expr } from "../engine/expr.ts";
import type { ClassDef, PetDef, SpellDef } from "../engine/model.ts";

export interface ScoreContext {
  cls: ClassDef;
  pet: PetDef;
  spells: readonly SpellDef[];
  /** Derived stat ids created by the model builder. */
  manaPerCast: ReadonlyMap<number, string>;
  manaPerSecond: ReadonlyMap<number, string>;
  petCastMana: string | null;
  autoclicks: boolean;
  voidMana: boolean;
}

export interface ScoreDef {
  id: string;
  label: string;
  description: string;
  /** null when the selection can't produce this score. */
  build(ctx: ScoreContext): Expr | null;
}

const BRANCH_ACTIVATION_CLICKS = 10;

const statScore = (stat: string, label: string): ScoreDef => ({
  id: `stat:${stat}`,
  label,
  description: `${label} while the selected spells are active, like the BiS bot's single-stat scores.`,
  build: () => ref(stat),
});

export const SCORES: readonly ScoreDef[] = [
  {
    id: "oni-burst",
    label: "Oni burst: Furious Strike mana per cast",
    description: "Mana from one Furious Strike cast with every other selected spell active (Oni Guide, Step 7: Burst Phase).",
    build: (ctx) => (ctx.manaPerCast.has(86) ? ref(ctx.manaPerCast.get(86)!) : null),
  },
  {
    id: "temporalist-burst",
    label: "Temporalist burst: Kelphior's Black Beam mana per second from Mechanos Apexis",
    description: "Mechanos Apexis casts Kelphior's Black Beam on its own, so the burst bar holds six incantations (Temporalist Guide e550+, Step 6).",
    build: (ctx) => (ctx.petCastMana ? ref(ctx.petCastMana) : null),
  },
  {
    id: "shaman-burst",
    label: "Shaman burst: autoclick mana during a Branch of the Great Cycle activation",
    description:
      "Mana from the summons' and pet's autoclicks over the 10-second Branch of the Great Cycle activation, plus the activation's own 10 empowered clicks (Shaman Guide, Burst). Without Branch equipped it's 10 seconds of summon autoclicks.",
    build: (ctx) =>
      ctx.autoclicks
        ? f(
            `${BRANCH_ACTIVATION_CLICKS} * (Click.AutoclickManaPerSecond + Weapon.BranchClickMultiplier * Click.ManaPerClick * Click.AutoclickProfit * (1 + Click.CritChanceTotal / 100 * Click.CritProfit / 100))`,
          )
        : null,
  },
  {
    id: "production",
    label: "Mana per second while the selected spells are active",
    description: "Production with every selected spell active; the score for bursts that earn mana over time.",
    build: () => ref("Prod.Total"),
  },
  {
    id: "autoclick-mana",
    label: "Autoclick mana per second",
    description: "Mana per second from the selected summons' and the pet's autoclicks.",
    build: (ctx) => (ctx.autoclicks ? ref("Click.AutoclickManaPerSecond") : null),
  },
  {
    id: "void-mana",
    label: "Void mana per second",
    description: "Void mana per second from Void Radiance and the pet (Void Mana phases).",
    build: (ctx) => (ctx.voidMana ? ref("Void.ManaPerSecond") : null),
  },
  statScore("Spell.EvocationEfficiency", "Evocation efficiency"),
  statScore("Spell.IncantationEfficiency", "Incantation efficiency"),
  statScore("Spell.SummoningEfficiency", "Summoning efficiency"),
  statScore("Hero.AbilityPower", "Character ability power"),
  statScore("Pet.AbilityPower", "Pet ability power"),
  statScore("Click.AutoclickProfit", "Autoclick profit"),
  statScore("Idle.Bonus", "Idle bonus"),
  statScore("Void.ManaPerEntity", "Void mana per Entity"),
];

/** One score per selected spell that earns mana, e.g. `spell:FuriousStrike`. */
export function spellScores(ctx: ScoreContext): ScoreDef[] {
  return ctx.spells.flatMap((s): ScoreDef[] => {
    const perCast = ctx.manaPerCast.get(s.id);
    const perSecond = ctx.manaPerSecond.get(s.id);
    const out: ScoreDef[] = [];
    if (perCast) out.push({ id: `spell:${s.key}`, label: `${s.name}: mana per cast`, description: `Mana from one ${s.name} cast with the other selected spells active.`, build: () => ref(perCast) });
    if (perSecond) {
      out.push({
        id: `spell:${s.key}:per-second`,
        label: `${s.name}: mana per second`,
        description: `Mana per second from ${s.name} while it's active.`,
        build: () => ref(perSecond),
      });
    }
    return out;
  });
}
