import { describe, expect, it } from "vitest";
import { refsOf, type Expr } from "../engine/expr.ts";
import type { Effect, Source } from "../engine/model.ts";
import { buildModel, MAX_SPELLS } from "./buildModel.ts";
import { CLASSES } from "./classes.ts";
import { PETS } from "./pets.ts";
import { SPELL_BEHAVIOURS } from "./spellBehaviours.ts";
import { classSpells, spellById, spellKey } from "./spells.ts";
import { GENERIC_STATS } from "./stats.ts";

const expectSource = (s: Source, where: string) => {
  expect(s.url, where).toMatch(/^https:\/\/idlewizard\.wiki\.gg\/wiki\//);
  if (!s.verified) expect(s.note, `${where} is unverified without a note`).toBeTruthy();
};

const chunks = <T>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

describe("spells", () => {
  it("builds identifier-safe keys", () => {
    expect(spellKey("Kelphior's Black Beam")).toBe("KelphiorsBlackBeam");
    expect(spellKey("Quasi-incantation")).toBe("QuasiIncantation");
    expect(spellById(93).behavior).toBe("Augment");
  });

  it("encodes every Oni, Shaman and Temporalist spell", () => {
    for (const c of CLASSES) {
      for (const s of classSpells(c.name)) expect(SPELL_BEHAVIOURS.has(s.id), `${c.name}: ${s.name} (${s.id})`).toBe(true);
    }
  });

  it("gives every behaviour an effect, a mana output or a note on what isn't modelled", () => {
    for (const [id, b] of SPELL_BEHAVIOURS) {
      const name = spellById(id).name;
      const modelled = b.effects.length > 0 || b.mana || b.autoclicks || b.voidManaPerSecond;
      expect(modelled || b.unmodelled.length > 0, name).toBeTruthy();
      expectSource(b.source, name);
      for (const e of b.effects) expectSource(e.source, e.label);
      for (const d of b.stats) expectSource(d.source!, d.id);
    }
  });

  it("uses per-spell cast inputs that The Rubedo Engine and Ritual Disk count twice", () => {
    const rop = SPELL_BEHAVIOURS.get(60)!;
    const counted = rop.stats.find((s) => s.id === "Spell.RitualOfPower.CountedCasts")!;
    expect(refsOf(counted.base as Expr)).toEqual(new Set(["Spell.RitualOfPower.CastsThisExile", "Spell.AccumulatedCastCountFactor"]));
    const qi = SPELL_BEHAVIOURS.get(93)!.stats.find((s) => s.id === "Spell.QuasiIncantation.CountedCasts")!;
    expect(refsOf(qi.base as Expr)).toEqual(new Set(["Spell.QuasiIncantation.CastsThisExile", "Spell.AugmentCastCountFactor"]));
  });
});

describe("pets and classes", () => {
  it("sources every pet, class, stance and default", () => {
    for (const p of PETS) {
      expectSource(p.source, p.name);
      expect(p.effects.length + p.unmodelled.length, p.name).toBeGreaterThan(0);
      for (const e of p.effects) expectSource(e.source, e.label);
    }
    for (const c of CLASSES) {
      expectSource(c.source, c.name);
      for (const e of [...c.effects, ...c.stances.flatMap((s) => s.effects)] as Effect[]) expectSource(e.source, e.label);
      for (const [id, d] of Object.entries(c.defaults)) expectSource(d.source, `${c.name} default ${id}`);
      for (const p of c.pairedPets) expect(PETS.some((x) => x.id === p), `${c.name} pairs unknown pet ${p}`).toBe(true);
    }
  });

  it("sets pet tiers from the category pages", () => {
    const tier = Object.fromEntries(PETS.map((p) => [p.name, p.tier]));
    expect(tier).toMatchObject({ "Living Sin": 3, "Mechanos Apexis": 3, "Herald of Rot": 3, "Greater Chimaera": 3, Hungerer: 2, "Risen Giant": 2, Interrogator: 1, Pixie: 1 });
  });

  it("only sets defaults for stats that exist", () => {
    const known = new Set([
      ...GENERIC_STATS.map((s) => s.id),
      ...[...SPELL_BEHAVIOURS.values()].flatMap((b) => b.stats.map((s) => s.id)),
      ...CLASSES.flatMap((c) => c.stats.map((s) => s.id)),
    ]);
    for (const c of CLASSES) for (const id of Object.keys(c.defaults)) expect(known.has(id), `${c.name} default ${id}`).toBe(true);
  });
});

describe("model builder over every encoded spell and pet", () => {
  it("compiles every spell of each class and resolves every reference", () => {
    for (const c of CLASSES) {
      for (const group of chunks(classSpells(c.name).map((s) => s.id), MAX_SPELLS)) {
        const m = buildModel({ classId: c.id, petId: c.defaultPet, spells: group, stance: c.defaultStance, snapped: [], scoreId: "production" }, { relevance: false });
        const exprs: Expr[] = [
          ...m.effects.map((e) => e.value),
          ...m.stats.all().flatMap((s) => (s.base !== undefined && typeof s.base !== "number" ? [s.base] : [])),
        ];
        for (const e of exprs) for (const r of refsOf(e)) expect(m.stats.has(r), `${c.name} [${group.join(",")}] references ${r}`).toBe(true);
        for (const e of m.effects) expect(m.stats.has(e.stat), `${e.label} targets ${e.stat}`).toBe(true);
      }
    }
  });

  it("compiles each class with each of its paired pets", () => {
    for (const c of CLASSES) {
      for (const petId of c.pairedPets) {
        const m = buildModel({ classId: c.id, petId, spells: c.defaultSpells, stance: c.defaultStance, scoreId: "production" }, { relevance: false });
        expect(m.graph.inputs.length, `${c.name} + ${petId}`).toBeGreaterThan(0);
      }
    }
  });

  it("rejects invalid selections", () => {
    expect(() => buildModel({ classId: "oni", petId: "living-sin", spells: [60, 6, 88, 89, 107, 86, 64] })).toThrow(/At most 6/);
    expect(() => buildModel({ classId: "oni", petId: "living-sin", spells: [3] })).toThrow(/isn't a Oni spell/);
    expect(() => buildModel({ classId: "shaman", petId: "herald-of-rot", spells: [18], stance: "berserk" })).toThrow(/no stance/);
    expect(() => buildModel({ classId: "temporalist", petId: "risen-giant", spells: [73], scoreId: "temporalist-burst" })).toThrow(/isn't available/);
  });
});
