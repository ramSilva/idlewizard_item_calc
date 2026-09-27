import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateLoadout } from "../engine/loadout.ts";
import { ENCHANT_LEVELS } from "../engine/optimizer.ts";
import { buildModel, defaultSelection, type BuiltModel } from "./buildModel.ts";
import { itemByKey } from "./items.ts";
import { createOptimizer } from "./optimize.ts";
import { comparePreset } from "./optimizerReport.ts";

// Guide burst presets (the same ones `buildModel.test.ts` checks scalings against) and their enchant tabs.
const GUIDE = {
  oni: { preset: "104;113;1;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509", level: 17 },
  shaman: { preset: "108;113;4;20;12;33;47;61;59;87;73;1001;206;306;418;406;94;2005;3004;507", level: 20 },
  temporalist: { preset: "104;113;1;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508", level: 15 },
} as const;

const models = new Map<string, BuiltModel>();
const model = (classId: string) => {
  if (!models.has(classId)) models.set(classId, buildModel(defaultSelection(classId)));
  return models.get(classId)!;
};

describe.each(Object.keys(GUIDE) as (keyof typeof GUIDE)[])("%s burst optimizer", (classId) => {
  const g = GUIDE[classId];

  it("finds a valid, fully searched set at the guide's enchant level that scores at least the guide preset", () => {
    const m = model(classId);
    const opt = createOptimizer(m);
    const row = opt.optimizeLevel(g.level);
    const equipped = row.best.items.map((i) => ({ item: itemByKey(i.key)!, enchant: i.enchant }));
    expect(validateLoadout(equipped)).toEqual([]);
    expect(row.branches.every((b) => b.stats.complete)).toBe(true);
    expect(row.best.forced).toEqual(["resonator-ring"]);
    expect(row.best.items.find((i) => i.key !== "resonator-ring" && i.enchant > 0)!.effectiveEnchant).toBe(g.level + 5);
    const cmp = comparePreset(opt, m, row, g.preset);
    if (cmp.unmetRequirements.length === 0) expect(cmp.gapLog10).toBeGreaterThanOrEqual(-1e-9);
    expect(cmp.shared.length).toBeGreaterThan(5);
  });

  it("shows fewer inputs once real candidate sets replace the synthetic ones", () => {
    const m = model(classId);
    const opt = createOptimizer(m);
    const rel = opt.relevance(opt.optimizeLevel(g.level));
    const shown = rel.inputs.filter((i) => i.shown).length;
    expect(shown).toBeLessThan(m.relevance!.inputs.filter((i) => i.shown).length);
    expect(rel.inputs.find((i) => i.id === "Mysteries.Count")?.shown ?? false).toBe(false);
  });
});

// `OPTIMIZER_BENCH=1 npx vitest run src/data/optimize.test.ts` sweeps every level and rewrites docs/optimizer-benchmark.md.
const BENCH = process.env.OPTIMIZER_BENCH === "1";

describe("optimizer performance", () => {
  it(`sweeps ${BENCH ? "every enchant level" : "a few enchant levels"} for each class's guide burst setup`, () => {
    const levels = BENCH ? ENCHANT_LEVELS : [0, 15, 30, 55];
    const rows: string[] = [];
    let total = 0;
    for (const classId of Object.keys(GUIDE)) {
      const m = buildModel(defaultSelection(classId), { relevance: false });
      const t0 = performance.now();
      const result = createOptimizer(m).sweep(levels);
      const ms = performance.now() - t0;
      total += ms;
      const stats = result.levels.flatMap((r) => r.branches.map((b) => b.stats));
      const sum = (f: (s: (typeof stats)[number]) => number) => stats.reduce((a, s) => a + f(s), 0);
      expect(stats.every((s) => s.complete)).toBe(true);
      rows.push(
        `| ${m.cls.name} | ${(ms / 1000).toFixed(1)} s | ${sum((s) => s.evaluations).toLocaleString("en")} | ${sum((s) => s.bounds).toLocaleString("en")} | ${Math.max(...stats.map((s) => s.ms)).toFixed(0)} ms | ${result.changes.join(", ")} |`,
      );
    }
    expect(total).toBeLessThan(BENCH ? 60_000 : 20_000);
    if (BENCH) {
      writeFileSync(
        "docs/optimizer-benchmark.md",
        [
          "# Optimizer benchmark",
          "",
          `Full enchant sweep (levels 0–55, Resonator in and out) of each class's default guide burst setup, all items owned at maximum quality, Node ${process.version}, single thread. Regenerate with \`OPTIMIZER_BENCH=1 npx vitest run src/data/optimize.test.ts\`.`,
          "",
          "| Class | Sweep | Evaluations | Bound evaluations | Slowest level/branch | Levels where the best set changes |",
          "|---|---|---|---|---|---|",
          ...rows,
          "",
          `Total: ${(total / 1000).toFixed(1)} s.`,
          "",
        ].join("\n"),
      );
    }
  });
});
