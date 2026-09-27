import type { Source, SpellBehavior, SpellDef } from "../engine/model.ts";
import raw from "./generated/spells.json";

interface RawSpell {
  id: number;
  name: string;
  school: SpellDef["school"];
  accumulated: boolean;
  persistent: boolean;
  behavior: SpellBehavior | null;
  duration: number | null;
  description: string;
  math: string | null;
  classes: string[];
}

const DATA = raw as unknown as { meta: { url: string }; spells: RawSpell[] };

export const SPELL_DATA_URL = "https://idlewizard.wiki.gg/wiki/Module:Data/Spells";
export const SPELL_SOURCE: Source = { url: SPELL_DATA_URL, verified: true };

export const spellKey = (name: string): string =>
  name
    .replace(/'/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("");

export const SPELLS: readonly SpellDef[] = DATA.spells.map((s) => ({
  id: s.id,
  name: s.name,
  key: spellKey(s.name),
  school: s.school,
  accumulated: s.accumulated,
  persistent: s.persistent,
  behavior: s.behavior,
  duration: s.duration,
  description: s.description,
  math: s.math,
  classes: s.classes,
  source: SPELL_SOURCE,
}));

const byId = new Map(SPELLS.map((s) => [s.id, s]));

export function spellById(id: number): SpellDef {
  const s = byId.get(id);
  if (!s) throw new Error(`Unknown spell id ${id}`);
  return s;
}

/** Spells an item adds to any class's spellbook; they only take effect while the item is equipped. */
export const ITEM_GRANTED_SPELLS: ReadonlyMap<number, { item: string; source: Source }> = new Map([
  [111, { item: "The Accumulator", source: { url: "https://idlewizard.wiki.gg/wiki/The_Accumulator", verified: true } }],
]);

export const classSpells = (className: string): SpellDef[] => SPELLS.filter((s) => s.classes.includes(className) || ITEM_GRANTED_SPELLS.has(s.id));

/** Per-spell stat ids, e.g. `Spell.RitualOfPower.CastsThisExile`. */
export const spellStat = (spell: SpellDef, name: string): string => `Spell.${spell.key}.${name}`;
