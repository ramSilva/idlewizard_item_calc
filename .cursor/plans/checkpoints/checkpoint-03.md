# Checkpoint 03: after `encode-data`, at the start of `encode-classes`

Handoff for the next agent. Read this file first, then the plan (`.cursor/plans/idle_wizard_item_optimizer.plan.md`, which is authoritative). This file replaces checkpoint-02: everything still relevant from it is copied here, so you don't need to read the older checkpoints. The project is carried across several agents to limit context rot. When you finish a plan step, write `checkpoint-NN.md` next to this file in the same format, carrying forward everything still relevant.

## 1. The user's constraints (from the original task prompt, not all of it is in the plan)

- Work on branch `feat/item-optimizer`. Never merge into main, never open or edit PRs. Leave the branch for the user to review.
- **Commits and pushes:** the user has given standing permission for any agent to commit and push to this repo at its discretion. Commit in logical steps with brief one-line messages that say what was done (no rationale), and push `feat/item-optimizer`. Merging into main and opening or editing PRs are still NOT allowed. Never stage `.idea/` or other IDE config.
- Follow the plan's todo list in order. Scope for v1: Oni, Shaman and Temporalist (spells, stances, paired pets), the full item DB, plus Chronomancer for the blind check.
- Stack: Vite + React + TS, Vitest, `break_eternity.js`, client-side only, optimizer in a Web Worker, GitHub Pages via Actions with `base: "/idlewizard_item_calc/"`. The deploy workflow triggers on push to main. If Pages can't be enabled, say so in the final report.
- **Hard constraint 1:** every piece of information the calculation needs gets its own separate, labelled input, but ONLY if it can change which item set wins. Anything that scales all sets equally must not be asked for: use the structural log-factor check plus the numeric ratio-invariance check from the plan (implemented, see section 6). Hidden inputs go in a collapsed section with an explanation. Show scores as relative multipliers.
- **Hard constraint 2: blind Chronomancer check** against https://idle-wizard.fandom.com/wiki/Chronomancer.
  1. Read ONLY the setup sections (spell loadouts per phase, pet, stance/passives, stated values). Filter the fetched page programmatically (e.g. `action=parse&prop=sections`, then fetch only the chosen sections and strip `ItemTooltip`, `items=` params and item lists) so item recommendations never enter your context.
  2. Run the tool and save the result to `validation/chronomancer/tool-result.md` BEFORE looking at the guide's gear.
  3. Then read the gear and write `validation/chronomancer/comparison.md` slot by slot. Classify each difference as bug/missing data (fix it, never just to force a match), different assumptions/outdated guide (list it, don't chase it), or unclear (say what would settle it).
  - **Do not open the wiki.gg pages** `Chronomancer Guide`, `Chronomancer Guide Updated` or `In Over Your Head Chronomancer Guide`. The scraper excludes them on purpose. `data-raw/wikigg/Chronomancer.wikitext` is the class page (hero ability and spell list). Before reading it, check its headings to make sure it has no gear section. (This step only grepped two lines of it, about Compressed Time and Time Distortion; no gear was seen.)
- Never answer from memory about game mechanics. Encode from the wiki source, keep a source URL and a `verified` flag on every encoded entity, and mark anything unverifiable as unverified (with a `note`; tests enforce this for stats, attribute effects and item effects).
- Code style: only add comments for non-obvious rationale, invariants or external constraints (e.g. wiki quirks, library bugs).
- Final report must cover: what was done per plan todo; test results (unit, golden, and the Chronomancer comparison with match rate and open differences); data that couldn't be obtained or verified; whether the Pages workflow exists and whether Pages is enabled; and anything the user must do manually.
- The user's rules also say: recommend a better-suited model if there is one; commit messages are one-liners.

## 2. Repo state

Commits on `feat/item-optimizer` (all pushed to `origin/feat/item-optimizer`):
1. `425772a` Scaffold Vite + React + TypeScript app with Vitest and break_eternity
2. `d5a00e1` Add wiki scraper, raw wikitext snapshot and Lua data conversion
3. `77e89f1` Add expression parser and engine model types
4. `cc09426`, `3286ce5` checkpoint 01 and plan status
5. `5cd3ca7` Add stat registry and generic stat definitions
6. `0c178c4` Add stat graph compiler with float and Decimal evaluators
7. `8f9042f` Add input relevance filter
8. `39a449a` checkpoint 02 and plan status
9. `847378f` Add --only scrape mode and snapshot Expeditions, Collectibles and Catalysts pages
10. `8a25815` Typecheck tests in a separate tsconfig and enable JSON imports
11. `e44613c` Add attribute per-point bonuses, perks and item-facing stats
12. `9c5b42a` Add item text parser, formula overrides, item database and loadout resolution
13. `ec015e9` Add item coverage report
14. (this checkpoint and the plan status update, committed right after this file was written)

Every commit from 5 onwards typechecks and passes its tests on its own (verified for 9–13 with the archive method below).

Tooling: `npm test` (Vitest, **86 tests in 10 files**), `npm run build` (`tsc -b` + vite), `npm run lint` (all three pass), `npm run scrape` (needs network; `npm run scrape -- --only "A,B"` fetches just those titles and merges them into `data-raw/manifest.json`), `npm run build-data` (Lua to JSON). `UPDATE_COVERAGE=1 npm test` rewrites `docs/item-coverage.md` (the coverage test fails if the file is stale). Versions: Node 22, Vite 8, Vitest 5, TypeScript 6, React 19, ESLint 10. `.gitignore` covers node_modules, dist, coverage, Playwright artifacts, .env, .idea, .vscode. To run a TS file directly with Node, use `node --experimental-transform-types` (strip-only mode rejects the parser's parameter properties); note that `src/data/items.ts` imports JSON, which plain Node ESM would need an import attribute for, so prefer running things through Vitest.

TypeScript projects: `tsconfig.app.json` (src without `*.test.ts`, browser types, `resolveJsonModule`), `tsconfig.test.json` (extends app, adds Node types, includes tests; use it for anything needing `node:fs`), `tsconfig.node.json` (vite config). Root `tsconfig.json` references all three.

Pushing: `origin`'s push URL is SSH (`git@github.com:ramSilva/idlewizard_item_calc.git`), which authenticates as ramSilva, and `feat/item-optimizer` tracks `origin/feat/item-optimizer`. Plain `git push` works (the sandbox needs `full_network`). Do NOT push over HTTPS: the stored HTTPS credential belongs to the user's work account and returns 403. Do not inspect credential stores. The user wants this work done autonomously: agents may commit, push and spawn subagents without asking.

Git identity is set repo-locally (ramSilva, noreply email). `gh` CLI auth is broken: the active account is a different, invalid user. So `gh` can't be used to check or enable Pages. Report that rather than switching accounts.

Sandbox notes: `git worktree add` fails in the sandbox (can't write `.git/worktrees`), and `.cursor/` can't be created by shell commands in the sandbox (the file tools can edit files there). To check each commit separately: `git archive <sha> | tar -x --exclude='.cursor' -C .verify-<sha>`, symlink `node_modules`, run `npx tsc -b` and `npx vitest run --root .` there, then delete the folder. Vitest 5 swallows `console.log` from passing tests; to inspect data while exploring, write a throwaway test that writes a file (and delete it afterwards).

## 3. Data acquisition (plan todo `scrape`: done)

- **The wiki.gg MediaWiki API works with plain `fetch`/curl** (`https://idlewizard.wiki.gg/api.php`). Cloudflare only blocks `/wiki/...` HTML pages. The sandbox needs `full_network` permission for these hosts.
- `scripts/scrape/wiki.mjs` and `scrape.mjs`: batched `prop=revisions` calls (50 titles each), handling redirects and normalization. The fallback chain is Playwright headless Chromium (`action=raw`, only used if `playwright` is installed; it is not, and this path is untested), then the Fandom API. `wiki.mjs` also exports `fetchSections`/`fetchSectionWikitext` (use these for the blind Chronomancer protocol).
- Snapshot: **284 pages, all from wiki.gg via the API**, nothing missing (281 files on disk because of redirects). Output is in `data-raw/wikigg/*.wikitext` (filenames replace `/:` with `__` and other odd characters with `_`). `data-raw/manifest.json` records title, resolved title, URL, revid, revision timestamp and method for each page. This step added `Expeditions`, `Collectibles` and `Catalysts` (via `--only`, so the other pages keep their original revisions).
- Covered: modules (`Module:Data/Items`, `Data/Spells`, `Data/Familiars`, `Data/Classes`, `Data/ManaSources`, `Module:Items`, `Module:Spells`, `Module:BiS`), mechanics pages (Items, Attributes, Enchantments, Stance, Elixir, Basic Mechanics, Paragon, Expeditions, Collectibles, Catalysts, plus redirects Mysteries/Void Mana/Idle Mode → Basic Mechanics), class pages Oni, Shaman, Temporalist and Chronomancer, the guides (Oni Guide, Shaman Guide, Temporalist Guide (e300-e550), Temporalist Guide (e550+)), all of `Category:Pets` and all of `Category:Items`.
- `scripts/data/lua-table.mjs` is a small Lua data parser; `scripts/data/build-data.mjs` writes `src/data/generated/items.json` (223 items including 20 Mythic, and 12 sets) and `spells.json` (226 spells). Each raw item carries `id, name, slot, set, startQuality, requirements, tiers[{quality, desc}], enchant, acquisition, details (the ==Details== section; only the 17 weapons have one), source`. Set tiers carry `pieces` (tier i applies from i+2 pieces, per `Module:Items` SetInfo).
- Fandom API (`https://idle-wizard.fandom.com/api.php`) also works. The BiS Guide was read from Fandom for the algorithm design and is **not** in `data-raw`.

## 4. Game mechanics found so far (all from wiki source; cite these URLs when encoding)

**Items** (`Module:Data/Items`; https://idlewizard.wiki.gg/wiki/Items, https://idlewizard.wiki.gg/wiki/Enchantments):
- 18 slot types; Finger and Trophy hold 2 each, so 20 slots are equipped. Qualities Common..Legendary, plus Unique (fixed max) and Mythic. `Tiers[i]` corresponds to quality `startQuality + i`.
- Enchanting only on Legendary/Unique, max level 55, cost 100 × 1.5^level. **Levels stack multiplicatively: (1 + x)^level** — the item's "Enchant" text is x ("Evocation efficiency +20%" → 1.2^level; the Enchantments page table is reproduced in tests).
- Bonus enchant levels: the Items page says bonus levels give "a number of free levels (up to 5) to all Enchantments on all items equipped" and only apply to items with ≥ 1 enchant level. The Legion's reward gives +1 (boolean input `Items.LegionReward`), Resonator Ring +1/+2/+3/+4 by quality (Uncommon..Legendary). The Enchantments page says "Resonator Ring 4.06% if Enchanting Membrane is equipped and enchanted" = 1.01^4, which confirms Resonator's +4 and multiplicative per-level stacking (tested). Slot-scoped: Power Armor 7 pieces "Finger Items Enchantment level +4", Raiments 6 pieces "Hands Items Enchantment level +8" (Raiments has no Hands piece, so it boosts whatever Hands item is worn), Mythic Burden of the Erased "Shoulder Items Enchantment Level +3", Mythic Endtimes Armor "This Item's Enchantment Level +2".
- Item text conventions: "X +N%" read as a multiplier ×(1+N%) (unverified; evidence: edust bonuses are "multiplicative unless stated otherwise" on the Enchantments page, and the Stance page flags additive items like Grasp Of The Grave explicitly); "X (base) +N%" added to the stat's base; "(multiplicative)" explicit multiplier; "Attr +N" added points; "decreases X +N%" read as ×(1−N%).
- Wiki formula conventions checked against the source: the Expedition items spell out "+0.132 * Expedition Level (13.2% per Expedition Level)", so formula values are fractions; Pitch-black Cage's page has an Analysis table matching `5 × (bats + 1)^0.5` (Legendary) etc.; Commissar's Torn Sleeve's Notes say the bonus rounds to the nearest point (307 pet levels give +25); Scales of Appraisal matches the Enchantments page's `0.1 × log10(experiments + 1)^0.5`; Enchanting Membrane's Details give 35% at Legendary, as the Enchantments page lists.
- Weapons' Details use R = (1 + 0.75 × Tier)/4 with Tier Common 0 … Legendary 4, Unique 4 (Chiropteric Rod uses R + 1, Philosopher's Stone R × 0.065, Enchanting Membrane R = Tier × 0.25 + 1).
- Mythic items: inherent effect + random bonuses/imbuement + a user-chosen enchant. Only the inherent effect is encoded; exclude Mythics from the default search.
- Requirements: the Attributes page says item attribute bonuses count toward other items' requirements (Legacy's Insight helps Ebon Mantle), but "Fill" ignores them. Implemented as `unmetRequirements` (see section 5).
- Expedition level is a single wizard-wide level, max 100 (Expeditions page).
- Time Distortion has a maximum of 10x, raised by items and an upgrade (Chronomancer class page).
- Basic Mechanics: Liquid Shadow is an Umbramancer resource; XP pools are Mana, Mana Sources (passive) and Click, Clickables, Spells (active); "Increased XP from Mana Sources similarly multiplies the XP from mana sources".
- Guide item presets like `#7#BURST@104;113;1;29;...` are 20 item IDs from the `IDs` table in `Module:Data/Items` (`-1` = empty). Ordering doesn't matter. They assume Legendary, or Unique for Quality 6. Tab labels like "Living Sin 17+5" mean enchant 17 plus 5 bonus levels. All 12 presets below resolve to full, slot-valid loadouts (tested in `src/data/items.test.ts`).

**Attributes** (https://idlewizard.wiki.gg/wiki/Attributes): each point is multiplicative, (1 + B)^X. Per-point: Int 2.5% Mysteries power (Multiplier), Ins 2.5% VM per Entity, SC 3.00% Evo, Wis 2.5% passive shards, Dom 3.0% autoclick profit, Pat 2.5% idle bonus, Mas 2.5% CAP (unlocks Paragon 5), Emp 2.5% PAP (Paragon 8), Vers 1.8% profits (Paragon 38, no perks). Perks every 25 points are all encoded (see section 5); Int perks are explicitly additive to the 3% base ("total of 35%" at 225, matching Basic Mechanics: "Intelligence can increase that bonus to 35%"); Insight states "(additive)"/"(multiplier)"; Basic Mechanics says crit rating adds to base crit profit "before multiplication by spells or Dominance", so Dominance crit-profit perks multiply. The Temporalist e550+ guide plans "INT … until you get 230 (+20 from Circlet Of Deep Thoughts)" for the 250 perk, so perk thresholds count item attribute bonuses.

**Mysteries** (Basic Mechanics): Mysteries = sqrt(mana / 5e11). Each mystery adds 3% production (base); Int perks raise that to 35%; Int points multiply it; Hungerer multiplies Mysteries power. Encoded as `Mysteries.Factor = 1 + Count × Power` (additive reading flagged unverified).

**Void mana:** production × (1 + VM × per-point). Base per-point value not found (More Statistics shows "Increase profit by point (%)"); input `Void.ProfitPerPoint` with placeholder default 1. During burst VM is already collected, so VM-per-entity items don't matter there; VM-profit items do.

**Crit** (Basic Mechanics): expected click value = (1 − c) + c × CritProfit. Crit Rating R adds log10(R)% to chance and R% to base crit profit. Encoded as `Click.CritChanceTotal` and `Click.CritFactor`; the reading of crit profit % and the 100% cap are unverified.

**Idle mode:** always burst in idle mode (Basic Mechanics). "Burst in idle mode" = boolean input `Idle.Active` (default true).

**Sources (buildings)** (Basic Mechanics): 1 Mana Gems, 2 Grimoires, 3 Spell Fountains, 4 Enchanted Trees, 5 Alchemy Desks, 6 Circles Of Power, 7 Dimensional Rifts, 8 Nexi. Classes rename some (Oni: Hellholes = Circle of Power, Monuments = Spell Fountain, Grim Trophy = Enchanted Tree). Item text "Nexi/Nexus/The Nexus profit" → 8, etc.

**BiS bot algorithm** (https://idle-wizard.fandom.com/wiki/BiS_Guide, "How it Works" / "Formula Generation"):
- Builds a postfix formula by substituting effects, multiplicative before additive, and drops items that don't affect it.
- Per enchant level, scores each item "best case", treating every set effect as belonging to that item alone, and keeps items per slot until the first non-set item (2 for rings).
- Tests every subset of each set against the non-set alternatives, then every remaining combination.
- Runs at least 40 levels and stops after 15 unchanged levels once the second-best set grows more slowly than the best. Resonator is handled as a separate branch.
- Defaults: attributes 175, max paragon (all slots). Pro=SubParagonN excludes slots: 12 Shoulder/Waist, 18 Neck/Rings, 24 Back/Wrist, 28 Weapon.
- Weapons are flagged as unreliable because their effects are self-scaling.

**Oni** (Oni.wikitext; guide `Oni Guide.wikitext`):
- Hero ability: PAP × [(PetT·G/3600+1)^0.5 · PetL^0.8 · C^0.5 · L/4e9 + 1] and Inc × [((I+1)·L·G^0.5/100)^0.65 / 250000 + 1].
- Stances: Meditation (charging), Defense (FS instant, divides incant duration), Berserk (Evo × [(I+1)·C^0.5·L·G/1e4 + 1]). G = CAP growth rate, C = CAP, L = char level, I = incantations cast this exile + 1.
- Burst setup: pet Living Sin (fallback Hungerer), stance Berserk. Spells 60 Ritual Of Power, 6 Goblet Of Fire, 88 Iron Blood, 89 Enhanced Strength, 107 Possessed Blade, 86 Furious Strike (score). Hellholes = building 6, Monuments = 3, Grim Trophy = 4.
- Burst presets:
  - Hungerer 10+5: `104;113;1;29;11;32;48;68;54;83;76;1002;211;301;411;417;91;2007;3005;509`
  - Hungerer 18+5: `104;113;1;29;18;32;48;68;54;84;72;1002;211;301;411;417;91;2007;3005;509`
  - LS 13+5: `104;113;6;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509`
  - LS 17+5: `104;113;1;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509`
  - LS 39+5: `104;113;1;29;18;31;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509`
- Guide stat scalings (elasticities for the golden test): Inc 7.1438, CAP 1.5517, Evo 1.0421, PAP 2.0614, Char XP 0.3923.
- Attributes: Int 200, Ins 60, SC 125, Pat 50, Mas 200, Emp 125–200.

**Shaman** (Shaman.wikitext; `Shaman Guide.wikitext`):
- Hero ability: Idle × [((T_G+1)^2/1000)·C^0.30·L^1.6 + L + 1] with a softcap on T_G, and Summon × [(1 + A·G^0.25/10000)^0.85 · C^0.155 · L^0.31/400 + 1] with an autoclick softcap above 7e7. The idle bar gives × (10·A_cur^0.5 + 1).
- Burst: pet Herald of Rot (alt Risen Giant). Spells 18 Summon Evergrowing Forest, 92 Summon Centipede Swarm, 105 Summon Spider Swarm, 16 Summon Deepwood Stalker, 23 Summon Unholy Avatar, 7 Dreaded Script Of Harvest. Burst mana comes from autoclicks: Σ clicks/s × ClickProfit × Summon × AutoclickProfit × crit.
- Presets:
  - Burst: `108;113;4;20;12;33;47;65;59;87;76;1001;206;306;418;406;94;2005;3004;507`
  - 20+5: `108;113;4;20;12;33;47;61;59;87;73;1001;206;306;418;406;94;2005;3004;507`
  - 28+5: `108;113;4;20;12;33;47;61;59;88;73;1001;206;306;418;406;94;2005;3004;507`
- Run scalings (burst): Evo 0, Inc 0.92, Summon 7.76, CAP 1.997, PAP 1.676, Idle 2.62, Void/Autoclick/Click/Crit profit 1.
- Attributes (e550 variant): Int 150, Ins 90, SC 175, Wis 0, Dom 75, Pat 200, Mas 100, Emp 175.
- The Shaman presets use weapon 1001 Branch of the Great Cycle, whose base effect is an activated autoclick burst (not modelled as a stat; see section 5 — a candidate extra mana source for Shaman scores).

**Temporalist** (Temporalist.wikitext; `Temporalist Guide (e550_).wikitext`):
- Hero ability: profits × [(T^2.15·(S·G/16000)^1.78 + 1)·(X/1e7 + 1)·C^0.5·L/1e10 + 1] and Evo × [(T^0.5/40·(S·G/16000)^1.15 + 1)·C^0.5·L/5e6 + 1]. S = skipped years, X = total char XP, T = char time in hours, softcapped after 720h.
- Burst: pet Mechanos Apexis, which casts KBB (the score): Mana = (CharLvl + 2.5) × Evo × Mana/s × 8. Spells 73 Converge Timelines, 57 Ley Overdrive, 61 True Sorcery, 17 Superposition, 69 Stabilize The Flow, 4 Gem Resonance.
- Presets:
  - 11+5: `104;113;6;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`
  - 15+5: `104;113;1;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`
  - 22+5: `104;113;1;29;14;36;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`
  - 34+5: `104;113;1;29;14;36;48;67;59;84;76;1005;207;300;411;408;92;2003;3005;508`
- Burst scalings: Evo 1, Inc 4, CAP 1, PAP 1, Idle/Void profit 1, Char XP 1.34.
- The guide's "Enchant Priority" section lists each item's exact profit gain per enchant level (e.g. Reality Prism 42.92%, Clockcarers 30%, Rubedo 12.5%, Circlet 25%, Nethershackles 15%). Those make a good golden test.
- Weapon 1005 Reality Prism multiplies KBB efficiency by (charges + 1); encoded on `Spell.KelphiorsBlackBeamEfficiency` — the Temporalist KBB score must multiply by that stat. Temporalist guides say Timeshroud/Stabilizing Pauldrons matter via max Time Distortion (skipped time, Stabilize The Flow) and The Magnifier doubles TS active casts.
- Attributes: Int 155, Ins 140, SC 250, Wis 200, Dom 0, Pat 150, Mas 250, Emp 175.

**Pets** (encode from `data-raw/wikigg/<Pet>.wikitext`, "Pet Ability(ies)" sections):
- Living Sin: profits × [log10^5(X+1)·P·L^4·2 + 1], Evo × [P^0.35·L^2·0.001 + 1].
- Hungerer: Mysteries power × [X^0.4·L·P^0.9·100 + 1.5].
- Greater Chimaera: profits × [P·L·5 + 1], plus attributes.
- Herald of Rot, Risen Giant, Mechanos Apexis, Pit Lord, Archivist, Interrogator and Ley Keeper have also been read; their formulas are in those files.
- Pet encodings must set `Pet.Tier` (1–3; The Bond's PAP bonus depends on it).

**Spell math** is in `spells.json` (`math`, LaTeX). Summing exponents gives elasticities close to the guides' tables (Oni about Inc 6.1 / CAP 1.2 / Evo 1.0, Temporalist Inc about 4.5, Shaman Summon about 7.5), so the multiplicative model looks structurally right.

## 5. What was built in this step (plan todo `encode-data`: done)

### Stat changes (`src/data/stats.ts`, `src/data/attributes.ts`)
- **Attributes restructured:** inputs are `AttrPoints.<A>` (points assigned); `Attr.<A>` is derived (= `AttrPoints.<A>`, items add to it) and is what per-point bonuses and perks use; `AttrBonus.<A>` are constants (0.025 … 0.018; The Starmap's "(base) +0.03%" adds to `AttrBonus.Versatility`). `attributePoints(a)` / `attributeStat(a)` helpers (re-exported from `stats.ts`).
- `Char.ExperienceGain` was replaced by `Char.ExperienceFromActions` and `Char.ExperienceFromSources`.
- `GENERIC_EFFECTS` = `PRODUCTION_EFFECTS` (Mysteries/Void/Idle factors on `Prod.Global`) + `ATTRIBUTE_EFFECTS`. Tests that want only the production part use `PRODUCTION_EFFECTS`.
- Input labels now say "without item and attribute bonuses" for CAP, CAP growth, PAP, Void profit per point, idle bonus, autoclicks/s, crit chance and rating, passive shard generation (hint: the tool applies those itself). This resolves the checkpoint-02 open question about what the "before item bonuses" inputs exclude; the UI should explain it.
- New item-facing stats (all with sources): `Spell.{Evocation,Incantation}Duration`, `Spell.{Evocation,Incantation,Summoning}DurationDivisor`, `Spell.CostReduction`, `Spell.ChargingCostReduction` (additive fractions), `Spell.ChargeSpeed`, `Spell.AccumulatedStartingCasts` (additive, % items multiply), `Spell.AccumulatedCastGain`, `Spell.MaxCastRate`, `Spell.AutoclicksFromSpells`, `Spell.AccumulatedCastCountFactor` (Rubedo ×2), `Spell.AugmentCastCountFactor` (Ritual Disk ×2), `Spell.PersistentActiveAccumulationFactor` (Magnifier ×2), `Spell.KelphiorsBlackBeamEfficiency` (Reality Prism); `Pet.ExperienceFlat`, `Pet.ChargeSpeed`, `Pet.Tier` (input 1–3); `Void.ManaPerEntityFlat`, `Void.EntityLifetime` and `Void.EntitySpawnRate` (inputs, items multiply); `Click.HallowedProfit`, `Click.ProductionShare` ("click profit +5% of your Mana per second", additive); `Shards.PassiveGeneration` (input), `Shards.PoolEfficiency`, `Shards.PoolCapacity`, `Shards.PerClick`; `Time.MaxDistortion` (constant 10), `Time.CompressedTimeGain`; `Items.EnchantingDustIncome`, `Items.ExperimentEfficiency`, `Items.CraftingEfficiency`, `Items.WeaponChargeSpeed`.
- New inputs for formulas and perks (all default 0 unless noted; placeholders): `Spell.CastsThisExile`, `Spell.AccumulatedCastsThisExile`, `Spell.EvocationCastsThisExile`, `Misc.AchievementsUnlocked`, `Misc.AchievementPoints`, `Misc.UpgradesBought`, `Pet.TimeCurrent` (seconds, unverified unit), `Misc.SourcesOwned`, `Void.EntitiesThisExile`, `Idle.TimeThisExile`, `Click.AutoclicksThisExile`, `Shards.CollectedThisExile`, `Items.EnchantingDustThisExile`, `Items.ExperimentsThisRealm`, `Expeditions.Level` (0–100), `Misc.BatsThisExile`, `Misc.CatalystShards`, weapon inputs `Weapon.ThunderbirdCharges`, `Misc.Arcanasprings`, `Misc.LeyApexes`, `Misc.Laboratories`, `Elixir.{Evocation,Incantation,Summoning}Ingredients`, `Misc.LiquidShadow`, `Misc.ShadowCoals`, `Misc.Voidgates`, and Head Of The All-Eater's `Misc.MaxManaAccrued`, `Void.ManaAccrued`, `Click.AutoclicksAccrued`, `Spell.CastsAccrued`, `Void.EntitiesAccrued`.
- `src/data/attributes.ts`: `ATTRIBUTE_STATS`, `ATTRIBUTE_EFFECTS` (9 per-point `(1 + AttrBonus.A) ^ Attr.A` multipliers + 72 perk effects), `ATTRIBUTE_PERKS` (table per attribute), `UNMODELLED_PERKS` (8: Int 75 and Mas 125 level requirements; Ins 100/125 VM collection; Pat 25/50/100 idle-mode timing; Pat 225 green catalysts). Perk effects are `if(ge(Attr.X, N), factor, 1)` (mul) or `ge(Attr.X, N) * amount` (add). Every attribute except Versatility has exactly the perks 25…250 (tested).

### Item model (`src/engine/model.ts`)
- `ItemEffect { stat, op, value: number | Expr, text, source }` (same semantics as `Effect`: "mul" values are factors). `UnmodelledClause { text, reason, note? }` with `UnmodelledReason = "not-production" | "mechanic" | "mythic-random" | "unparsed"`. `BonusEnchant { scope: "all" | "self" | ItemSlot, levels, text, source }`. `EffectBlock { desc, effects, bonusEnchant, unmodelled }`; `ItemTier = EffectBlock & { quality }`; `SetTier = EffectBlock & { pieces }`.
- `EnchantDef { desc, stat | null, perLevel, unmodelled?, source }` (always multiplicative; `op` was dropped). `ItemDef { key, id | null, name, slot, set, startQuality, maxQuality, requirements, tiers, enchant, mythic, acquisition, details, source }`. `SetDef { name, items (keys), tiers, source }`.

### Clause parser (`src/data/itemText.ts`)
- `normalizeText` (strips markup, `<br>` → clause break, `<sup>x</sup>` → `^(x)`, `log<sub>10</sub>` → `log10`), `splitClauses` (commas and sentence ends outside parentheses), `parseEffectText(desc, { url, quality, overrides })` → `{ effects, bonusEnchant, unmodelled }`, `parseEnchant(desc, url)`, `overrideEffect(ctx, stat, op, value, note?, verified?)`.
- Order per text: item overrides (regex over the normalized text; matched spans are removed) → per clause: phylactery flag "Scales multiplicatively from Character level" (turns every factor f of the block into `f ^ Char.Level`) → `UNMODELLED_RULES` (offline bonus, jars, trials, gods/ascension XP, attribute gain speed, idle activation time, level requirements, red catalysts, echoes, Liquid Shadow/Shadow Clots, memetics, gods, phylactery slot efficiency, breakthroughs/exhibits, source quantities, flat cast-rate cap) → bonus-enchant patterns → "Entities remain N% longer" → "N% of your Mana per second" → "X +a * Expedition Level (N% …)" (flags a mismatch between a and N) → the grammar `[decreases] <phrase> [(base)|(multiplicative)] [+]N[%]` looked up in `PHRASES` (explicit phrase → stat table with per-form modes: percent mul/add/points/reduce, flat add/factor, a separate `flatStat` for "(base)"/flat amounts). Stat names listed without a value share the next value ("Click profit, critical profit +125%"); a bare value clause ("150%", "additionally +200%") applies to the previous stat (or the previous unmodelled rule). Anything else is kept as `unparsed`.
- Every effect's `source` is the item page; effects whose reading isn't stated by the wiki are `verified: false` with a note (percent-as-multiplier, "(base)", divisors multiplying, crit chance points, decreases, level scaling, carried values, …).

### Overrides (`src/data/itemOverrides.ts`, `ITEM_OVERRIDES` by item name)
- Formula items: Pitch-black Cage (`Void.ManaPerEntity × (1 + a·(bats+1)^b)`), Ceaseless Hunger (PAP, void entities), Murmuring Spellbook (idle, spells cast), Arcane Accelerator (Evo, catalyst shards), Black Vortex (VM profit, `Idle.Bonus`), Commissar's Torn Sleeve (all attributes `floor(0.08·PetLevel + 0.5)`, verified by its Notes), Miniaturized Accelerator (profits × `(0.0001·(C+1))^0.3`), Enigmatic Parchment (CAP × `(2.5·(edust+1))^0.5`), Collar Of Obedience (pet charge speed × `1 + 0.2·log10(CAP+1)`), Symbol Of Authority (Summ × `1 + 0.05·L`), Simple Memento (pet XP × `5/log10(PetL+1) + 1`), Paukan (pet XP × `1 + 0.2·(autoclicks/s+1)^0.5`), Recaller Stone (summoning duration divisor), Habitstone (incantation duration divisor), Scales of Appraisal (experiment/crafting efficiency, verified by the Enchantments page), The Bond (PAP ×10/×3 for pet tier 1/2), Rubedo Engine, Ritual Disk, The Magnifier (cast-count factors ×2). The Expedition trophies (Arcane Engine, Anima Core, Binding Sigil, Mutated Mycelium) are handled by the generic Expedition rule.
- Weapons from their Details: Chiropteric Rod (profits × `bats^(R+1) + 1`), Head Of The All-Eater (profits formula), Thunderbird (Evo), Reality Prism (KBB efficiency, charges at max), Philosopher's Stone (Evo/Inc/Summ × `N^(5 − ingredients)`), Black Blade (profits), Shard Of A Lost Dimension (VM/entity), Enchanting Membrane (edust 35% at Legendary). Kept as `mechanic`: Branch of the Great Cycle (Shaman's activated autoclick burst; candidate extra mana source for encode-classes), Cataclysm (temporary Hellholes; building counts not modelled; Oni's preset weapon), Heart of the Grave, Redeemer, Temporal Stabilizer, Berzerker (Oni: Furious Strike grants incantation casts; cast counts are inputs), Spellstealer, The Accumulator, Shadow-Scryer's Crystal Ball, Broomstaff Of Klevdariah.

### Item database (`src/data/items.ts`)
- `ITEMS` (223 `ItemDef`s, keys like `commissars-torn-sleeve` from `itemKey(name)`), `SETS` (12), `itemByKey/itemByName/itemById`, `tierOf(item, quality = max)`, `qualitiesOf`, `qualityRank`, `setByNameOf`, `presetItems(code)`, `ITEM_DATA_URL`. Mythic tiers parse only the "Inherent:" part; the random bonuses are one `mythic-random` clause; Mythic enchants are `mythic-random`.

### Loadout resolution (`src/engine/loadout.ts`)
- `resolveLoadout(equipped: EquippedItem[], { legion, sets })` → `{ effects: ResolvedEffect[], enchantLevels, setPieces, globalBonusLevels }`. `EquippedItem { item, quality? (default max), enchant }`. Applies the item's tier, every set tier with `pieces ≤ equipped count` (cumulative: unverified), bonus levels, and enchant factors `(1 + perLevel)^effectiveLevel`. Effective level = 0 if no real level, else `real + min(5, Legion + Σ "all" bonuses) + Σ slot bonuses for the item's slot + Σ self bonuses`. Throws on invalid loadouts (`validateLoadout`: slot capacity, duplicates, quality, enchant range 0–55).
- `ItemCatalog(items, sets)`: `spec: ItemEffectSpec` declaring every static add/mul stat and one dynamic effect per formula-valued `ItemEffect` (identity-keyed; build the catalog from the same `ITEMS`/`SETS` objects), and `modifierSpec(resolved)` → `ModifierSpec` for `createModifiers`. One compiled graph serves every loadout. The optimizer can build `ItemModifiers` arrays directly for speed (sum `add`, sum `log10` of factors into `logMul`, set dynamic gates).
- `unmetRequirements(equipped, assigned, sets)`: requirement met if assigned points + static attribute bonuses of the other equipped items and active set tiers ≥ requirement. Formula bonuses (Commissar's) aren't counted.

### Coverage (`src/data/coverage.ts`, `docs/item-coverage.md`)
- `buildCoverage(items, sets)`. Current numbers: 223 items (203 regular + 20 Mythic), 199 with at least one modelled effect. Max-quality tiers: **398 modelled clauses**, 17 not-production, 30 mechanic, 20 mythic-random, **0 unparsed**; 420 effects, 50 formula effects, 345 unverified (mostly the percent-as-multiplier convention). All tiers (916 blocks): 1270 modelled clauses, 67 not-production, 85 mechanic, 20 mythic-random, 0 unparsed; 1309 effects, 194 formula, 1136 unverified. Set tiers: 59 tiers, 57 modelled clauses, 2 mechanic (Regalia Of Shadow's Liquid Shadow/Shadow Clots). Enchants: 223, 193 modelled, 10 not-production (offline bonus), 20 mythic-random. The coverage test pins these counts and fails when `docs/item-coverage.md` is stale.
- **Unmodelled categories:** offline bonus (10 enchants + ~10 tier clauses), jar capacity, Trial of Innovation speed, gods' XP, ascension XP, attribute gain speed, idle activation time; level-requirement reductions (5 items + 2 perks); red/green catalysts; echo traps; Liquid Shadow/Shadow Clots (Umbramancer); weapon abilities listed above; Mythic memetics/gods/phylactery slot efficiency/breakthroughs/exhibits/source quantities/flat cast cap; Mythic random bonuses.

### Unverified assumptions introduced (each carries a note in the data)
1. Percentage item bonuses multiply ×(1+N%) (and percentage perks without "(additive)").
2. **"(base)" adds to the stat's base value.** Biggest risk: `Mysteries.Power` base is 0.03, so Circlet Of Deep Thoughts' "(base) +20%" adds 0.20 (≈ 7.7× Mysteries power alone). If "(base)" instead means a percentage of the base, these items are hugely overrated. Validate against the Temporalist guide's enchant/stat tables or presets (golden tests) before trusting Mysteries-power items. Same reading for "Void Mana profit (base) +N%" (adds to `Void.ProfitPerPoint`, like Insight's "(additive)" perks).
3. Set tiers cumulative.
4. Slot-/self-scoped bonus enchant levels are not capped at 5 (evidence: Raiments offers +8).
5. Phylacteries: "scales multiplicatively from Character level" = factor^level; "decreases X +N%" = (1 − N%)^level.
6. Formula values as fractions ×(1 + value) (Cage, Hunger, Murmuring, Accelerator, Black Vortex, Collar, Symbol); "X by (formula)" = ×formula (Miniaturized Accelerator, Enigmatic Parchment — note Miniaturized is < 1 for small shard counts); formulas with their own "+ 1" are the factor (Memento, Paukan, Habitstone).
7. Weapon abilities active during the burst (Thunderbird, Black Blade, Shard Of A Lost Dimension); Reality Prism charges at maximum `B^(2R)·10 + 1`; Head Of The All-Eater's "log10^2" = squared log and the "accrued" period is unclear.
8. Recaller Stone's "Autoclicks" = autoclicks this Exile; Arcane/Miniaturized Accelerator's catalyst shards are one input.
9. Conjured Razorspaulders "Pet ability power +100" (no %) added to the PAP base as written (maybe a wiki typo).
10. Spirit's Guidance Legendary's trailing "150%" applies to critical rating.
11. Mutated Mycelium Rare: factor 0.021 vs "(2.7% per Expedition Level)" in the text; the factor is used.
12. Item attribute bonuses count as points for per-point bonuses (thresholds: supported by the Temporalist guide); Int 150's "trained" points = assigned points.
13. Cost reductions add up (charging ones: Stance page says additive); crit chance items add percentage points; "Entities" (spawnrate/remain longer) = Void entities; flat pet XP and flat VM/entity combine in undocumented ways (own stats).
14. Units: `Pet.TimeCurrent` seconds; Void entity spawn rate and passive shard generation units unknown.

## 6. Engine APIs from earlier steps (unchanged unless noted)

### `src/engine/expr.ts`
Expr AST `num | ref | bin(+ - * / ^) | neg | fn`. `f(source, bindings)` parses infix: dotted identifiers are stat ids, single letters must be bound (`{ P: "Pet.AbilityPower" }` or to an Expr). `^` is right-associative and binds tighter than unary minus (`-2^2 = -4`; write `x ^ (-1)`). Functions: `log10 ln log(base,x) max min sqrt ge lt if(c,a,b) floor abs` (no equality: use `lt(x, 1.5)` etc.). Helpers: `num ref bin mul add pow call(fn, ...args)`, `refsOf`, `toInfix`, `toPostfix` (BiS-bot notation).

### `src/engine/stats.ts`: registry core
- Constructors: `inputStat(id, label, group, spec, extras)`, `multiplierStat` (base 1), `additiveStat` (base 0), `constantStat(…, value)`, `derivedStat(…, expr)`.
- `StatRegistry` (iterable): `add(...defs)` rejects duplicates, ids that don't look like `Namespace.Name` (dotted, e.g. `Elixir.EvocationIngredients` or `Building.6.Profit`) and defs with both `input` and `base`; `extend(...defs)` returns a copy (use it to add class/pet/spell stats); `withInputDefaults({id: value})` returns a copy with input defaults replaced (use it for class defaults: main building share = 1, guide attribute points via `AttrPoints.<A>`, realistic levels); `has/get/require/all`.
- `createGenericRegistry()` (src/data/stats.ts) now has all generic, attribute and item-facing stats.

### `src/engine/graph.ts`: stat graph and evaluators
- `compileGraph(spec: GraphSpec): StatGraph` (throws `GraphError { issues }`) and `tryCompileGraph(spec)`. `GraphSpec = { stats, effects?, score: Expr, items?: ItemEffectSpec }`. `ItemEffectSpec = { add?: statId[], mul?: statId[], dynamic?: DynamicEffect[] }`, `DynamicEffect = { stat, op, value: Expr, label? }`.
- Only stats reachable from the score are compiled, in topological order. Issues: `unknown-ref`, `unknown-target`, `cycle`, `missing-input`. `StatGraph`: `stats: CompiledStat[]`, `index`, `score`, `inputs` (required inputs), `dynamic` (same order as the spec; `target = -1` if unreachable), `inertItemStats` (declared item stats that can't reach the score: items touching only these can be filtered out). Helpers: `statIndex`, `exprItemDependent`, `exprInputs`.
- **Item modifiers** (`ItemModifiers = { add: Float64Array, logMul: Float64Array, dynamic: Uint8Array }`). `createModifiers(graph, { add?, mul?, dynamic? })` validates ops (silently ignores inert stats). A stat's value is `(base + Σadd effects + add[i] + Σ active dynamic adds) × Π mul effects × 10^logMul[i] × Π active dynamic muls`.
- **`FloatEvaluator(graph, inputs?)`**: signed log10 arithmetic, so magnitudes up to about 10^(1.8e308) stay on the float path; item-independent stats are cached until `setInputs`/`setInput`. `scoreLog10(mods?)` (hot path), `evaluate(mods?) → { log10, sign, fallback, decimal? }`, `statLog10(id)`/`statSign(id)`, `inputValues()`. `InputValues = Record<id, number | Decimal | boolean>`; missing inputs use their spec default.
- Decimal fallback (`evaluateDecimal`) only for doubly-exponential intermediates and domain errors; `resultToDecimal(r)`. Performance: about 1.1M float evaluations/s vs 78k/s Decimal on a 35-stat graph. break_eternity 2.1's `Decimal.sqrt` returns NaN below about 1e-15 (the Decimal evaluator uses `pow(x, 0.5)`).

### `src/engine/relevance.ts`: ranking-relevance filter
- `analyzeRelevance(graph, { inputs?, candidates?, epsilon? = 1e-9 }) → { inputs: InputRelevance[], terms }`. Structural pass (log-decomposition; inputs only in item-independent terms are hidden) plus numeric pass (ratio invariance across candidate modifier sets over sampled input values). `syntheticCandidates(graph)` probes each item stat alone and "everything on"; the optimizer should pass real candidates (top items per slot as modifier sets).
- Known limitations: a whole-score exponent input is shown although it can't change the order; synthetic candidates may miss combination-only interactions; the numeric check holds other inputs at current values, so placeholder defaults matter; inputs consumed by the modifier builder (`Items.LegionReward`, enchant levels) never appear in the graph — decide their visibility in the optimizer/UI step (relevant whenever an enchantable item affects the score).

### Tests (`npm test`: 86 passing in 10 files)
- `src/engine/{expr,graph,stats,relevance,decimal}.test.ts` (from earlier steps; `stats.test.ts` now uses `PRODUCTION_EFFECTS`).
- `src/data/itemText.test.ts` (15): normalization/splitting, multipliers vs points, "(base)"/"(multiplicative)", flat vs % routing, shared and carried values, divisors and cost reductions, All Attributes, phylactery level scaling, Expedition formulas and the mismatch flag, bonus enchant scopes, unmodelled reasons, overrides, enchant parsing.
- `src/data/items.test.ts` (10): 223 items with valid slots/qualities/tiers/requirements, sets linked both ways, all 12 guide presets resolve to full slot-valid loadouts, every effect targets/references registered stats and unverified ones carry notes, one graph compiles every item-affected stat with attribute effects and all dynamic effects on; worked examples (Enchanting Membrane 35%, Pitch-black Cage Analysis table, Commissar rounding, Scales of Appraisal, weapon tier R).
- `src/data/attributes.test.ts` (10): perk completeness, Int additive perks (35% at 250 with Circlet), Spellcraft/Dominance/Insight/Mastery/Empathy/Versatility values, Int 150 counts assigned points only, sources.
- `src/engine/loadout.test.ts` (10): Enchantments page table, Resonator + Membrane = 4.06%, bonus levels only on enchanted items and the cap of 5, Power Armor Finger +4 on top of the cap, Mythic self bonus, cumulative set tiers, validation, requirements (Legacy → Ebon Mantle), `ItemCatalog` static and dynamic modifiers.
- `src/data/coverage.test.ts` (3): no unparsed clauses, pinned counts, report file in sync.

## 7. How to encode things with this engine (for the next steps)

- **New stats**: `createGenericRegistry().extend(inputStat(…), derivedStat(…, f("…", bindings)), …)`. Every entity needs `source` with `verified` (+ `note` when false).
- **Non-item effects** (hero, pet, stance, spells): `Effect { stat, op, value: Expr, label, source }`, e.g. `{ stat: "Spell.EvocationEfficiency", op: "mul", value: f("(I + 1) * C^0.5 * L * G / 1e4 + 1", {…}) }`. Threshold-style effects use `if(ge(…), …, 1)`.
- **Items**: build `new ItemCatalog(ITEMS, SETS)` once, pass `catalog.spec` as `GraphSpec.items`, then per loadout `createModifiers(graph, catalog.modifierSpec(resolveLoadout(equipped, { legion, sets: SETS })))`. `graph.inertItemStats` tells which declared stats can't reach the score.
- **Scores**: an Expr over stats (e.g. `Spell.EvocationEfficiency * Prod.Total` for FS, spell mana formulas); compile with `compileGraph({ stats, effects: [...GENERIC_EFFECTS, ...classEffects], score, items: catalog.spec })`, then `analyzeRelevance(graph)` for the input form and `FloatEvaluator` for the search.
- Hooks already waiting for class/spell/pet encodings: `Spell.KelphiorsBlackBeamEfficiency` (Reality Prism; Temporalist KBB score), cast-count factors (Rubedo, Ritual Disk, Magnifier), duration divisors/durations, `Spell.AccumulatedStartingCasts`/`AccumulatedCastGain`, `Spell.ChargeSpeed`, `Spell.ChargingCostReduction`, `Click.ProductionShare`, `Click.HallowedProfit`, `Pet.Tier`, `Pet.ChargeSpeed`, `Time.MaxDistortion`, `Time.CompressedTimeGain`, `Char.ExperienceFromActions/FromSources` (Temporalist X = total char XP). Encode which of these the scored phase actually uses; otherwise they stay inert and those items drop out.

## 8. Next steps (plan order)

1. **encode-classes** (next): Oni, Shaman, Temporalist hero abilities, stances and all their spells (as `SpellBehaviour`s from `spells.json` math + class pages), the paired pets (Living Sin, Hungerer, Herald of Rot, Risen Giant, Mechanos Apexis, Greater Chimaera, Archivist, …; set `Pet.Tier`), and score definitions (Oni FS, Shaman autoclick burst — consider Branch of the Great Cycle's activation — Temporalist KBB via Mechanos Apexis). Set realistic input defaults from the guides with `withInputDefaults` (main building share = 1, guide `AttrPoints.<A>`, levels). Wire class-specific consumers of the hooks in section 7. Do not build the optimizer or UI in that step.
2. **encode-chronomancer:** follow the blind protocol in section 1.
3. **optimizer + worker**: filter items (not owned, unmet requirements via `unmetRequirements`, excluded slot, no effect on the score via `inertItemStats`/relevance, Mythics off by default), rank per slot (standalone best case with sets counted fully, then marginal against a greedy set; keep 2 for Finger/Trophy), test set subsets, DFS branch-and-bound with an optimistic per-stat bound, Resonator in/out branches, enchant sweep 0–55 with per-item overrides, per-item contribution = score with vs. without the item. Item quality defaults to max; owned defaults to all non-Mythic items. Pass real candidate sets into `analyzeRelevance`.
4. Then **ui**, **validate** (golden tests from the presets, scalings and the Temporalist enchant-priority table in section 4 — use them to test assumption 2 above), **chronomancer-blind-check**, and **deploy** (`.github/workflows/deploy.yml`).
