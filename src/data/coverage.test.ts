import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCoverage } from "./coverage.ts";
import { ITEMS, SETS } from "./items.ts";

const REPORT = path.resolve("docs/item-coverage.md");

describe("item coverage", () => {
  const coverage = buildCoverage(ITEMS, SETS);

  it("leaves no clause unparsed: every unmodelled clause has a reason", () => {
    expect(coverage.allTiers.unmodelled.unparsed).toBe(0);
    expect(coverage.setTiers.unmodelled.unparsed).toBe(0);
    expect(coverage.enchants.unmodelled.unparsed).toBe(0);
  });

  it("keeps the modelled/unmodelled counts stable (update them deliberately when the data or rules change)", () => {
    expect(coverage.items).toBe(223);
    expect(coverage.maxTiers).toMatchObject({
      blocks: 223,
      modelledClauses: 404,
      unmodelled: { "not-production": 17, mechanic: 26, "mythic-random": 20, unparsed: 0 },
    });
    expect(coverage.enchants).toMatchObject({ total: 223, modelled: 193, unmodelled: { "not-production": 10, "mythic-random": 20, mechanic: 0 } });
  });

  it("matches docs/item-coverage.md (UPDATE_COVERAGE=1 rewrites it)", () => {
    if (process.env.UPDATE_COVERAGE || !existsSync(REPORT)) {
      mkdirSync(path.dirname(REPORT), { recursive: true });
      writeFileSync(REPORT, coverage.markdown);
    }
    expect(readFileSync(REPORT, "utf8")).toBe(coverage.markdown);
  });
});
