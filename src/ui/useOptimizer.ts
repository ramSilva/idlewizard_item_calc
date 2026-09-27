import { useCallback, useEffect, useRef, useState } from "react";
import type { LevelResult, SweepResult } from "../engine/optimizer.ts";
import type { RelevanceResult } from "../engine/relevance.ts";
import { OptimizeCancelled, OptimizerClient, type OptimizeRun } from "../worker/optimizerClient.ts";
import type { OptimizeRequest } from "../worker/protocol.ts";

export interface RunOutcome {
  /** The request key the outcome belongs to; compare with the current key to detect stale results. */
  key: string;
  result: SweepResult;
  relevance?: RelevanceResult;
  ms: number;
}

export interface SweepProgress {
  done: number;
  total: number;
  rows: LevelResult[];
}

export interface OptimizerState {
  /** Latest single-level run started automatically for the relevance of the current setup. */
  quick: RunOutcome | null;
  quickBusy: boolean;
  sweep: RunOutcome | null;
  progress: SweepProgress | null;
  error: string | null;
  startSweep(): void;
  cancelSweep(): void;
}

const QUICK_DELAY_MS = 500;

export type ClientFactory = () => OptimizerClient;

/**
 * Two workers: one re-runs the global enchant level (and the relevance) whenever the setup changes, the other runs
 * the sweep the user starts, so a long sweep never delays the inputs form.
 */
export function useOptimizer(
  quickRequest: OptimizeRequest | null,
  quickKey: string,
  sweepRequest: OptimizeRequest | null,
  sweepKey: string,
  createClient: ClientFactory,
): OptimizerState {
  const clients = useRef<{ quick?: OptimizerClient; sweep?: OptimizerClient }>({});
  const quickRun = useRef<OptimizeRun | null>(null);
  const sweepRun = useRef<OptimizeRun | null>(null);
  const [quick, setQuick] = useState<RunOutcome | null>(null);
  const [quickBusy, setQuickBusy] = useState(false);
  const [sweep, setSweep] = useState<RunOutcome | null>(null);
  const [progress, setProgress] = useState<SweepProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const client = useCallback(
    (which: "quick" | "sweep") => (clients.current[which] ??= createClient()),
    [createClient],
  );

  useEffect(() => {
    const c = clients.current;
    return () => {
      c.quick?.terminate();
      c.sweep?.terminate();
      clients.current = {};
    };
  }, []);

  useEffect(() => {
    if (!quickRequest) return;
    const timer = setTimeout(() => {
      quickRun.current?.cancel();
      const run = client("quick").run(quickRequest);
      quickRun.current = run;
      setQuickBusy(true);
      run.promise.then(
        (o) => {
          setQuick({ key: quickKey, ...o });
          setError(null);
        },
        (err: Error) => {
          if (!(err instanceof OptimizeCancelled)) setError(err.message);
        },
      ).finally(() => {
        if (quickRun.current === run) {
          quickRun.current = null;
          setQuickBusy(false);
        }
      });
    }, QUICK_DELAY_MS);
    return () => clearTimeout(timer);
    // The key identifies the request's content; the request object itself changes identity every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickKey, client]);

  const startSweep = useCallback(() => {
    if (!sweepRequest) return;
    sweepRun.current?.cancel();
    const rows: LevelResult[] = [];
    const total = sweepRequest.levels?.length ?? 56;
    setProgress({ done: 0, total, rows });
    const run = client("sweep").run(sweepRequest, (row, done, t) => {
      rows.push(row);
      setProgress({ done, total: t, rows: [...rows] });
    });
    sweepRun.current = run;
    run.promise.then(
      (o) => {
        setSweep({ key: sweepKey, ...o });
        setError(null);
      },
      (err: Error) => {
        if (!(err instanceof OptimizeCancelled)) setError(err.message);
      },
    ).finally(() => {
      if (sweepRun.current === run) {
        sweepRun.current = null;
        setProgress(null);
      }
    });
  }, [sweepRequest, sweepKey, client]);

  const cancelSweep = useCallback(() => {
    sweepRun.current?.cancel();
  }, []);

  return { quick, quickBusy, sweep, progress, error, startSweep, cancelSweep };
}
