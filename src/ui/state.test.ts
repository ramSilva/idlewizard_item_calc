import { describe, expect, it } from "vitest";
import { itemByKey, ITEMS } from "../data/items.ts";
import type { InputSpec } from "../engine/model.ts";
import {
  decodeState,
  defaultState,
  encodeState,
  formatNumber,
  fromCompact,
  optimizerOptions,
  parseInputText,
  pruneInputs,
  sanitizeSelection,
  serializedInputs,
  toCompact,
  withOwned,
  type AppState,
} from "./state.ts";

const LOG: InputSpec = { default: 1e6, kind: "number", min: 0, logScale: true };
const INT: InputSpec = { default: 200, kind: "integer", min: 0, max: 250 };

describe("state encoding", () => {
  it("encodes a class's default state as the class alone", () => {
    for (const c of ["oni", "shaman", "temporalist", "chronomancer"]) expect(toCompact(defaultState(c))).toEqual({ c });
  });

  it("round-trips a state with every field changed", () => {
    const base = defaultState("oni");
    const lowQuality = ITEMS.find((i) => !i.mythic && i.tiers.length > 1)!;
    const mythic = ITEMS.find((i) => i.mythic)!;
    const state: AppState = {
      selection: { classId: "oni", petId: "hungerer", spells: [60, 6, 88, 86], stance: undefined, idle: false, snapped: [], scoreId: "production" },
      inputs: { "Mysteries.Count": "1e500", "Pet.Level": "750", "AttrPoints.Spellcraft": "150" },
      items: {
        ...base.items,
        enchant: 17,
        overrides: { "cataclysm": 30, "resonator-ring": 0 },
        owned: { [lowQuality.key]: lowQuality.tiers[0].quality, "lucky-amulet": null, [mythic.key]: mythic.maxQuality },
        excludedSlots: ["Weapon", "Neck"],
        resonator: false,
        legion: false,
      },
      sweep: false,
    };
    expect(decodeState(encodeState(state))).toEqual(state);
  });

  it("round-trips snapped spells and a class without stances", () => {
    const state = defaultState("temporalist");
    state.selection = { ...state.selection, snapped: [69] };
    expect(decodeState(encodeState(state))).toEqual(state);
    expect(toCompact(state)).toEqual({ c: "temporalist", n: [69] });
  });

  it("keeps the encoding URL-safe and short for typical changes", () => {
    const state = defaultState("shaman");
    state.items = withOwned({ ...state.items, enchant: 20 }, "black-vortex", null);
    state.inputs = { "Weapon.BranchCharges": "1e6" };
    const encoded = encodeState(state);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded.length).toBeLessThan(120);
  });

  it("drops inputs equal to their defaults when specs are given", () => {
    const specs = new Map([["Hero.AbilityPower", LOG], ["AttrPoints.Mastery", INT]]);
    expect(pruneInputs({ "Hero.AbilityPower": "1e6", "AttrPoints.Mastery": "225", "Other.Input": "5" }, specs)).toEqual({
      "AttrPoints.Mastery": "225",
      "Other.Input": "5",
    });
    const state = { ...defaultState("oni"), inputs: { "Hero.AbilityPower": "1000000" } };
    expect(toCompact(state, specs)).toEqual({ c: "oni" });
  });

  it("falls back to defaults for unreadable input and sanitizes unknown ids", () => {
    expect(decodeState("not base64 !!")).toEqual(defaultState());
    expect(fromCompact({ c: "wizard" })).toEqual(defaultState());
    const s = fromCompact({ c: "shaman", p: "no-such-pet", s: [86, 18, 18, 92], t: "berserk", q: { "no-such-item": 3, "lucky-amulet": 99 }, e: 99, x: [0, 99], v: { "cataclysm": -4 } });
    expect(s.selection.petId).toBe(defaultState("shaman").selection.petId);
    expect(s.selection.spells).toEqual([18, 92]);
    expect(s.selection.stance).toBeUndefined();
    expect(s.items.owned).toEqual({});
    expect(s.items.enchant).toBe(55);
    expect(s.items.excludedSlots).toEqual(["Head"]);
    expect(s.items.overrides).toEqual({ cataclysm: 0 });
  });

  it("limits snapped spells to selected spells that can be snapped", () => {
    const sel = sanitizeSelection({ ...defaultState("temporalist").selection, spells: [73, 57, 69], snapped: [69, 4, 73] });
    expect(sel.snapped).toEqual([69]);
  });
});

describe("input parsing", () => {
  it("accepts plain, exponent and huge numbers", () => {
    expect(parseInputText("1500", LOG)).toEqual({ ok: true, value: 1500 });
    expect(parseInputText("2.5e12", LOG)).toEqual({ ok: true, value: 2.5e12 });
    expect(parseInputText("e300", LOG)).toEqual({ ok: true, value: 1e300 });
    expect(parseInputText("1e500", LOG)).toEqual({ ok: true, value: "1e500" });
    expect(parseInputText("1,000", LOG)).toEqual({ ok: true, value: 1000 });
  });

  it("rejects malformed, out-of-range and fractional integer values", () => {
    expect(parseInputText("abc", LOG).ok).toBe(false);
    expect(parseInputText("-1", LOG).ok).toBe(false);
    expect(parseInputText("251", INT).ok).toBe(false);
    expect(parseInputText("12.5", INT).ok).toBe(false);
    expect(parseInputText("on", { default: 0, kind: "boolean" })).toEqual({ ok: true, value: true });
  });

  it("serializes only valid values that differ from the default", () => {
    const specs = new Map([["A.Big", LOG], ["A.Int", INT]]);
    expect(serializedInputs({ "A.Big": "1e400", "A.Int": "200", "A.Unknown": "3" }, specs)).toEqual({ "A.Big": "1e400" });
    expect(serializedInputs({ "A.Big": "oops" }, specs)).toEqual({});
  });

  it("formats numbers compactly", () => {
    expect(formatNumber(1e300)).toBe("1e300");
    expect(formatNumber(2.5e12)).toBe("2.5e12");
    expect(formatNumber(3.0000000000000004e19)).toBe("3e19");
    expect(formatNumber(1500)).toBe("1500");
    expect(formatNumber("1e500")).toBe("1e500");
    expect(formatNumber(0)).toBe("0");
  });
});

describe("optimizer options", () => {
  it("owns every non-Mythic item at max quality by default and applies differences", () => {
    const items = withOwned(withOwned(defaultState("oni").items, "lucky-amulet", null), "cataclysm", "Epic");
    const { owned } = optimizerOptions(items);
    expect(owned!["lucky-amulet"]).toBeUndefined();
    expect(owned!.cataclysm).toBe("Epic");
    expect(Object.keys(owned!).length).toBe(ITEMS.filter((i) => !i.mythic).length - 1);
    expect(ITEMS.filter((i) => i.mythic).every((i) => owned![i.key] === undefined)).toBe(true);
    expect(withOwned(items, "cataclysm", itemByKey("cataclysm")!.maxQuality).owned).toEqual({ "lucky-amulet": null });
  });
});
