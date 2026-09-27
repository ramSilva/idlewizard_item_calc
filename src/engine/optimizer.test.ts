import { describe, expect, it } from "vitest";
import { f, type Expr } from "./expr.ts";
import { compileGraph, createModifiers, FloatEvaluator, type StatGraph } from "./graph.ts";
import { ItemCatalog, resolveLoadout, unmetRequirements, type EquippedItem } from "./loadout.ts";
import type { Attribute, BonusEnchant, ItemDef, ItemEffect, ItemSlot, SetDef, Source } from "./model.ts";
import { SLOT_CAPACITY } from "./model.ts";
import { Optimizer, type OptimizerOptions, type OptimizerProblem } from "./optimizer.ts";
import { derivedStat, inputStat, multiplierStat, StatRegistry } from "./stats.ts";

const SRC: Source = { url: "https://idlewizard.wiki.gg/wiki/Items", verified: false, note: "synthetic test item" };

type EffectSpec = [stat: string, op: "add" | "mul", value: number | Expr];

interface ItemSpec {
  name: string;
  slot: ItemSlot;
  effects: EffectSpec[];
  set?: string;
  enchant?: [stat: string, perLevel: number];
  requirements?: Partial<Record<Attribute, number>>;
  bonus?: BonusEnchant["scope"] extends infer S ? [scope: S, levels: number] : never;
}

const effect = ([stat, op, value]: EffectSpec): ItemEffect => ({ stat, op, value, text: `${stat} ${op} ${String(value)}`, source: SRC });
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function item(s: ItemSpec): ItemDef {
  return {
    key: key(s.name),
    id: null,
    name: s.name,
    slot: s.slot,
    set: s.set ?? null,
    startQuality: "Legendary",
    maxQuality: "Legendary",
    requirements: s.requirements ?? {},
    tiers: [
      {
        quality: "Legendary",
        desc: s.name,
        effects: s.effects.map(effect),
        bonusEnchant: s.bonus ? [{ scope: s.bonus[0], levels: s.bonus[1], text: "bonus", source: SRC }] : [],
        unmodelled: [],
      },
    ],
    enchant: s.enchant ? { desc: "enchant", stat: s.enchant[0], perLevel: s.enchant[1], source: SRC } : null,
    mythic: false,
    acquisition: null,
    details: null,
    source: SRC,
  };
}

function set(name: string, items: ItemDef[], tiers: { pieces: number; effects: EffectSpec[]; bonus?: [ItemSlot, number] }[]): SetDef {
  return {
    name,
    items: items.map((i) => i.key),
    tiers: tiers.map((t) => ({
      pieces: t.pieces,
      desc: `${name} ${t.pieces}`,
      effects: t.effects.map(effect),
      bonusEnchant: t.bonus ? [{ scope: t.bonus[0], levels: t.bonus[1], text: "bonus", source: SRC }] : [],
      unmodelled: [],
    })),
    source: SRC,
  };
}

const STATS = new StatRegistry([
  multiplierStat("S.Evo", "Evocation", "Spells"),
  multiplierStat("S.Inc", "Incantation", "Spells"),
  inputStat("S.Cap", "Class ability power", "Character", { default: 10, kind: "number", min: 0, logScale: true }),
  inputStat("S.Pap", "Pet ability power", "Pet", { default: 1, kind: "number", min: 0, logScale: true }),
  inputStat("S.Scale", "Global scale", "Misc", { default: 1, kind: "number", min: 0, logScale: true }),
  inputStat("S.Offset", "Offset", "Misc", { default: 100, kind: "number", min: 0, logScale: true }),
  inputStat("AttrPoints.Intelligence", "Intelligence points", "Attributes", { default: 50, kind: "integer", min: 0 }),
  derivedStat("Attr.Intelligence", "Intelligence", "Attributes", f("AttrPoints.Intelligence")),
]);

const SCORE = f("S.Scale * S.Evo * S.Inc ^ 2 * (S.Cap * S.Pap + S.Offset) ^ 0.8 * (1 + Attr.Intelligence / 100)");

function problem(items: ItemDef[], sets: SetDef[] = [], attributes?: Partial<Record<Attribute, number>>): OptimizerProblem & { graph: StatGraph } {
  const catalog = new ItemCatalog(items, sets);
  const graph = compileGraph({ stats: STATS, score: SCORE, items: catalog.spec });
  return { graph, catalog, items, sets, attributes };
}

/** Reference: every loadout of the owned items through `resolveLoadout`, as the app's preset scoring does. */
function bruteForce(p: OptimizerProblem, options: OptimizerOptions, level: number): { score: number; keys: string[] } {
  const ev = new FloatEvaluator(p.graph, p.inputs);
  const overrides = options.enchantOverrides ?? {};
  const bySlot = new Map<ItemSlot, ItemDef[]>();
  for (const i of p.items) {
    if (options.excludedSlots?.includes(i.slot)) continue;
    if (options.resonator === false && i.tiers[0].bonusEnchant.some((b) => b.scope === "all")) continue;
    bySlot.set(i.slot, [...(bySlot.get(i.slot) ?? []), i]);
  }
  const choices = [...bySlot].map(([slot, list]) => {
    const out: ItemDef[][] = [[]];
    for (let a = 0; a < list.length; a++) {
      out.push([list[a]]);
      if (SLOT_CAPACITY[slot] > 1) for (let b = a + 1; b < list.length; b++) out.push([list[a], list[b]]);
    }
    return out;
  });
  let best = { score: -Infinity, keys: [] as string[] };
  const attrs = p.attributes ?? { Intelligence: 50 };
  const walk = (d: number, chosen: ItemDef[]) => {
    if (d === choices.length) {
      const equipped: EquippedItem[] = chosen.map((item) => ({ item, enchant: item.enchant ? (overrides[item.key] ?? level) : 0 }));
      if (unmetRequirements(equipped, attrs, p.sets).length > 0) return;
      const mods = createModifiers(p.graph, p.catalog.modifierSpec(resolveLoadout(equipped, { legion: options.legion ?? false, sets: p.sets })));
      const s = ev.scoreLog10(mods);
      if (s > best.score + 1e-12) best = { score: s, keys: chosen.map((i) => i.key).sort() };
      return;
    }
    for (const c of choices[d]) walk(d + 1, [...chosen, ...c]);
  };
  walk(0, []);
  return best;
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function randomCatalog(seed: number): { items: ItemDef[]; sets: SetDef[] } {
  const r = rng(seed);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const between = (lo: number, hi: number) => lo + (hi - lo) * r();
  const randomEffect = (): EffectSpec =>
    pick<() => EffectSpec>([
      () => ["S.Evo", "mul", between(1.1, 3)],
      () => ["S.Inc", "mul", between(1.05, 1.6)],
      () => ["S.Cap", "add", Math.round(between(5, 60))],
      () => ["S.Pap", "mul", between(1.1, 2.5)],
      () => ["S.Pap", "add", Math.round(between(1, 20))],
      () => ["Attr.Intelligence", "add", Math.round(between(10, 50))],
      () => ["S.Evo", "mul", f(`1 + S.Cap / ${Math.round(between(20, 200))}`)],
    ])();
  const slots: ItemSlot[] = ["Head", "Hands", "Chest", "Feet", "Finger"];
  const items: ItemDef[] = [];
  let n = 0;
  for (const slot of slots) {
    const count = slot === "Finger" ? 4 : 3 + Math.floor(r() * 2);
    for (let k = 0; k < count; k++) {
      const effects = Array.from({ length: 1 + Math.floor(r() * 2) }, randomEffect);
      items.push(
        item({
          name: `${slot} ${++n}`,
          slot,
          effects,
          enchant: r() < 0.8 ? [pick(["S.Evo", "S.Inc", "S.Pap"]), between(0.02, 0.3)] : undefined,
          requirements: r() < 0.25 ? { Intelligence: Math.round(between(55, 110)) } : undefined,
        }),
      );
    }
  }
  items.push(item({ name: "Resonator", slot: "Finger", effects: [], bonus: ["all", 3] }));
  const members = [items.find((i) => i.slot === "Head")!, items.find((i) => i.slot === "Hands")!, items.find((i) => i.slot === "Chest")!];
  const setName = "Synthetic Set";
  for (const m of members) (m as { set: string | null }).set = setName;
  const sets = [
    set(setName, members, [
      { pieces: 2, effects: [["S.Evo", "mul", between(1.2, 4)]] },
      { pieces: 3, effects: [["S.Inc", "mul", between(1.1, 2)]], bonus: ["Finger", 2] },
    ]),
  ];
  return { items, sets };
}

describe("optimizer against brute force", () => {
  const seeds = Array.from({ length: 12 }, (_, i) => 1000 + i * 7919);

  it.each(seeds)("branch-and-bound over every candidate matches exhaustive enumeration (seed %i)", (seed) => {
    const { items, sets } = randomCatalog(seed);
    const r = rng(seed + 1);
    const p = problem(items, sets);
    const level = Math.floor(r() * 30);
    const options: OptimizerOptions = { legion: r() < 0.5, pruning: "none", enchantOverrides: { [items[0].key]: 0, [items[4].key]: 12 } };
    const ref = bruteForce(p, options, level);
    const row = new Optimizer(p, options).optimizeLevel(level);
    expect(row.best.scoreLog10).toBeCloseTo(ref.score, 9);
    expect(row.branches.every((b) => b.stats.complete)).toBe(true);
    expect(row.branches.some((b) => !b.stats.exhaustive)).toBe(true);
  });

  // The catalogues are adversarial (Cap and Pap multiply inside a sum with a large offset), so the bot-style pruning,
  // a heuristic, misses some optima that need three or more slots to change at once: 31 of 36 at the defaults.
  it.each([
    ["defaults", {}, 30],
    ["pair polish", { polishDepth: 2 }, 32],
  ] as const)("the bot-style pruning (%s) finds the brute-force optimum on most random catalogues", (_, extra, minimum) => {
    let matched = 0;
    for (const seed of seeds) {
      const { items, sets } = randomCatalog(seed);
      const p = problem(items, sets);
      for (const level of [0, 10, 25]) {
        const options: OptimizerOptions = { legion: true, ...extra };
        const ref = bruteForce(p, options, level);
        const row = new Optimizer(p, options).optimizeLevel(level);
        expect(row.best.scoreLog10).toBeLessThanOrEqual(ref.score + 1e-9);
        if (row.best.scoreLog10 >= ref.score - 1e-9) matched++;
      }
    }
    expect(matched).toBeGreaterThanOrEqual(minimum);
  });

  it("reports every reported score consistently with the reference loadout path", () => {
    const { items, sets } = randomCatalog(4242);
    const p = problem(items, sets);
    const opt = new Optimizer(p, { legion: true });
    const row = opt.optimizeLevel(20);
    const equipped = row.best.items.map((i) => ({ item: items.find((x) => x.key === i.key)!, enchant: i.enchant }));
    const resolved = resolveLoadout(equipped, { legion: true, sets });
    const ref = new FloatEvaluator(p.graph).scoreLog10(createModifiers(p.graph, p.catalog.modifierSpec(resolved)));
    expect(row.best.scoreLog10).toBeCloseTo(ref, 9);
    for (const i of row.best.items) expect(i.effectiveEnchant).toBe(resolved.enchantLevels[i.key]);
    expect(row.best.gainLog10).toBeCloseTo(row.best.scoreLog10 - opt.baselineLog10, 12);
  });
});

describe("bonus enchant levels", () => {
  const ring = item({ name: "Plain Ring", slot: "Finger", effects: [["S.Evo", "mul", 1.5]], enchant: ["S.Evo", 0.2] });
  const band = item({ name: "Plain Band", slot: "Finger", effects: [["S.Evo", "mul", 1.4]], enchant: ["S.Evo", 0.2] });
  const helm = item({ name: "Helm", slot: "Head", effects: [["S.Inc", "mul", 1.2]], enchant: ["S.Inc", 0.3] });
  const resonator = item({ name: "Resonator", slot: "Finger", effects: [], bonus: ["all", 4] });
  const others = (["Hands", "Chest", "Feet"] as const).map((slot) => item({ name: `Worn ${slot}`, slot, effects: [["S.Inc", "mul", 1.1]], enchant: ["S.Inc", 0.3] }));

  it("searches Resonator forced in and excluded, and gives its levels only to enchanted items", () => {
    const p = problem([ring, band, helm, resonator, ...others]);
    const opt = new Optimizer(p, { legion: true });
    const high = opt.optimizeLevel(20);
    expect(high.branches.map((b) => b.forced)).toEqual([[], ["resonator"]]);
    expect(high.best.forced).toEqual(["resonator"]);
    expect(high.best.items.find((i) => i.key === "helm")!.effectiveEnchant).toBe(20 + 5);
    expect(high.best.items.find((i) => i.key === "resonator")!.effectiveEnchant).toBe(0);
    expect(high.best.scoreLog10).toBeCloseTo(bruteForce(p, { legion: true }, 20).score, 9);
    const low = opt.optimizeLevel(0);
    expect(low.best.forced).toEqual([]);
    expect(low.best.items.map((i) => i.key)).toEqual(expect.arrayContaining(["plain-band", "plain-ring"]));
    expect(low.best.items.every((i) => i.effectiveEnchant === 0)).toBe(true);
  });

  it("caps all-item bonus levels at 5 and skips the Resonator branch when it's disabled", () => {
    const p = problem([ring, band, helm, resonator]);
    const noLegion = new Optimizer(p, { legion: false }).optimizeLevel(10);
    expect(noLegion.best.items.find((i) => i.key === "helm")!.effectiveEnchant).toBe(10 + 4);
    const off = new Optimizer(p, { legion: true, resonator: false });
    expect(off.excluded).toContainEqual({ key: "resonator", name: "Resonator", reason: "resonator-disabled" });
    expect(off.optimizeLevel(10).branches).toHaveLength(1);
  });

  it("applies slot-scoped set bonuses exactly (Finger +4 at 2 pieces)", () => {
    const a = item({ name: "Armor A", slot: "Chest", set: "Armor", effects: [["S.Inc", "mul", 1.1]] });
    const b = item({ name: "Armor B", slot: "Legs", set: "Armor", effects: [["S.Inc", "mul", 1.1]] });
    const armor = set("Armor", [a, b], [{ pieces: 2, effects: [], bonus: ["Finger", 4] }]);
    const p = problem([ring, a, b], [armor]);
    const row = new Optimizer(p, {}).optimizeLevel(10);
    expect(row.best.items.find((i) => i.key === "plain-ring")!.effectiveEnchant).toBe(14);
    const ref = bruteForce(p, {}, 10);
    expect(row.best.scoreLog10).toBeCloseTo(ref.score, 9);
  });
});

describe("sets, requirements, overrides and exclusions", () => {
  it("equips set pieces that only win together", () => {
    const pieces = ["Head", "Hands", "Chest"].map((slot) => item({ name: `Set ${slot}`, slot: slot as ItemSlot, set: "Trio", effects: [["S.Evo", "mul", 1.1]] }));
    const solo = ["Head", "Hands", "Chest"].map((slot) => item({ name: `Solo ${slot}`, slot: slot as ItemSlot, effects: [["S.Evo", "mul", 1.5]] }));
    const trio = set("Trio", pieces, [
      { pieces: 2, effects: [["S.Evo", "mul", 1.2]] },
      { pieces: 3, effects: [["S.Inc", "mul", 3]] },
    ]);
    const all = new Optimizer(problem([...pieces, ...solo], [trio]), {}).optimizeLevel(0);
    expect(all.best.items.map((i) => i.key).sort()).toEqual(["set-chest", "set-hands", "set-head"]);
    const owned = { "set-head": "Legendary", "set-hands": "Legendary", "solo-head": "Legendary", "solo-hands": "Legendary", "solo-chest": "Legendary" } as const;
    const partial = new Optimizer(problem([...pieces, ...solo], [trio]), { owned }).optimizeLevel(0);
    expect(partial.best.items.map((i) => i.key).sort()).toEqual(["solo-chest", "solo-hands", "solo-head"]);
    expect(partial.best.scoreLog10).toBeCloseTo(bruteForce(problem([...solo, pieces[0], pieces[1]], [trio]), {}, 0).score, 9);
  });

  it("filters unreachable requirements and counts other items' attribute bonuses", () => {
    const smart = item({ name: "Smart Hat", slot: "Head", effects: [["S.Evo", "mul", 10]], requirements: { Intelligence: 80 } });
    const genius = item({ name: "Genius Hat", slot: "Head", effects: [["S.Evo", "mul", 100]], requirements: { Intelligence: 500 } });
    const plain = item({ name: "Plain Hat", slot: "Head", effects: [["S.Evo", "mul", 2]] });
    const book = item({ name: "Book", slot: "Offhand", effects: [["Attr.Intelligence", "add", 40]] });
    const p = problem([smart, genius, plain, book], [], { Intelligence: 50 });
    const opt = new Optimizer(p, {});
    expect(opt.excluded).toContainEqual({ key: "genius-hat", name: "Genius Hat", reason: "requirements" });
    const row = opt.optimizeLevel(0);
    expect(row.best.items.map((i) => i.key).sort()).toEqual(["book", "smart-hat"]);
    expect(row.best.items.find((i) => i.key === "book")!.contributionLog10).toBe(Infinity);
    const withoutBook = new Optimizer(problem([smart, plain], [], { Intelligence: 50 }), {}).optimizeLevel(0);
    expect(withoutBook.best.items.map((i) => i.key)).toEqual(["plain-hat"]);
  });

  it("keeps per-item enchant overrides fixed across the sweep", () => {
    const a = item({ name: "Hat A", slot: "Head", effects: [["S.Evo", "mul", 2]], enchant: ["S.Evo", 0.2] });
    const b = item({ name: "Gloves B", slot: "Hands", effects: [["S.Inc", "mul", 1.5]], enchant: ["S.Inc", 0.2] });
    const opt = new Optimizer(problem([a, b]), { enchantOverrides: { "hat-a": 0, "gloves-b": 30 } });
    for (const row of opt.sweep([0, 20, 55]).levels) {
      expect(row.best.items.find((i) => i.key === "hat-a")!.enchant).toBe(0);
      expect(row.best.items.find((i) => i.key === "gloves-b")!.enchant).toBe(30);
    }
  });

  it("lists excluded items with a reason", () => {
    const a = item({ name: "Hat A", slot: "Head", effects: [["S.Evo", "mul", 2]] });
    const b = item({ name: "Belt", slot: "Waist", effects: [["S.Evo", "mul", 2]] });
    const c = item({ name: "Hat C", slot: "Head", effects: [["S.Evo", "mul", 3]] });
    const inert = item({ name: "Inert Cape", slot: "Back", effects: [["Unknown.Stat", "mul", 2]] });
    const mythic = { ...item({ name: "Mythic Hat", slot: "Head", effects: [["S.Evo", "mul", 9]] }), mythic: true };
    const catalog = new ItemCatalog([a, b, c, mythic], []);
    const graph = compileGraph({ stats: STATS, score: SCORE, items: catalog.spec });
    const opt = new Optimizer({ graph, catalog, items: [a, b, c, inert, mythic], sets: [] }, { excludedSlots: ["Waist"] });
    expect(opt.excluded.map((e) => [e.key, e.reason]).sort()).toEqual([
      ["belt", "excluded-slot"],
      ["inert-cape", "no-effect"],
      ["mythic-hat", "mythic"],
    ]);
    const owned = new Optimizer({ graph, catalog, items: [a, c], sets: [] }, { owned: { "hat-a": "Legendary" } });
    expect(owned.excluded).toEqual([{ key: "hat-c", name: "Hat C", reason: "not-owned" }]);
  });
});

describe("enchant sweep", () => {
  it("reports the levels where the best set changes", () => {
    const flat = item({ name: "Flat Hat", slot: "Head", effects: [["S.Evo", "mul", 1000]], enchant: ["S.Evo", 0.05] });
    const growth = item({ name: "Growth Hat", slot: "Head", effects: [["S.Evo", "mul", 10]], enchant: ["S.Evo", 0.2] });
    const result = new Optimizer(problem([flat, growth]), {}).sweep();
    // 1000 · 1.05^L = 10 · 1.2^L at L = log(100) / log(1.2 / 1.05) ≈ 34.5
    expect(result.changes).toEqual([0, 35]);
    expect(result.levels[34].best.items[0].key).toBe("flat-hat");
    expect(result.levels[35].best.items[0].key).toBe("growth-hat");
    expect(result.levels[35].changed).toBe(true);
    expect(result.levels[36].changed).toBe(false);
  });
});

describe("relevance against real candidate sets", () => {
  it("hides inputs that scale every candidate equally and shows ones that change the ranking", () => {
    const capItem = item({ name: "Cap Hat", slot: "Head", effects: [["S.Cap", "add", 50]] });
    const evoItem = item({ name: "Evo Hat", slot: "Head", effects: [["S.Evo", "mul", 3]] });
    const opt = new Optimizer(problem([capItem, evoItem]), {});
    const rel = opt.relevance(opt.optimizeLevel(0));
    const shown = (id: string) => rel.inputs.find((i) => i.id === id)!.shown;
    expect(shown("S.Scale")).toBe(false);
    expect(shown("S.Offset")).toBe(true);
    expect(shown("S.Pap")).toBe(true);
  });

  it("treats deviations below the threshold as noise", () => {
    const capItem = item({ name: "Cap Hat", slot: "Head", effects: [["S.Cap", "add", 0.001]] });
    const evoItem = item({ name: "Evo Hat", slot: "Head", effects: [["S.Evo", "mul", 3]] });
    const opt = new Optimizer(problem([capItem, evoItem]), {});
    const row = opt.optimizeLevel(0);
    const offset = (threshold: number) => opt.relevance(row, { threshold }).inputs.find((i) => i.id === "S.Offset")!;
    expect(offset(0).shown).toBe(true);
    expect(offset(0.01).shown).toBe(false);
    expect(offset(0.01).reason).toMatch(/noise threshold/);
  });
});
