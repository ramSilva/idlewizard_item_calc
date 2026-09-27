import type { Expr } from "./expr.ts";
import type { InputSpec, StatDef, StatGroup } from "./model.ts";

type StatExtras = Omit<StatDef, "id" | "label" | "group" | "base" | "input">;

/** Supplied by the user. Items and other effects still apply on top of the entered value. */
export function inputStat(id: string, label: string, group: StatGroup, input: InputSpec, extras: StatExtras = {}): StatDef {
  return { id, label, group, input, ...extras };
}

/** Starts at 1 and is scaled by multiplicative effects. */
export function multiplierStat(id: string, label: string, group: StatGroup, extras: StatExtras = {}): StatDef {
  return { id, label, group, base: 1, ...extras };
}

/** Starts at 0 and accumulates additive effects. */
export function additiveStat(id: string, label: string, group: StatGroup, extras: StatExtras = {}): StatDef {
  return { id, label, group, base: 0, ...extras };
}

export function constantStat(id: string, label: string, group: StatGroup, value: number, extras: StatExtras = {}): StatDef {
  return { id, label, group, base: value, ...extras };
}

export function derivedStat(id: string, label: string, group: StatGroup, base: Expr, extras: StatExtras = {}): StatDef {
  return { id, label, group, base, ...extras };
}

// The formula parser treats dotted identifiers as stat ids, so every id needs a namespace.
const STAT_ID = /^[A-Za-z_]\w*(\.\w+)+$/;

export class StatRegistry implements Iterable<StatDef> {
  private readonly defs = new Map<string, StatDef>();

  constructor(defs: Iterable<StatDef> = []) {
    for (const d of defs) this.add(d);
  }

  add(...defs: StatDef[]): this {
    for (const d of defs) {
      if (!STAT_ID.test(d.id)) throw new Error(`Stat id "${d.id}" must look like Namespace.Name`);
      if (this.defs.has(d.id)) throw new Error(`Stat ${d.id} is already registered`);
      if (d.input && d.base !== undefined) throw new Error(`Stat ${d.id} has both an input and a base`);
      this.defs.set(d.id, d);
    }
    return this;
  }

  /** A copy with extra stats; class, pet and spell encodings extend the generic registry this way. */
  extend(...defs: StatDef[]): StatRegistry {
    return new StatRegistry(this.defs.values()).add(...defs);
  }

  /** A copy with some input defaults replaced, e.g. a class's main building share. */
  withInputDefaults(defaults: Record<string, number>): StatRegistry {
    const copy = new StatRegistry();
    for (const d of this.defs.values()) {
      const v = defaults[d.id];
      copy.add(v === undefined ? d : { ...d, input: { ...this.requireInput(d.id), default: v } });
    }
    for (const id of Object.keys(defaults)) this.requireInput(id);
    return copy;
  }

  has(id: string): boolean {
    return this.defs.has(id);
  }

  get(id: string): StatDef | undefined {
    return this.defs.get(id);
  }

  require(id: string): StatDef {
    const d = this.defs.get(id);
    if (!d) throw new Error(`Unknown stat ${id}`);
    return d;
  }

  all(): StatDef[] {
    return [...this.defs.values()];
  }

  [Symbol.iterator](): Iterator<StatDef> {
    return this.defs.values();
  }

  private requireInput(id: string): InputSpec {
    const input = this.require(id).input;
    if (!input) throw new Error(`Stat ${id} is not an input`);
    return input;
  }
}
