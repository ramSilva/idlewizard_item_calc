import { f, type Expr } from "../engine/expr.ts";
import type {
  Attribute,
  BonusEnchant,
  EnchantDef,
  ItemEffect,
  ItemSlot,
  Quality,
  Source,
  UnmodelledClause,
  UnmodelledReason,
} from "../engine/model.ts";
import { ATTRIBUTES, ITEM_SLOTS } from "../engine/model.ts";
import { attributeStat } from "./attributes.ts";

export interface BlockParts {
  effects: ItemEffect[];
  bonusEnchant: BonusEnchant[];
  unmodelled: UnmodelledClause[];
}

export interface OverrideContext {
  quality: Quality;
  /** The wiki's weapon "Tier": Common 0 … Legendary 4, Unique 4. */
  tier: number;
  /** Page of the item, for building effect sources. */
  url: string;
  /** The matched text, for effect `text` fields. */
  text: string;
}

/** Hand encoding for a clause (or several) the phrase table can't read; matched against the normalized text. */
export interface ClauseOverride {
  pattern: RegExp;
  build(match: RegExpExecArray, ctx: OverrideContext): Partial<BlockParts>;
}

export interface ParseContext {
  url: string;
  quality: Quality;
  overrides?: readonly ClauseOverride[];
}

const QUALITY_TIER: Record<Quality, number> = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Unique: 4, Mythic: 4 };

export const ENCHANTMENTS_URL = "https://idlewizard.wiki.gg/wiki/Enchantments";

const NOTES = {
  percentMul: 'Percentage item bonuses are read as multipliers ×(1 + N%) (edust bonuses are "multiplicative unless stated otherwise", Enchantments page).',
  base: '"(base)" is read as an addition to the stat\'s base value; the older Fandom item data words the same bonuses "(additive)".',
  divisor: "Divisors from several sources are assumed to multiply.",
  points: "Read as percentage points added to the critical chance.",
  reduce: "Read as a factor ×(1 − N%).",
  decrease: 'A "decreases X +N%" clause is read as a factor ×(1 − N%).',
  levelScaling:
    '"Scales multiplicatively from Character level" is read as raising the per-level factor to the power of the character level plus level requirement reduction. The guides\' character-experience scalings (Oni 0.39, Shaman 0.88, Temporalist 1.34) are only reached this way; a linear reading would make phylacteries nearly insensitive to levels.',
  levelReduction: "Only phylacteries use it (the guides say level requirement reduction raises their power); spell, class and pet level requirements are not modelled.",
  carried: "The value-only clause is applied to the stat named just before it.",
  shared: "The stat names listed before the value share it.",
} as const;

type PercentMode = "mul" | "add" | "points" | "reduce";
type FlatMode = "add" | "factor";

interface Target {
  stat: string | readonly string[];
  percent?: PercentMode;
  flat?: FlatMode;
  /** Stat that "(base)" or flat amounts go to when it differs from `stat`. */
  flatStat?: string;
  note?: string;
  flatNote?: string;
}

const building = (b: number): Target => ({ stat: `Building.${b}.Profit`, percent: "mul" });
const multiplier = (stat: string | readonly string[], note?: string): Target => ({ stat, percent: "mul", note });

/** Normalized phrase → target stat. Phrases are lower-case, with the value and "(base)"/"(multiplicative)" removed. */
export const PHRASES: Readonly<Record<string, Target>> = {
  profits: multiplier("Prod.Global"),
  "all profits": multiplier("Prod.Global"),
  "mana gem": building(1),
  "mana gem profit": building(1),
  "mana gems profit": building(1),
  grimoire: building(2),
  "grimoires profit": building(2),
  "spell fountain": building(3),
  "spell fountains profit": building(3),
  "enchanted tree profit": building(4),
  "enchanted trees profit": building(4),
  "alchemy desk": building(5),
  "alchemy desk profit": building(5),
  "circle of power profit": building(6),
  "dimensional rift profit": building(7),
  "dimensional rifts profit": building(7),
  "nexi profit": building(8),
  "nexus profit": building(8),
  "the nexus profit": building(8),
  "evocation efficiency": multiplier("Spell.EvocationEfficiency"),
  "incantation efficiency": multiplier("Spell.IncantationEfficiency"),
  "summoning efficiency": multiplier("Spell.SummoningEfficiency"),
  "character ability power": multiplier("Hero.AbilityPower"),
  "pet ability power": multiplier("Pet.AbilityPower"),
  "idle bonus": multiplier("Idle.Bonus"),
  "mysteries power": multiplier("Mysteries.Power"),
  "void mana per entity": { stat: "Void.ManaPerEntity", percent: "mul", flat: "add", flatStat: "Void.ManaPerEntityFlat" },
  "void mana profit": multiplier("Void.ProfitPerPoint"),
  "void mana profits": multiplier("Void.ProfitPerPoint"),
  "void profits": multiplier("Void.ProfitPerPoint"),
  "click profit": multiplier("Click.Profit"),
  "autoclick profit": multiplier("Click.AutoclickProfit"),
  "critical profit": multiplier("Click.CritProfit"),
  "critical profits": multiplier("Click.CritProfit"),
  "critical rating": { stat: "Click.CritRating", percent: "mul", flat: "add" },
  "critical chance": { stat: "Click.CritChance", percent: "points", note: NOTES.points },
  "hallowed click profit": multiplier("Click.HallowedProfit"),
  "hallowed clicks profit": multiplier("Click.HallowedProfit"),
  "autoclicks amount": multiplier("Click.AutoclicksPerSecond"),
  "autoclick amount from spells": multiplier("Spell.AutoclicksFromSpells"),
  "experience gained from actions": multiplier("Char.ExperienceFromActions"),
  "character experience from actions": multiplier("Char.ExperienceFromActions"),
  "character experience gained from actions": multiplier("Char.ExperienceFromActions"),
  "character experience gained from sources": multiplier("Char.ExperienceFromSources"),
  "from mana sources": multiplier("Char.ExperienceFromSources", "Continues the preceding character experience clause."),
  "pet experience": { stat: "Pet.ExperienceGain", percent: "mul", flat: "add", flatStat: "Pet.ExperienceFlat" },
  "pet experience gained": { stat: "Pet.ExperienceGain", percent: "mul", flat: "add", flatStat: "Pet.ExperienceFlat" },
  "pet experience gain": { stat: "Pet.ExperienceGain", percent: "mul", flat: "add", flatStat: "Pet.ExperienceFlat" },
  ...Object.fromEntries(ATTRIBUTES.map((a) => [a.toLowerCase(), { stat: attributeStat(a), flat: "add" } satisfies Target])),
  "all attributes": { stat: ATTRIBUTES.map((a: Attribute) => attributeStat(a)), flat: "add" },
  "divides summoning duration": { stat: "Spell.SummoningDurationDivisor", flat: "factor", note: NOTES.divisor },
  "summoning duration divisor": { stat: "Spell.SummoningDurationDivisor", flat: "factor", note: NOTES.divisor },
  "incantation duration divisor": { stat: "Spell.IncantationDurationDivisor", flat: "factor", note: NOTES.divisor },
  "evocation duration divisor": { stat: "Spell.EvocationDurationDivisor", flat: "factor", note: NOTES.divisor },
  "incantation duration": multiplier("Spell.IncantationDuration"),
  "reduces evocation duration": { stat: "Spell.EvocationDuration", percent: "reduce", note: NOTES.reduce },
  "spell costs reduction": { stat: "Spell.CostReduction", percent: "add", note: "Cost reductions are assumed to add up." },
  "reduces spells costs reduction": { stat: "Spell.CostReduction", percent: "add", note: "Cost reductions are assumed to add up." },
  "charging spells' costs reduction": { stat: "Spell.ChargingCostReduction", percent: "add" },
  "charge-based spell charging speed": multiplier("Spell.ChargeSpeed"),
  "accumulated spells' starting casts amount": { stat: "Spell.AccumulatedStartingCasts", percent: "mul", flat: "add" },
  "accumulated casts gain": multiplier("Spell.AccumulatedCastGain"),
  "maximum cast rate of spells attainable per second": multiplier("Spell.MaxCastRate"),
  "pet ability charging speed": multiplier("Pet.ChargeSpeed"),
  "weapon charging speed": multiplier("Items.WeaponChargeSpeed"),
  "enchanting dust income": multiplier("Items.EnchantingDustIncome"),
  "all enchanting dust (with exception of trials) gains": multiplier("Items.EnchantingDustIncome"),
  "experiment and crafting efficiency": multiplier(["Items.ExperimentEfficiency", "Items.CraftingEfficiency"]),
  "passive shards generation": multiplier("Shards.PassiveGeneration"),
  "passive spell shards generation rate": multiplier("Shards.PassiveGeneration"),
  "shard pool efficiency": multiplier("Shards.PoolEfficiency"),
  "shards pool capacity": multiplier("Shards.PoolCapacity"),
  "compressed time gained per tick": multiplier("Time.CompressedTimeGain"),
  "max time distortion": { stat: "Time.MaxDistortion", flat: "add" },
  "maximum time distortion": { stat: "Time.MaxDistortion", flat: "add" },
  "void entities spawnrate": multiplier("Void.EntitySpawnRate"),
  "void entity spawn rate": multiplier("Void.EntitySpawnRate"),
  "the spawnrate of void entities": multiplier("Void.EntitySpawnRate"),
  "entities spawnrate": multiplier("Void.EntitySpawnRate", '"Entities" is read as Void entities.'),
  "character level": { stat: "Char.Level", flat: "add" },
  "level requirement reduction": { stat: "Char.LevelRequirementReduction", flat: "add", flatNote: NOTES.levelReduction },
  "reduces level requirements": { stat: "Char.LevelRequirementReduction", flat: "add", flatNote: NOTES.levelReduction },
  "versatility per-point attribute bonus' power": { stat: "AttrBonus.Versatility", percent: "mul", flatStat: "AttrBonus.Versatility" },
};

interface UnmodelledRule {
  pattern: RegExp;
  reason: UnmodelledReason;
  note: string;
}

const NOT_PRODUCTION = "Doesn't change mana production in the scored phase.";
const LIQUID_SHADOW = "Liquid Shadow and Shadow Clots (Umbramancer resources, per Basic Mechanics) are not modelled.";

export const UNMODELLED_RULES: readonly UnmodelledRule[] = [
  { pattern: /^offline bonus\b/i, reason: "not-production", note: "The scored phase is an online burst." },
  { pattern: /^maximum resources in jars\b/i, reason: "not-production", note: NOT_PRODUCTION },
  { pattern: /^trial of innovation completion speed\b/i, reason: "not-production", note: NOT_PRODUCTION },
  { pattern: /^gods' experience bonus\b/i, reason: "not-production", note: NOT_PRODUCTION },
  { pattern: /^ascension forms experience gain\b/i, reason: "not-production", note: NOT_PRODUCTION },
  { pattern: /^attribute gain speed\b/i, reason: "not-production", note: "Attribute points are an input." },
  { pattern: /^time without clicks before idle mode activates\b/i, reason: "not-production", note: NOT_PRODUCTION },
  { pattern: /^red catalyst power\b/i, reason: "mechanic", note: "Catalysts (source quantity multipliers) are not modelled." },
  { pattern: /^amount of echoes held by echo traps\b/i, reason: "mechanic", note: "Echo traps are not modelled." },
  { pattern: /liquid shadow|shadow clots/i, reason: "mechanic", note: LIQUID_SHADOW },
  { pattern: /^all evocation spell memetic level\b/i, reason: "mechanic", note: "Memetics are not modelled." },
  { pattern: /^major gods' main ability power\b/i, reason: "mechanic", note: "Pantheon gods are not modelled." },
  { pattern: /^phylacteries' slot efficiency\b/i, reason: "mechanic", note: "Phylactery slot efficiency is not modelled." },
  { pattern: /^(breakthroughs'|exhibits') bonus per point\b/i, reason: "mechanic", note: "Breakthroughs and Exhibits are not modelled." },
  { pattern: /^all mana sources \+/i, reason: "mechanic", note: "Source quantities are not modelled." },
  { pattern: /^maximum cast rate of spells attainable \+\d/i, reason: "mechanic", note: "The flat cast-rate cap is not modelled." },
];

/** Strips markup, turns `<br>` into clause breaks and `<sup>x</sup>` into `^(x)`; case is kept. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/<br\s*\/?>/gi, ", ")
    .replace(/log<sub>(\d+)<\/sub>/gi, "log$1")
    .replace(/<sup>(.*?)<\/sup>/gi, "^($1)")
    .replace(/<\/?(i|b|small|span)[^>]*>/gi, "")
    .replace(/\s+/g, " ")
    .replace(/(,\s*)+/g, ", ")
    .trim()
    .replace(/^,\s*|[,.\s]+$/g, "");
}

/** Splits on commas and sentence-ending periods outside parentheses. */
export function splitClauses(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    const sentenceEnd = c === "." && (i + 1 === text.length || text[i + 1] === " ");
    if (depth === 0 && (c === "," || sentenceEnd)) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}

const phraseKey = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

const CLAUSE = /^(?<dec>decreases\s+)?(?<name>.*?)\s*(?:\((?<mod>base|multiplicative)\)\s*)?(?<sign>[+-])?\s*(?<num>\d+(?:\.\d+)?)\s*(?<pct>%)?$/i;

function source(url: string, note?: string): Source {
  return note ? { url, verified: false, note } : { url, verified: true };
}

function effect(stat: string, op: "add" | "mul", value: number | Expr, text: string, url: string, note?: string): ItemEffect {
  return { stat, op, value, text, source: source(url, note) };
}

const joinNotes = (...notes: (string | undefined)[]) => notes.filter(Boolean).join(" ") || undefined;

interface ValuedClause {
  decrease: boolean;
  mod: "base" | "multiplicative" | null;
  value: number;
  percent: boolean;
}

function effectsFor(target: Target, c: ValuedClause, text: string, url: string, extraNote?: string): ItemEffect[] | null {
  const stats = typeof target.stat === "string" ? [target.stat] : target.stat;
  const make = (op: "add" | "mul", value: number, note?: string, statOverride?: string) =>
    (statOverride ? [statOverride] : stats).map((s) => effect(s, op, value, text, url, joinNotes(note, target.note, extraNote)));
  const x = c.value / 100;
  if (c.percent) {
    if (c.mod === "base") return make("add", x, NOTES.base, target.flatStat);
    if (c.mod === "multiplicative") return make("mul", 1 + x);
    if (c.decrease) return target.percent === "mul" ? make("mul", 1 - x, NOTES.decrease) : null;
    switch (target.percent) {
      case "mul":
        return make("mul", 1 + x, NOTES.percentMul);
      case "add":
        return make("add", x);
      case "points":
        return make("add", c.value);
      case "reduce":
        return make("mul", 1 - x);
      default:
        return null;
    }
  }
  if (c.decrease || c.mod === "multiplicative") return null;
  if (c.mod === "base") return target.flat === "add" ? make("add", c.value, joinNotes(NOTES.base, target.flatNote), target.flatStat) : null;
  if (target.flat === "add") return make("add", c.value, target.flatNote, target.flatStat);
  if (target.flat === "factor") return make("mul", c.value, target.flatNote);
  return null;
}

const BONUS_ALL = /^enchantments on your equipped items are (\d+) levels? stronger$/i;
const BONUS_SLOT = /^(\w+) items enchantment level \+(\d+)$/i;
const BONUS_SELF = /^this item's enchantment level \+(\d+)$/i;
const LIFETIME = /^entities remain (\d+(?:\.\d+)?)% longer$/i;
const MANA_SHARE = /^(?:click profit \+|additionally )(\d+(?:\.\d+)?)% of your mana per second$/i;
const EXPEDITION = /^(?<name>.+?) \+(?<a>\d*\.?\d+) \* expedition level \((?<pct>\d*\.?\d+)% per expedition level\)$/i;
const LEVEL_SCALING = /^scales multiplicatively from character level$/i;

function bonusEnchant(clause: string, url: string): BonusEnchant | null {
  let m = BONUS_ALL.exec(clause);
  if (m) return { scope: "all", levels: Number(m[1]), text: clause, source: source(ENCHANTMENTS_URL) };
  m = BONUS_SELF.exec(clause);
  if (m) return { scope: "self", levels: Number(m[1]), text: clause, source: source(url) };
  m = BONUS_SLOT.exec(clause);
  if (m) {
    const slot = ITEM_SLOTS.find((s) => s.toLowerCase() === m![1].toLowerCase());
    if (slot) {
      return {
        scope: slot as ItemSlot,
        levels: Number(m[2]),
        text: clause,
        source: source(url, "Slot-scoped bonus levels are assumed not to count toward the cap of 5 (Raiments gives +8, above that cap)."),
      };
    }
  }
  return null;
}

function applyLevelScaling(effects: ItemEffect[]): ItemEffect[] {
  return effects.map((e) => {
    if (e.op !== "mul" || typeof e.value !== "number") return e;
    return {
      ...e,
      value: f(`${e.value} ^ Char.PhylacteryLevel`),
      source: { ...e.source, verified: false, note: joinNotes(e.source.note, NOTES.levelScaling) },
    };
  });
}

/** Parses an item tier, set tier or Mythic inherent text into effects. Clauses nothing matches are kept as `unparsed`. */
export function parseEffectText(desc: string, ctx: ParseContext): BlockParts {
  const parts: BlockParts = { effects: [], bonusEnchant: [], unmodelled: [] };
  let text = normalizeText(desc);

  for (const o of ctx.overrides ?? []) {
    const m = new RegExp(o.pattern.source, o.pattern.flags.includes("i") ? o.pattern.flags : o.pattern.flags + "i").exec(text);
    if (!m) continue;
    const built = o.build(m, { quality: ctx.quality, tier: QUALITY_TIER[ctx.quality], url: ctx.url, text: m[0].trim() });
    parts.effects.push(...(built.effects ?? []));
    parts.bonusEnchant.push(...(built.bonusEnchant ?? []));
    parts.unmodelled.push(...(built.unmodelled ?? []));
    text = text.slice(0, m.index) + ", " + text.slice(m.index + m[0].length);
  }

  let previous: Target | UnmodelledRule | null = null;
  let pending: Target[] = [];
  let levelScaling = false;
  for (const clause of splitClauses(text)) {
    if (LEVEL_SCALING.test(clause)) {
      levelScaling = true;
      continue;
    }
    const carried = /^(additionally )?\+?\d+(\.\d+)?%?$/i.test(clause);
    const rule: UnmodelledRule | undefined =
      carried && previous && "pattern" in previous ? previous : UNMODELLED_RULES.find((r) => r.pattern.test(clause));
    if (rule) {
      parts.unmodelled.push({ text: clause, reason: rule.reason, note: rule.note });
      previous = rule;
      continue;
    }
    const bonus = bonusEnchant(clause, ctx.url);
    if (bonus) {
      parts.bonusEnchant.push(bonus);
      continue;
    }
    let m = LIFETIME.exec(clause);
    if (m) {
      parts.effects.push(effect("Void.EntityLifetime", "mul", 1 + Number(m[1]) / 100, clause, ctx.url, '"Entities" is read as Void entities.'));
      continue;
    }
    m = MANA_SHARE.exec(clause);
    if (m) {
      parts.effects.push(effect("Click.ProductionShare", "add", Number(m[1]) / 100, clause, ctx.url));
      continue;
    }
    m = EXPEDITION.exec(clause);
    if (m) {
      const target = PHRASES[phraseKey(m.groups!.name)];
      if (target?.percent === "mul") {
        const a = Number(m.groups!.a);
        const mismatch = Math.abs(a * 100 - Number(m.groups!.pct)) > 1e-9 ? `The text's "(${m.groups!.pct}% per Expedition Level)" disagrees with the factor ${a}; the factor is used.` : undefined;
        const stats = typeof target.stat === "string" ? [target.stat] : target.stat;
        for (const s of stats) parts.effects.push(effect(s, "mul", f(`1 + ${a} * Expeditions.Level`), clause, ctx.url, joinNotes(NOTES.percentMul, mismatch)));
        continue;
      }
    }

    const cm = CLAUSE.exec(clause);
    if (!cm) {
      const target = PHRASES[phraseKey(clause)];
      if (target) pending.push(target);
      else parts.unmodelled.push({ text: clause, reason: "unparsed" });
      continue;
    }
    const g = cm.groups!;
    const name = phraseKey(g.name);
    const valued: ValuedClause = {
      decrease: Boolean(g.dec),
      mod: (g.mod?.toLowerCase() as ValuedClause["mod"]) ?? null,
      value: Number(g.num) * (g.sign === "-" ? -1 : 1),
      percent: Boolean(g.pct),
    };
    let target: Target | null | undefined;
    let note: string | undefined;
    if (name === "" || name === "additionally") {
      target = previous && !("pattern" in previous) ? previous : null;
      note = NOTES.carried;
    } else {
      target = PHRASES[name];
    }
    const targets = target ? [...pending.map((t) => ({ t, note: NOTES.shared })), { t: target, note }] : [];
    pending = [];
    const produced = targets.map(({ t, note: n }) => effectsFor(t, valued, clause, ctx.url, n));
    if (!target || produced.some((p) => p === null)) {
      parts.unmodelled.push({ text: clause, reason: "unparsed", note: target ? "The phrase is known but this form of value is not." : undefined });
      previous = null;
      continue;
    }
    parts.effects.push(...produced.flat() as ItemEffect[]);
    previous = target;
  }
  for (const t of pending) parts.unmodelled.push({ text: String(t.stat), reason: "unparsed", note: "A stat name without a value." });

  if (levelScaling) parts.effects = applyLevelScaling(parts.effects);
  return parts;
}

/** Builds an effect for a hand-encoded override; string values are parsed as formulas. A note marks it unverified unless `verified` is set. */
export function overrideEffect(
  ctx: OverrideContext,
  stat: string,
  op: "add" | "mul",
  value: number | string | Expr,
  note?: string,
  verified = !note,
): ItemEffect {
  return { stat, op, value: typeof value === "string" ? f(value) : value, text: ctx.text, source: { url: ctx.url, verified, ...(note ? { note } : {}) } };
}

/** Parses an enchant text such as "Evocation efficiency +20%" into a per-level multiplier. */
export function parseEnchant(desc: string, url: string): EnchantDef {
  const text = normalizeText(desc);
  const src: Source = { url, verified: true, note: `Enchant levels multiply: (1 + x)^level (${ENCHANTMENTS_URL}).` };
  const rule = UNMODELLED_RULES.find((r) => r.pattern.test(text));
  if (rule) return { desc, stat: null, perLevel: 0, unmodelled: { text, reason: rule.reason, note: rule.note }, source: src };
  const m = CLAUSE.exec(text);
  const target = m ? PHRASES[phraseKey(m.groups!.name)] : undefined;
  if (!m || !target || !m.groups!.pct || m.groups!.mod || m.groups!.dec || target.percent !== "mul" || typeof target.stat !== "string") {
    return { desc, stat: null, perLevel: 0, unmodelled: { text, reason: "unparsed" }, source: src };
  }
  return { desc, stat: target.stat, perLevel: Number(m.groups!.num) / 100, source: src };
}
