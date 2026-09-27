import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { FANDOM, WIKIGG, fetchCategoryMembers, fetchRawWithBrowser, fetchRevisions, pageUrl } from "./wiki.mjs";

const OUT_DIR = path.resolve("data-raw");

const MODULES = [
  "Module:Data/Items",
  "Module:Data/Spells",
  "Module:Data/Familiars",
  "Module:Data/Classes",
  "Module:Data/ManaSources",
  "Module:Items",
  "Module:Spells",
  "Module:BiS",
];

const MECHANICS = [
  "Items",
  "Attributes",
  "Enchantments",
  "Stance",
  "Elixir",
  "Basic Mechanics",
  "Paragon",
  "Mysteries",
  "Void Mana",
  "Idle Mode",
  "Expeditions",
  "Collectibles",
  "Catalysts",
];

const CLASSES = ["Oni", "Shaman", "Temporalist", "Chronomancer"];

const GUIDES = ["Oni Guide", "Shaman Guide", "Temporalist Guide (e300-e550)", "Temporalist Guide (e550+)"];

// The Chronomancer guides are the answer key for the blind validation; keep them out of the snapshot.
const EXCLUDED = new Set(["Chronomancer Guide", "Chronomancer Guide Updated", "In Over Your Head Chronomancer Guide"]);

function fileNameFor(title) {
  return title.replace(/[/:]/g, "__").replace(/[^\w\-(). ']/g, "_") + ".wikitext";
}

/** `--only "A,B"` fetches just those titles and merges them into the existing manifest. */
function onlyTitles() {
  const i = process.argv.indexOf("--only");
  if (i < 0) return null;
  return process.argv[i + 1].split(",").map((t) => t.trim()).filter(Boolean);
}

async function allTitles() {
  const [pets, items] = await Promise.all([fetchCategoryMembers(WIKIGG, "Pets"), fetchCategoryMembers(WIKIGG, "Items")]);
  return [...MODULES, ...MECHANICS, ...CLASSES, ...GUIDES, ...pets, ...items];
}

async function main() {
  const only = onlyTitles();
  const titles = [...new Set(only ?? (await allTitles()))].filter((t) => !EXCLUDED.has(t));

  const manifest = [];
  const fetched = await fetchRevisions(WIKIGG, titles);
  let missing = titles.filter((t) => !fetched.has(t));

  const record = async (wiki, method, title, page) => {
    const dir = path.join(OUT_DIR, wiki.name);
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, fileNameFor(page.title));
    await writeFile(file, page.content);
    manifest.push({
      title,
      resolvedTitle: page.title,
      wiki: wiki.name,
      method,
      url: pageUrl(wiki, page.title),
      revid: page.revid,
      revisionTimestamp: page.timestamp,
      file: path.relative(OUT_DIR, file),
    });
  };

  for (const [title, page] of fetched) await record(WIKIGG, "api", title, page);

  if (missing.length) {
    const viaBrowser = await fetchRawWithBrowser(WIKIGG, missing);
    for (const [title, page] of viaBrowser) await record(WIKIGG, "playwright", title, page);
    missing = missing.filter((t) => !viaBrowser.has(t));
  }

  if (missing.length) {
    const viaFandom = await fetchRevisions(FANDOM, missing);
    for (const [title, page] of viaFandom) await record(FANDOM, "api", title, page);
    missing = missing.filter((t) => !viaFandom.has(t));
  }

  const manifestFile = path.join(OUT_DIR, "manifest.json");
  let pages = manifest;
  let fetchedAt = new Date().toISOString();
  if (only) {
    const previous = JSON.parse(await readFile(manifestFile, "utf8"));
    const replaced = new Set(manifest.map((p) => p.title));
    pages = [...previous.pages.filter((p) => !replaced.has(p.title)), ...manifest];
    missing = [...new Set([...previous.missing.filter((t) => !replaced.has(t)), ...missing])];
    fetchedAt = previous.fetchedAt;
  }
  pages.sort((a, b) => a.title.localeCompare(b.title));
  await writeFile(manifestFile, JSON.stringify({ fetchedAt, pages, missing }, null, 2) + "\n");
  console.log(`Saved ${manifest.length} pages; missing: ${missing.length ? missing.join(", ") : "none"}`);
}

await main();
