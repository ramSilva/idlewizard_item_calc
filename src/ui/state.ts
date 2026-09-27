import Decimal from "break_eternity.js";
import { defaultSelection, MAX_SPELLS } from "../data/buildModel.ts";
import { CLASSES, classById } from "../data/classes.ts";
import { itemByKey, ITEMS, qualitiesOf } from "../data/items.ts";
import type { SerializedInputs } from "../data/optimize.ts";
import { PETS } from "../data/pets.ts";
import { behaviourOf } from "../data/spellBehaviours.ts";
import { classSpells } from "../data/spells.ts";
import { MAX_ENCHANT_LEVEL } from "../engine/loadout.ts";
import { ITEM_SLOTS, QUALITIES, type InputSpec, type ItemSlot, type Quality } from "../engine/model.ts";
import { ENCHANT_LEVELS, type OptimizerOptions } from "../engine/optimizer.ts";
import type { OptimizeRequest } from "../worker/protocol.ts";

export interface Selection {
  classId: string;
  petId: string;
  spells: number[];
  stance?: string;
  idle: boolean;
  snapped: number[];
  scoreId: string;
}

export interface ItemOptions {
  /** Global real enchant level (0–55): the level shown in detail and used for relevance. */
  enchant: number;
  overrides: Record<string, number>;
  /** Differences from the default inventory (every non-Mythic item at maximum quality); null = not owned. */
  owned: Record<string, Quality | null>;
  excludedSlots: ItemSlot[];
  resonator: boolean;
  legion: boolean;
}

export interface AppState {
  selection: Selection;
  /** Input text as typed, by stat id; absent inputs use the model's default. */
  inputs: Record<string, string>;
  items: ItemOptions;
  /** Optimize every enchant level 0–55 instead of only the global level. */
  sweep: boolean;
}

export const classLegionDefault = (classId: string): boolean => classById(classId).defaults["Items.LegionReward"]?.value === 1;

export function defaultSelectionFor(classId: string): Selection {
  const d = defaultSelection(classId);
  return { classId, petId: d.petId, spells: d.spells, stance: d.stance, idle: d.idle ?? true, snapped: d.snapped ?? [], scoreId: d.scoreId! };
}

export function defaultItems(classId: string): ItemOptions {
  return { enchant: 0, overrides: {}, owned: {}, excludedSlots: [], resonator: true, legion: classLegionDefault(classId) };
}

export function defaultState(classId: string = CLASSES[0].id): AppState {
  return { selection: defaultSelectionFor(classId), inputs: {}, items: defaultItems(classId), sweep: true };
}

export const defaultQuality = (key: string): Quality | null => {
  const item = itemByKey(key);
  return !item || item.mythic ? null : item.maxQuality;
};

export const ownedQuality = (items: ItemOptions, key: string): Quality | null => (key in items.owned ? items.owned[key] : defaultQuality(key));

/** Sets an item's owned quality, keeping only differences from the default inventory. */
export function withOwned(items: ItemOptions, key: string, quality: Quality | null): ItemOptions {
  const owned = { ...items.owned };
  if (quality === defaultQuality(key)) delete owned[key];
  else owned[key] = quality;
  return { ...items, owned };
}

// ---------- Input values ----------

const NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;

export type ParsedInput = { ok: true; value: number | string | boolean } | { ok: false; error: string };

/** Parses typed input text into a serialized value (numbers beyond ~1e300 stay strings for `Decimal`). */
export function parseInputText(text: string, spec: InputSpec): ParsedInput {
  const t = text.trim().replace(/[_,\s]/g, "");
  if (spec.kind === "boolean") {
    if (/^(1|true|on|yes)$/i.test(t)) return { ok: true, value: true };
    if (/^(0|false|off|no)$/i.test(t)) return { ok: true, value: false };
    return { ok: false, error: "Expected on or off" };
  }
  const normalized = /^e[+-]?\d+$/i.test(t) ? `1${t}` : t;
  if (!NUMBER.test(normalized)) return { ok: false, error: spec.logScale ? "Enter a number such as 1500, 2.5e12 or 1e300" : "Enter a number" };
  const d = new Decimal(normalized);
  if (spec.min !== undefined && d.lt(spec.min)) return { ok: false, error: `Must be at least ${formatNumber(spec.min)}` };
  if (spec.max !== undefined && d.gt(spec.max)) return { ok: false, error: `Must be at most ${formatNumber(spec.max)}` };
  const small = d.eq(0) || Math.abs(d.log10().toNumber()) < 305;
  if (spec.kind === "integer" && small && !Number.isInteger(d.toNumber())) return { ok: false, error: "Must be a whole number" };
  return { ok: true, value: small ? d.toNumber() : d.toString() };
}

const sameValue = (a: number | string | boolean, b: number): boolean =>
  typeof a === "boolean" ? Number(a) === b : new Decimal(a).eq(b);

export function formatNumber(n: number | string): string {
  const d = new Decimal(n);
  const x = d.toNumber();
  if (x === 0) return "0";
  if (Number.isFinite(x) && Math.abs(x) < 1e6 && Math.abs(x) >= 1e-3) return String(Number(x.toPrecision(6)));
  if (Number.isFinite(x)) return Number(x.toPrecision(6)).toExponential().replace("e+", "e");
  const exp = d.abs().log10().floor().toNumber();
  const mantissa = d.div(Decimal.pow(10, exp)).toNumber();
  return `${Number(mantissa.toPrecision(4))}e${exp}`;
}

/** Valid typed inputs that differ from their defaults, ready for the worker. */
export function serializedInputs(inputs: Record<string, string>, specs: ReadonlyMap<string, InputSpec>): SerializedInputs {
  const out: SerializedInputs = {};
  for (const [id, text] of Object.entries(inputs)) {
    const spec = specs.get(id);
    if (!spec) continue;
    const p = parseInputText(text, spec);
    if (p.ok && !sameValue(p.value, spec.default)) out[id] = p.value;
  }
  return out;
}

// ---------- Worker request ----------

export function optimizerOptions(items: ItemOptions): OptimizerOptions {
  const owned: Record<string, Quality> = {};
  for (const item of ITEMS) {
    const q = ownedQuality(items, item.key);
    if (q) owned[item.key] = q;
  }
  return {
    owned,
    excludedSlots: [...items.excludedSlots],
    enchantOverrides: { ...items.overrides },
    legion: items.legion,
    resonator: items.resonator,
  };
}

export function optimizeRequest(state: AppState, selection: Selection, specs: ReadonlyMap<string, InputSpec>, full: boolean): OptimizeRequest {
  const level = state.items.enchant;
  return {
    selection,
    inputs: serializedInputs(state.inputs, specs),
    options: optimizerOptions(state.items),
    levels: full && state.sweep ? [...ENCHANT_LEVELS] : [level],
    relevanceLevel: level,
  };
}

// ---------- Sanitizing ----------

const clampLevel = (n: unknown): number | null =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(MAX_ENCHANT_LEVEL, Math.max(0, Math.round(n))) : null;

/** Drops anything a stored or shared state can't mean for the current data (unknown ids, wrong class spells, bad levels). */
export function sanitizeSelection(sel: Partial<Selection> & { classId: string }): Selection {
  const cls = classById(sel.classId);
  const base = defaultSelectionFor(cls.id);
  const allowed = new Set(classSpells(cls.name).map((s) => s.id));
  const spells = Array.isArray(sel.spells) ? [...new Set(sel.spells.filter((id) => typeof id === "number" && allowed.has(id)))].slice(0, MAX_SPELLS) : base.spells;
  const petId = typeof sel.petId === "string" && PETS.some((p) => p.id === sel.petId) ? sel.petId : base.petId;
  const stance = sel.stance === undefined ? undefined : cls.stances.some((s) => s.id === sel.stance) ? sel.stance : base.stance;
  const snapped = (Array.isArray(sel.snapped) ? sel.snapped : base.snapped).filter((id) => spells.includes(id) && behaviourOf(id).snap);
  return {
    classId: cls.id,
    petId,
    spells,
    stance,
    idle: typeof sel.idle === "boolean" ? sel.idle : base.idle,
    snapped: [...new Set(snapped)],
    scoreId: typeof sel.scoreId === "string" ? sel.scoreId : base.scoreId,
  };
}

// ---------- Compact encoding (localStorage and share URL) ----------

/**
 * Short keys, only fields that differ from `defaultState(classId)`:
 * c class, p pet, s spells, t stance ("" = none), d idle, n snapped, o score, i inputs, e enchant,
 * v enchant overrides, q owned (quality index into QUALITIES, -1 = not owned), x excluded slots (indices into ITEM_SLOTS),
 * r Resonator allowed, l Legion, w full sweep.
 */
interface Compact {
  c: string;
  p?: string;
  s?: number[];
  t?: string;
  d?: 0 | 1;
  n?: number[];
  o?: string;
  i?: Record<string, string>;
  e?: number;
  v?: Record<string, number>;
  q?: Record<string, number>;
  x?: number[];
  r?: 0 | 1;
  l?: 0 | 1;
  w?: 0 | 1;
}

const sameList = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const bit = (b: boolean): 0 | 1 => (b ? 1 : 0);

/** Drops typed inputs that equal their default (only for inputs in `specs`; others are kept for other setups). */
export function pruneInputs(inputs: Record<string, string>, specs: ReadonlyMap<string, InputSpec>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(inputs).filter(([id, text]) => {
      const spec = specs.get(id);
      if (!spec) return true;
      const p = parseInputText(text, spec);
      return !p.ok || !sameValue(p.value, spec.default);
    }),
  );
}

export function toCompact(state: AppState, specs?: ReadonlyMap<string, InputSpec>): Compact {
  const def = defaultState(state.selection.classId);
  const sel = state.selection;
  const out: Compact = { c: sel.classId };
  if (sel.petId !== def.selection.petId) out.p = sel.petId;
  if (!sameList(sel.spells, def.selection.spells)) out.s = sel.spells;
  if (sel.stance !== def.selection.stance) out.t = sel.stance ?? "";
  if (sel.idle !== def.selection.idle) out.d = bit(sel.idle);
  if (!sameList(sel.snapped, def.selection.snapped)) out.n = sel.snapped;
  if (sel.scoreId !== def.selection.scoreId) out.o = sel.scoreId;
  const inputs = specs ? pruneInputs(state.inputs, specs) : state.inputs;
  if (Object.keys(inputs).length) out.i = { ...inputs };
  const it = state.items;
  if (it.enchant !== def.items.enchant) out.e = it.enchant;
  if (Object.keys(it.overrides).length) out.v = { ...it.overrides };
  if (Object.keys(it.owned).length) out.q = Object.fromEntries(Object.entries(it.owned).map(([k, q]) => [k, q ? QUALITIES.indexOf(q) : -1]));
  if (it.excludedSlots.length) out.x = it.excludedSlots.map((s) => ITEM_SLOTS.indexOf(s));
  if (it.resonator !== def.items.resonator) out.r = bit(it.resonator);
  if (it.legion !== def.items.legion) out.l = bit(it.legion);
  if (state.sweep !== def.sweep) out.w = bit(state.sweep);
  return out;
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

export function fromCompact(raw: unknown): AppState {
  if (!isRecord(raw) || typeof raw.c !== "string" || !CLASSES.some((c) => c.id === raw.c)) return defaultState();
  const c = raw as unknown as Compact;
  const def = defaultState(c.c);
  const selection = sanitizeSelection({
    classId: c.c,
    petId: c.p ?? def.selection.petId,
    spells: c.s ?? def.selection.spells,
    stance: c.t === undefined ? def.selection.stance : c.t || undefined,
    idle: c.d === undefined ? def.selection.idle : c.d === 1,
    snapped: c.n ?? def.selection.snapped,
    scoreId: c.o ?? def.selection.scoreId,
  });
  const inputs: Record<string, string> = {};
  if (isRecord(c.i)) for (const [k, v] of Object.entries(c.i)) if (typeof v === "string" || typeof v === "number") inputs[k] = String(v);

  const items = { ...def.items };
  items.enchant = clampLevel(c.e) ?? def.items.enchant;
  if (isRecord(c.v)) {
    for (const [k, v] of Object.entries(c.v)) {
      const level = clampLevel(v);
      if (itemByKey(k) && level !== null) items.overrides[k] = level;
    }
  }
  if (isRecord(c.q)) {
    for (const [k, v] of Object.entries(c.q)) {
      const item = itemByKey(k);
      if (!item || typeof v !== "number") continue;
      if (v === -1) items.owned[k] = null;
      else if (qualitiesOf(item).includes(QUALITIES[v])) items.owned[k] = QUALITIES[v];
    }
    items.owned = Object.fromEntries(Object.entries(items.owned).filter(([k, q]) => q !== defaultQuality(k)));
  }
  if (Array.isArray(c.x)) items.excludedSlots = [...new Set(c.x.filter((i) => typeof i === "number").map((i) => ITEM_SLOTS[i]).filter(Boolean))];
  if (c.r !== undefined) items.resonator = c.r === 1;
  if (c.l !== undefined) items.legion = c.l === 1;
  return { selection, inputs, items, sweep: c.w === undefined ? def.sweep : c.w === 1 };
}

const toBase64Url = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromBase64Url = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (ch) => ch.charCodeAt(0)));

export const encodeState = (state: AppState, specs?: ReadonlyMap<string, InputSpec>): string => toBase64Url(JSON.stringify(toCompact(state, specs)));

/** Falls back to the default state for anything unreadable. */
export function decodeState(encoded: string): AppState {
  try {
    return fromCompact(JSON.parse(fromBase64Url(encoded)));
  } catch {
    return defaultState();
  }
}
