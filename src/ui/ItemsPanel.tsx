import { useMemo, useState } from "react";
import { ITEMS, qualitiesOf } from "../data/items.ts";
import { MAX_ENCHANT_LEVEL } from "../engine/loadout.ts";
import { ITEM_SLOTS, type ItemSlot, type Quality } from "../engine/model.ts";
import type { StatRegistry } from "../engine/stats.ts";
import { ItemDetails } from "./ItemDetails.tsx";
import { BOT_SUB_PARAGON, botSubParagonSlots, PARAGON_SLOT_UNLOCK, PARAGON_SOURCE } from "./model.ts";
import { classLegionDefault, defaultItems, ownedQuality, withOwned, type ItemOptions } from "./state.ts";

interface Props {
  items: ItemOptions;
  classId: string;
  stats?: StatRegistry;
  onChange(items: ItemOptions): void;
}

const ENCHANTABLE: readonly Quality[] = ["Legendary", "Unique"];

function LevelInput({ value, onChange, label, placeholder }: { value: number | undefined; onChange(v: number | undefined): void; label: string; placeholder?: string }) {
  return (
    <input
      type="number"
      aria-label={label}
      min={0}
      max={MAX_ENCHANT_LEVEL}
      step={1}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => {
        if (e.target.value === "") return onChange(undefined);
        const n = Math.round(Number(e.target.value));
        if (Number.isFinite(n)) onChange(Math.min(MAX_ENCHANT_LEVEL, Math.max(0, n)));
      }}
    />
  );
}

export function ItemsPanel({ items, classId, stats, onChange }: Props) {
  const [slot, setSlot] = useState<ItemSlot | "">("");
  const [query, setQuery] = useState("");
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [paragon, setParagon] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ITEMS.filter(
      (i) =>
        (!slot || i.slot === slot) &&
        (!q || i.name.toLowerCase().includes(q) || (i.set ?? "").toLowerCase().includes(q)) &&
        (!ownedOnly || ownedQuality(items, i.key) !== null),
    ).sort((a, b) => ITEM_SLOTS.indexOf(a.slot) - ITEM_SLOTS.indexOf(b.slot) || a.name.localeCompare(b.name));
  }, [slot, query, ownedOnly, items]);

  const set = (patch: Partial<ItemOptions>) => onChange({ ...items, ...patch });
  const toggleSlot = (s: ItemSlot, excluded: boolean) =>
    set({ excludedSlots: excluded ? [...items.excludedSlots, s] : items.excludedSlots.filter((x) => x !== s) });
  const setOverride = (key: string, level: number | undefined) => {
    const overrides = { ...items.overrides };
    if (level === undefined) delete overrides[key];
    else overrides[key] = level;
    set({ overrides });
  };
  const applyParagon = () => {
    const p = Number(paragon);
    if (Number.isFinite(p)) set({ excludedSlots: ITEM_SLOTS.filter((s) => PARAGON_SLOT_UNLOCK[s] > p) });
  };
  const ownedCount = ITEMS.filter((i) => ownedQuality(items, i.key) !== null).length;

  return (
    <section className="panel" aria-labelledby="items-heading">
      <div className="panel-head">
        <h2 id="items-heading">Items</h2>
        <button type="button" onClick={() => onChange(defaultItems(classId))}>
          Reset items
        </button>
      </div>

      <div className="grid">
        <label>
          Global enchant level (0–{MAX_ENCHANT_LEVEL})
          <div className="field-row">
            <input
              type="range"
              min={0}
              max={MAX_ENCHANT_LEVEL}
              value={items.enchant}
              aria-label="Global enchant level slider"
              onChange={(e) => set({ enchant: Number(e.target.value) })}
            />
            <LevelInput label="Global enchant level" value={items.enchant} onChange={(v) => set({ enchant: v ?? 0 })} />
          </div>
          <span className="hint">Real levels bought on every Legendary/Unique item without an override. Results show this level in detail.</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={items.legion} onChange={(e) => set({ legion: e.target.checked })} />
          The Legion reward (+1 bonus enchant level)
          <span className="hint"> Class default: {classLegionDefault(classId) ? "on" : "off"}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={items.resonator} onChange={(e) => set({ resonator: e.target.checked })} />
          Allow Resonator Ring (bonus levels for all enchanted items)
        </label>
      </div>

      <h3>Slots</h3>
      <p className="muted">
        Exclude slots you haven't unlocked. Unlock levels are from the{" "}
        <a href={PARAGON_SOURCE.url} target="_blank" rel="noreferrer">
          Paragon page
        </a>
        .
      </p>
      <div className="field-row wrap">
        <label>
          My Paragon level{" "}
          <input type="number" min={0} max={200} value={paragon} onChange={(e) => setParagon(e.target.value)} aria-label="Paragon level" />
        </label>
        <button type="button" onClick={applyParagon} disabled={paragon === ""}>
          Exclude locked slots
        </button>
        <span className="muted">BiS bot SubParagon:</span>
        {BOT_SUB_PARAGON.map((b) => (
          <button
            type="button"
            key={b.level}
            title={`Excludes ${botSubParagonSlots(b.level).join(", ")} (the bot's numbering; reading it as cumulative is an assumption)`}
            onClick={() => set({ excludedSlots: botSubParagonSlots(b.level) })}
          >
            {b.level}: {b.slots.join("/")}
          </button>
        ))}
        <button type="button" onClick={() => set({ excludedSlots: [] })} disabled={items.excludedSlots.length === 0}>
          All slots
        </button>
      </div>
      <div className="slots">
        {ITEM_SLOTS.map((s) => (
          <label key={s} className="check small">
            <input type="checkbox" checked={!items.excludedSlots.includes(s)} onChange={(e) => toggleSlot(s, !e.target.checked)} />
            {s} <span className="muted">P{PARAGON_SLOT_UNLOCK[s]}</span>
          </label>
        ))}
      </div>

      <h3>
        Owned items ({ownedCount} of {ITEMS.length})
      </h3>
      <p className="muted">By default every non-Mythic item is owned at its maximum quality. Mythic items only count their inherent effect.</p>
      <div className="field-row wrap">
        <input type="search" placeholder="Search name or set" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search items" />
        <select value={slot} onChange={(e) => setSlot(e.target.value as ItemSlot | "")} aria-label="Filter by slot">
          <option value="">All slots</option>
          {ITEM_SLOTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="check small">
          <input type="checkbox" checked={ownedOnly} onChange={(e) => setOwnedOnly(e.target.checked)} />
          owned only
        </label>
        <button type="button" onClick={() => set({ owned: {} })}>
          Own all non-Mythic (max quality)
        </button>
        <button type="button" onClick={() => set({ owned: Object.fromEntries(ITEMS.filter((i) => !i.mythic).map((i) => [i.key, null])) })}>
          Own none
        </button>
      </div>

      <table className="items">
        <thead>
          <tr>
            <th>Owned</th>
            <th>Item</th>
            <th>Slot</th>
            <th>Quality</th>
            <th title="Real enchant level for this item; empty uses the global level">Enchant</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((item) => {
            const quality = ownedQuality(items, item.key);
            const enchantable = quality !== null && ENCHANTABLE.includes(quality) && item.enchant !== null;
            const expanded = open === item.key;
            return [
              <tr key={item.key} className={quality ? "" : "not-owned"}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Own ${item.name}`}
                    checked={quality !== null}
                    onChange={(e) => onChange(withOwned(items, item.key, e.target.checked ? item.maxQuality : null))}
                  />
                </td>
                <td>
                  <button type="button" className="link" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : item.key)}>
                    {expanded ? "▾" : "▸"} {item.name}
                  </button>
                  {item.set && <span className="tag">{item.set}</span>}
                  {item.mythic && <span className="tag">Mythic</span>}
                </td>
                <td>{item.slot}</td>
                <td>
                  {quality && (
                    <select aria-label={`${item.name} quality`} value={quality} onChange={(e) => onChange(withOwned(items, item.key, e.target.value as Quality))}>
                      {qualitiesOf(item).map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
                <td>
                  {enchantable ? (
                    <LevelInput label={`${item.name} enchant override`} value={items.overrides[item.key]} placeholder={`global ${items.enchant}`} onChange={(v) => setOverride(item.key, v)} />
                  ) : (
                    <span className="muted" title={item.enchant ? "Only Legendary and Unique items can be enchanted" : "No enchant"}>
                      —
                    </span>
                  )}
                </td>
              </tr>,
              expanded && (
                <tr key={`${item.key}-details`} className="details-row">
                  <td colSpan={5}>
                    <ItemDetails item={item} quality={quality} stats={stats} />
                  </td>
                </tr>
              ),
            ];
          })}
        </tbody>
      </table>
    </section>
  );
}
