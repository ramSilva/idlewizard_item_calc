// Explains the gap between the optimizer's best set and each guide burst preset: every preset item's contribution
// (score with / without it) and the gain of swapping each of the optimizer's items into the preset. Also prints the
// Temporalist enchant-priority check, character-experience scalings and the Lucky Amulet / Miniaturized Accelerator tie.
//
//   node scripts/validation/golden-diagnose.mjs [--variant oni-spellcraft] [--brief] [--input Id=value]...
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const root = fileURLToPath(new URL("../..", import.meta.url));
const argv = process.argv.slice(2);
let only;
let brief = false;
const rawInputs = {};
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--variant") only = argv[++i];
  else if (argv[i] === "--brief") brief = true;
  else if (argv[i] === "--input") {
    const [k, v] = argv[++i].split("=");
    rawInputs[k] = /^-?[\d.]+(e[+-]?\d+)?$/i.test(v) && Math.abs(Number(v)) < 1e300 ? Number(v) : v;
  } else throw new Error(`Unknown argument ${argv[i]}`);
}

const { module: m } = await runnerImport(`${root}src/data/scriptEntry.ts`, { root, configFile: false, logLevel: "error" });
const fmt = m.formatMultiplier;
const SCALED = {
  Evo: "Spell.EvocationEfficiency",
  Inc: "Spell.IncantationEfficiency",
  Summon: "Spell.SummoningEfficiency",
  CAP: "Hero.AbilityPower",
  PAP: "Pet.AbilityPower",
  Idle: "Idle.Bonus",
  Void: "Void.ProfitPerPoint",
  Autoclick: "Click.AutoclickProfit",
};

for (const v of m.GUIDE_VARIANTS) {
  if (only && v.id !== only) continue;
  const g = m.GUIDE_CASES.find((c) => c.classId === v.classId);
  const inputs = m.deserializeInputs({ ...v.inputs, ...rawInputs });
  const model = m.buildModel(m.defaultSelection(g.classId), { relevance: false });
  const opt = m.createOptimizer(model, inputs);
  for (const p of g.presets) {
    const row = opt.optimizeLevel(p.enchant);
    const preset = m.presetLoadout(p.code, p.enchant);
    const best = m.equipAt(m.setItems(row.best), p.enchant);
    const c = m.comparePreset(opt, model, row, p.code, inputs);
    console.log(`\n=== ${v.id} ${p.label}: ${c.shared.length}/20 shared, best ${fmt(c.gapLog10)} the preset`);
    console.log(`  only in preset: ${c.onlyPreset.join(", ") || "-"}`);
    console.log(`  only in best:   ${c.onlyBest.join(", ") || "-"}`);
    if (c.unmetRequirements.length) console.log(`  unmet: ${c.unmetRequirements.join("; ")}`);
    console.log(`  character-experience scaling at the preset: ${m.experienceElasticity(model, preset, opt.legion, inputs).toFixed(3)}`);
    const mods = m.loadoutModifiers(model, preset, opt.legion);
    const scal = Object.entries(SCALED)
      .filter(([, id]) => model.graph.index.has(id))
      .map(([k, id]) => `${k} ${m.elasticity(model, id, mods, inputs).toFixed(3)}`);
    console.log(`  stat scalings at the preset: ${scal.join(", ")}`);
    if (brief) continue;
    console.log("  preset item contributions:");
    for (const r of m.removalGains(model, preset, opt.legion, inputs)) console.log(`    ${r.slot.padEnd(10)} ${r.name.padEnd(34)} ${fmt(r.log10)}`);
    console.log("  swapping the optimizer's items into the preset:");
    for (const s of m.swapGains(model, preset, best, opt.legion, inputs).sort((a, b) => b.log10 - a.log10)) {
      console.log(`    ${s.slot.padEnd(10)} ${s.out.padEnd(34)} -> ${s.in.padEnd(34)} ${fmt(s.log10)}`);
    }
  }
  if (v.id === "temporalist") {
    console.log("\n=== Temporalist enchant priority (score ratio per extra enchant level at the preset)");
    for (const e of m.TEMPORALIST_ENCHANT_PRIORITY) {
      const p = g.presets.find((x) => x.label === e.preset);
      const ours = m.perLevelGain(model, m.presetLoadout(p.code, p.enchant), e.item, opt.legion, inputs) - 1;
      console.log(`  ${e.item.padEnd(30)} ours ${(ours * 100).toFixed(2).padStart(7)}%  guide ${(e.guide * 100).toFixed(2).padStart(6)}%${e.otherPhases ? "  (other phases)" : ""}`);
    }
    const p15 = g.presets.find((x) => x.label === "15+5");
    for (const level of [1, 40]) {
      const tie = m.catalystTie(model, m.presetLoadout(p15.code, level), "Miniaturized Accelerator", "Lucky Amulet", opt.legion, inputs);
      console.log(`  Lucky Amulet = Miniaturized Accelerator at enchant ${level}: ${tie.toExponential(2)} catalyst shards`);
    }
  }
}
