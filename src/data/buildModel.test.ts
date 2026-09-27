import { describe, expect, it } from "vitest";
import { FloatEvaluator } from "../engine/graph.ts";
import { buildModel, defaultSelection, elasticity, loadoutModifiers, type BuiltModel } from "./buildModel.ts";
import { presetItems } from "./items.ts";

type Scaled = "Evo" | "Inc" | "Summon" | "CAP" | "PAP" | "Idle";

const STAT: Record<Scaled, string> = {
  Evo: "Spell.EvocationEfficiency",
  Inc: "Spell.IncantationEfficiency",
  Summon: "Spell.SummoningEfficiency",
  CAP: "Hero.AbilityPower",
  PAP: "Pet.AbilityPower",
  Idle: "Idle.Bonus",
};

interface Scaling {
  guide: number;
  /** Allowed |ours − guide|; wider than the default only where a discrepancy is documented. */
  tolerance?: number;
  note?: string;
}

interface GuideCase {
  preset: string;
  enchant: number;
  source: string;
  scalings: Partial<Record<Scaled, Scaling>>;
}

// Burst presets and scaling tables from the guides (Oni: "Stat scalings" under Source Memetics; Shaman: "Run Scalings",
// Burst column; Temporalist e550+: "Phase Scaling", Burst column).
const GUIDES: Record<string, GuideCase> = {
  oni: {
    preset: "104;113;1;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509",
    enchant: 17,
    source: "https://idlewizard.wiki.gg/wiki/Oni_Guide",
    scalings: {
      Evo: { guide: 1.0421 },
      Inc: { guide: 7.1438, tolerance: 1.5, note: "Summing the burst spells' exponents gives about 6.1 (RoP 1 + Goblet 1.6 + ES 1 + PB 1.3 + Iron Blood via CAP 1.2)." },
      CAP: { guide: 1.5517, tolerance: 0.5, note: "Berserk C^0.5 plus the hero PAP term C^0.5 feeding Living Sin (P^1.35) give about 1.18." },
      PAP: { guide: 2.0614, tolerance: 0.8, note: "Living Sin's profit (P^1) and Evocation (P^0.35) terms give 1.35; the guide's table may assume Hungerer or other phases." },
    },
  },
  shaman: {
    preset: "108;113;4;20;12;33;47;61;59;87;73;1001;206;306;418;406;94;2005;3004;507",
    enchant: 20,
    source: "https://idlewizard.wiki.gg/wiki/Shaman_Guide",
    scalings: {
      Evo: { guide: 0 },
      Inc: { guide: 0.92 },
      Summon: { guide: 7.76 },
      CAP: { guide: 1.997 },
      PAP: {
        guide: 1.676,
        tolerance: 0.5,
        note: "Herald of Rot's (P^0.1 + 1), (P^0.4 + 1) and (P^0.5 + 1) terms are far from their power-law limit at the placeholder PAP (base 1), so PAP scales at about 1.3.",
      },
      Idle: { guide: 2.62 },
    },
  },
  temporalist: {
    preset: "104;113;1;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508",
    enchant: 15,
    source: "https://idlewizard.wiki.gg/wiki/Temporalist_Guide_(e550%2B)",
    scalings: {
      Evo: { guide: 1 },
      Inc: { guide: 4 },
      Summon: { guide: 0 },
      CAP: { guide: 1 },
      PAP: { guide: 1 },
      Idle: { guide: 1 },
    },
  },
};

const DEFAULT_TOLERANCE = (guide: number) => Math.max(0.15, 0.1 * guide);

const models = new Map<string, BuiltModel>();
const model = (classId: string) => {
  if (!models.has(classId)) models.set(classId, buildModel(defaultSelection(classId)));
  return models.get(classId)!;
};

const presetMods = (m: BuiltModel, g: GuideCase) =>
  loadoutModifiers(
    m,
    presetItems(g.preset).map((item) => ({ item, enchant: g.enchant })),
    true,
  );

describe.each(Object.keys(GUIDES))("%s burst model", (classId) => {
  const g = GUIDES[classId];

  it("compiles the guide setup with every required input labelled and defaulted", () => {
    const m = model(classId);
    expect(m.score.def.id).toBe(m.cls.defaultScore);
    expect(m.graph.inputs.length).toBeGreaterThan(10);
    for (const i of m.graph.inputs) {
      const s = m.graph.stats[i];
      expect(s.def.label, s.id).toBeTruthy();
      expect(Number.isFinite(s.def.input!.default), s.id).toBe(true);
    }
    const ev = new FloatEvaluator(m.graph);
    expect(Number.isFinite(ev.scoreLog10(presetMods(m, g)))).toBe(true);
  });

  it("scales with the stats roughly as the guide's scaling table says", () => {
    const m = model(classId);
    const mods = presetMods(m, g);
    for (const [key, s] of Object.entries(g.scalings) as [Scaled, Scaling][]) {
      const ours = elasticity(m, STAT[key], mods);
      expect(Math.abs(ours - s.guide), `${classId} ${key}: ours ${ours.toFixed(3)} vs guide ${s.guide}${s.note ? ` (${s.note})` : ""}`).toBeLessThanOrEqual(
        s.tolerance ?? DEFAULT_TOLERANCE(s.guide),
      );
    }
  });
});

const shown = (m: BuiltModel, id: string) => {
  const r = m.relevance!.inputs.find((i) => i.id === id);
  if (!r) throw new Error(`${id} is not an input of this model`);
  return r.shown;
};

describe("relevance at the guide defaults", () => {
  it("hides Oni inputs that scale every set equally", () => {
    const m = model("oni");
    for (const id of ["Spell.FuriousStrike.Charges", "Pet.ExperienceTotal", "Mysteries.Count", "Spell.EvocationEfficiency"]) expect(shown(m, id), id).toBe(false);
    for (const id of ["Pet.Level", "Hero.AbilityPower", "Weapon.CataclysmCharges", "Spell.IronBlood.CastsThisExile"]) expect(shown(m, id), id).toBe(true);
  });

  it("hides Temporalist's snapped inputs and total experience", () => {
    const m = model("temporalist");
    for (const id of [
      "Spell.StabilizeTheFlow.SnappedIncantationEfficiency",
      "Spell.StabilizeTheFlow.SnappedMaxDistortion",
      "Spell.GemResonance.SnappedIncantationEfficiency",
      "Char.ExperienceTotal",
      "Mysteries.Count",
    ]) {
      expect(shown(m, id), id).toBe(false);
    }
    for (const id of ["Spell.QuasiIncantation.CastsThisExile", "Hero.AbilityPower", "Pet.AbilityPower"]) expect(shown(m, id), id).toBe(true);
  });

  it("shows Branch of the Great Cycle's charges for Shaman", () => {
    const m = model("shaman");
    expect(shown(m, "Weapon.BranchCharges")).toBe(true);
    expect(shown(m, "Mysteries.Count")).toBe(false);
  });
});

// The Fandom guide's setup sections state no stat scalings and its gear is unread until the blind check, so these tests
// run without items and pin the scalings the encoded formulas imply.
describe("chronomancer burst model", () => {
  const noItems = (m: BuiltModel) => loadoutModifiers(m, [], false);

  it("compiles the guide's burst setup with every required input labelled and defaulted", () => {
    const m = model("chronomancer");
    expect(m.selection).toMatchObject({ petId: "risen-giant", spells: [65, 17, 73, 60, 4, 69], snapped: [69], idle: true, scoreId: "chronomancer-burst" });
    expect(m.effects.some((e) => e.label === "Time Helix")).toBe(true);
    for (const i of m.graph.inputs) {
      const s = m.graph.stats[i];
      expect(s.def.label, s.id).toBeTruthy();
      expect(Number.isFinite(s.def.input!.default), s.id).toBe(true);
    }
    expect(Number.isFinite(new FloatEvaluator(m.graph).scoreLog10(noItems(m)))).toBe(true);
  });

  it("scales as the burst formulas imply", () => {
    const m = model("chronomancer");
    const e = (stat: string) => elasticity(m, stat, noItems(m));
    expect(e(STAT.Evo)).toBeCloseTo(1, 3);
    expect(e(STAT.CAP)).toBeCloseTo(1, 3);
    expect(e(STAT.Inc)).toBeGreaterThan(3);
    expect(e(STAT.Inc)).toBeLessThan(3.3);
    expect(e(STAT.PAP)).toBeCloseTo(0.3, 2);
    expect(e(STAT.Idle)).toBeCloseTo(2.0155, 2);
  });

  it("adds Stabilize The Flow's Incantation scaling when it isn't snapped", () => {
    const snapped = model("chronomancer");
    const live = buildModel({ ...defaultSelection("chronomancer"), snapped: [] }, { relevance: false });
    const inc = (m: BuiltModel) => elasticity(m, STAT.Inc, noItems(m));
    expect(inc(live) - inc(snapped)).toBeCloseTo(1, 2);
  });

  it("hides inputs that scale every set equally", () => {
    const m = model("chronomancer");
    for (const id of [
      "Spell.StabilizeTheFlow.SnappedIncantationEfficiency",
      "Spell.StabilizeTheFlow.SnappedMaxDistortion",
      "Spell.EvocationEfficiency",
      "Hero.AbilityPowerGrowth",
      "Char.ClassTimeHours",
      "Mysteries.Count",
    ]) {
      expect(shown(m, id), id).toBe(false);
    }
    for (const id of ["Building.8.Count", "Spell.TimeHelix.CastsThisExile", "AttrPoints.Patience"]) expect(shown(m, id), id).toBe(true);
  });

  it("needs Singularity Beam on the bar for its burst score", () => {
    expect(model("chronomancer").scores.map((s) => s.id)).toEqual(expect.arrayContaining(["chronomancer-burst", "spell:SingularityBeam", "production"]));
    expect(() => buildModel({ classId: "chronomancer", petId: "risen-giant", spells: [17, 60], scoreId: "chronomancer-burst" })).toThrow(/isn't available/);
  });
});

describe("guide-anchored magnitudes and toggles", () => {
  it("gives about 76 Summon Centipede Swarm clicks per second in the Shaman burst preset", () => {
    const m = model("shaman");
    const ev = new FloatEvaluator(m.graph);
    ev.scoreLog10(presetMods(m, GUIDES.shaman));
    const clicks = Math.floor(ev.statLog10("Spell.SummoningEfficiency") * 2.5 + 1);
    expect(clicks).toBeGreaterThanOrEqual(70);
    expect(clicks).toBeLessThanOrEqual(82);
  });

  it("applies Quasi-incantation to Temporalist's burst although it isn't on the bar", () => {
    const m = model("temporalist");
    expect(m.selection.spells).not.toContain(93);
    expect(m.effects.some((e) => e.label === "Quasi-incantation")).toBe(true);
    expect(m.selection.snapped).toEqual([69, 4]);
  });

  it("lets the snapped spells use the current item set when not snapped", () => {
    const snapped = model("temporalist");
    const live = buildModel({ ...defaultSelection("temporalist"), snapped: [] }, { relevance: false });
    const g = GUIDES.temporalist;
    const e = (m: BuiltModel) => elasticity(m, "Spell.IncantationEfficiency", presetMods(m, g));
    expect(e(live) - e(snapped)).toBeGreaterThan(0.9);
  });

  it("switches the idle factor off outside Idle mode", () => {
    const g = GUIDES.oni;
    const on = model("oni");
    const off = buildModel({ ...defaultSelection("oni"), idle: false }, { relevance: false });
    const score = (m: BuiltModel) => new FloatEvaluator(m.graph).scoreLog10(presetMods(m, g));
    expect(score(on)).toBeGreaterThan(score(off));
    expect(elasticity(off, "Idle.Bonus", presetMods(off, g))).toBeCloseTo(0, 6);
  });

  it("changes Oni's Evocation scaling with the stance", () => {
    const mods = (m: BuiltModel) => presetMods(m, GUIDES.oni);
    const berserk = model("oni");
    const defense = buildModel({ ...defaultSelection("oni"), stance: "defense" }, { relevance: false });
    expect(elasticity(berserk, "Hero.AbilityPower", mods(berserk))).toBeGreaterThan(elasticity(defense, "Hero.AbilityPower", mods(defense)) + 0.4);
  });

  it("offers per-spell and generic scores", () => {
    const ids = model("oni").scores.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(["oni-burst", "production", "spell:FuriousStrike", "stat:Spell.IncantationEfficiency", "stat:Hero.AbilityPower"]));
    expect(model("shaman").scores.map((s) => s.id)).toEqual(expect.arrayContaining(["shaman-burst", "autoclick-mana"]));
    expect(model("temporalist").scores.map((s) => s.id)).toContain("temporalist-burst");
  });
});
