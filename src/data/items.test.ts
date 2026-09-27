import { describe, expect, it } from "vitest";
import { add, ref, refsOf, type Expr } from "../engine/expr.ts";
import { compileGraph, createModifiers, FloatEvaluator, type InputValues } from "../engine/graph.ts";
import { ItemCatalog } from "../engine/loadout.ts";
import { ATTRIBUTES, ITEM_SLOTS, QUALITIES, SLOT_CAPACITY, type ItemSlot } from "../engine/model.ts";
import { itemByName, ITEMS, presetItems, SETS, tierOf } from "./items.ts";
import { createGenericRegistry, GENERIC_EFFECTS } from "./stats.ts";

const registry = createGenericRegistry();

function evalExpr(e: Expr, inputs: InputValues = {}): number {
  const graph = compileGraph({ stats: registry, score: e });
  return 10 ** new FloatEvaluator(graph, inputs).scoreLog10();
}

const effectValue = (item: string, stat: string, quality?: (typeof QUALITIES)[number]) => {
  const e = tierOf(itemByName(item)!, quality).effects.find((x) => x.stat === stat);
  if (!e) throw new Error(`${item} has no effect on ${stat}`);
  return e.value;
};

/** Burst presets from the Oni, Shaman and Temporalist guides. */
const PRESETS = [
  "104;113;1;29;11;32;48;68;54;83;76;1002;211;301;411;417;91;2007;3005;509",
  "104;113;1;29;18;32;48;68;54;84;72;1002;211;301;411;417;91;2007;3005;509",
  "104;113;6;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509",
  "104;113;1;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509",
  "104;113;1;29;18;31;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509",
  "108;113;4;20;12;33;47;65;59;87;76;1001;206;306;418;406;94;2005;3004;507",
  "108;113;4;20;12;33;47;61;59;87;73;1001;206;306;418;406;94;2005;3004;507",
  "108;113;4;20;12;33;47;61;59;88;73;1001;206;306;418;406;94;2005;3004;507",
  "104;113;6;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508",
  "104;113;1;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508",
  "104;113;1;29;14;36;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508",
  "104;113;1;29;14;36;48;67;59;84;76;1005;207;300;411;408;92;2003;3005;508",
];

describe("item database", () => {
  it("loads all 223 items with valid slots, qualities, tiers and requirements", () => {
    expect(ITEMS).toHaveLength(223);
    expect(ITEMS.filter((i) => i.mythic)).toHaveLength(20);
    expect(new Set(ITEMS.map((i) => i.key)).size).toBe(ITEMS.length);
    const ids = ITEMS.filter((i) => i.id !== null).map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of ITEMS) {
      expect(ITEM_SLOTS, item.name).toContain(item.slot);
      const start = QUALITIES.indexOf(item.startQuality);
      expect(start, item.name).toBeGreaterThanOrEqual(0);
      item.tiers.forEach((t, i) => expect(t.quality, item.name).toBe(QUALITIES[start + i]));
      expect(item.maxQuality).toBe(item.tiers[item.tiers.length - 1].quality);
      expect(["Legendary", "Unique", "Mythic"], item.name).toContain(item.maxQuality);
      for (const [a, v] of Object.entries(item.requirements)) {
        expect(ATTRIBUTES, item.name).toContain(a);
        expect(Number.isInteger(v) && v > 0, `${item.name} ${a}`).toBe(true);
      }
      expect(item.source.url).toMatch(/^https:\/\/idlewizard\.wiki\.gg\/wiki\//);
      expect(item.mythic, item.name).toBe(item.id === null);
    }
  });

  it("links every set to existing items of that set", () => {
    expect(SETS).toHaveLength(12);
    for (const set of SETS) {
      expect(set.tiers.map((t) => t.pieces)).toEqual(set.tiers.map((_, i) => i + 2));
      for (const key of set.items) expect(ITEMS.find((i) => i.key === key)?.set, `${set.name}: ${key}`).toBe(set.name);
      const members = ITEMS.filter((i) => i.set === set.name).map((i) => i.key).sort();
      expect(members).toEqual([...set.items].sort());
    }
  });

  it("resolves every guide preset to a full, slot-valid loadout", () => {
    for (const code of PRESETS) {
      const items = presetItems(code);
      expect(items, code).toHaveLength(20);
      const perSlot = new Map<ItemSlot, number>();
      for (const i of items) perSlot.set(i.slot, (perSlot.get(i.slot) ?? 0) + 1);
      for (const slot of ITEM_SLOTS) expect(perSlot.get(slot) ?? 0, `${code} ${slot}`).toBe(SLOT_CAPACITY[slot]);
    }
  });

  it("targets and references only registered stats, and every effect carries a source", () => {
    const check = (stat: string, value: unknown, what: string) => {
      expect(registry.has(stat), `${what} targets ${stat}`).toBe(true);
      if (value !== null && typeof value === "object") for (const r of refsOf(value as Expr)) expect(registry.has(r), `${what} references ${r}`).toBe(true);
    };
    for (const item of ITEMS) {
      for (const t of item.tiers) {
        for (const e of t.effects) {
          check(e.stat, e.value, `${item.name} ${t.quality}`);
          expect(e.source.url).toBeTruthy();
          if (!e.source.verified) expect(e.source.note, `${item.name}: ${e.text}`).toBeTruthy();
        }
        for (const b of t.bonusEnchant) if (!b.source.verified) expect(b.source.note).toBeTruthy();
      }
      if (item.enchant?.stat) check(item.enchant.stat, null, `${item.name} enchant`);
    }
    for (const set of SETS) for (const t of set.tiers) for (const e of t.effects) check(e.stat, e.value, set.name);
  });

  it("compiles every item-affected stat into one graph with the attribute effects", () => {
    const catalog = new ItemCatalog(ITEMS, SETS);
    const stats = new Set([...catalog.spec.add!, ...catalog.spec.mul!, ...catalog.spec.dynamic!.map((d) => d.stat)]);
    const graph = compileGraph({ stats: registry, effects: GENERIC_EFFECTS, items: catalog.spec, score: add(...[...stats].map(ref)) });
    expect(graph.inertItemStats).toEqual([]);
    expect(graph.dynamic.every((d) => d.target >= 0)).toBe(true);
    const allOn = createModifiers(graph, { dynamic: graph.dynamic.map((_, k) => k) });
    const result = new FloatEvaluator(graph, { "Char.Level": 100, "Pet.Level": 100 }).evaluate(allOn);
    expect(Number.isFinite(result.log10)).toBe(true);
  });
});

describe("worked examples from the wiki", () => {
  it("Enchanting Membrane's Details formula gives 35% edust at Legendary", () => {
    // Details: 5^R × 1.4 / 100 + 1 with R = Tier × 0.25 + 1; the Enchantments page lists "35% + 1% per enchant".
    expect(effectValue("Enchanting Membrane", "Items.EnchantingDustIncome")).toBeCloseTo(1.35, 12);
    expect(effectValue("Enchanting Membrane", "Items.EnchantingDustIncome", "Common")).toBeCloseTo(1.07, 12);
    expect(itemByName("Enchanting Membrane")!.enchant).toMatchObject({ stat: "Items.EnchantingDustIncome", perLevel: 0.01 });
  });

  it("Pitch-black Cage matches the Analysis table on its page", () => {
    const factor = (bats: number, q: (typeof QUALITIES)[number]) => evalExpr(effectValue("Pitch-black Cage", "Void.ManaPerEntity", q) as Expr, { "Misc.BatsThisExile": bats });
    expect(factor(1, "Legendary") - 1).toBeCloseTo(7.1, 1);
    expect(factor(1000, "Legendary") - 1).toBeCloseTo(158.2, 1);
    expect(factor(1000, "Common") - 1).toBeCloseTo(2.8, 1);
    expect(factor(100, "Epic") - 1).toBeCloseTo(31.9, 1);
  });

  it("Commissar's Torn Sleeve rounds to the nearest point, as its Notes describe", () => {
    const bonus = effectValue("Commissar's Torn Sleeve", "Attr.Mastery") as Expr;
    expect(evalExpr(bonus, { "Pet.Level": 307 })).toBeCloseTo(25, 9);
    expect(evalExpr(bonus, { "Pet.Level": 306 })).toBeCloseTo(24, 9);
  });

  it("Conjured Razorspaulders' Legendary pet ability power is +100% like its lower tiers and the Fandom text", () => {
    const pap = tierOf(itemByName("Conjured Razorspaulders")!).effects.find((e) => e.stat === "Pet.AbilityPower")!;
    expect(pap).toMatchObject({ op: "mul", value: 2, source: { verified: true } });
    expect(effectValue("Conjured Razorspaulders", "Pet.AbilityPower", "Epic")).toBeCloseTo(1.75, 12);
  });

  it("phylacteries compound per character level and count level requirement reduction", () => {
    const tangerine = effectValue("Robust Tangerine Phylactery", "Mysteries.Power") as Expr;
    expect(evalExpr(tangerine, { "Char.Level": 200 })).toBeCloseTo(1.023 ** 200, 6);
    expect(evalExpr(tangerine, { "Char.Level": 200, "Char.LevelRequirementReduction": 3 })).toBeCloseTo(1.023 ** 203, 6);
    expect(effectValue("Bite Sleeves", "Char.LevelRequirementReduction")).toBe(3);
    expect(effectValue("The Great Journey", "Char.LevelRequirementReduction")).toBe(1);
  });

  it("Scales of Appraisal matches the Enchantments page's experiment efficiency formula", () => {
    const e = effectValue("Scales of Appraisal", "Items.ExperimentEfficiency") as Expr;
    expect(evalExpr(e, { "Items.ExperimentsThisRealm": 99 })).toBeCloseTo(1 + 0.1 * Math.sqrt(2), 12);
  });

  it("weapon formulas use the Details tier factor R", () => {
    expect(evalExpr(effectValue("Chiropteric Rod", "Prod.Global") as Expr, { "Misc.BatsThisExile": 10 })).toBeCloseTo(10 ** 2 + 1, 9);
    expect(evalExpr(effectValue("Chiropteric Rod", "Prod.Global", "Common") as Expr, { "Misc.BatsThisExile": 10 })).toBeCloseTo(10 ** 1.25 + 1, 9);
    const stone = effectValue("Philosopher's Stone", "Spell.EvocationEfficiency") as Expr;
    expect(evalExpr(stone, { "Misc.Laboratories": 999, "Elixir.EvocationIngredients": 1 })).toBeCloseTo(1000 ** (0.065 * 4), 9);
  });
});
