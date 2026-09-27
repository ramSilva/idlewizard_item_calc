import Decimal from "break_eternity.js";
import { describe, expect, it } from "vitest";
import { f, num, ref, refsOf, toInfix, toPostfix, type Expr } from "./expr.ts";
import { evalDecimalExpr } from "./graph.ts";

const value = (e: Expr, vars: Record<string, number> = {}) =>
  evalDecimalExpr(e, (id) => {
    if (!(id in vars)) throw new Error(`no value for ${id}`);
    return new Decimal(vars[id]);
  }).toNumber();

describe("formula parser", () => {
  it("follows arithmetic precedence", () => {
    expect(value(f("1 + 2 * 3"))).toBe(7);
    expect(value(f("(1 + 2) * 3"))).toBe(9);
    expect(value(f("10 - 4 - 3"))).toBe(3);
    expect(value(f("16 / 4 / 2"))).toBe(2);
  });

  it("makes ^ right-associative and binds it tighter than unary minus", () => {
    expect(value(f("2 ^ 3 ^ 2"))).toBeCloseTo(512, 9);
    expect(value(f("-2 ^ 2"))).toBe(-4);
    expect(value(f("2 * -3"))).toBe(-6);
    expect(value(f("2 ^ -1"))).toBe(0.5);
  });

  it("reads scientific notation", () => {
    expect(value(f("4e9 / 1e-3"))).toBeCloseTo(4e12, 0);
  });

  it("parses functions with the right arity", () => {
    expect(value(f("log(2, 8)"))).toBeCloseTo(3, 12);
    expect(value(f("max(2, min(7, 5))"))).toBe(5);
    expect(value(f("if(ge(3, 2), 10, 20) + if(lt(3, 2), 1, 2)"))).toBe(12);
    expect(value(f("floor(2.7) + abs(-1) + sqrt(16) + log10(1000)"))).toBe(10);
    expect(() => f("max(1)")).toThrow(/expects 2 arguments/);
    expect(() => f("cos(1)")).toThrow(/unknown function/);
  });

  it("treats dotted identifiers as stat ids and resolves bindings", () => {
    const e = f("P ^ 0.35 * L ^ 2 * 0.001 + Pet.Level + k", { P: "Pet.AbilityPower", L: "Char.Level", k: num(4) });
    expect([...refsOf(e)].sort()).toEqual(["Char.Level", "Pet.AbilityPower", "Pet.Level"]);
    expect(value(e, { "Pet.AbilityPower": 1, "Char.Level": 10, "Pet.Level": 2 })).toBeCloseTo(6.1, 12);
  });

  it("rejects malformed formulas", () => {
    expect(() => f("x + 1")).toThrow(/unbound identifier x/);
    expect(() => f("1 + $")).toThrow(/Unexpected characters/);
    expect(() => f("1 2")).toThrow(/trailing tokens/);
    expect(() => f("(1 + 2")).toThrow(/expected \)/);
    expect(() => f("1 +")).toThrow(/unexpected end/);
  });

  it("renders infix and bot-style postfix", () => {
    const e = f("A.x * (B.y + 2) ^ 3", {});
    expect(toInfix(e)).toBe("(A.x * ((B.y + 2) ^ 3))");
    expect(toPostfix(e)).toBe("A.x B.y 2 + 3 ^ *");
    expect(toPostfix(f("max(A.x, 1)"))).toBe("A.x 1 max");
    expect(refsOf(ref("A.x")).has("A.x")).toBe(true);
  });
});
