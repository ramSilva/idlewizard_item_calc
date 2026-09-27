import { buildModel, type BuiltModel } from "../data/buildModel.ts";
import { classById } from "../data/classes.ts";
import { attributePoints } from "../data/attributes.ts";
import { ITEMS } from "../data/items.ts";
import { ATTRIBUTES, type InputSpec, type ItemSlot, type Source, type StatGroup } from "../engine/model.ts";
import type { InputRelevance, RelevanceResult } from "../engine/relevance.ts";
import type { Selection } from "./state.ts";

export interface UiModel {
  model: BuiltModel;
  specs: Map<string, InputSpec>;
  /** Set when the chosen score isn't available for the selection and another one was used. */
  warning?: string;
}

/** Inputs the UI sets through its own controls rather than the inputs form. */
const CONTROLLED_INPUTS = new Set(["Idle.Active", "Items.LegionReward"]);

function build(sel: Selection): BuiltModel {
  return buildModel(sel, { relevance: false });
}

/** Builds the selection's model; if its score isn't available, falls back to the class's burst score, then production. */
export function buildUiModel(sel: Selection): UiModel | { error: string } {
  let model: BuiltModel;
  let warning: string | undefined;
  try {
    model = build(sel);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/isn't available for this selection/.test(message)) return { error: message };
    const fallbacks = [classById(sel.classId).defaultScore, "production"].filter((id) => id !== sel.scoreId);
    const built = fallbacks.map((scoreId) => {
      try {
        return build({ ...sel, scoreId });
      } catch {
        return null;
      }
    });
    const found = built.find((m) => m !== null);
    if (!found) return { error: message };
    model = found;
    warning = `The chosen score isn't available with these spells and pet, so "${model.score.def.label}" is used.`;
  }
  const specs = new Map<string, InputSpec>();
  for (const i of model.graph.inputs) {
    const s = model.graph.stats[i];
    if (s.base.kind === "input") specs.set(s.id, s.base.spec);
  }
  return { model, specs, warning };
}

export interface InputField {
  id: string;
  label: string;
  group: StatGroup;
  description?: string;
  spec: InputSpec;
  /** Where the class or pet default comes from (absent for generic defaults). */
  defaultSource?: Source;
  shown: boolean;
  reason: string;
  /** True while no relevance result is available for this setup yet. */
  pending: boolean;
}

export const GROUP_ORDER: readonly StatGroup[] = ["Character", "Pet", "Attributes", "Spells", "Production", "Clicks", "Void", "Items", "Misc"];

/** Attributes some item requires: their points decide which items are allowed, whatever their effect on the score. */
const REQUIRED_ATTRIBUTE_INPUTS = new Set(ATTRIBUTES.filter((a) => ITEMS.some((i) => i.requirements[a])).map(attributePoints));

const REQUIREMENT_REASON = "Items require these points, so they decide which items are allowed.";

export function inputFields(model: BuiltModel, relevance: RelevanceResult | undefined): InputField[] {
  const byId = new Map<string, InputRelevance>((relevance?.inputs ?? []).map((r) => [r.id, r]));
  const fields: InputField[] = [];
  for (const i of model.graph.inputs) {
    const s = model.graph.stats[i];
    if (s.base.kind !== "input" || CONTROLLED_INPUTS.has(s.id)) continue;
    const r = byId.get(s.id);
    const required = REQUIRED_ATTRIBUTE_INPUTS.has(s.id);
    const shown = !r || r.shown || required;
    fields.push({
      id: s.id,
      label: s.def.label,
      group: s.def.group,
      description: s.def.description,
      spec: s.base.spec,
      defaultSource: model.cls.defaults[s.id]?.source ?? model.pet.defaults?.[s.id]?.source,
      shown,
      reason: r ? (r.shown || !required ? r.reason : REQUIREMENT_REASON) : "Checking whether this input can change the ranking…",
      pending: !r,
    });
  }
  return fields.sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.label.localeCompare(b.label));
}

const PARAGON_URL = "https://idlewizard.wiki.gg/wiki/Paragon";

/** Paragon level that unlocks each item slot (Paragon page table; Paragon levels are completed in order). */
export const PARAGON_SLOT_UNLOCK: Readonly<Record<ItemSlot, number>> = {
  Head: 9,
  Chest: 9,
  Hands: 9,
  Feet: 9,
  Research: 9,
  Trophy: 9,
  Shoulder: 11,
  Waist: 13,
  Finger: 14,
  Neck: 16,
  Back: 18,
  Wrist: 19,
  Weapon: 20,
  Offhand: 23,
  Legs: 25,
  Mount: 26,
  Accessory: 28,
  Phylactery: 29,
};

export const PARAGON_SOURCE: Source = { url: PARAGON_URL, verified: true };

/**
 * The BiS bot's "Pro=SubParagonN" options (https://idle-wizard.fandom.com/wiki/BiS_Guide). Its numbers don't match the
 * current Paragon table, and reading them as cumulative (lower N also drops the later slots) is an assumption.
 */
export const BOT_SUB_PARAGON: readonly { level: number; slots: ItemSlot[] }[] = [
  { level: 12, slots: ["Shoulder", "Waist"] },
  { level: 18, slots: ["Neck", "Finger"] },
  { level: 24, slots: ["Back", "Wrist"] },
  { level: 28, slots: ["Weapon"] },
];

export const botSubParagonSlots = (level: number): ItemSlot[] => BOT_SUB_PARAGON.filter((b) => b.level >= level).flatMap((b) => b.slots);
