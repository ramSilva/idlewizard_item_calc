import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OptimizerClient } from "../worker/optimizerClient.ts";
import { InputsPanel } from "./InputsPanel.tsx";
import { ItemsPanel } from "./ItemsPanel.tsx";
import { buildUiModel, inputFields } from "./model.ts";
import { isOwnHash, loadState, saveState, shareUrl } from "./persistence.ts";
import { ResultsPanel, type ResultView } from "./ResultsPanel.tsx";
import { SetupPanel } from "./SetupPanel.tsx";
import { defaultItems, defaultSelectionFor, optimizeRequest, sanitizeSelection, type AppState, type ItemOptions, type Selection } from "./state.ts";
import { useOptimizer, type ClientFactory } from "./useOptimizer.ts";

const TABS = ["Setup", "Inputs", "Items", "Results"] as const;
type Tab = (typeof TABS)[number];

const defaultClient: ClientFactory = () => new OptimizerClient();

export function App({ createClient = defaultClient }: { createClient?: ClientFactory }) {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>("Setup");
  const [copied, setCopied] = useState(false);
  const encoded = useRef("");

  const selectionKey = JSON.stringify(state.selection);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const built = useMemo(() => buildUiModel(state.selection), [selectionKey]);
  const ui = "model" in built ? built : null;

  const requests = useMemo(() => {
    if (!ui) return null;
    const quick = optimizeRequest(state, ui.model.selection, ui.specs, false);
    const sweep = optimizeRequest(state, ui.model.selection, ui.specs, true);
    const sweepKey = JSON.stringify({ selection: quick.selection, inputs: quick.inputs, options: quick.options });
    return { quick, sweep, sweepKey, quickKey: `${sweepKey}|${state.items.enchant}` };
  }, [ui, state]);

  const opt = useOptimizer(requests?.quick ?? null, requests?.quickKey ?? "", requests?.sweep ?? null, requests?.sweepKey ?? "", createClient);

  useEffect(() => {
    encoded.current = saveState(state, ui?.specs);
  }, [state, ui]);

  useEffect(() => {
    const onHash = () => {
      if (!isOwnHash(encoded.current)) setState(loadState());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const quickCurrent = opt.quick && opt.quick.key === requests?.quickKey ? opt.quick : null;
  const relevance = (quickCurrent ?? opt.quick)?.relevance;
  const fields = useMemo(() => (ui ? inputFields(ui.model, relevance) : []), [ui, relevance]);

  const view: ResultView | null = useMemo(() => {
    if (opt.progress && opt.progress.rows.length > 0) {
      const rows = opt.progress.rows;
      return { kind: "partial", stale: false, result: { baselineLog10: NaN, excluded: [], levels: rows, changes: rows.filter((r) => r.changed).map((r) => r.level) } };
    }
    if (opt.sweep && opt.sweep.key === requests?.sweepKey && opt.sweep.result.levels.some((r) => r.level === state.items.enchant)) {
      return { kind: "sweep", stale: false, result: opt.sweep.result, ms: opt.sweep.ms };
    }
    if (opt.quick) return { kind: "quick", stale: opt.quick.key !== requests?.quickKey, result: opt.quick.result, ms: opt.quick.ms };
    return null;
  }, [opt.progress, opt.sweep, opt.quick, requests, state.items.enchant]);

  const setSelection = useCallback((selection: Selection) => setState((s) => ({ ...s, selection: sanitizeSelection(selection) })), []);
  const setClass = useCallback(
    (classId: string) => setState((s) => ({ ...s, selection: defaultSelectionFor(classId), inputs: {}, items: { ...s.items, legion: defaultItems(classId).legion } })),
    [],
  );
  const resetSetup = useCallback(() => setState((s) => ({ ...s, selection: defaultSelectionFor(s.selection.classId), inputs: {} })), []);
  const setInput = useCallback(
    (id: string, text: string | undefined) =>
      setState((s) => {
        const inputs = { ...s.inputs };
        if (text === undefined) delete inputs[id];
        else inputs[id] = text;
        return { ...s, inputs };
      }),
    [],
  );
  const setItems = useCallback((items: ItemOptions) => setState((s) => ({ ...s, items })), []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(encoded.current));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", shareUrl(encoded.current));
    }
  };

  const shownCount = fields.filter((f) => f.shown).length;

  return (
    <div className="app">
      <header>
        <h1>Idle Wizard Item Optimizer</h1>
        <div className="field-row">
          <span className="muted">
            {ui ? `${ui.model.cls.name} · ${ui.model.pet.name} · ${ui.model.score.def.label}` : "Setup error"}
            {opt.quickBusy ? " · updating…" : ""}
          </span>
          <button type="button" onClick={copyLink}>
            {copied ? "Link copied" : "Copy share link"}
          </button>
        </div>
      </header>
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? "active" : ""} onClick={() => setTab(t)}>
            {t}
            {t === "Inputs" && ui ? ` (${shownCount})` : ""}
            {t === "Results" && opt.progress ? ` (${opt.progress.done}/${opt.progress.total})` : ""}
          </button>
        ))}
      </nav>
      <main>
        {tab === "Setup" && <SetupPanel selection={state.selection} built={built} onChange={setSelection} onClassChange={setClass} onReset={resetSetup} />}
        {tab === "Inputs" &&
          (ui ? (
            <InputsPanel fields={fields} values={state.inputs} onChange={setInput} onResetAll={() => setState((s) => ({ ...s, inputs: {} }))} updating={opt.quickBusy} />
          ) : (
            <p className="error">Fix the setup first.</p>
          ))}
        {tab === "Items" && <ItemsPanel items={state.items} classId={state.selection.classId} stats={ui?.model.stats} onChange={setItems} />}
        {tab === "Results" && (
          <ResultsPanel
            view={view}
            progress={opt.progress}
            error={opt.error}
            enchant={state.items.enchant}
            sweep={state.sweep}
            onSweepChange={(sweep) => setState((s) => ({ ...s, sweep }))}
            onRun={opt.startSweep}
            onCancel={opt.cancelSweep}
            model={ui?.model ?? null}
            fields={fields}
            inputs={state.inputs}
          />
        )}
      </main>
      <footer className="muted small">
        Game data from the <a href="https://idlewizard.wiki.gg/">Idle Wizard wiki</a>. Many effects are encoded with unverified readings; the Results tab lists the
        ones behind each result.
      </footer>
    </div>
  );
}
