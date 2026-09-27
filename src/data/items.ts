import type { Attribute, EffectBlock, ItemDef, ItemSlot, Quality, SetDef, Source } from "../engine/model.ts";
import { QUALITIES } from "../engine/model.ts";
import raw from "./generated/items.json";
import { ITEM_OVERRIDES } from "./itemOverrides.ts";
import { parseEffectText, parseEnchant } from "./itemText.ts";

interface RawItem {
  id: number | null;
  name: string;
  slot: string;
  set: string | null;
  startQuality: string;
  requirements: Record<string, number>;
  tiers: { quality: string; desc: string }[];
  enchant: string | null;
  acquisition: string | null;
  details: string | null;
  source: string;
}

interface RawSet {
  name: string;
  items: Record<string, string>;
  tiers: { pieces: number; desc: string }[];
}

const DATA = raw as unknown as { meta: { url: string; revid: number }; items: RawItem[]; sets: RawSet[] };

export const ITEM_DATA_URL = DATA.meta.url;

export const itemKey = (name: string): string =>
  name
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const MYTHIC_SPLIT = /<b>\s*Random Bonuses:\s*<\/b>/i;

function mythicBlock(desc: string, url: string): EffectBlock {
  const [inherent, rest = ""] = desc.split(MYTHIC_SPLIT);
  const parsed = parseEffectText(inherent.replace(/<b>\s*Inherent:\s*<\/b>/i, ""), { url, quality: "Mythic" });
  return {
    desc,
    ...parsed,
    unmodelled: [
      ...parsed.unmodelled,
      { text: `Random Bonuses: ${rest.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`, reason: "mythic-random", note: "Rolled per item; not encoded." },
    ],
  };
}

function buildItem(r: RawItem): ItemDef {
  const mythic = r.startQuality === "Mythic";
  const overrides = ITEM_OVERRIDES[r.name] ?? [];
  const source: Source = { url: r.source, verified: true };
  const tiers = r.tiers.map((t) => {
    const quality = t.quality as Quality;
    const block = mythic ? mythicBlock(t.desc, r.source) : { desc: t.desc, ...parseEffectText(t.desc, { url: r.source, quality, overrides }) };
    return { quality, ...block };
  });
  const enchant = r.enchant ? parseEnchant(r.enchant, r.source) : null;
  if (enchant && mythic) {
    enchant.unmodelled = { text: r.enchant!, reason: "mythic-random", note: "Chosen per item at the Mythic Forge." };
  }
  return {
    key: itemKey(r.name),
    id: r.id,
    name: r.name,
    slot: r.slot as ItemSlot,
    set: r.set,
    startQuality: r.startQuality as Quality,
    maxQuality: tiers[tiers.length - 1].quality,
    requirements: r.requirements as Partial<Record<Attribute, number>>,
    tiers,
    enchant,
    mythic,
    acquisition: r.acquisition,
    details: r.details,
    source,
  };
}

export const ITEMS: readonly ItemDef[] = DATA.items.map(buildItem);

const byKey = new Map(ITEMS.map((i) => [i.key, i]));
const byName = new Map(ITEMS.map((i) => [i.name, i]));
const byId = new Map(ITEMS.filter((i) => i.id !== null).map((i) => [i.id!, i]));

export const itemByKey = (key: string): ItemDef | undefined => byKey.get(key);
export const itemByName = (name: string): ItemDef | undefined => byName.get(name);
export const itemById = (id: number): ItemDef | undefined => byId.get(id);

export function tierOf(item: ItemDef, quality: Quality = item.maxQuality) {
  const tier = item.tiers.find((t) => t.quality === quality);
  if (!tier) throw new Error(`${item.name} has no ${quality} tier (${item.startQuality}–${item.maxQuality})`);
  return tier;
}

/** Qualities an item can be at, lowest first. */
export const qualitiesOf = (item: ItemDef): Quality[] => item.tiers.map((t) => t.quality);

export const qualityRank = (q: Quality): number => QUALITIES.indexOf(q);

export const SETS: readonly SetDef[] = DATA.sets.map((s) => {
  const source: Source = {
    url: ITEM_DATA_URL,
    verified: false,
    note: "Set tier N applies from N + 1 pieces (Module:Items SetInfo); tiers are assumed to be cumulative.",
  };
  return {
    name: s.name,
    items: Object.values(s.items).map((n) => {
      const item = byName.get(n);
      if (!item) throw new Error(`Set ${s.name} lists unknown item ${n}`);
      return item.key;
    }),
    tiers: s.tiers.map((t) => ({ pieces: t.pieces, desc: t.desc, ...parseEffectText(t.desc, { url: ITEM_DATA_URL, quality: "Legendary" }) })),
    source,
  };
});

const setByName = new Map(SETS.map((s) => [s.name, s]));
export const setByNameOf = (name: string): SetDef | undefined => setByName.get(name);

/** Resolves a guide preset such as `104;113;1;…` (20 ids, -1 for an empty slot) to items. */
export function presetItems(code: string): ItemDef[] {
  return code
    .split(";")
    .map(Number)
    .filter((id) => id >= 0)
    .map((id) => {
      const item = itemById(id);
      if (!item) throw new Error(`Unknown item id ${id} in preset ${code}`);
      return item;
    });
}
