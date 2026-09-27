// Prints the generated sections of validation/chronomancer/tool-result.md from the JSON files written by
// chronomancer-blind-runs.sh. Usage: node scripts/validation/chronomancer-blind-report.mjs > sections.md
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const root = fileURLToPath(new URL("../..", import.meta.url));
const dir = `${root}validation/chronomancer`;
const { module } = await runnerImport(`${root}src/data/scriptEntry.ts`, { root, configFile: false, logLevel: "error" });
const { buildModel, deserializeInputs, formatMultiplier, itemByKey, setByNameOf } = module;

const HEADLINE = "era-notes";
const DETAILED = [HEADLINE, "main"];
const VARIANTS = ["main", "notes", "era", "era-notes", "era-e150", "era-notes-legion", "era-notes-gems-mixed", "era-notes-gems-only"];
const DETAIL_LEVELS = [0, 1, 5, 10, 15, 20, 30, 40];
const SLOT_ROWS = ["Head", "Chest", "Hands", "Feet", "Shoulder", "Neck", "Waist", "Wrist", "Back", "Legs", "Offhand", "Research", "Accessory", "Mount", "Phylactery", "Weapon", "Finger 1", "Finger 2", "Trophy 1", "Trophy 2"];

const load = (name) => {
  const file = name === "main" ? `${dir}/tool-result.json` : `${dir}/tool-result-${name}.json`;
  if (!existsSync(file)) return null;
  const json = JSON.parse(readFileSync(file, "utf8"), (_, v) => (v === "Infinity" ? Infinity : v));
  return { name, file: file.slice(dir.length + 1), ...json };
};
const runs = new Map(VARIANTS.map((v) => [v, load(v)]).filter(([, r]) => r));

const fmt = (x) => (typeof x === "number" ? (Math.abs(x) >= 1e5 || (x !== 0 && Math.abs(x) < 1e-3) ? x.toExponential(2).replace("e+", "e") : String(x)) : String(x));
const bySlot = (items) => {
  const rows = new Map();
  const counts = {};
  for (const i of [...items].sort((a, b) => a.name.localeCompare(b.name))) {
    const multi = i.slot === "Finger" || i.slot === "Trophy";
    const n = (counts[i.slot] = (counts[i.slot] ?? 0) + 1);
    rows.set(multi ? `${i.slot} ${n}` : i.slot, i);
  }
  return rows;
};
const levelRow = (run, level) => run.result.levels.find((l) => l.level === level);
const changeLevels = (run) => run.result.levels.filter((l) => l.changed).map((l) => l.level);
const shownLevels = (run) => [...new Set([...DETAIL_LEVELS, ...changeLevels(run)])].filter((l) => levelRow(run, l)).sort((a, b) => a - b);
const itemCell = (i) => (i ? `${i.name}${i.enchant ? ` +${i.enchant}` : ""}` : "—");
const incomplete = (row) => row.branches.some((b) => !b.stats.complete);

function runSummary(run) {
  const o = run.run;
  const parts = [
    `snapped ${run.selection.snapped.join(",") || "none"}`,
    `Legion ${o.legion ? "on" : "off"}`,
    `Resonator ${o.resonator ? "allowed" : "disabled"}`,
    o.excludedSlots.length ? `excluded slots ${o.excludedSlots.join(", ")}` : "all slots",
    o.notOwned.length ? `not owned: ${o.notOwned.map((k) => itemByKey(k)?.name ?? k).join(", ")}` : "all non-Mythic items owned at max quality",
    Object.keys(o.inputOverrides).length ? `inputs ${Object.entries(o.inputOverrides).map(([k, v]) => `${k}=${v}`).join(", ")}` : "class default inputs",
  ];
  return parts.join("; ");
}

function exclusions(run) {
  const by = {};
  for (const e of run.result.excluded) (by[e.reason] ??= []).push(e.name);
  return Object.entries(by)
    .map(([reason, names]) => `- ${reason} (${names.length})${reason === "mythic" || reason === "excluded-slot" ? "" : `: ${names.sort().join(", ")}`}`)
    .join("\n");
}

function detailed(run) {
  const out = [`### ${run.name}: best set per enchant level`, "", `Run: ${runSummary(run)}. File: \`${run.file}\`. Sweep change levels (the set differs from the previous level): ${changeLevels(run).join(", ")}.`, ""];
  for (const level of shownLevels(run)) {
    const row = levelRow(run, level);
    const best = row.best;
    out.push(
      `**Enchant ${level}**: score ${formatMultiplier(best.gainLog10)} vs no items${row.branches.length > 1 ? `; branches ${row.branches.map((b) => `${b.forced ? "forced" : "free"} ${formatMultiplier(b.gainLog10)}`).join(", ")}` : ""}${incomplete(row) ? "; search hit the node budget (best found, not proven best)" : "; search complete"}.`,
      "",
      "| Slot | Item | Quality | Enchant (effective) | Contribution |",
      "|---|---|---|---|---|",
    );
    const rows = bySlot(best.items);
    for (const slot of SLOT_ROWS) {
      const i = rows.get(slot);
      if (i) out.push(`| ${slot} | ${i.name}${i.set ? ` (${i.set})` : ""} | ${i.quality} | ${i.enchant} (${i.effectiveEnchant}) | ${formatMultiplier(i.contributionLog10)} |`);
      else out.push(`| ${slot} | — | | | |`);
    }
    out.push("");
  }
  return out.join("\n");
}

function overview(run, levels) {
  const ls = levels.filter((l) => levelRow(run, l));
  const out = [`| Slot | ${ls.map((l) => `E${l}`).join(" | ")} |`, `|---|${ls.map(() => "---").join("|")}|`];
  const rowsAt = new Map(ls.map((l) => [l, bySlot(levelRow(run, l).best.items)]));
  for (const slot of SLOT_ROWS) out.push(`| ${slot} | ${ls.map((l) => itemCell(rowsAt.get(l).get(slot)).replace(/ \+\d+$/, "")).join(" | ")} |`);
  out.push(`| score vs no items | ${ls.map((l) => formatMultiplier(levelRow(run, l).best.gainLog10)).join(" | ")} |`);
  return out.join("\n");
}

function inputsTable(run) {
  const model = buildModel(run.selection, { relevance: false });
  const overrides = deserializeInputs(run.run.inputOverrides);
  const relevance = new Map((run.relevance?.inputs ?? []).map((i) => [i.id, i]));
  const out = ["| Input | Value | Source of the value | Ranking relevance (enchant " + (run.relevance?.level ?? "?") + ") |", "|---|---|---|---|"];
  for (const i of model.graph.inputs) {
    const s = model.graph.stats[i];
    if (s.base.kind !== "input") continue;
    const src = model.cls.defaults[s.id]?.source ?? model.pet.defaults?.[s.id]?.source;
    const value = s.id in overrides ? overrides[s.id] : s.base.spec.default;
    const source = s.id in overrides ? "set for this run (see choices)" : src ? `${src.verified ? "guide/wiki" : "unverified"}${src.note ? `: ${src.note}` : ""}` : "generic default";
    const r = relevance.get(s.id);
    out.push(`| \`${s.id}\` (${s.def.label}) | ${fmt(typeof value === "object" ? value.toString() : value)} | ${source.replace(/\|/g, "/")} | ${r ? `${r.shown ? "**shown**" : "hidden"}: ${r.reason}` : "not analysed (consumed by the optimizer)"} |`);
  }
  return out.join("\n");
}

function assumptions(run, level) {
  const row = levelRow(run, level);
  const byNote = new Map();
  const flag = (note, where) => byNote.set(note, [...(byNote.get(note) ?? []), where]);
  for (const chosen of row.best.items) {
    const item = itemByKey(chosen.key);
    const tier = item?.tiers.find((t) => t.quality === chosen.quality);
    for (const e of tier?.effects ?? []) if (!e.source.verified) flag(e.source.note ?? "Unverified reading.", `${chosen.name} ("${e.text}")`);
    for (const u of tier?.unmodelled ?? []) if (u.reason !== "not-production") flag(`Ignored (${u.reason})${u.note ? `: ${u.note}` : ""}`, `${chosen.name} ("${u.text}")`);
    if (item?.enchant && !item.enchant.source.verified && chosen.enchant > 0) flag(item.enchant.source.note ?? "Unverified enchant.", `${chosen.name} enchant`);
  }
  const out = [];
  const sets = {};
  for (const i of row.best.items) if (i.set) sets[i.set] = (sets[i.set] ?? 0) + 1;
  for (const [name, n] of Object.entries(sets)) if (n >= 2) out.push(`- Set ${name} (${n} pieces): ${setByNameOf(name)?.source.note ?? "verified"}`);
  for (const [note, where] of [...byNote].sort((a, b) => b[1].length - a[1].length)) out.push(`- ${note} Affects: ${where.join("; ")}.`);
  const model = buildModel(run.selection, { relevance: false });
  for (const u of model.unmodelled) out.push(`- Not modelled (${u.text ?? u.source ?? ""}): ${u.note ?? ""}`);
  return out.join("\n");
}

const out = [];
const headline = runs.get(HEADLINE);
if (headline) {
  out.push("## Headline result (" + HEADLINE + ")", "", `Run: ${runSummary(headline)}.`, "", overview(headline, shownLevels(headline)), "");
}
out.push("## All variants at a glance", "");
for (const run of runs.values()) {
  out.push(`### ${run.name}`, "", `Run: ${runSummary(run)}. File: \`${run.file}\`. Levels run: ${run.result.levels.map((l) => l.level).join(", ")}. Change levels: ${changeLevels(run).join(", ") || "—"}.`, "");
  out.push(overview(run, run.name === "era-e150" ? [0] : [0, 1, 5, 10, 15, 20, 30, 40]), "");
  const budget = run.result.levels.filter(incomplete).map((l) => l.level);
  out.push(`Search hit the node budget at levels: ${budget.join(", ") || "none"}.`, "", "Items left out:", "", exclusions(run), "");
}
out.push("## Detailed sets and contributions", "", "Contribution = the set's score divided by the score with that item removed (slot left empty); \"required\" = removing it breaks another chosen item's attribute requirement.", "");
for (const name of DETAILED) if (runs.get(name)) out.push(detailed(runs.get(name)), "");
for (const name of DETAILED) {
  const run = runs.get(name);
  if (!run?.relevance) continue;
  const hidden = run.relevance.inputs.filter((i) => !i.shown);
  out.push(`## Inputs of ${name} (relevance at enchant ${run.relevance.level})`, "", `Shown: ${run.relevance.inputs.length - hidden.length}; hidden (can't change which set wins, so the UI would not ask for them): ${hidden.length}.`, "", `Hidden inputs: ${hidden.map((i) => `\`${i.id}\``).join(", ")}.`, "", inputsTable(run), "");
}
for (const name of DETAILED) {
  const run = runs.get(name);
  if (!run) continue;
  out.push(`## Unverified data behind ${name} at enchant 10`, "", assumptions(run, 10), "");
}
console.log(out.join("\n"));
