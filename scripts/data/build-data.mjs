import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { collectTables } from "./lua-table.mjs";

const RAW = path.resolve("data-raw");
const OUT = path.resolve("src/data/generated");
const QUALITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary", "Unique", "Mythic"];

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : Object.keys(v).sort((a, b) => a - b).map((k) => v[k]));

async function loadModule(manifest, title) {
  const entry = manifest.pages.find((p) => p.title === title);
  if (!entry) throw new Error(`${title} missing from data-raw/manifest.json; run npm run scrape`);
  const source = await readFile(path.join(RAW, entry.file), "utf8");
  return { tables: collectTables(source), meta: { url: entry.url, revid: entry.revid, wiki: entry.wiki } };
}

async function hasDetails(manifest, title) {
  const entry = manifest.pages.find((p) => p.title === title);
  if (!entry) return null;
  const text = await readFile(path.join(RAW, entry.file), "utf8");
  const m = /==\s*Details\s*==([\s\S]*?)(?=\n==[^=]|\[\[Category:|$)/.exec(text);
  return m ? m[1].trim() : null;
}

async function buildItems(manifest) {
  const { tables, meta } = await loadModule(manifest, "Module:Data/Items");
  const items = [];
  for (const [name, raw] of Object.entries(tables.items)) {
    const startQuality = raw.Quality;
    const tiers = asArray(raw.Tiers).map((t, i) => ({
      quality: QUALITIES[startQuality - 1 + i],
      desc: t.Desc,
    }));
    const page = manifest.pages.find((p) => p.title === name);
    items.push({
      id: typeof raw.ID === "number" ? raw.ID : null,
      name,
      slot: raw.Slot,
      set: raw.Set ?? null,
      startQuality: QUALITIES[startQuality - 1],
      requirements: Array.isArray(raw.Requirements) ? {} : (raw.Requirements ?? {}),
      tiers,
      enchant: raw.Enchant ?? null,
      acquisition: raw.Acquisition ?? null,
      details: await hasDetails(manifest, name),
      source: page?.url ?? meta.url,
    });
  }
  items.sort((a, b) => (a.id ?? 1e9) - (b.id ?? 1e9) || a.name.localeCompare(b.name));
  const sets = Object.entries(tables.sets).map(([name, raw]) => ({
    name,
    items: raw.Items,
    tiers: asArray(raw.Tiers).map((t, i) => ({ pieces: i + 2, desc: t.Desc })),
  }));
  return { meta, items, sets };
}

async function buildSpells(manifest) {
  const { tables, meta } = await loadModule(manifest, "Module:Data/Spells");
  const spells = Object.entries(tables.spells)
    .filter(([, s]) => !s.Unreleased)
    .map(([name, s]) => ({
      id: s.ID,
      name,
      school: s.School,
      accumulated: Boolean(s.Accumulated),
      persistent: Boolean(s.Persistent),
      behavior: s.Behavior ?? null,
      level: s.Level ?? null,
      cost: s.Cost ?? null,
      charge: s.Charge ?? null,
      duration: s.Duration ?? null,
      description: s.Description,
      math: s.Math ?? null,
      classes: Object.keys(s.Classes ?? {}).sort(),
    }))
    .sort((a, b) => a.id - b.id);
  return { meta, spells };
}

async function main() {
  const manifest = JSON.parse(await readFile(path.join(RAW, "manifest.json"), "utf8"));
  await mkdir(OUT, { recursive: true });
  const items = await buildItems(manifest);
  const spells = await buildSpells(manifest);
  await writeFile(path.join(OUT, "items.json"), JSON.stringify(items, null, 1) + "\n");
  await writeFile(path.join(OUT, "spells.json"), JSON.stringify(spells, null, 1) + "\n");
  console.log(`items: ${items.items.length}, sets: ${items.sets.length}, spells: ${spells.spells.length}`);
}

await main();
