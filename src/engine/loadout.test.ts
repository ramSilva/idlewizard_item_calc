import { describe, expect, it } from "vitest";
import { itemByName, ITEMS, SETS } from "../data/items.ts";
import { createGenericRegistry, GENERIC_EFFECTS } from "../data/stats.ts";
import { f } from "./expr.ts";
import { compileGraph, createModifiers, FloatEvaluator } from "./graph.ts";
import { ItemCatalog, resolveLoadout, unmetRequirements, validateLoadout, type EquippedItem } from "./loadout.ts";
import type { ItemDef } from "./model.ts";

const item = (name: string): ItemDef => {
  const i = itemByName(name);
  if (!i) throw new Error(`no item ${name}`);
  return i;
};
const eq = (name: string, enchant = 0, quality?: ItemDef["maxQuality"]): EquippedItem => ({ item: item(name), enchant, quality });
const resolve = (equipped: EquippedItem[], legion = false) => resolveLoadout(equipped, { legion, sets: SETS });
const enchantFactor = (equipped: EquippedItem[], name: string, legion = false) =>
  resolve(equipped, legion).effects.find((e) => e.kind === "enchant" && e.from === item(name).key)?.value ?? 1;

describe("enchant levels", () => {
  it("reproduces the Enchantments page table: (1 + x)^level", () => {
    expect(enchantFactor([eq("Fiery Grips", 10)], "Fiery Grips")).toBeCloseTo(6.19, 2);
    expect(enchantFactor([eq("Fiery Grips", 20)], "Fiery Grips")).toBeCloseTo(38.34, 2);
    expect(enchantFactor([eq("Fiery Grips", 40)], "Fiery Grips")).toBeCloseTo(1469.8, 1);
    expect(enchantFactor([eq("The Clockcarers", 40)], "The Clockcarers")).toBeCloseTo(36118.9, 0);
  });

  it("Resonator Ring adds 4.06% edust with an enchanted Enchanting Membrane", () => {
    const edust = (equipped: EquippedItem[]) =>
      resolve(equipped)
        .effects.filter((e) => e.stat === "Items.EnchantingDustIncome")
        .reduce((p, e) => p * (e.value as number), 1);
    const without = edust([eq("Enchanting Membrane", 1)]);
    const withRing = edust([eq("Enchanting Membrane", 1), eq("Resonator Ring")]);
    expect(without).toBeCloseTo(1.35 * 1.01, 12);
    expect(withRing / without).toBeCloseTo(1.0406, 4);
  });

  it("gives bonus levels only to enchanted items and caps all-item bonuses at 5", () => {
    const r = resolve([eq("Resonator Ring", 0), eq("Fiery Grips", 3), eq("Searing Gaze", 0)], true);
    expect(r.globalBonusLevels).toBe(5);
    expect(r.enchantLevels[item("Fiery Grips").key]).toBe(3 + 5);
    expect(r.enchantLevels[item("Resonator Ring").key]).toBe(0);
    expect(r.enchantLevels[item("Searing Gaze").key]).toBe(0);
    expect(resolve([eq("Resonator Ring", 0, "Uncommon"), eq("Fiery Grips", 3)], true).enchantLevels[item("Fiery Grips").key]).toBe(3 + 2);
  });

  it("adds slot-scoped set bonuses on top of the cap (Power Armor 7 pieces: Finger +4)", () => {
    const armor = ["Empowering Headguard", "Empowering Handguards", "Empowering Chestguard", "Empowering Ankleguards", "Empowering Shoulderguard", "Empowering Waistguard", "Empowering Legguards"];
    const r = resolve([...armor.map((n) => eq(n, 1)), eq("Resonator Ring", 2)], true);
    expect(r.setPieces["Power Armor"]).toBe(7);
    expect(r.enchantLevels[item("Resonator Ring").key]).toBe(2 + 5 + 4);
    expect(r.enchantLevels[item("Empowering Headguard").key]).toBe(1 + 5);
  });

  it("applies a Mythic's own bonus levels only to itself", () => {
    const r = resolve([eq("Endtimes Armor", 2), eq("Fiery Grips", 2)]);
    expect(r.enchantLevels[item("Endtimes Armor").key]).toBe(4);
    expect(r.enchantLevels[item("Fiery Grips").key]).toBe(2);
    expect(r.effects.some((e) => e.kind === "enchant" && e.from === item("Endtimes Armor").key)).toBe(false);
  });
});

describe("sets", () => {
  it("apply every tier up to the equipped piece count", () => {
    const r = resolve(["Empowering Headguard", "Empowering Handguards", "Empowering Chestguard", "Empowering Ankleguards"].map((n) => eq(n)));
    const setEvo = r.effects.filter((e) => e.kind === "set" && e.stat === "Spell.EvocationEfficiency").map((e) => e.value);
    expect(setEvo).toEqual([1.5, 2]);
    expect(r.effects.filter((e) => e.kind === "set" && e.stat === "Spell.IncantationEfficiency").map((e) => e.value)).toEqual([1.25]);
  });
});

describe("validation and requirements", () => {
  it("rejects over-full slots, duplicates and bad enchant levels", () => {
    expect(validateLoadout([eq("Resonator Ring"), eq("Spell Helix"), eq("The Bond")])).toEqual(["3 items in Finger (capacity 2)"]);
    expect(validateLoadout([eq("Fiery Grips"), eq("Fiery Grips")])).toContain("Fiery Grips is equipped twice");
    expect(validateLoadout([eq("Fiery Grips", 56)])).toEqual(["Fiery Grips: enchant level 56 is out of range"]);
  });

  it("counts other items' attribute bonuses toward requirements (Legacy's Insight for Ebon Mantle)", () => {
    const equipped = [eq("Ebon Mantle"), eq("Legacy")];
    expect(unmetRequirements(equipped, { Insight: 60, Intelligence: 50 }, SETS)).toEqual([]);
    expect(unmetRequirements(equipped, { Insight: 50, Intelligence: 50 }, SETS)).toEqual([
      { item: item("Ebon Mantle").key, attribute: "Insight", required: 100, available: 90 },
    ]);
  });
});

describe("ItemCatalog", () => {
  const catalog = new ItemCatalog(ITEMS, SETS);
  const graph = compileGraph({
    stats: createGenericRegistry(),
    effects: GENERIC_EFFECTS,
    items: catalog.spec,
    score: f("Spell.EvocationEfficiency * Prod.Global"),
  });
  const score = (equipped: EquippedItem[], inputs = {}) =>
    10 ** new FloatEvaluator(graph, inputs).scoreLog10(createModifiers(graph, catalog.modifierSpec(resolve(equipped))));

  it("turns static tier, set and enchant effects into modifiers", () => {
    expect(score([])).toBeCloseTo(1, 12);
    expect(score([eq("Fiery Grips", 2)])).toBeCloseTo(3 * 1.2 ** 2, 9);
    expect(score([eq("Fiery Grips"), eq("Gemshoes")])).toBeCloseTo(3 * 2.75, 9);
  });

  it("switches on formula effects for the equipped items only", () => {
    const rod = [eq("Chiropteric Rod")];
    expect(score(rod, { "Misc.BatsThisExile": 10 })).toBeCloseTo(101, 6);
    expect(catalog.modifierSpec(resolve(rod)).dynamic).toHaveLength(1);
    expect(score([eq("Intricate Crimson Phylactery")], { "Char.Level": 100 })).toBeCloseTo(0.9925 ** 100, 9);
  });
});
