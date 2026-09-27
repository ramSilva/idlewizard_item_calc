// Runs the item optimizer for a class setup in Node, loading the TypeScript sources through Vite's module runner.
//
//   npm run optimize -- --class oni [--levels 0-55|0,10,20] [--all-levels] [--pet living-sin] [--spells 60,6,88]
//     [--stance berserk] [--snapped 69,4] [--score oni-burst] [--no-idle] [--legion on|off] [--no-resonator]
//     [--input Id=value]... [--override item-key=level]... [--exclude-slot Shoulder]... [--not-owned item-key]...
//     [--pruning bot|none] [--thorough] [--preset "104;113;..." --preset-level 17] [--relevance 17] [--json out.json]
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));

function parseArgs(argv) {
  const out = { inputs: {}, overrides: {}, excludedSlots: [], notOwned: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${a} needs a value`);
      return v;
    };
    const pair = (v) => {
      const at = v.indexOf("=");
      if (at < 0) throw new Error(`${a} expects key=value, got ${v}`);
      return [v.slice(0, at), v.slice(at + 1)];
    };
    if (a === "--class") out.classId = next();
    else if (a === "--levels") out.levels = next();
    else if (a === "--all-levels") out.allLevels = true;
    else if (a === "--pet") out.petId = next();
    else if (a === "--spells") out.spells = next().split(",").map(Number);
    else if (a === "--stance") out.stance = next();
    else if (a === "--snapped") out.snapped = next().split(",").filter(Boolean).map(Number);
    else if (a === "--score") out.scoreId = next();
    else if (a === "--no-idle") out.idle = false;
    else if (a === "--legion") out.legion = next() === "on";
    else if (a === "--no-resonator") out.resonator = false;
    else if (a === "--input") {
      const [k, v] = pair(next());
      out.inputs[k] = v === "true" || v === "false" ? v === "true" : /^-?[\d.]+(e[+-]?\d+)?$/i.test(v) && Math.abs(Number(v)) < 1e300 ? Number(v) : v;
    } else if (a === "--override") {
      const [k, v] = pair(next());
      out.overrides[k] = Number(v);
    } else if (a === "--exclude-slot") out.excludedSlots.push(next());
    else if (a === "--not-owned") out.notOwned.push(next());
    else if (a === "--pruning") out.pruning = next();
    else if (a === "--thorough") out.thorough = true;
    else if (a === "--preset") out.preset = next();
    else if (a === "--preset-level") out.presetLevel = Number(next());
    else if (a === "--relevance") out.relevanceLevel = Number(next());
    else if (a === "--json") out.json = next();
    else throw new Error(`Unknown argument ${a}`);
  }
  if (!out.classId) throw new Error("--class is required");
  return out;
}

function parseLevels(spec) {
  if (!spec) return Array.from({ length: 56 }, (_, i) => i);
  if (/^\d+-\d+$/.test(spec)) {
    const [lo, hi] = spec.split("-").map(Number);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }
  return spec.split(",").map(Number);
}

const args = parseArgs(process.argv.slice(2));
const { module } = await runnerImport(`${root}src/data/scriptEntry.ts`, { root, configFile: false, logLevel: "error" });
const { ITEMS, buildModel, defaultSelection, createOptimizer, deserializeInputs, comparePreset, presetReport, sweepReport } = module;
for (const key of args.notOwned) if (!ITEMS.some((i) => i.key === key)) throw new Error(`Unknown item key ${key}`);

const selection = { ...defaultSelection(args.classId) };
for (const k of ["petId", "spells", "stance", "snapped", "scoreId", "idle"]) if (args[k] !== undefined) selection[k] = args[k];
const inputs = deserializeInputs(args.inputs);

let t0 = performance.now();
const model = buildModel(selection, { relevance: false });
const options = {
  excludedSlots: args.excludedSlots,
  enchantOverrides: args.overrides,
  legion: args.legion,
  resonator: args.resonator,
  ...(args.notOwned.length ? { owned: Object.fromEntries(ITEMS.filter((i) => !i.mythic && !args.notOwned.includes(i.key)).map((i) => [i.key, i.maxQuality])) } : {}),
  pruning: args.pruning,
  ...(args.thorough ? { polishDepth: 2, nodeBudget: 1_000_000 } : {}),
};
const opt = createOptimizer(model, inputs, options);
const setupMs = performance.now() - t0;
const levels = parseLevels(args.levels);
t0 = performance.now();
const result = opt.sweep(levels);
const sweepMs = performance.now() - t0;

console.log(`${model.cls.name} with ${model.pet.name}, spells ${model.selection.spells.join(",")}${model.selection.stance ? `, ${model.selection.stance} stance` : ""}, score ${model.score.def.id}`);
console.log(`Legion ${opt.legion ? "on" : "off"}; snapped ${model.selection.snapped.join(",") || "none"}; ${levels.length} levels in ${(sweepMs / 1000).toFixed(2)} s (setup ${setupMs.toFixed(0)} ms)`);
console.log(sweepReport(result, { allLevels: args.allLevels }));

if (args.preset) {
  const level = args.presetLevel ?? levels[0];
  const row = result.levels.find((r) => r.level === level) ?? opt.optimizeLevel(level);
  console.log(presetReport(comparePreset(opt, model, row, args.preset, inputs)));
}
let relevance;
if (args.relevanceLevel !== undefined) {
  const row = result.levels.find((r) => r.level === args.relevanceLevel) ?? opt.optimizeLevel(args.relevanceLevel);
  const rel = opt.relevance(row);
  const shown = rel.inputs.filter((i) => i.shown);
  console.log(`Ranking-relevant inputs at enchant ${row.level}: ${shown.length} of ${rel.inputs.length}`);
  for (const i of rel.inputs) console.log(`  ${i.shown ? "show" : "hide"} ${i.id}: ${i.reason}`);
  relevance = { level: row.level, inputs: rel.inputs.map(({ id, shown, reason }) => ({ id, shown, reason })) };
}
if (args.json) {
  const run = {
    inputOverrides: args.inputs,
    legion: opt.legion,
    resonator: args.resonator ?? true,
    excludedSlots: args.excludedSlots,
    notOwned: args.notOwned,
    enchantOverrides: args.overrides,
    thorough: Boolean(args.thorough),
  };
  writeFileSync(args.json, JSON.stringify({ selection: model.selection, run, result, relevance }, (_, v) => (v === Infinity ? "Infinity" : v), 2));
}
