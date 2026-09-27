import { useState } from "react";
import type { BuiltModel } from "../data/buildModel.ts";
import { itemByKey, setByNameOf } from "../data/items.ts";
import { ITEM_SLOTS, SLOT_CAPACITY } from "../engine/model.ts";
import type { ChosenItem, LevelResult, SetResult, SweepResult } from "../engine/optimizer.ts";
import { EXCLUSION_LABELS, formatMultiplier, UNMODELLED_LABELS } from "./format.ts";
import type { InputField } from "./model.ts";
import { formatNumber } from "./state.ts";
import type { SweepProgress } from "./useOptimizer.ts";

export interface ResultView {
  result: SweepResult;
  /** "quick": the automatic run of the global level only; "partial": a sweep still running. */
  kind: "sweep" | "quick" | "partial";
  /** The setup changed since this result was computed. */
  stale: boolean;
  ms?: number;
}

interface Props {
  view: ResultView | null;
  progress: SweepProgress | null;
  error: string | null;
  enchant: number;
  sweep: boolean;
  onSweepChange(on: boolean): void;
  onRun(): void;
  onCancel(): void;
  model: BuiltModel | null;
  fields: InputField[];
  inputs: Record<string, string>;
}

const branchLabel = (b: SetResult) => (b.forced.length ? `With ${b.forced.map((k) => itemByKey(k)?.name ?? k).join(", ")}` : "Without Resonator Ring");

function BestSet({ row }: { row: LevelResult }) {
  const bySlot = new Map<string, ChosenItem[]>();
  for (const i of row.best.items) bySlot.set(i.slot, [...(bySlot.get(i.slot) ?? []), i]);
  const rows = ITEM_SLOTS.flatMap((slot) => Array.from({ length: SLOT_CAPACITY[slot] }, (_, k) => ({ slot, item: bySlot.get(slot)?.[k] })));
  return (
    <table className="best-set">
      <thead>
        <tr>
          <th>Slot</th>
          <th>Item</th>
          <th>Quality</th>
          <th title="Real levels bought (effective levels including bonus levels)">Enchant</th>
          <th title="Score with the item divided by the score with its slot left empty">Contribution</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ slot, item }, k) => (
          <tr key={`${slot}${k}`} className={item ? "" : "muted"}>
            <td>{slot}</td>
            <td>
              {item ? (
                <>
                  {item.name}
                  {item.set && <span className="tag">{item.set}</span>}
                </>
              ) : (
                "—"
              )}
            </td>
            <td>{item?.quality}</td>
            <td>{item && (item.effectiveEnchant > 0 ? `${item.enchant} (${item.effectiveEnchant})` : item.enchant > 0 ? String(item.enchant) : "—")}</td>
            <td className="num">
              {item && (item.contributionLog10 === Infinity ? <span title="Removing it breaks another item's attribute requirement">required</span> : formatMultiplier(item.contributionLog10))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SweepTable({ result, selected, onSelect }: { result: SweepResult; selected: number; onSelect(level: number): void }) {
  const rows = result.levels.filter((r) => r.changed);
  return (
    <table className="sweep">
      <thead>
        <tr>
          <th>From enchant</th>
          <th>vs no items</th>
          <th>Items in</th>
          <th>Items out</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const prev = rows[i - 1];
          const keys = new Set(r.best.items.map((x) => x.key));
          const prevKeys = new Set(prev?.best.items.map((x) => x.key) ?? []);
          const added = r.best.items.filter((x) => !prevKeys.has(x.key)).map((x) => x.name);
          const removed = prev?.best.items.filter((x) => !keys.has(x.key)).map((x) => x.name) ?? [];
          return (
            <tr key={r.level} className={r.level === selected ? "selected" : ""} onClick={() => onSelect(r.level)}>
              <td>
                <button type="button" className="link" onClick={() => onSelect(r.level)}>
                  {r.level}
                </button>
              </td>
              <td className="num">{formatMultiplier(r.best.gainLog10)}</td>
              <td>{prev ? added.join(", ") : `${r.best.items.length} items`}</td>
              <td>{removed.join(", ")}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function Assumptions({ row, model, fields, inputs }: { row: LevelResult; model: BuiltModel | null; fields: InputField[]; inputs: Record<string, string> }) {
  const byNote = new Map<string, string[]>();
  const flag = (note: string, where: string) => byNote.set(note, [...(byNote.get(note) ?? []), where]);
  for (const chosen of row.best.items) {
    const item = itemByKey(chosen.key);
    const tier = item?.tiers.find((t) => t.quality === chosen.quality);
    for (const e of tier?.effects ?? []) if (!e.source.verified) flag(e.source.note ?? "Unverified reading.", `${chosen.name} (“${e.text}”)`);
    for (const u of tier?.unmodelled ?? []) {
      if (u.reason !== "not-production") flag(`Ignored: ${UNMODELLED_LABELS[u.reason]}.`, `${chosen.name} (“${u.text}”)`);
    }
    if (item?.enchant && !item.enchant.source.verified && chosen.enchant > 0) flag(item.enchant.source.note ?? "Unverified enchant.", `${chosen.name} enchant`);
  }
  const itemFlags = [...byNote].sort((a, b) => b[1].length - a[1].length);
  const setCounts = new Map<string, number>();
  for (const i of row.best.items) if (i.set) setCounts.set(i.set, (setCounts.get(i.set) ?? 0) + 1);
  const setFlags = [...setCounts].filter(([, n]) => n >= 2).map(([name, n]) => ({ name, n, note: setByNameOf(name)?.source.note }));
  const inputFlags = fields.filter((f) => f.shown && inputs[f.id] === undefined && f.defaultSource && !f.defaultSource.verified);
  const incomplete = row.branches.filter((b) => !b.stats.complete);

  return (
    <details className="assumptions" open>
      <summary>Assumptions and unverified data behind this result</summary>
      <ul>
        {incomplete.map((b) => (
          <li key={branchLabel(b)} className="warning">
            {branchLabel(b)}: the exact search ran out of budget, so this is the best set found, not proven best.
          </li>
        ))}
        {inputFlags.length > 0 && (
          <li>
            Inputs still at unverified defaults:
            <ul>
              {inputFlags.map((f) => (
                <li key={f.id}>
                  {f.label} = {formatNumber(f.spec.default)} — {f.defaultSource?.note}
                </li>
              ))}
            </ul>
          </li>
        )}
        {setFlags.map((s) => (
          <li key={s.name}>
            {s.name} ({s.n} pieces): {s.note}
          </li>
        ))}
        {itemFlags.map(([note, where]) => (
          <li key={note}>
            <strong>{note}</strong> <span className="muted">Affects {where.join("; ")}.</span>
          </li>
        ))}
        {model && model.unmodelled.length > 0 && (
          <li>
            Parts of the class, stance, pet and spells that aren't modelled:
            <ul>
              {model.unmodelled.map((u, i) => (
                <li key={i}>
                  {u.from}: {u.text} — {u.note}
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </details>
  );
}

export function ResultsPanel({ view, progress, error, enchant, sweep, onSweepChange, onRun, onCancel, model, fields, inputs }: Props) {
  const [picked, setPicked] = useState<number | null>(null);
  const levels = view?.result.levels ?? [];
  const row =
    levels.find((r) => r.level === picked) ?? levels.find((r) => r.level === enchant) ?? (levels.length ? levels[levels.length - 1] : undefined);
  const excluded = new Map<string, string[]>();
  for (const e of view?.result.excluded ?? []) excluded.set(e.reason, [...(excluded.get(e.reason) ?? []), e.name]);

  return (
    <section className="panel" aria-labelledby="results-heading">
      <div className="panel-head">
        <h2 id="results-heading">Results</h2>
        <div className="field-row">
          <label className="check small">
            <input type="checkbox" checked={sweep} onChange={(e) => onSweepChange(e.target.checked)} />
            all enchant levels 0–55
          </label>
          {progress ? (
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <button type="button" className="primary" onClick={onRun} disabled={!model}>
              {sweep ? "Run enchant sweep" : `Optimize enchant ${enchant}`}
            </button>
          )}
        </div>
      </div>
      {progress && (
        <div className="progress" role="status">
          <progress max={progress.total} value={progress.done} /> {progress.done} / {progress.total} levels
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <p className="muted">
        Scores are relative multipliers: factors that scale every item set equally are dropped (and never asked for), so only ratios between sets are meaningful,
        never absolute mana.
      </p>
      {view?.stale && <p className="warning">The setup changed since this result was computed{view.kind === "quick" ? "; updating…" : "; run again to refresh it."}</p>}
      {view?.kind === "quick" && <p className="muted">Automatic result for the global enchant level. Run the sweep to see where the best set changes.</p>}
      {!view && !progress && <p className="muted">Computing the best set for the current setup…</p>}
      {view && row && (
        <>
          <h3>
            Best set at enchant {row.level}: {formatMultiplier(row.best.gainLog10)} vs no items
          </h3>
          {row.branches.length > 1 && (
            <p className="muted">
              {row.branches
                .map((b) => `${branchLabel(b)}: ${b === row.best ? "best" : `${formatMultiplier(b.scoreLog10 - row.best.scoreLog10)} of the best`}`)
                .join(" · ")}
            </p>
          )}
          <BestSet row={row} />
          {view.kind !== "quick" && levels.length > 1 && (
            <>
              <h3>Enchant levels where the best set changes</h3>
              <SweepTable result={view.result} selected={row.level} onSelect={setPicked} />
              {view.kind === "sweep" && <p className="muted">Unchanged at the other {levels.length - view.result.changes.length} levels. Click a level to see its set.</p>}
            </>
          )}
          <Assumptions row={row} model={model} fields={fields} inputs={inputs} />
          {excluded.size > 0 && (
            <details>
              <summary>Items left out ({view.result.excluded.length})</summary>
              <ul>
                {[...excluded].map(([reason, names]) => (
                  <li key={reason}>
                    <strong>
                      {EXCLUSION_LABELS[reason] ?? reason} ({names.length}):
                    </strong>{" "}
                    {names.join(", ")}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {view.ms !== undefined && <p className="muted small">Computed in {(view.ms / 1000).toFixed(1)} s.</p>}
        </>
      )}
    </section>
  );
}
