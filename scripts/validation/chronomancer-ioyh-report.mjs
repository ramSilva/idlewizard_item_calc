// Prints the generated sections of validation/chronomancer-ioyh/tool-result.md from the JSON files written by
// chronomancer-ioyh-runs.sh. Usage: node scripts/validation/chronomancer-ioyh-report.mjs > sections.md
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";

const root = fileURLToPath(new URL("../..", import.meta.url));
const dir = `${root}validation/chronomancer-ioyh`;
const { module } = await runnerImport(`${root}src/data/scriptEntry.ts`, { root, configFile: false, logLevel: "error" });
const { buildModel, deserializeInputs, elasticity, experienceElasticity, formatMultiplier, itemByKey, loadoutModifiers, setByNameOf } = module;

const HEADLINE = "burst";
const HEADLINE_LEVEL = 20;
const VARIANTS = ["burst", "burst-chimaera", "burst-risen-giant", "burst-weapon-free", "burst-no-legion", "burst-literal-attrs", "burst-gems-mixed"];
const DETAIL_LEVELS = [0, 5, 10, 15, 20, 30, 40, 55];
const SLOT_ROWS = ["Head", "Chest", "Hands", "Feet", "Shoulder", "Neck", "Waist", "Wrist", "Back", "Legs", "Offhand", "Research", "Accessory", "Mount", "Phylactery", "Weapon", "Finger 1", "Finger 2", "Trophy 1", "Trophy 2"];
/** The guide's "Overall Scaling to Profits" table (Scaling section of guide-setup.md). */
const GUIDE_SCALING = [
  ["Spell.IncantationEfficiency", "Inc", "7.39"],
  ["Pet.AbilityPower", "PAP", "2"],
  ["Spell.EvocationEfficiency", "Evo", "0.016"],
  ["Hero.AbilityPower", "CAP", "1"],
  ["Idle.Bonus", "Idle", "1"],
  ["Prod.Global", "Profit", "1"],
  ["Void.ManaPerEntity", "VpE", "1"],
  ["Void.ProfitPerPoint", "Void Mana (profit per point)", "1"],
];

const load = (name) => {
  const file = name === HEADLINE ? `${dir}/tool-result.json` : `${dir}/tool-result-${name}.json`;
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
const itemCell = (i) => (i ? i.name : "—");
const incomplete = (row) => row.branches.some((b) => !b.stats.complete);

function runSummary(run) {
  const o = run.run;
  const weapons = o.notOwned.filter((k) => itemByKey(k)?.slot === "Weapon");
  const otherNotOwned = o.notOwned.filter((k) => itemByKey(k)?.slot !== "Weapon");
  const parts = [
    `pet ${run.selection.petId}`,
    `spells ${run.selection.spells.join(",")}`,
    `snapped ${run.selection.snapped.join(",") || "none"}`,
    `score ${run.selection.scoreId}`,
    `idle ${run.selection.idle === false ? "off" : "on"}`,
    `Legion ${o.legion ? "on" : "off"}`,
    `Resonator ${o.resonator ? "allowed" : "disabled"}`,
    o.excludedSlots.length ? `excluded slots ${o.excludedSlots.join(", ")}` : "all slots",
    weapons.length ? `Weapon: only The Accumulator owned (${weapons.length} other Weapons not owned)` : "all Weapons owned",
    otherNotOwned.length ? `not owned: ${otherNotOwned.map((k) => itemByKey(k)?.name ?? k).join(", ")}` : "every other non-Mythic item owned at max quality",
    `inputs ${Object.entries(o.inputOverrides).map(([k, v]) => `${k}=${v}`).join(", ")}`,
  ];
  return parts.join("; ");
}

function exclusions(run) {
  const by = {};
  for (const e of run.result.excluded) (by[e.reason] ??= []).push(e.name);
  return Object.entries(by)
    .map(([reason, names]) => `- ${reason} (${names.length})${reason === "mythic" || reason === "not-owned" ? "" : `: ${names.sort().join(", ")}`}`)
    .join("\n");
}

function detailed(run) {
  const out = [`### ${run.name}: best set per enchant level`, "", `File: \`${run.file}\`. Sweep change levels (the set differs from the previous level): ${changeLevels(run).join(", ")}.`, ""];
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
  for (const slot of SLOT_ROWS) out.push(`| ${slot} | ${ls.map((l) => itemCell(rowsAt.get(l).get(slot))).join(" | ")} |`);
  out.push(`| score vs no items | ${ls.map((l) => formatMultiplier(levelRow(run, l).best.gainLog10)).join(" | ")} |`);
  return out.join("\n");
}

function inputsTable(run) {
  const model = buildModel(run.selection, { relevance: false });
  const overrides = deserializeInputs(run.run.inputOverrides);
  const relevance = new Map((run.relevance?.inputs ?? []).map((i) => [i.id, i]));
  const out = [`| Input | Value | Source of the value | Ranking relevance (enchant ${run.relevance?.level ?? "?"}) |`, "|---|---|---|---|"];
  for (const i of model.graph.inputs) {
    const s = model.graph.stats[i];
    if (s.base.kind !== "input") continue;
    const src = model.cls.defaults[s.id]?.source ?? model.pet.defaults?.[s.id]?.source;
    const value = s.id in overrides ? overrides[s.id] : s.base.spec.default;
    const source = s.id in overrides ? "set for this run (see choices)" : src ? `class/pet default, ${src.verified ? "guide/wiki" : "unverified"}${src.note ? `: ${src.note}` : ""}` : "generic default";
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

function scalings(run, level) {
  const model = buildModel(run.selection, { relevance: false });
  const inputs = deserializeInputs(run.run.inputOverrides);
  const legion = run.run.legion;
  const chosen = levelRow(run, level).best.items.map((c) => ({ item: itemByKey(c.key), enchant: c.enchant }));
  const loadouts = [
    ["no items", []],
    [`headline set at enchant ${level}`, chosen],
  ];
  const value = (stat, equipped) => {
    try {
      return elasticity(model, stat, loadoutModifiers(model, equipped, legion), inputs).toFixed(3);
    } catch (e) {
      return `n/a (${e.message})`;
    }
  };
  const out = [`| Stat | Guide | ${loadouts.map(([l]) => `Ours, ${l}`).join(" | ")} |`, `|---|---|${loadouts.map(() => "---").join("|")}|`];
  for (const [stat, label, guide] of GUIDE_SCALING) out.push(`| ${label} (\`${stat}\`) | ^${guide} | ${loadouts.map(([, eq]) => value(stat, eq)).join(" | ")} |`);
  const xp = loadouts.map(([, eq]) => experienceElasticity(model, eq, legion, inputs).toFixed(3));
  out.push(`| Char Exp (per the XP table) | ^? | ${xp.join(" | ")} |`);
  return out.join("\n");
}

const out = [];
const headline = runs.get(HEADLINE);
if (headline) {
  out.push(`## Headline result (${HEADLINE})`, "", `Run: ${runSummary(headline)}.`, "", overview(headline, shownLevels(headline)), "");
  out.push(`## Scalings: ours vs the guide's "Overall Scaling to Profits" (informational)`, "", "d ln(score) / d ln(stat), measured by scaling the stat like an item multiplier.", "", scalings(headline, HEADLINE_LEVEL), "");
}
out.push("## All variants at a glance", "");
for (const run of runs.values()) {
  out.push(`### ${run.name}`, "", `Run: ${runSummary(run)}. File: \`${run.file}\`. Levels run: ${run.result.levels[0].level}–${run.result.levels.at(-1).level}. Change levels: ${changeLevels(run).join(", ") || "—"}.`, "");
  out.push(overview(run, DETAIL_LEVELS), "");
  const budget = run.result.levels.filter(incomplete).map((l) => l.level);
  out.push(`Search hit the node budget at levels: ${budget.join(", ") || "none"}.`, "", "Items left out:", "", exclusions(run), "");
}
out.push("## Detailed sets and contributions", "", 'Contribution = the set\'s score divided by the score with that item removed (slot left empty); "required" = removing it breaks another chosen item\'s attribute requirement.', "");
if (headline) out.push(detailed(headline), "");
if (headline?.relevance) {
  const hidden = headline.relevance.inputs.filter((i) => !i.shown);
  out.push(
    `## Inputs of ${HEADLINE} (relevance at enchant ${headline.relevance.level})`,
    "",
    `Shown: ${headline.relevance.inputs.length - hidden.length}; hidden (can't change which set wins, so the UI would not ask for them): ${hidden.length}.`,
    "",
    `Hidden inputs: ${hidden.map((i) => `\`${i.id}\``).join(", ")}.`,
    "",
    inputsTable(headline),
    "",
  );
}
if (headline) out.push(`## Unverified data behind ${HEADLINE} at enchant ${HEADLINE_LEVEL}`, "", assumptions(headline, HEADLINE_LEVEL), "");
console.log(out.join("\n"));
