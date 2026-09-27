// Extracts only the setup parts of the Fandom Chronomancer guide for the blind check.
// Item recommendations must never be printed or saved: headings about gear are skipped (with
// their subsections), item templates/params/images/lists/tables are stripped, and every item and
// set name is redacted before anything leaves this process.
//
// Usage: node scripts/validation/chronomancer-setup.mjs [--list] [--drop "<heading>"]... [--page <title>] [--file <wikitext> --out <md>]
//   --list  print the (redacted) heading list and the selection, fetch nothing else
//   --drop  exclude a selected heading (exact redacted text) and its subsections
//   --page  Fandom page to read (default: the guide the Fandom class page links)
//   --file  dry-run the filter on a local wikitext file (e.g. an allowed class guide) instead of Fandom
//   --inventory  print each selected section's markup shape (template names, parameter keys, table sizes) only
import fs from "node:fs";
import path from "node:path";
import { FANDOM, fetchSectionWikitext, fetchSections, pageUrl } from "../scrape/wiki.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
/** The Fandom class page (https://idle-wizard.fandom.com/wiki/Chronomancer) has no setup; its Guides section links this page as the most up to date guide. */
const DEFAULT_TITLE = "Chronomancer Guide Updated";
const OUT = path.join(ROOT, "validation/chronomancer/guide-setup.md");
const MAX_REMOVED_SHARE = 0.5;

const EXCLUDED_HEADING =
  /gear|items?\b|\bbis\b|best[- ]in[- ]slot|equip|enchant|\bsets?\b|weapon|loadout|mythic|quality|legendary|\bslots?\b|rings?\b|amulet|trophy|trophies|phylacter|artifact|relic|changelog|credits?|see also|references/i;
const GEAR_WORDS =
  /\b(enchant\w*|bis|best[- ]in[- ]slot|gear|equip\w*|unequip\w*|loadouts?|items?|mythics?|legendary|uniques?|quality|slots?|chest|feet|shoulders?|neck|waist|wrists?|legs|fingers?|offhand|trophy|trophies|accessory|weapons?|mount|phylactery|phylacteries|rings?|amulets?|boots|gloves|helm\w*|pants|belts?|cloaks?|bracers|pauldrons|sleeves?)\b/i;
const ITEM_TEMPLATE = /item|bis|gear|equip|enchant|sets?$|preset|loadout/i;
const ITEM_PARAM = /item|gear|bis|enchant|set|preset|equip|loadout/i;
const SETUP_PARAM = /^(pet|spells|t-spells|t-pet|stance|class)\d*$/i;
const SPELL_TEMPLATE = /^Spell/i;
/** Attribute point lists are setup, not item lists, even when a line credits points to an item. */
const ATTRIBUTE_LINE = /^[*#:;]+\s*'*(Intelligence|Insight|Spellcraft|Wisdom|Dominance|Patience|Mastery|Empathy|Versatility)\b/i;
const ATTRIBUTE_VALUE = /^([*#:;]+)\s*'*(Intelligence|Insight|Spellcraft|Wisdom|Dominance|Patience|Mastery|Empathy|Versatility)'*\s*:?\s*'*(\d[\d.,+\-–~/]*|max(?:ed)?)/i;
const SPELL_PARAM = /^spell_\d+_(name|autocast)$/i;
const ITEM_PRESET = /#?\d*#?[\w()]*@?-?\d+(?:;-?\d+){9,}/g;
const SENTINEL = "\u0000ITEM\u0000";

const STOPWORDS = new Set(
  "the of and a an to in on for with from at by or ring amulet boots gloves helm helmet pants belt cloak robe robes staff wand orb book tome stone crystal shard core disk seal band charm sigil mark cape hood crown mask shield sword blade rod shoes armor armour sleeves sleeve spaulders pauldrons bracers vestments set gear".split(
    " ",
  ),
);

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function loadDictionary() {
  try {
    return new Set(fs.readFileSync("/usr/share/dict/words", "utf8").split("\n").map((w) => w.toLowerCase()));
  } catch {
    return new Set();
  }
}

function petNames() {
  const manifest = readJson("data-raw/manifest.json");
  const names = [];
  for (const p of manifest.pages) {
    const file = path.join(ROOT, "data-raw", p.file);
    if (!fs.existsSync(file)) continue;
    if (/\[\[Category:[^\]]*Pets\]\]/.test(fs.readFileSync(file, "utf8"))) names.push(p.resolvedTitle);
  }
  return names;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phraseRe = (phrases) =>
  new RegExp(`(?<![\\w'])(?:${[...phrases].sort((a, b) => b.length - a.length).map(escapeRe).join("|")})(?:'s)?(?![\\w'])`, "gi");
const tokens = (name) => name.split(/[\s\-–]+/).map((t) => t.replace(/[^\p{L}\p{N}']/gu, "")).filter(Boolean);
const initials = (name) => tokens(name).map((t) => t[0]).join("");

function buildRedactor() {
  const { items, sets } = readJson("src/data/generated/items.json");
  const { spells } = readJson("src/data/generated/spells.json");
  const dictionary = loadDictionary();
  const protectedNames = [
    ...spells.map((s) => s.name),
    ...petNames(),
    "Chronomancer",
    "Temporalist",
    "Oni",
    "Shaman",
    "Compressed Time",
    "Time Distortion",
    "Skipped Time",
    "Temporal Anchor",
    "Meditation",
    "Defense",
    "Berserk",
  ].filter(Boolean);
  const protectedTokens = new Set(protectedNames.flatMap(tokens).map((t) => t.toLowerCase()));
  const protectedAcronyms = new Set(protectedNames.map((n) => initials(n).toLowerCase()));

  const names = [...items.map((i) => i.name), ...sets.map((s) => s.name)];
  const phrases = new Set();
  for (const n of names) {
    phrases.add(n);
    const withoutThe = n.replace(/^the\s+/i, "");
    if (withoutThe !== n) phrases.add(withoutThe);
    for (const t of tokens(n)) {
      const lower = t.toLowerCase().replace(/'s$/, "");
      if (lower.length < 5 || STOPWORDS.has(lower) || protectedTokens.has(lower) || dictionary.has(lower)) continue;
      phrases.add(t.replace(/'s$/, ""));
    }
    const acronym = initials(n);
    if (acronym.length >= 3 && !protectedAcronyms.has(acronym.toLowerCase()) && !dictionary.has(acronym.toLowerCase())) phrases.add(acronym);
  }
  const itemRe = phraseRe(phrases);
  const protectRe = phraseRe(protectedNames);
  const itemPages = new Set(names.map((n) => n.toLowerCase()));
  const fullNameRe = phraseRe(names);

  function redact(text) {
    const kept = [];
    const masked = text.replace(protectRe, (m) => {
      kept.push(m);
      return `\uE000${kept.length - 1}\uE000`;
    });
    return masked.replace(itemRe, SENTINEL).replace(/\uE000(\d+)\uE000/g, (_, i) => kept[Number(i)]);
  }
  return {
    redact,
    isItemPage: (title) => itemPages.has(title.trim().toLowerCase()),
    countItemNames: (text) => text.replace(protectRe, "").match(fullNameRe)?.length ?? 0,
  };
}

/** Finds `open ... close` blocks with nesting and replaces each with `replace(inner)`. */
function replaceBalanced(text, open, close, replace) {
  let out = "";
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf(open, i);
    if (start < 0) break;
    let depth = 0;
    let j = start;
    for (; j < text.length; j++) {
      if (text.startsWith(open, j)) {
        depth++;
        j += open.length - 1;
      } else if (text.startsWith(close, j)) {
        depth--;
        j += close.length - 1;
        if (depth === 0) break;
      }
    }
    out += text.slice(i, start) + replace(text.slice(start + open.length, j - close.length + 1));
    i = j + 1;
  }
  return out + text.slice(i);
}

function splitTopLevel(inner) {
  const parts = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < inner.length; i++) {
    const two = inner.slice(i, i + 2);
    if (two === "{{" || two === "[[") {
      depth++;
      cur += two;
      i++;
    } else if (two === "}}" || two === "]]") {
      depth--;
      cur += two;
      i++;
    } else if (inner[i] === "|" && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += inner[i];
  }
  parts.push(cur);
  return parts;
}

function transformTemplate(inner, stats) {
  const [rawName, ...params] = splitTopLevel(inner);
  const name = rawName.trim();
  if (ITEM_TEMPLATE.test(name) && !SPELL_TEMPLATE.test(name)) {
    stats.markup += inner.length;
    return SENTINEL;
  }
  const named = params.map((p) => {
    const eq = p.indexOf("=");
    return eq > 0 && !p.slice(0, eq).includes("{{") ? { key: p.slice(0, eq).trim(), value: p.slice(eq + 1).trim() } : { key: null, value: p.trim() };
  });
  const tooltip = /^(Spell|Pet|Class|Stance)Tooltip$/i.exec(name);
  if (tooltip) {
    const display = named.find((p) => p.key === "display_name")?.value;
    const main = named.find((p) => p.key && /_name$/.test(p.key))?.value ?? named.find((p) => !p.key)?.value ?? "";
    return display ? `${display} (${main})` : main;
  }
  const kept = named.filter((p) => {
    const drop = (p.key && ITEM_PARAM.test(p.key)) || ITEM_PRESET.test(p.value);
    ITEM_PRESET.lastIndex = 0;
    if (drop) stats.markup += p.value.length;
    return !drop;
  });
  const render = (params) => `{{${name}${params.map((p) => `\n| ${p.key ? `${p.key} = ` : ""}${p.value}`).join("")}${params.length ? "\n" : ""}}}`;
  if (/^GuideBox$/i.test(name)) {
    const setup = kept.filter((p) => p.key && SETUP_PARAM.test(p.key) && !p.value.includes(SENTINEL));
    if (setup.length) stats.boxes.push(render(setup));
  }
  if (SPELL_TEMPLATE.test(name) && named.some((p) => p.key && SPELL_PARAM.test(p.key))) {
    const spells = named.filter((p) => p.key && SPELL_PARAM.test(p.key) && !p.value.includes(SENTINEL));
    stats.markup += inner.length;
    const box = render(spells);
    stats.boxes.push(box);
    return box;
  }
  return render(kept);
}

/**
 * `removedShare` counts only dropped prose (sentences, list lines, tables) against the section's
 * text without markup, so long item preset codes don't make a phase section look like item discussion.
 */
function filterSection(wikitext, { redact, isItemPage }) {
  const stats = { original: wikitext.length, removed: 0, markup: 0, boxes: [] };
  let t = wikitext.replace(/<!--[\s\S]*?-->/g, "");
  t = replaceBalanced(t, "[[", "]]", (inner) => {
    const [target, ...rest] = splitTopLevel(inner);
    if (/^\s*(file|image):/i.test(target)) {
      stats.markup += inner.length;
      return "";
    }
    if (isItemPage(target.split("#")[0])) {
      stats.markup += inner.length;
      return SENTINEL;
    }
    return rest.length ? rest.at(-1) : target;
  });
  const templates = (text) => replaceBalanced(text, "{{", "}}", (inner) => transformTemplate(templates(inner), stats));
  t = redact(templates(t));
  t = replaceBalanced(t, "{|", "|}", (inner) => {
    if (inner.includes(SENTINEL) || GEAR_WORDS.test(inner)) {
      stats.removed += inner.length;
      return "[table removed: references items]";
    }
    return `{|${inner}|}`;
  });
  const lines = t.split("\n").flatMap((line) => {
    if (/^[*#:;]/.test(line) && line.includes(SENTINEL) && !ATTRIBUTE_LINE.test(line)) {
      stats.removed += line.length;
      return [];
    }
    const sentences = line.split(/(?<=[.!?])\s+/);
    const keptSentences = sentences.filter((s) => {
      const drop = GEAR_WORDS.test(s);
      if (drop) stats.removed += s.length;
      return !drop;
    });
    if (keptSentences.length < sentences.length && ATTRIBUTE_LINE.test(line)) {
      const m = ATTRIBUTE_VALUE.exec(line);
      const value = m?.[3].trim();
      if (value && !value.includes(SENTINEL) && !GEAR_WORDS.test(value)) return [`${m[1]} ${m[2]}: ${value} (rest of line removed)`];
    }
    if (keptSentences.length === 0 && sentences.some((s) => s.trim())) return [];
    return [keptSentences.join(" ")];
  });
  t = lines.join("\n").replaceAll(SENTINEL, "[item]").replace(/\n{3,}/g, "\n\n").trim();
  const prose = stats.original - stats.markup;
  return { text: t, boxes: stats.boxes, removedShare: prose > 0 ? Math.min(1, stats.removed / prose) : 0 };
}

/** Markup shape only (template names, parameter keys, table sizes); never prints values. */
function inventory(wikitext) {
  const counts = new Map();
  const walk = (text) =>
    replaceBalanced(text, "{{", "}}", (inner) => {
      walk(inner);
      const [name, ...params] = splitTopLevel(inner);
      const keys = params.map((p) => (p.includes("=") ? p.slice(0, p.indexOf("=")).trim() : "(positional)")).filter((k) => /^[\w\- ()]+$/.test(k));
      const key = `${ITEM_TEMPLATE.test(name.trim()) ? "(item template)" : name.trim()} [${[...new Set(keys)].join(", ")}]`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return "";
    });
  walk(wikitext);
  const tables = [];
  replaceBalanced(wikitext, "{|", "|}", (inner) => {
    tables.push(`table: ${inner.split(/\n\|-/).length} rows`);
    return "";
  });
  return [...[...counts].map(([k, n]) => `${n}× ${k}`), ...tables];
}

/** Splits a local wikitext file into the same section shape the API returns, for dry runs on allowed guides. */
function localSections(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const sections = [{ index: 0, level: 1, line: "(introduction)", body: [] }];
  for (const l of lines) {
    const m = /^(={2,6})\s*(.*?)\s*\1\s*$/.exec(l);
    if (m) sections.push({ index: sections.length, level: m[1].length, line: m[2], body: [l] });
    else sections.at(-1).body.push(l);
  }
  return sections.map((s) => ({ ...s, body: s.body.join("\n") }));
}

function cutAtFirstSubheading(wikitext) {
  const lines = wikitext.split("\n");
  const rest = lines.slice(1).findIndex((l) => /^={2,}.*={2,}\s*$/.test(l));
  return rest < 0 ? wikitext : lines.slice(0, rest + 1).join("\n");
}

function parseArgs(argv) {
  const drop = [];
  let list = false;
  let file = null;
  let out = OUT;
  let title = DEFAULT_TITLE;
  let shape = false;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--list") list = true;
    else if (argv[i] === "--drop") drop.push(argv[++i]);
    else if (argv[i] === "--file") file = argv[++i];
    else if (argv[i] === "--out") out = path.resolve(argv[++i]);
    else if (argv[i] === "--page") title = argv[++i];
    else if (argv[i] === "--inventory") shape = true;
  }
  return { list, drop, file, out, title, shape };
}

async function main() {
  const { list, drop, file, out, title: TITLE, shape } = parseArgs(process.argv.slice(2));
  const redactor = buildRedactor();
  const clean = (line) =>
    redactor
      .redact(line.replace(/<[^>]+>/g, "").replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1"))
      .replaceAll(SENTINEL, "[item]");
  const raw = file ? localSections(file) : [{ index: 0, level: 1, line: "(introduction)" }, ...(await fetchSections(FANDOM, TITLE))];
  const sections = raw.map((s) => ({ ...s, heading: clean(s.line) }));
  const sectionText = async (s) => (file ? s.body : fetchSectionWikitext(FANDOM, TITLE, s.index));

  const excludedAt = [];
  for (const s of sections) {
    while (excludedAt.length && excludedAt.at(-1) >= s.level) excludedAt.pop();
    const parentExcluded = excludedAt.length > 0;
    const own = !Number.isFinite(s.index)
      ? "transcluded"
      : EXCLUDED_HEADING.test(s.line) || s.heading.includes("[item]")
        ? "gear heading"
        : drop.includes(s.heading)
          ? "dropped by --drop"
          : null;
    s.reason = parentExcluded ? "under an excluded heading" : own;
    if (s.reason && s.index !== 0) excludedAt.push(s.level);
  }

  if (shape) {
    for (const s of sections.filter((x) => !x.reason)) {
      console.log(`${s.index}. ${s.heading}`);
      for (const l of inventory(cutAtFirstSubheading(await sectionText(s)))) console.log(`   ${clean(l)}`);
    }
    return;
  }

  if (!list) {
    for (const s of sections.filter((x) => !x.reason)) {
      const wikitext = cutAtFirstSubheading(await sectionText(s));
      const filtered = filterSection(wikitext, redactor);
      if (filtered.removedShare > MAX_REMOVED_SHARE) {
        s.reason = `mostly item content (${Math.round(filtered.removedShare * 100)}% removed)`;
        s.boxes = filtered.boxes.map((b) => b.replaceAll(SENTINEL, "[item]"));
      } else Object.assign(s, filtered);
    }
  }

  const boxesOnly = (s) => s.boxes?.length > 0;
  const status = (s) => {
    const share = s.removedShare === undefined ? "" : ` (${Math.round(s.removedShare * 100)}% removed)`;
    if (!s.reason) return `used${share}`;
    return `excluded: ${s.reason}${boxesOnly(s) ? "; prose dropped, setup boxes (pet/spells/stance) kept" : ""}`;
  };
  for (const s of sections) console.log(`${"  ".repeat(Math.max(0, s.level - 1))}${s.index}. ${s.heading} — ${status(s)}`);
  if (list) return;

  const used = sections.filter((s) => !s.reason || boxesOnly(s));
  const body = (s) => (s.reason ? ["Prose dropped (mostly item discussion); setup boxes only:", "", ...s.boxes].join("\n") : s.text || "(no text left after filtering)");
  const leaks = used.reduce((n, s) => n + redactor.countItemNames(body(s)), 0);
  if (leaks > 0) {
    console.error(`Aborting: ${leaks} item name(s) survived filtering; nothing was written.`);
    process.exit(1);
  }
  const source = file ? path.relative(ROOT, file) : `${pageUrl(FANDOM, TITLE)} (Fandom)`;
  const doc = [
    "# Chronomancer guide: setup sections only",
    "",
    `Source: ${source}, fetched ${new Date().toISOString().slice(0, 10)} by \`scripts/validation/chronomancer-setup.mjs\`.`,
    "Item templates, item parameters, images, item lists/tables and sentences about gear, enchants or slots were removed, and item and set names were redacted to `[item]`, before this file was written.",
    "",
    "## Sections",
    "",
    ...sections.map((s) => `- ${s.index}. ${s.heading}: ${status(s)}`),
    "",
    ...used.flatMap((s) => [`## ${s.index}. ${s.heading}`, "", body(s), ""]),
  ];
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, doc.join("\n"));
  console.log(`\nWrote ${out} (${used.length} sections)`);
}

await main();
