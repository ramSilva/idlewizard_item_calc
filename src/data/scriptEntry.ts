// Node scripts load the sources through one Vite module-runner import, so every module (and the item objects the
// catalog keys on) is instantiated once; separate imports would each get their own copy.
export { buildModel, defaultSelection, elasticity, loadoutModifiers } from "./buildModel.ts";
export { createOptimizer, deserializeInputs } from "./optimize.ts";
export { comparePreset, formatMultiplier, presetReport, sweepReport } from "./optimizerReport.ts";
export {
  GUIDE_CASES,
  GUIDE_VARIANTS,
  catalystTie,
  experienceElasticity,
  TEMPORALIST_ENCHANT_PRIORITY,
  equipAt,
  loadoutScore,
  perLevelGain,
  presetLoadout,
  removalGains,
  setItems,
  swapGains,
} from "./golden.ts";
export { ITEMS, itemByKey, itemByName, presetItems, setByNameOf } from "./items.ts";
