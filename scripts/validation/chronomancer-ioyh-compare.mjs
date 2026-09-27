// Compares a recorded optimizer run with the Burst Set of the Fandom "In Over Your Head Chronomancer Guide"
// (second Chronomancer blind check, part 2), using the rule pre-declared in validation/chronomancer-ioyh/tool-result.md:
// the Weapon is fixed by the setup and reported separately, Finger and Trophy pairs are unordered, and guide slots
// without an item aren't counted (the Fandom presets have 19 ids and no Accessory).
//
//   node scripts/validation/chronomancer-ioyh-compare.mjs [--file run.json] [--level 20] [--sweep] [--gains]
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const root = fileURLToPath(new URL("../..", import.meta.url));
const argv = process.argv.slice(2);
let file = "validation/chronomancer-ioyh/tool-result.json";
let level = 20;
let sweep = false;
let gains = false;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--file") file = argv[++i];
  else if (argv[i] === "--level") level = Number(argv[++i]);
  else if (argv[i] === "--sweep") sweep = true;
  else if (argv[i] === "--gains") gains = true;
  else throw new Error(`Unknown argument ${argv[i]}`);
}

// Fandom revid 16563, "=== Burst Set ===" ItemPreset `#6#Burst@…` (no enchant label).
const GUIDE_BURST = "6;46;24;17;38;57;113;112;67;87;76;1022;204;307;415;401;96;2002;3003";
// wiki.gg revid 30817 (context only): the same list plus an Accessory.
const SUCCESSOR_BURST = "112;113;6;24;17;38;46;67;57;87;76;1022;204;307;415;401;96;2002;3003;506";
// Slots whose guide items were abbreviated in the sentence part 1 read by mistake ("Kilt", "Amp", "Torc").
const EXPOSED = new Set(["Legs", "Offhand", "Neck"]);
const PAIRED = new Set(["Finger", "Trophy"]);
const SCALED = {
  Inc: "Spell.IncantationEfficiency",
  PAP: "Pet.AbilityPower",
  CAP: "Hero.AbilityPower",
  Idle: "Idle.Bonus",
  Profit: "Prod.Global",
  Evo: "Spell.EvocationEfficiency",
  VpE: "Void.ManaPerEntity",
  "Void Mana": "Void.ProfitPerPoint",
  "Pet charging": "Pet.ChargeSpeed",
};
const ORDER = ["Head", "Chest", "Hands", "Feet", "Shoulder", "Neck", "Waist", "Wrist", "Back", "Legs", "Offhand", "Research", "Accessory", "Mount", "Phylactery", "Weapon", "Finger", "Trophy"];

const { module: m } = await runnerImport(`${root}src/data/scriptEntry.ts`, { root, configFile: false, logLevel: "error" });
const run = JSON.parse(readFileSync(file, "utf8"));
const guide = m.presetItems(GUIDE_BURST);

function compare(items) {
  const rows = [];
  for (const slot of ORDER) {
    const g = guide.filter((i) => i.slot === slot).map((i) => i.name);
    const t = items.filter((i) => i.slot === slot).map((i) => i.name);
    const matched = PAIRED.has(slot) ? g.filter((n) => t.includes(n)).length : g.length && g[0] === t[0] ? 1 : 0;
    rows.push({ slot, guide: g, tool: t, compared: slot === "Weapon" ? 0 : g.length, matched: slot === "Weapon" ? 0 : matched });
  }
  const total = (keep) => rows.filter(keep).reduce((a, r) => [a[0] + r.matched, a[1] + r.compared], [0, 0]);
  return { rows, all: total(() => true), unexposed: total((r) => !EXPOSED.has(r.slot)), weapon: rows.find((r) => r.slot === "Weapon") };
}

const levelRow = (l) => run.result.levels.find((r) => r.level === l);
const row = levelRow(level);
if (!row) throw new Error(`${file} has no level ${level}`);
const c = compare(row.best.items);
const s = run.selection;
console.log(`Run: ${file} (pet ${s.petId}; spells ${s.spells.join(",")}; score ${s.scoreId}), enchant ${level}`);
console.log(`\n| Slot | Guide Burst Set | Tool | Match |\n|---|---|---|---|`);
for (const r of c.rows) {
  const mark = r.slot === "Weapon" ? (r.guide[0] === r.tool[0] ? "same (not counted)" : "differs (not counted)") : r.compared ? `${r.matched}/${r.compared}` : "not counted";
  console.log(`| ${r.slot}${EXPOSED.has(r.slot) ? " (exposed)" : ""} | ${r.guide.join(" + ") || "— (no slot in the preset)"} | ${r.tool.join(" + ") || "—"} | ${mark} |`);
}
console.log(`\nMatch: ${c.all[0]}/${c.all[1]} slots; without the exposed Neck/Legs/Offhand: ${c.unexposed[0]}/${c.unexposed[1]}. Weapon: guide ${c.weapon.guide[0]}, tool ${c.weapon.tool[0]}.`);

if (sweep) {
  console.log("\nPer level (all compared slots / without exposed slots):");
  console.log(run.result.levels.map((r) => `E${r.level} ${compare(r.best.items).all[0]}/${compare(r.best.items).unexposed[0]}`).join(", "));
}

if (gains) {
  const inputs = m.deserializeInputs(run.run.inputOverrides);
  const model = m.buildModel({ ...s }, { relevance: false });
  const legion = run.run.legion;
  const preset = m.presetLoadout(GUIDE_BURST, level);
  const successor = m.presetLoadout(SUCCESSOR_BURST, level);
  const best = m.equipAt(m.setItems(row.best), level);
  const fmt = m.formatMultiplier;
  const score = (eq) => m.loadoutScore(model, eq, legion, inputs);
  console.log(`\nUnder this run's model at enchant ${level}: tool set ${fmt(score(best) - score(preset))} the guide preset (no Accessory), ${fmt(score(best) - score(successor))} the preset with the successor's Accessory (Falconer's Treats).`);
  const mods = m.loadoutModifiers(model, successor, legion);
  const scalings = Object.entries(SCALED)
    .filter(([, id]) => model.graph.index.has(id))
    .map(([k, id]) => `${k} ${m.elasticity(model, id, mods, inputs).toFixed(3)}`);
  console.log(`Scalings at the guide preset (guide: Inc 7.39, PAP 2, Idle/Profit/CAP/VpE/Void Mana 1, Evo 0.016): ${scalings.join(", ")}`);
  console.log("Guide preset item contributions (score with / without):");
  for (const g of m.removalGains(model, successor, legion, inputs)) console.log(`  ${g.slot.padEnd(10)} ${g.name.padEnd(34)} ${fmt(g.log10)}`);
  console.log("Swapping the tool's items into the guide preset (with the successor's Accessory):");
  for (const g of m.swapGains(model, successor, best, legion, inputs).sort((a, b) => b.log10 - a.log10)) {
    console.log(`  ${g.slot.padEnd(10)} ${g.out.padEnd(34)} -> ${g.in.padEnd(34)} ${fmt(g.log10)}`);
  }
}
