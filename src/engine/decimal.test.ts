import Decimal from "break_eternity.js";
import { describe, expect, it } from "vitest";

describe("break_eternity", () => {
  it("handles values beyond 1e2000", () => {
    const big = Decimal.pow(10, 2500).mul(3);
    expect(big.log10().toNumber()).toBeCloseTo(2500 + Math.log10(3), 9);
  });
});
