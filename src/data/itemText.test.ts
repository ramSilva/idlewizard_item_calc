import { describe, expect, it } from "vitest";
import { toInfix } from "../engine/expr.ts";
import type { ItemEffect } from "../engine/model.ts";
import { normalizeText, parseEffectText, parseEnchant, splitClauses } from "./itemText.ts";

const URL = "https://idlewizard.wiki.gg/wiki/Test";
const parse = (desc: string) => parseEffectText(desc, { url: URL, quality: "Legendary" });
const brief = (effects: ItemEffect[]) =>
  effects.map((e) => [e.stat, e.op, typeof e.value === "number" ? +e.value.toPrecision(12) : toInfix(e.value)]);

describe("normalizeText and splitClauses", () => {
  it("turns markup into formula text and clause breaks", () => {
    expect(normalizeText("Profits +150%<br>Idle bonus +75%<br>Patience +50")).toBe("Profits +150%, Idle bonus +75%, Patience +50");
    expect(normalizeText("x log<sub>10</sub>(A + 1)<sup>1.2</sup> y.")).toBe("x log10(A + 1)^(1.2) y");
  });

  it("splits on commas and sentence ends but not inside parentheses or decimals", () => {
    expect(splitClauses("A +1.5%, B (x, y) +2. Scales multiplicatively")).toEqual(["A +1.5%", "B (x, y) +2", "Scales multiplicatively"]);
  });
});

describe("parseEffectText", () => {
  it('reads "X +N%" as a multiplier and "Attr +N" as added points', () => {
    const r = parse("Profits +25%, Intelligence +20, Nexi profit +250%");
    expect(brief(r.effects)).toEqual([
      ["Prod.Global", "mul", 1.25],
      ["Attr.Intelligence", "add", 20],
      ["Building.8.Profit", "mul", 3.5],
    ]);
    expect(r.effects[0].source.verified).toBe(false);
    expect(r.effects[1].source.verified).toBe(true);
    expect(r.unmodelled).toEqual([]);
  });

  it('adds "(base)" bonuses to the base and multiplies "(multiplicative)" ones', () => {
    const r = parse("Void Mana profit (base) +60%, Void Mana profit (multiplicative) +20%, Mysteries power (base) +20%, Pet Experience (base) +100");
    expect(brief(r.effects)).toEqual([
      ["Void.ProfitPerPoint", "add", 0.6],
      ["Void.ProfitPerPoint", "mul", 1.2],
      ["Mysteries.Power", "add", 0.2],
      ["Pet.ExperienceFlat", "add", 100],
    ]);
  });

  it("routes flat and percentage bonuses of the same phrase to the right stat", () => {
    expect(brief(parse("Critical rating +10000, critical rating +200%, critical chance +3%").effects)).toEqual([
      ["Click.CritRating", "add", 10000],
      ["Click.CritRating", "mul", 3],
      ["Click.CritChance", "add", 3],
    ]);
    expect(brief(parse("Void Mana per Entity +300, Void Mana per Entity +25%").effects)).toEqual([
      ["Void.ManaPerEntityFlat", "add", 300],
      ["Void.ManaPerEntity", "mul", 1.25],
    ]);
  });

  it("shares a value across listed stat names and carries a bare value to the previous stat", () => {
    expect(brief(parse("Click profit, critical profit +200%, critical rating +1000, 150%").effects)).toEqual([
      ["Click.Profit", "mul", 3],
      ["Click.CritProfit", "mul", 3],
      ["Click.CritRating", "add", 1000],
      ["Click.CritRating", "mul", 2.5],
    ]);
  });

  it("reads divisors as factors and cost reductions as additive fractions", () => {
    expect(brief(parse("Divides summoning duration +1.35, Spell costs reduction +5%, Incantation Duration Divisor 2, reduces Evocation duration +50%").effects)).toEqual([
      ["Spell.SummoningDurationDivisor", "mul", 1.35],
      ["Spell.CostReduction", "add", 0.05],
      ["Spell.IncantationDurationDivisor", "mul", 2],
      ["Spell.EvocationDuration", "mul", 0.5],
    ]);
  });

  it("expands All Attributes to every attribute", () => {
    const r = parse("All Attributes +5");
    expect(r.effects).toHaveLength(9);
    expect(r.effects.every((e) => e.op === "add" && e.value === 5 && e.stat.startsWith("Attr."))).toBe(true);
  });

  it("raises phylactery factors to the character level, including decreases", () => {
    const r = parse("Incantation efficiency +0.36%, decreases Evocation efficiency +0.75%. Scales multiplicatively from Character level.");
    expect(brief(r.effects)).toEqual([
      ["Spell.IncantationEfficiency", "mul", "(1.0036 ^ Char.Level)"],
      ["Spell.EvocationEfficiency", "mul", "(0.9925 ^ Char.Level)"],
    ]);
    expect(r.effects.every((e) => !e.source.verified && e.source.note)).toBe(true);
  });

  it("reads Expedition Level formulas and flags a mismatching percentage", () => {
    const ok = parse("Evocation efficiency +0.132 * Expedition Level (13.2% per Expedition Level)");
    expect(brief(ok.effects)).toEqual([["Spell.EvocationEfficiency", "mul", "(1 + (0.132 * Expeditions.Level))"]]);
    const mismatch = parse("Idle bonus +0.021 * Expedition Level (2.7% per Expedition Level)");
    expect(mismatch.effects[0].source.note).toMatch(/disagrees/);
  });

  it("recognises bonus enchant levels by scope", () => {
    expect(parse("Enchantments on your equipped items are 4 levels stronger").bonusEnchant).toMatchObject([{ scope: "all", levels: 4 }]);
    expect(parse("Finger Items Enchantment level +4").bonusEnchant).toMatchObject([{ scope: "Finger", levels: 4 }]);
    expect(parse("This Item's Enchantment Level +2").bonusEnchant).toMatchObject([{ scope: "self", levels: 2 }]);
  });

  it("keeps clauses it can't model, with a reason", () => {
    const r = parse("Offline bonus +300%, character ability power +200%, Maximum resources in jars +3000, additionally +200%, Frobnicate +5%");
    expect(brief(r.effects)).toEqual([["Hero.AbilityPower", "mul", 3]]);
    expect(r.unmodelled.map((u) => [u.text, u.reason])).toEqual([
      ["Offline bonus +300%", "not-production"],
      ["Maximum resources in jars +3000", "not-production"],
      ["additionally +200%", "not-production"],
      ["Frobnicate +5%", "unparsed"],
    ]);
  });

  it("applies overrides before the phrase table and parses the rest", () => {
    const r = parseEffectText("Weird formula thing, Profits +10%", {
      url: URL,
      quality: "Epic",
      overrides: [{ pattern: /weird formula thing/, build: (_m, ctx) => ({ unmodelled: [{ text: `${ctx.text} @${ctx.tier}`, reason: "mechanic" }] }) }],
    });
    expect(r.unmodelled).toEqual([{ text: "Weird formula thing @3", reason: "mechanic" }]);
    expect(brief(r.effects)).toEqual([["Prod.Global", "mul", 1.1]]);
  });
});

describe("parseEnchant", () => {
  it("reads the per-level multiplier, with or without a plus sign", () => {
    expect(parseEnchant("Evocation efficiency +20%", URL)).toMatchObject({ stat: "Spell.EvocationEfficiency", perLevel: 0.2 });
    expect(parseEnchant("Autoclick Profit 25%", URL)).toMatchObject({ stat: "Click.AutoclickProfit", perLevel: 0.25 });
    expect(parseEnchant("Void Profits +22.50%", URL)).toMatchObject({ stat: "Void.ProfitPerPoint", perLevel: 0.225 });
    expect(parseEnchant("All Enchanting Dust (with exception of Trials) gains +1%", URL)).toMatchObject({ stat: "Items.EnchantingDustIncome", perLevel: 0.01 });
  });

  it("marks enchants on unmodelled stats", () => {
    expect(parseEnchant("Offline bonus +25%", URL)).toMatchObject({ stat: null, unmodelled: { reason: "not-production" } });
    expect(parseEnchant("Frobnication +5%", URL)).toMatchObject({ stat: null, unmodelled: { reason: "unparsed" } });
  });
});
