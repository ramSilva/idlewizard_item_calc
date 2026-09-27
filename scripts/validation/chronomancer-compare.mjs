// Part 2 of the Chronomancer blind check: checks the recorded blind headline set against the gear guidance of the Fandom
// guide (stat priorities only; no revision of the page names an item) and the burst scalings of wiki.gg's successor guide.
// Reads the blind JSON, never writes it.
//
//   node scripts/validation/chronomancer-compare.mjs [--variant era-notes | --file run.json] [--level 10] [--brief] [--json out.json]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const root = fileURLToPath(new URL("../..", import.meta.url));
const argv = process.argv.slice(2);
let variant = "era-notes";
let level = 10;
let jsonOut;
let runFile;
let brief = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--variant") variant = argv[++i];
  else if (argv[i] === "--brief") brief = true;
  else if (argv[i] === "--file") runFile = argv[++i];
  else if (argv[i] === "--level") level = Number(argv[++i]);
  else if (argv[i] === "--json") jsonOut = argv[++i];
  else throw new Error(`Unknown argument ${argv[i]}`);
}

const { module: m } = await runnerImport(`${root}src/data/scriptEntry.ts`, { root, configFile: false, logLevel: "error" });
const fmt = m.formatMultiplier;
if (runFile) variant = runFile;
const file = runFile ?? `${root}validation/chronomancer/${variant === "main" ? "tool-result.json" : `tool-result-${variant}.json`}`;
const blind = JSON.parse(readFileSync(file, "utf8"));
const row = blind.result.levels.find((r) => r.level === level);
if (!row) throw new Error(`${variant} has no enchant ${level} row`);
const inputs = m.deserializeInputs(blind.run.inputOverrides);

// The Fandom guide's burst gear priorities (intro): "items that increase maximum Temporal Distortion and provides
// bonuses to incantation efficiency, evocation efficiency, character ability power and idle bonus for bursting".
const GUIDE_BURST = {
  "Max Time Distortion": ["Time.MaxDistortion"],
  Incantation: ["Spell.IncantationEfficiency"],
  Evocation: ["Spell.EvocationEfficiency"],
  "Character ability power": ["Hero.AbilityPower"],
  "Idle bonus": ["Idle.Bonus"],
};
const categoryOf = (stat) => Object.entries(GUIDE_BURST).find(([, ids]) => ids.includes(stat))?.[0];

const model = m.buildModel(blind.selection, { relevance: false });
const equipped = row.best.items.map((c) => ({ item: m.itemByKey(c.key), enchant: c.enchant }));
const legion = blind.run.legion;

function ownStats(item) {
  const stats = new Set(item.tiers.at(-1).effects.map((e) => e.stat));
  if (item.enchant?.stat) stats.add(item.enchant.stat);
  return stats;
}

// Each stat's share of an item's own contribution (set bonuses aside): swap the item for a copy without its effects on
// that stat (tier effects and enchant) and compare.
function statShares(item) {
  const base = m.loadoutScore(model, equipped, legion, inputs);
  const out = [];
  for (const stat of ownStats(item)) {
    const stripped = {
      ...item,
      tiers: item.tiers.map((t) => ({ ...t, effects: t.effects.filter((e) => e.stat !== stat) })),
      enchant: item.enchant?.stat === stat ? { ...item.enchant, stat: null } : item.enchant,
    };
    const swapped = equipped.map((e) => (e.item.key === item.key ? { ...e, item: stripped } : e));
    let log10;
    try {
      log10 = base - m.loadoutScore(model, swapped, legion, inputs);
    } catch {
      log10 = NaN;
    }
    out.push({ stat, category: categoryOf(stat) ?? null, log10 });
  }
  return out.sort((a, b) => b.log10 - a.log10);
}

const removal = new Map(m.removalGains(model, equipped, legion, inputs).map((r) => [r.name, r.log10]));
const slots = row.best.items.map((c) => {
  const item = m.itemByKey(c.key);
  const shares = statShares(item);
  return {
    slot: c.slot,
    name: c.name,
    set: c.set,
    recordedContributionLog10: c.contributionLog10,
    removalLog10: removal.get(c.name),
    desc: item.tiers.at(-1).desc,
    enchant: item.enchant?.desc ?? null,
    shares,
  };
});

const setsUsed = [...new Set(equipped.map((e) => e.item.set).filter(Boolean))].map((name) => {
  const set = m.setByNameOf(name);
  const pieces = equipped.filter((e) => e.item.set === name).length;
  const stripped = equipped.filter((e) => e.item.set !== name);
  return {
    name,
    pieces,
    tiers: set.tiers.filter((t) => t.pieces <= pieces).map((t) => `${t.pieces}pc: ${t.desc}`),
    stats: [...new Set(set.tiers.filter((t) => t.pieces <= pieces).flatMap((t) => t.effects.map((e) => e.stat)))],
    wholeSetLog10: m.loadoutScore(model, equipped, legion, inputs) - m.loadoutScore(model, stripped, legion, inputs),
  };
});

const SCALED = {
  Evo: "Spell.EvocationEfficiency",
  Inc: "Spell.IncantationEfficiency",
  CAP: "Hero.AbilityPower",
  PAP: "Pet.AbilityPower",
  Idle: "Idle.Bonus",
};
function scalings(selection, loadout) {
  const mdl = m.buildModel(selection, { relevance: false });
  const mods = m.loadoutModifiers(mdl, loadout, legion);
  return Object.fromEntries(Object.entries(SCALED).filter(([, id]) => mdl.graph.index.has(id)).map(([k, id]) => [k, m.elasticity(mdl, id, mods, inputs)]));
}
const scal = {
  headlineSet: scalings(blind.selection, equipped),
  noItems: scalings(blind.selection, []),
  headlineSetGemResonanceSnapped: scalings({ ...blind.selection, snapped: [69, 4] }, equipped),
};

// Items the guide's categories point at that the tool didn't pick: best swap into the headline set (same slot).
const chosen = new Set(equipped.map((e) => e.item.key));
const excludedSlots = new Set(blind.run.excludedSlots);
const notOwned = new Set(blind.run.notOwned);
const maxTd = m.ITEMS.filter((i) => !i.mythic && i.tiers.at(-1).effects.some((e) => e.stat === "Time.MaxDistortion"));
function swapInto(item) {
  const enchant = ["Legendary", "Unique"].includes(item.maxQuality) && item.enchant?.stat ? level : 0;
  const sameSlot = equipped.filter((e) => e.item.slot === item.slot);
  let best = { log10: -Infinity, out: "(empty)" };
  const base = m.loadoutScore(model, equipped, legion, inputs);
  const victims = sameSlot.length ? sameSlot : [undefined];
  for (const v of victims) {
    const loadout = [...equipped.filter((e) => e !== v), { item, enchant }];
    const log10 = m.loadoutScore(model, loadout, legion, inputs) - base;
    if (log10 > best.log10) best = { log10, out: v?.item.name ?? "(empty)" };
  }
  return best;
}
const maxTdItems = maxTd.map((item) => ({
  name: item.name,
  slot: item.slot,
  requirements: item.requirements,
  available: !excludedSlots.has(item.slot) && !notOwned.has(item.key),
  chosen: chosen.has(item.key),
  desc: item.tiers.at(-1).desc,
  swap: excludedSlots.has(item.slot) ? null : swapInto(item),
}));

// A slot supplies a guide stat when that stat alone is worth more than x1.05 there; its main stat is its largest share.
const LOG_TIE = Math.log10(1.05);
const guideStats = (s) => [...new Set(s.shares.filter((x) => x.category && x.log10 > LOG_TIE).map((x) => x.category))];
const mainIsGuide = (s) => Boolean(s.shares[0]?.category);
const categories = new Set(slots.flatMap(guideStats));
const summary = {
  slots: slots.length,
  supplyGuideStat: slots.filter((s) => guideStats(s).length > 0).length,
  mainStatIsGuideStat: slots.filter(mainIsGuide).length,
  categoriesCovered: Object.keys(GUIDE_BURST).filter((c) => categories.has(c)),
  categoriesMissing: Object.keys(GUIDE_BURST).filter((c) => !categories.has(c)),
  mainStatNotGuide: slots.filter((s) => !mainIsGuide(s)).map((s) => `${s.name} (${s.shares[0]?.stat})`),
};

console.log(`${variant} at enchant ${level} (recorded set; score ${fmt(row.best.gainLog10)} vs no items)`);
console.log(
  `  slots supplying a guide burst stat: ${summary.supplyGuideStat}/${summary.slots}; main stat is a guide stat: ${summary.mainStatIsGuideStat}/${summary.slots}` +
    `; categories missing: ${summary.categoriesMissing.join(", ") || "none"}; main stat not a guide stat: ${summary.mainStatNotGuide.join(", ") || "-"}`,
);
if (brief) process.exit(0);
for (const s of slots) {
  const guide = guideStats(s);
  console.log(`\n${s.slot.padEnd(9)} ${s.name}  contribution ${fmt(s.removalLog10)} (recorded ${fmt(Number(s.recordedContributionLog10))})`);
  console.log(`  text: ${s.desc}${s.enchant ? ` | enchant: ${s.enchant}` : ""}`);
  for (const x of s.shares) console.log(`  ${x.stat.padEnd(44)} ${fmt(x.log10).padStart(10)}  ${x.category ?? ""}`);
  console.log(`  guide burst categories supplying > x1.05: ${guide.join(", ") || "none"}`);
}
for (const s of setsUsed) {
  console.log(`\nSet ${s.name} (${s.pieces} pieces; all its pieces together ${fmt(s.wholeSetLog10)}): ${s.stats.join(", ")}`);
  for (const t of s.tiers) console.log(`  ${t}`);
}
console.log("\nBurst scalings (d ln score / d ln stat):");
for (const [k, v] of Object.entries(scal)) console.log(`  ${k}: ${Object.entries(v).map(([s, x]) => `${s} ${x.toFixed(3)}`).join(", ")}`);
console.log("\nMax Time Distortion items:");
for (const t of maxTdItems) {
  console.log(`  ${t.name} (${t.slot}; req ${JSON.stringify(t.requirements)}; ${t.available ? "available" : "not available in this run"}${t.chosen ? "; chosen" : ""}): ${t.desc}`);
  if (t.swap) console.log(`    swapped in for ${t.swap.out}: ${fmt(t.swap.log10)}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ variant, level, summary, slots, sets: setsUsed, scalings: scal, maxTdItems }, null, 2) + "\n");
