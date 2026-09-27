# Checkpoint 05: after `encode-chronomancer`, at the start of `optimizer`

Handoff for the next agent. Read this file first, then the plan (`.cursor/plans/idle_wizard_item_optimizer.plan.md`, which is authoritative). This file replaces checkpoint-04: everything still relevant from it is copied here, so you don't need to read the older checkpoints. The project is carried across several agents to limit context rot. When you finish a plan step, write `checkpoint-NN.md` next to this file in the same format, carrying forward everything still relevant.

## 1. The user's constraints (from the original task prompt, not all of it is in the plan)

- Work on branch `feat/item-optimizer`. Never merge into main, never open or edit PRs. Leave the branch for the user to review.
- **Commits and pushes:** the user has given standing permission for any agent to commit and push to this repo at its discretion. Commit in logical steps with brief one-line messages that say what was done (no rationale), and push `feat/item-optimizer`. Merging into main and opening or editing PRs are still NOT allowed. Never stage `.idea/` or other IDE config.
- Follow the plan's todo list in order. Scope for v1: Oni, Shaman and Temporalist (spells, stances, paired pets), the full item DB, plus Chronomancer for the blind check.
- Stack: Vite + React + TS, Vitest, `break_eternity.js`, client-side only, optimizer in a Web Worker, GitHub Pages via Actions with `base: "/idlewizard_item_calc/"`. The deploy workflow triggers on push to main. If Pages can't be enabled, say so in the final report.
- **Hard constraint 1:** every piece of information the calculation needs gets its own separate, labelled input, but ONLY if it can change which item set wins. Anything that scales all sets equally must not be asked for: use the structural log-factor check plus the numeric ratio-invariance check (implemented, see section 8). Hidden inputs go in a collapsed section with an explanation. Show scores as relative multipliers.
- **Hard constraint 2: blind Chronomancer check.** The guide is the Fandom page https://idle-wizard.fandom.com/wiki/Chronomancer_Guide_Updated (the Fandom class page https://idle-wizard.fandom.com/wiki/Chronomancer has no setup; its Guides section links this page as "Most up to date"). Its setup has been extracted item-free (section 7). **Its gear/items/enchants/BiS must still not be read** until `validation/chronomancer/tool-result.md` is written and committed (protocol in section 10).
  - Do not open the Fandom guide page directly, do not rerun or modify `scripts/validation/chronomancer-setup.mjs` in a way that prints unfiltered text, and do not web-search Chronomancer builds before the tool result is saved. `validation/chronomancer/guide-setup.md` and `setup-used.md` are safe to read.
  - **Do not open the wiki.gg pages** `Chronomancer Guide`, `Chronomancer Guide Updated` or `In Over Your Head Chronomancer Guide`. The scraper excludes them on purpose. `data-raw/wikigg/Chronomancer.wikitext` (class page) and `Skipped Time.wikitext` are gear-free and safe.
- Never answer from memory about game mechanics. Encode from the wiki source, keep a source URL and a `verified` flag on every encoded entity, and mark anything unverifiable as unverified (with a `note`; tests enforce this for stats, attribute effects, item effects, spell/pet/class effects and class defaults; source URLs must be wiki.gg or Fandom `/wiki/` pages).
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
14. `a69a17e` Add checkpoint 03 and update plan todo status
15. `91e3955` Add spell behavior to generated spell data
16. `9e7663c` Add class, pet and spell model types and inputs; encode Branch of the Great Cycle and Cataclysm abilities
17. `e1b7cb3` Encode Oni, Shaman and Temporalist spells, stances, hero abilities, pets and scores
18. `87794df` Add model builder with elasticity helper and class burst tests
19. `fe71d54` Add checkpoint 04 and update plan todo status
20. `ba7aa19` Add filtered Chronomancer guide setup extraction script and output
21. `47fa57b` Add Skipped Time page to the wiki snapshot
22. `0e9d320` Encode Chronomancer class, Wormhole, Time Helix, Zombie and burst score with tests
23. (this checkpoint and the plan status update, committed right after this file was written)

Every commit from 5 onwards typechecks and passes its tests on its own.

Tooling: `npm test` (Vitest, **116 tests in 12 files**, ~5 s), `npm run build` (`tsc -b` + vite), `npm run lint` (all three pass), `npm run scrape` (needs network; `npm run scrape -- --only "A,B"` fetches just those titles and merges them into `data-raw/manifest.json`), `npm run build-data` (Lua to JSON), `npm run chronomancer-setup` (section 7; needs network). `UPDATE_COVERAGE=1 npm test` rewrites `docs/item-coverage.md` (the coverage test fails if the file is stale). Versions: Node 22, Vite 8, Vitest 5, TypeScript 6, React 19, ESLint 10. `.gitignore` covers node_modules, dist, coverage, Playwright artifacts, .env, .idea, .vscode. To run a TS file directly with Node, use `node --experimental-transform-types` (strip-only mode rejects the parser's parameter properties); `src/data/items.ts` and `spells.ts` import JSON, which plain Node ESM would need an import attribute for, so prefer running things through Vitest.

TypeScript projects: `tsconfig.app.json` (src without `*.test.ts`, browser types, `resolveJsonModule`), `tsconfig.test.json` (extends app, adds Node types, includes tests; use it for anything needing `node:fs`), `tsconfig.node.json` (vite config). Root `tsconfig.json` references all three. ESLint lints `scripts/**/*.mjs` with Node globals (no control characters in regexes).

Pushing: `origin`'s push URL is SSH (`git@github.com:ramSilva/idlewizard_item_calc.git`), which authenticates as ramSilva, and `feat/item-optimizer` tracks `origin/feat/item-optimizer`. Plain `git push` works (the sandbox needs `full_network`). Do NOT push over HTTPS: the stored HTTPS credential belongs to the user's work account and returns 403. Do not inspect credential stores. The user wants this work done autonomously: agents may commit, push and spawn subagents without asking.

Git identity is set repo-locally (ramSilva, noreply email). `gh` CLI auth is broken: the active account is a different, invalid user. So `gh` can't be used to check or enable Pages. Report that rather than switching accounts.

Sandbox notes: `git worktree add` fails in the sandbox (can't write `.git/worktrees`), and `.cursor/` can't be created by shell commands in the sandbox (the file tools can edit files there). To check each commit separately: `git archive <sha> | tar -x --exclude='.cursor' -C .verify-<sha>`, symlink `node_modules`, run `npx tsc -b` and `npx vitest run --root .` there, then delete the folder. Vitest 5 swallows `console.log` from passing tests; to inspect data while exploring, write a throwaway test that writes a file (e.g. to `/tmp`, which the sandbox allows) and delete it afterwards.

## 3. Data acquisition (plan todo `scrape`: done)

- **The wiki.gg MediaWiki API works with plain `fetch`/curl** (`https://idlewizard.wiki.gg/api.php`). Cloudflare only blocks `/wiki/...` HTML pages. The sandbox needs `full_network` permission for these hosts.
- `scripts/scrape/wiki.mjs` and `scrape.mjs`: batched `prop=revisions` calls (50 titles each), handling redirects and normalization. The fallback chain is Playwright headless Chromium (`action=raw`, only used if `playwright` is installed; it is not, and this path is untested), then the Fandom API. `wiki.mjs` also exports `fetchSections`/`fetchSectionWikitext` (Fandom transcluded sections come back with a non-numeric index; `fetchSections` turns it into NaN).
- Snapshot: **285 pages, all from wiki.gg via the API** (this step added `Skipped Time`), nothing missing. Output is in `data-raw/wikigg/*.wikitext` (filenames replace `/:` with `__` and other odd characters with `_`). `data-raw/manifest.json` records title, resolved title, URL, revid, revision timestamp and method for each page.
- Covered: modules (`Module:Data/Items`, `Data/Spells`, `Data/Familiars` (familiars, not pets), `Data/Classes`, `Data/ManaSources`, `Module:Items`, `Module:Spells`, `Module:BiS`), mechanics pages (Items, Attributes, Enchantments, Stance, Elixir, Basic Mechanics, Paragon, Expeditions, Collectibles, Catalysts, Skipped Time, plus redirects Mysteries/Void Mana/Idle Mode → Basic Mechanics), class pages Oni, Shaman, Temporalist and Chronomancer, the guides (Oni Guide, Shaman Guide, Temporalist Guide (e300-e550), Temporalist Guide (e550+)), all of `Category:Pets` and all of `Category:Items`. There are no individual spell pages; spell data comes from `Module:Data/Spells`.
- `scripts/data/lua-table.mjs` is a small Lua data parser; `scripts/data/build-data.mjs` writes `src/data/generated/items.json` (223 items including 20 Mythic, and 12 sets) and `spells.json` (226 spells, with `behavior`: Instant/Buff/Periodic/Augment). Each raw item carries `id, name, slot, set, startQuality, requirements, tiers[{quality, desc}], enchant, acquisition, details, source`. Set tiers carry `pieces` (tier i applies from i+2 pieces, per `Module:Items` SetInfo).
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
- Requirements: the Attributes page says item attribute bonuses count toward other items' requirements (Legacy's Insight helps Ebon Mantle), but "Fill" ignores them. Implemented as `unmetRequirements`.
- Expedition level is a single wizard-wide level, max 100 (Expeditions page).
- Time Distortion has a maximum of 10x, raised up to 30x by items and an upgrade (Temporalist/Chronomancer class pages). It doesn't affect spell durations, Mechanos Apexis's activation or weapon charging. It degenerates by 0.1x per real second and Stabilize The Flow consumes all of it.
- Basic Mechanics: Liquid Shadow is an Umbramancer resource; XP pools are Mana, Mana Sources (passive) and Click, Clickables, Spells (active); "Increased XP from Mana Sources similarly multiplies the XP from mana sources". Basic Mechanics: "the profit of autoclicks provided by summon spells scales 1:1 with summoning efficiency"; no base click value formula is given.
- Guide item presets like `#7#BURST@104;113;1;29;...` are 20 item IDs from the `IDs` table in `Module:Data/Items` (`-1` = empty). Ordering doesn't matter. They assume Legendary, or Unique for Quality 6. Tab labels like "Living Sin 17+5" mean enchant 17 plus 5 bonus levels (Resonator 4 + Legion 1). All 12 presets below resolve to full, slot-valid loadouts (tested in `src/data/items.test.ts`). Guide spell lists like `60,2;6,2;…` are spell ids with an autocast mode after the comma (not used).

**Skipped Time** (https://idlewizard.wiki.gg/wiki/Skipped_Time, new in this step): only Time Warps (Market) and Wormhole/Refined Wormhole skip time; uncapped since v1.31. Time Warps and Wormhole stop all active spells ("increasing casts as if completed normally"); Refined Wormhole, or Wormhole with Temporal Stabilizer, don't. Void Mana is set to 0. Grants mana I × O × M × T (idle bonus + 1, offline bonus + 1, mana/s, seconds skipped) and spell shards S × T (up to 1 day). Skipped time adds to Skipped and Played Game Time (Exile, Realm, Total) and to Character and Pet Game Time. Counts for on-tick effects (Synthetic Entity, Nightfall, Quasi-incantation, Refined Wormhole charging; Ironsoul/Oni Meditation charging) and as offline time for pets (Zombie, Pixie, Ent, Risen Giant, Herald of Rot autoclick; Mechanos Apexis casts KBB; Simulacrum/Greater Chimaera grant sources).

**Attributes** (https://idlewizard.wiki.gg/wiki/Attributes): each point is multiplicative, (1 + B)^X. Per-point: Int 2.5% Mysteries power (Multiplier), Ins 2.5% VM per Entity, SC 3.00% Evo, Wis 2.5% passive shards, Dom 3.0% autoclick profit, Pat 2.5% idle bonus, Mas 2.5% CAP (unlocks Paragon 5), Emp 2.5% PAP (Paragon 8), Vers 1.8% profits (Paragon 38, no perks). Perks every 25 points are all encoded; Int perks are explicitly additive to the 3% base ("total of 35%" at 225, matching Basic Mechanics); Insight states "(additive)"/"(multiplier)"; Basic Mechanics says crit rating adds to base crit profit "before multiplication by spells or Dominance", so Dominance crit-profit perks multiply. The Temporalist e550+ guide plans "INT … until you get 230 (+20 from Circlet Of Deep Thoughts)" for the 250 perk, so perk thresholds count item attribute bonuses.

**Mysteries** (Basic Mechanics): Mysteries = sqrt(mana / 5e11). Each mystery adds 3% production (base); Int perks raise that to 35%; Int points multiply it; Hungerer multiplies Mysteries power. Encoded as `Mysteries.Factor = 1 + Count × Power` (additive reading flagged unverified).

**Void mana:** production × (1 + VM × per-point). Base per-point value not found; input `Void.ProfitPerPoint` with placeholder default 1. During burst VM is already collected, so VM-per-entity items don't matter there; VM-profit items do.

**Crit** (Basic Mechanics): expected click value = (1 − c) + c × CritProfit. Crit Rating R adds log10(R)% to chance and R% to base crit profit. Encoded as `Click.CritChanceTotal` and `Click.CritFactor`; the reading of crit profit % and the 100% cap are unverified.

**Idle mode:** always burst in idle mode (Basic Mechanics). Boolean input `Idle.Active` (the model builder sets it from the selection's `idle` toggle).

**Sources (buildings)** (Basic Mechanics): 1 Mana Gems, 2 Grimoires, 3 Spell Fountains, 4 Enchanted Trees, 5 Alchemy Desks, 6 Circles Of Power, 7 Dimensional Rifts, 8 Nexi. Class renames: Oni: Hellholes = 6, Monuments = 3, Grim Trophy = 4 (Oni page). Shaman: Forbidden Tomes = 2, Trees of Life = 4, Witching Cauldron = 5 (Shaman page). Temporalist: Ley Temporal Singleton replaces The Nexus (8) and is both Prodigy's Ley Apex and Chronomancer's Temporal Anchor (Temporalist page). **Chronomancer: Temporal Anchor replaces The Nexus (8)** (Chronomancer page). Item text "Nexi/Nexus/The Nexus profit" → 8, "Circle Of Power" → 6 (Anointed Ashes, Oni burst), "Grimoire"/"Enchanted Tree" → 2/4 (Warbanner Fragment, Shaman burst).

**BiS bot algorithm** (https://idle-wizard.fandom.com/wiki/BiS_Guide, "How it Works" / "Formula Generation"):
- Builds a postfix formula by substituting effects, multiplicative before additive, and drops items that don't affect it.
- Per enchant level, scores each item "best case", treating every set effect as belonging to that item alone, and keeps items per slot until the first non-set item (2 for rings).
- Tests every subset of each set against the non-set alternatives, then every remaining combination.
- Runs at least 40 levels and stops after 15 unchanged levels once the second-best set grows more slowly than the best. Resonator is handled as a separate branch.
- Defaults: attributes 175, max paragon (all slots). Pro=SubParagonN excludes slots: 12 Shoulder/Waist, 18 Neck/Rings, 24 Back/Wrist, 28 Weapon.
- Weapons are flagged as unreliable because their effects are self-scaling.

**Oni** (Oni.wikitext; guide `Oni Guide.wikitext`, https://idlewizard.wiki.gg/wiki/Oni_Guide):
- Hero ability: PAP × [(PetT·G/3600+1)^0.5 · PetL^0.8 · C^0.5 · L/4e9 + 1] and Inc × [((I+1)·L·G^0.5/100)^0.65 / 250000 + 1]. I = Incantation spells cast this Exile **+ 1** (so the formulas use casts + 2).
- Stances: Meditation (charging only), Defense (FS instant, divides incantation duration by log10(1 + (I+1)·G·C·L²) + 1), Berserk (Evo × [(I+1)·C^0.5·L·G/1e4 + 1]). G = CAP growth rate, C = CAP, L = char level. Meditation is the default when none is selected (Stance page).
- Burst setup: pet Living Sin (fallback Hungerer; Pit Lord explicitly not used), stance Berserk. Spells 60 Ritual Of Power, 6 Goblet Of Fire, 88 Iron Blood, 89 Enhanced Strength, 107 Possessed Blade, 86 Furious Strike (score). FS charges cap at 1e9. Other phases: summon scry (Archivist/Ley Keeper, Defense), Berzerker buildup (Pixie/Ent, Defense), box levelling (Interrogator, Berserk), FS stacking (Ent), Cataclysm charging (Defense; Ley Keeper or Geode), Void Mana (Voidterror, Meditation), Greater Chimaera/Simulacrum for sources.
- Burst presets:
  - Hungerer 10+5: `104;113;1;29;11;32;48;68;54;83;76;1002;211;301;411;417;91;2007;3005;509`
  - Hungerer 18+5: `104;113;1;29;18;32;48;68;54;84;72;1002;211;301;411;417;91;2007;3005;509`
  - LS 13+5: `104;113;6;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509`
  - LS 17+5: `104;113;1;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509`
  - LS 39+5: `104;113;1;29;18;31;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509`
  - (LS 17+5 items: Chronoboost Ring, Resonator Ring, Circlet Of Deep Thoughts, Seclusion Shell, Empowering Handguards, Boots Of Eastern Blessings, Tranquil Spaulders, Sash of Luxury, Lucky Amulet, The Amplifier, Bite Sleeves, **Cataclysm**, Commissar's Torn Sleeve, Incantations Restructuring, Anima Core, Anointed Ashes, Spellweaving Kilt, Ritual Disk, Smooth Amber Phylactery, Spell Vault.)
- Guide stat scalings (Source Memetics table): Inc 7.1438, CAP 1.5517, Evo 1.0421, PAP 2.0614, Char XP 0.3923, Autoclick 0, Summon 0.
- Attributes (Minimum): Int 200, Ins 60, SC 125, Pat 50, Mas 200, Emp 125 (200 with Bite Sleeves; Living Sin needs 200 Empathy to select).
- Commissar's Torn Sleeve perks in burst: 0 perks (0–25 AP), 1 (25–49), 2 (50–74) → pet levels up to ~925; Living Sin unlocks at highest pet level 1000 this Exile.

**Shaman** (Shaman.wikitext; `Shaman Guide.wikitext`, https://idlewizard.wiki.gg/wiki/Shaman_Guide):
- Hero ability: Idle × [((T_G+1)^2/1000)·C^0.30·L^1.6 + L + 1] with T_G = T·G if 1 + T·G < 720, else 719 + (T·G − 719)^0.9 (T = hours as Shaman this Exile); Summon × [(1 + A·G^0.25/10000)^0.85 · C^0.155 · L^0.31/400 + 1], A = autoclicks this Exile softcapped above 7e7 as (A − 7e7)^0.75 + 7e7. Idle bar: Idle × (10·A_cur^0.5 + 1), A_cur = autoclicks currently performed.
- Burst: pet Herald of Rot (alt Risen Giant). Spells 18 Summon Evergrowing Forest, 92 Summon Centipede Swarm, 105 Summon Spider Swarm, 16 Summon Deepwood Stalker, 23 Summon Unholy Avatar, 7 Dreaded Script Of Harvest. "Swap to your sets and use branch active ability" (Branch of the Great Cycle). Other phases: Pet XP (Ley Keeper/HoR), spell stacking (Ley Keeper), pet time stacking (HoR/RG), autoclick stacking (Ley Keeper), Branch charging (HoR/Ley Keeper), Void Mana (HoR with Void Radiance, or Voidterror).
- Summon table: base clicks Conjure Primal Elemental 15, SEF ~80 (= Trees of Life × 0.004), Deepwood 0.5, Spider 6, Centipede ~76 (= log10(Summon)·2.5 + 1), Unholy Avatar 16.
- Softcaps: class ability at 7e7 autoclicks and 30 days of class time; Herald of Rot at 14 days pet real time and 200 days pet game time (reached after ~80 h of pet time stacking at ~60 Plague Zombie casts/s).
- Presets:
  - Burst: `108;113;4;20;12;33;47;65;59;87;76;1001;206;306;418;406;94;2005;3004;507`
  - 20+5: `108;113;4;20;12;33;47;61;59;87;73;1001;206;306;418;406;94;2005;3004;507`
  - 28+5: `108;113;4;20;12;33;47;61;59;88;73;1001;206;306;418;406;94;2005;3004;507`
- Run scalings (burst): Evo 0, Inc 0.92, Summon 7.76, CAP 1.997, PAP 1.676, Idle 2.62, Void/Autoclick/Click/Crit profit 1, Char XP 0.88. Source-meme table: Inc 2.1895, CAP 1.9978, Autoclick 1, Evo 0, Summon 7.8433, PAP 1.6843, Char XP 1. Item priority: Idle > Summon = CAP > PAP > Click/Autoclick profit > Profit.
- Attributes (e550 variant): Int 150, Ins 90, SC 175, Wis 0, Dom 75, Pat 200, Mas 100, Emp 175.

**Temporalist** (Temporalist.wikitext; `Temporalist Guide (e550_).wikitext`, https://idlewizard.wiki.gg/wiki/Temporalist_Guide_(e550%2B)):
- Hero ability: profits × [(T^2.15·(S·G/16000)^1.78 + 1)·(X/1e7 + 1)·C^0.5·L/1e10 + 1] and Evo × [(T^0.5/40·(S·G/16000)^1.15 + 1)·C^0.5·L/5e6 + 1]. S = skipped years, X = total char XP, T = character time in hours, T = 720 + (hours − 719)^0.9 after 30 days.
- Burst: pet Mechanos Apexis, which casts KBB on its own (so six incantations fit on the bar): Mana = (CharLvl + 2.5) × Evo × Mana/s × 8. Spells 73 Converge Timelines, 57 Ley Overdrive, 61 True Sorcery, 17 Superposition, 69 Stabilize The Flow, 4 Gem Resonance. **StF and GR are snapped** in the Snap phase (cast with the incantation set, StF with 30x Time Distortion) before swapping to burst gear. Quasi-incantation (93, an Augment) "increases Incantation Efficiency until Exile" and is stacked all buildup. Other phases: Greater Chimaera/Pixie startup with Refined Wormhole, buildup with MA, Pet XP, Void Mana (Void Radiance with MA).
- Presets:
  - 11+5: `104;113;6;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`
  - 15+5: `104;113;1;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`
  - 22+5: `104;113;1;29;14;36;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`
  - 34+5: `104;113;1;29;14;36;48;67;59;84;76;1005;207;300;411;408;92;2003;3005;508`
  - (15+5 includes Collar Of Obedience, Reality Prism, Murmuring Spellbook, The Rubedo Engine, Gemshoes and Necrotic Powerstone (both Mana Gems profit), Miniaturized Accelerator.)
- Burst scalings: Evo 1, Inc 4, CAP 1, PAP 1, Idle/Void profit 1, Char XP 1.34. (Source-meme table: Inc 7.390, CAP 1.008, Evo 1.016, PAP 1.016, Char XP 1.60, extra Nexus source scaling 2.14.) Pre-e550 guide (Risen Giant): burst Evo/CAP/VProfit/Profit 1, Idle 2.01, Inc 4, PAP 0.6.
- The "Enchant Priority" section lists each item's exact profit gain per enchant level (e.g. Reality Prism 42.92%, Clockcarers 30%, Chronoboost 30%, Rubedo 12.5%, Circlet 25%, Collar 20%, Nethershackles 15%, Ritual Disk 4.29%). Good golden test.
- Lucky Amulet vs Miniaturized Accelerator: 1.4e8·(1.25/1.2)^(Ench·10/3) catalysts needed for Miniaturized to win (1.6e8 at enchant 1 to 3.2e10 at enchant 40).
- Temporalist guides say Timeshroud/Stabilizing Pauldrons matter via max Time Distortion (skipped time, Stabilize The Flow) and The Magnifier doubles TS active casts (used in the offline buildup set only).
- Attributes: Int 155, Ins 140, SC 250, Wis 200, Dom 0, Pat 150, Mas 250, Emp 175.

**Chronomancer** (Chronomancer.wikitext, https://idlewizard.wiki.gg/wiki/Chronomancer; Fandom class page has the same hero formula):
- Hero ability: Sources profit × [L² × C × ((T + S) × G)^0.64 × 0.25 + 1], L = hero level, C = CAP, G = CAP growth, T = character play time, S = skipped time (units not given anywhere).
- Compressed Time max L × 5 (Singularity Beam grants it). Time Distortion as above. Unlock: 1 day played, 1500 The Nexus, 325 upgrades.
- Spells (from `spells.json`): 4, 17, 26, 29, 30, 33, 34, 60, 65, 66, 67, 68, 69, 71, 73, 101, 104. Wormhole (66) skips (log10(Evo)×0.75+1)×Charlvl×0.5+10; Time Helix (101, Augment) resets char XP/mana/VM/exile stats and multiplies profits by CastsThisExile × (log10(Inc)×0.95+1)×0.9 + 1 until Exile.
- Guide setup (Fandom, item-free extract): see section 7.

**Pets** (from `data-raw/wikigg/<Pet>.wikitext`, all encoded): tiers from the category tags — T3 Living Sin, Greater Chimaera, Mechanos Apexis, Herald of Rot; T2 Hungerer, Pit Lord, Simulacrum, Archivist, Ley Keeper, Risen Giant, Ent, Voidterror, Arcanaworg; T1 Interrogator, Pixie, Geode, **Zombie** (new). `Module:Data/Familiars` is a separate familiar system, not pets. Zombie: autoclicks 1/s at half hero click profit, 20% crit for 900%; profits × [L/5 × (1 + 30^(0.6875·log10 I) × T × (P^0.6 + 1)) + 1], T = pet hours, softcapped after 14 days as 336 + (h − 336)^0.5.

**Spell math** is in `spells.json` (`math`, LaTeX); every Oni/Shaman/Temporalist/Chronomancer spell is now encoded.

## 5. Item model and data (from `encode-data`; unchanged)

### Stats (`src/data/stats.ts`, `src/data/attributes.ts`)
- Attributes: inputs `AttrPoints.<A>`; derived `Attr.<A>` (items add to it) feed per-point bonuses and perks; constants `AttrBonus.<A>`. `attributePoints(a)` / `attributeStat(a)`.
- `GENERIC_EFFECTS` = `PRODUCTION_EFFECTS` (Mysteries/Void/Idle factors on `Prod.Global`) + `ATTRIBUTE_EFFECTS` (9 per-point multipliers + 72 perks). `UNMODELLED_PERKS` (8).
- Input labels say "without item and attribute bonuses" for CAP, CAP growth, PAP, Void profit per point, idle bonus, autoclicks/s, crit chance and rating, passive shard generation.
- Item-facing stats: `Spell.{Evocation,Incantation}Duration`, `Spell.{Evocation,Incantation,Summoning}DurationDivisor`, `Spell.CostReduction`, `Spell.ChargingCostReduction`, `Spell.ChargeSpeed`, `Spell.AccumulatedStartingCasts`, `Spell.AccumulatedCastGain`, `Spell.MaxCastRate`, `Spell.AutoclicksFromSpells`, `Spell.AccumulatedCastCountFactor` (Rubedo ×2), `Spell.AugmentCastCountFactor` (Ritual Disk ×2), `Spell.PersistentActiveAccumulationFactor` (Magnifier ×2), `Spell.KelphiorsBlackBeamEfficiency` (Reality Prism); `Pet.ExperienceFlat`, `Pet.ChargeSpeed`, `Pet.Tier`; `Void.ManaPerEntityFlat`, `Void.EntityLifetime`, `Void.EntitySpawnRate`; `Click.HallowedProfit`, `Click.ProductionShare`; `Shards.*`; `Time.MaxDistortion` (constant 10, items add), `Time.CompressedTimeGain`; `Items.*`.
- Formula/perk inputs (default 0 unless a class default sets them): `Spell.CastsThisExile`, `Spell.AccumulatedCastsThisExile`, `Spell.EvocationCastsThisExile`, `Misc.AchievementsUnlocked`, `Misc.AchievementPoints`, `Misc.UpgradesBought`, `Pet.TimeCurrent` (seconds), `Misc.SourcesOwned`, `Void.EntitiesThisExile`, `Idle.TimeThisExile`, `Click.AutoclicksThisExile`, `Shards.CollectedThisExile`, `Items.EnchantingDustThisExile`, `Items.ExperimentsThisRealm`, `Expeditions.Level`, `Misc.BatsThisExile`, `Misc.CatalystShards`, weapon inputs `Weapon.ThunderbirdCharges`, `Misc.Arcanasprings`, `Misc.LeyApexes`, `Misc.Laboratories`, `Elixir.*Ingredients`, `Misc.LiquidShadow`, `Misc.ShadowCoals`, `Misc.Voidgates`, and Head Of The All-Eater's accrued totals.
- `Spell.{Evocation,Incantation,Summoning}Efficiency` are **inputs** ("from sources the tool doesn't model", default 1, logScale; class defaults give realistic magnitudes); `Click.ProductionShare` is an input (default 1 = 100%, placeholder; items add their "N% of your Mana per second"); derived `Click.ManaPerClick = Click.Profit × Prod.Total × Click.ProductionShare` (flat click mana isn't modelled); inputs `Spell.IncantationCastsThisExile`, `Char.ExperienceTotal`, `Char.ClassTimeHours` (h), `Time.SkippedYears`, `Pet.RealTime` (s), `Pet.ExperienceTotal`, `Pet.MaxLevelThisExile`, `Building.<b>.Count` (all 8), `Misc.LeastSourceCount`, `Misc.TemporalAnchors`, `Void.ManaThisExile`, `Void.ActiveTraps`, `Weapon.BranchCharges` (max 2e6), `Weapon.CataclysmCharges`; additive `Weapon.BranchClickMultiplier` (0 unless Branch is equipped). Helper `buildingCount(b)` next to `buildingProfit`/`buildingShare`.

### Item model, parser, overrides, database, loadouts, coverage
- `src/engine/model.ts`: `ItemEffect`, `UnmodelledClause` (`not-production | mechanic | mythic-random | unparsed`), `BonusEnchant`, `EffectBlock`, `ItemTier`, `SetTier`, `EnchantDef`, `ItemDef`, `SetDef`.
- `src/data/itemText.ts`: `normalizeText`, `splitClauses`, `parseEffectText(desc, { url, quality, overrides })`, `parseEnchant`, `overrideEffect(ctx, stat, op, value, note?, verified?)`. Phrase table `PHRASES`, `UNMODELLED_RULES`, phylactery level scaling, Expedition formulas, bonus-enchant patterns, carried values.
- `src/data/itemOverrides.ts` (`ITEM_OVERRIDES` by item name): formula items (Pitch-black Cage, Ceaseless Hunger, Murmuring Spellbook, Arcane Accelerator, Black Vortex, Commissar's Torn Sleeve, Miniaturized Accelerator, Enigmatic Parchment, Collar Of Obedience, Symbol Of Authority, Simple Memento, Paukan, Recaller Stone, Habitstone, Scales of Appraisal, The Bond, Rubedo, Ritual Disk, Magnifier) and weapons (Chiropteric Rod, Head Of The All-Eater, Thunderbird, Reality Prism, Philosopher's Stone, Black Blade, Shard Of A Lost Dimension, Enchanting Membrane, Branch of the Great Cycle → `Weapon.BranchClickMultiplier` = `C·R·S^(1+0.5R)·100 + 1` (verified), Cataclysm → Hellholes profit `1 + Weapon.CataclysmCharges / max(Building.6.Count, 1)` (unverified)). Still `mechanic`: Heart of the Grave, Redeemer, Temporal Stabilizer, Berzerker, Spellstealer, The Accumulator, Shadow-Scryer's Crystal Ball, Broomstaff Of Klevdariah.
- `src/data/items.ts`: `ITEMS` (223), `SETS` (12), `itemByKey/itemByName/itemById`, `tierOf`, `qualitiesOf`, `qualityRank`, `setByNameOf`, `presetItems(code)`, `ITEM_DATA_URL`.
- `src/engine/loadout.ts`: `resolveLoadout(equipped, { legion, sets })`, `validateLoadout`, `ItemCatalog(items, sets)` (`spec`, `modifierSpec(resolved)`), `unmetRequirements`. Effective enchant level = 0 if no real level, else real + min(5, Legion + Σ "all") + slot bonuses + self bonuses.
- `src/data/coverage.ts`, `docs/item-coverage.md`: max-quality tiers **400 modelled clauses**, 17 not-production, 30 mechanic, 20 mythic-random, 0 unparsed. Pinned in `coverage.test.ts`.

### Unverified item assumptions (each carries a note in the data)
1. Percentage item bonuses multiply ×(1+N%) (and percentage perks without "(additive)").
2. **"(base)" adds to the stat's base value.** Biggest risk: `Mysteries.Power` base is 0.03, so Circlet Of Deep Thoughts' "(base) +20%" adds 0.20 (≈ 7.7× Mysteries power alone). Validate against the Temporalist guide's enchant/stat tables or presets (golden tests) before trusting Mysteries-power items. Same reading for "Void Mana profit (base) +N%".
3. Set tiers cumulative.
4. Slot-/self-scoped bonus enchant levels are not capped at 5 (evidence: Raiments offers +8).
5. Phylacteries: "scales multiplicatively from Character level" = factor^level; "decreases X +N%" = (1 − N%)^level.
6. Formula values as fractions ×(1 + value) (Cage, Hunger, Murmuring, Accelerator, Black Vortex, Collar, Symbol); "X by (formula)" = ×formula (Miniaturized Accelerator, Enigmatic Parchment — Miniaturized is < 1 for small shard counts); formulas with their own "+ 1" are the factor (Memento, Paukan, Habitstone).
7. Weapon abilities active during the burst (Thunderbird, Black Blade, Shard Of A Lost Dimension, Cataclysm); Reality Prism charges at maximum `B^(2R)·10 + 1`; Head Of The All-Eater's "log10^2" = squared log and the "accrued" period is unclear.
8. Recaller Stone's "Autoclicks" = autoclicks this Exile; Arcane/Miniaturized Accelerator's catalyst shards are one input.
9. Conjured Razorspaulders "Pet ability power +100" (no %) added to the PAP base as written.
10. Spirit's Guidance Legendary's trailing "150%" applies to critical rating.
11. Mutated Mycelium Rare: factor 0.021 vs "(2.7% per Expedition Level)"; the factor is used.
12. Item attribute bonuses count as points for per-point bonuses (thresholds: supported by the Temporalist guide); Int 150's "trained" points = assigned points.
13. Cost reductions add up; crit chance items add percentage points; "Entities" = Void entities; flat pet XP and flat VM/entity combine in undocumented ways (own stats).
14. Units: `Pet.TimeCurrent` seconds (game time incl. skipped); Void entity spawn rate and passive shard generation units unknown.

## 6. Classes, pets, spells, scores and the model builder (from `encode-classes`, extended in this step)

### Types (`src/engine/model.ts`)
- `SpellDef` has `key` (identifier-safe name, e.g. `KelphiorsBlackBeam`), `behavior` (`Instant|Buff|Periodic|Augment`), `duration`.
- `AutoclickSource { label, perSecond, manaPerClick }`, `UnmodelledPart { text, note }`.
- `SpellBehaviour { spellId, effects, mana?: { perCast?, perSecond? }, autoclicks?, voidManaPerSecond?, stats, snap?: Record<statId, snappedInputId>, unmodelled, source }`. Persistent passives are ordinary effects labelled "(passive)".
- `StanceDef { id, name, effects, unmodelled, source }`, `DefaultValue { value, source }`.
- `ClassDef { id, name, effects, stances, stats (replace same-id stats), augments, pairedPets, defaultSpells, defaultPet, defaultStance?, defaultSnapped, defaultScore, defaults: Record<statId, DefaultValue>, mainBuilding, buildingNames, unmodelled, source }`.
- `PetDef { id, name, tier, effects, stats, autoclicks?, casts?: PetCast[] ({ spellId, perSecond }), voidManaPerSecond?, defaults?, unmodelled, source }`.

### Spells (`src/data/spells.ts`, `src/data/spellBehaviours.ts`)
- `SPELLS`, `spellById`, `classSpells(className)`, `spellKey(name)`, `spellStat(spell, name)` → `Spell.<Key>.<Name>`, `SPELL_SOURCE` (Module:Data/Spells).
- `SPELL_BEHAVIOURS` (Map id → behaviour, **55 spells**: every Oni, Shaman, Temporalist and Chronomancer spell, tested) and `behaviourOf(id)`. Built with a small `SpellBuilder` DSL: `casts()` creates input `Spell.<Key>.CastsThisExile` ("casts performed") and derived `Spell.<Key>.CountedCasts` = casts × `Spell.AccumulatedCastCountFactor` (accumulated/persistent; Rubedo) × `Spell.AugmentCastCountFactor` (Augment; Ritual Disk), bound to `C`; `realmCasts()` (`CastsThisRealm` ×Rubedo, bound to `R`); `charges(max)` (`Q`); `snapped(stat, label)` creates `Spell.<Key>.Snapped<StatName>` and a snap mapping; `effect(stat, op, formula, part?, note?)`; `manaPerCast/manaPerSecond`; `clicks(perSecond, crit, perClick = "CP * S * AP")` (× `Spell.AutoclicksFromSpells`; crit = character `Click.CritFactor`, a fixed chance/profit, or none); `voidMana`; `skip(text, note)` for parts that touch no modelled stat; `note(text)` marks the mana/autoclick reading unverified. Bindings: E/I/S efficiencies, M = `Prod.Total`, L = `Char.Level`, A = `Click.AutoclicksThisExile`, K = autoclick amount, AP, CP = `Click.ManaPerClick`, CRIT.
- Encoded readings worth knowing: instant evocations (Magic Missile, KBB ×`Spell.KelphiorsBlackBeamEfficiency`, Singularity Beam `(L+10)·E·M·20`, Furious Strike `(⌊0.1(Q−1)⌋+1)·E·M·100`, Plague Zombie with M added) → mana per cast; Hellstorm → mana per second; Fire Ball both; profit incantations → `Prod.Global`; Goblet → Hellholes (6), Force Of Nature → Trees of Life (4), Dreaded Script → Forbidden Tomes (2) with I = `Idle.Factor`; Gem Resonance → Mana Gems profit × (1 + temporary gems / gems owned) (unverified); Iron Blood/Converge Timelines/TTS passive → CAP; Possessed Blade uses `Pet.MaxLevelThisExile`; Meditative Fury → PAP with Hellholes count; Stabilize The Flow uses `Time.MaxDistortion` (snapped: consumed TD input); Superposition converts years with 365-day years; summons autoclick per their Math (Generate Paradox uses the Math's 5/s); Centipede Swarm multiplies `Click.ManaPerClick` by (1 + A·S^0.9·1e-4); Spider Swarm adds crit rating and ×S^0.7·1.5 profits; Unholy Avatar ×S^0.8·1.5 idle; Horned Incinerator and Infernal Thrasher bonuses wrapped in `max(…, 1)`; summons whose crit isn't stated have none. **New:** Wormhole (66) skip-only (skipped time is an input; stops spells); Time Helix (101) casts() + `Prod.Global × (C·(log10(I)·0.95+1)·0.9 + 1)` with current Inc (unverified), resets unmodelled. Unmodelled (with notes): pet XP, shards, Compressed Time, TD gain, Revert, Synthetic Entity, Refined Wormhole, Void Automaton, FS charging from TTS, PZ charge gain.

### Pets (`src/data/pets.ts`)
- `PETS` (**17**) and `petById(id)` (ids are kebab-case names, e.g. `living-sin`): Living Sin, Hungerer, Pit Lord, Greater Chimaera (profits + all-attributes bonus with the >150 softcap), Simulacrum, Mechanos Apexis (Evo with the 3-day formula switch, Inc ×(L·0.25+1), casts KBB at `Pet.ChargeSpeed / max(⌊max(1−T,0)^3·64⌋+1, 1)` per second, T = real days — unverified), Archivist, Interrogator, Ley Keeper (profits from `Misc.LeastSourceCount`), Geode (all unmodelled), Herald of Rot, Risen Giant (1 autoclick/s at 30%/1200%, profits `L·10·30^(0.6875·log10 I)·(P^0.6+1)·h² + 1` with game-hour softcap), **Zombie** (new, section 4; pet time read as game time, unverified), Ent, Pixie, Voidterror, Arcanaworg. Pet bindings: P = PAP, L = pet level, X = `Pet.ExperienceTotal`, N = `Spell.ActiveSummons`.

### Classes (`src/data/classes.ts`)
- `ONI`, `SHAMAN`, `TEMPORALIST`, **`CHRONOMANCER`**, `CLASSES` (in that order), `classById`. Hero abilities and stances as in section 4. Shaman's idle bar uses `Click.SpellAutoclicksPerSecond` (unverified reading). Temporalist's `stats` replace `Misc.LeyApexes` and `Misc.TemporalAnchors` with `Building.8.Count`; `augments: [93]`; `defaultSnapped: [69, 4]`. Chronomancer: section 7.
- Defaults (`defaults`, each with a source; `fromGuide` verified, `inferred` unverified with reasoning, `placeholder` unverified "Placeholder magnitude, not stated by a guide"):
  - Guide-stated: attribute points (section 4), main building share = 1 (Oni 6, Shaman 2 and Temporalist 8 are **unverified choices**), Legion on ("+5" tabs; not for Chronomancer), FS charges 1e9, Branch charges 2e6, HoR 200 game days / 14 real days, StF consumed TD 30 (Temporalist).
  - Inferred: Oni pet level 600 (Commissar perks), max pet level this Exile 1000 (Living Sin unlock), Shaman class time 86 h, Trees of Life 20000 (80 SEF clicks), Temporalist 72 h class time and 3 days MA real time, catalyst shards 2e9 (Lucky vs Miniaturized threshold), **Shaman Summon base 3e19 calibrated so the burst preset gives ~76 Centipede clicks/s** (tested).
  - Placeholders: character level (1000; Temporalist 2000), CAP base 1e6, CAP growth 10, efficiency bases 1e3, cast counts (1e4–1e8), pet XP 1e20, skipped years 1e6 (Temporalist), total char XP 1e12, Hellholes 1e4, Cataclysm charges 1e5, Ley Temporal Singletons 5000, Void mana 1e10, idle base 100, expedition level 50, snapped Inc 1e30 (Temporalist), crit chance 10% / crit profit 200%, **Mysteries.Count 1e300** (Oni/Shaman/Temporalist; e550+ doesn't fit a number default), PAP base left at the generic 1.

### Scores (`src/data/scores.ts`)
- `ScoreDef { id, label, description, build(ctx) → Expr | null }`, `SCORES`, `spellScores(ctx)`. Ids: `oni-burst` (Furious Strike mana per cast), `temporalist-burst` (`Pet.CastManaPerSecond`: KBB cast by Mechanos Apexis), `shaman-burst` (10 × (`Click.AutoclickManaPerSecond` + `Weapon.BranchClickMultiplier` × click mana × autoclick profit × (1 + c·CritProfit))), **`chronomancer-burst`** (Singularity Beam mana per cast; null without spell 65), `production` (`Prod.Total`), `autoclick-mana`, `void-mana`, `stat:<id>` for Evo/Inc/Summon/CAP/PAP/Autoclick profit/Idle bonus/VM per Entity, and `spell:<Key>` / `spell:<Key>:per-second` for each selected mana spell.

### Model builder (`src/data/buildModel.ts`)
- `buildModel(selection, { relevance? = true }) → BuiltModel`; `ModelSelection { classId, petId, spells (≤ 6, must be class spells), stance?, idle? (default true), snapped? (default class's, only applies to selected spells), scoreId? (default class's) }`; `defaultSelection(classId)`; `MAX_SPELLS`; `itemCatalog()` (cached `ItemCatalog(ITEMS, SETS)`).
- Assembly: generic stats + active spells' stats (selected ∪ class augments; snapped spells get their refs substituted) + pet stats + `Pet.Tier` constant + builder-derived stats (`Spell.ActiveSummons`, `Click.SpellAutoclicksPerSecond`, `Click.AutoclickManaPerSecond`, `Spell.<Key>.ManaPerCast/ManaPerSecond`, `Pet.CastManaPerSecond`, `Void.ManaPerSecond`) + class stats (replace). Effects: `GENERIC_EFFECTS` + class + stance + pet + active spells. Defaults: class + pet defaults (only for inputs present) + `Idle.Active`, baked in with `withInputDefaults`. Compiles with `catalog.spec` (throws `GraphError` on missing inputs/unknown refs), then `analyzeRelevance(graph)` at those defaults (≈1–1.5 s per class model). `BuiltModel { selection, cls, pet, stance, spells, stats (StatRegistry), effects, score {def, expr}, scores (available), catalog, graph, relevance, unmodelled[{from, text, note}] }`.
- Helpers: `loadoutModifiers(model, equipped, legion)` (`[]` = no items); `elasticity(model, statId, baseMods, inputs?, step = 0.01)` = d ln(score)/d ln(stat) by central difference on the stat's item log-multiplier (throws for stats without item multipliers, e.g. `Hero.AbilityPowerGrowth`, `Char.Level`).

### How to add things
- **Spell:** add an entry to `DEFINITIONS` in `spellBehaviours.ts` keyed by spell id; add any new generic input to `stats.ts` with a source. The "encodes every spell of every encoded class" test covers `CLASSES`.
- **Pet:** add `pet(name, tier, b => …)` to `PETS`; pet-specific inputs via `.stat(inputStat(...))`; autoclicks via `.clicks(perSecond, manaPerClick)`; pet-cast spells via `b.casts.push({ spellId, perSecond })`.
- **Class:** a `ClassDef` in `classes.ts` added to `CLASSES` (update the class-list assertion in `classData.test.ts`).
- **Score:** add a `ScoreDef` to `SCORES` returning null when the selection can't produce it.

### Elasticity results at the guide burst presets (d ln score / d ln stat; tests in `src/data/buildModel.test.ts`)

| Class (preset) | Stat | Ours | Guide | Note |
|---|---|---|---|---|
| Oni (LS 17+5) | Evo | 1.000 | 1.0421 | |
| | Inc | 6.075 | 7.1438 | exponent sum RoP 1 + Goblet 1.6 + ES 1 + PB 1.3 + Iron Blood via CAP ≈ 1.2 |
| | CAP | 1.175 | 1.5517 | Berserk C^0.5 + hero PAP C^0.5 into Living Sin P^1.35 |
| | PAP | 1.350 | 2.0614 | Living Sin P^1 + P^0.35; guide may reflect Hungerer/other phases |
| Shaman (20+5) | Evo | 0.000 | 0 | |
| | Inc | 0.920 | 0.92 | |
| | Summon | 7.726 | 7.76 | |
| | CAP | 1.992 | 1.997 | |
| | PAP | 1.260 | 1.676 | HoR's (P^x + 1) terms not saturated at placeholder PAP base 1 |
| | Idle | 2.649 | 2.62 | |
| | Autoclick / Void profit | 1.000 / 1.000 | 1 | |
| Temporalist (15+5) | Evo | 1.000 | 1 | |
| | Inc | 4.013 | 4 | only because StF and GR are snapped (5 unsnapped, tested) |
| | CAP | 1.013 | 1 | |
| | PAP | 1.000 | 1 | |
| | Idle / Void profit | 1.000 / 1.000 | 1 | |
| Chronomancer (no items; no guide table) | Evo / Inc / CAP / PAP / Idle | 1.000 / 3.107 / 1.000 / 0.300 / 2.016 | — | Inc 4.107 with StF unsnapped |

Default tolerance max(0.15, 10%); the four documented discrepancies have wider tolerances with notes. No constants were tuned to match (the only calibration is Shaman's Summon base, to a guide-stated click count).

### Relevance at the defaults (tested)
- Oni: hidden `Spell.FuriousStrike.Charges` (structural), `Pet.ExperienceTotal`, `Mysteries.Count`, `Spell.EvocationEfficiency`; shown `Pet.Level`, `Hero.AbilityPower`, `Weapon.CataclysmCharges`, `Spell.IronBlood.CastsThisExile` (Rubedo). 67 inputs, 48 shown.
- Temporalist: hidden snapped inputs, `Char.ExperienceTotal`, `Mysteries.Count`; shown `Spell.QuasiIncantation.CastsThisExile` (Ritual Disk), CAP, PAP.
- Shaman: shown `Weapon.BranchCharges`; hidden `Mysteries.Count`.
- Chronomancer (69 inputs): hidden snapped StF inputs, `Spell.EvocationEfficiency`, `Hero.AbilityPower`, `Hero.AbilityPowerGrowth`, `Char.ClassTimeHours`, `Mysteries.Count`; shown `Building.8.Count` (Converge Timelines), `Spell.TimeHelix.CastsThisExile`, attribute points. `Time.SkippedYears`, `Pet.TimeCurrent` and `Void.Mana` are shown with a max deviation of ~×1.00–1.007 (numeric-check noise; consider a deviation threshold in the UI/optimizer step).
- Many shown inputs are item-formula inputs (bats, laboratories, accrued totals, edust…) that matter only if the user owns those items; the optimizer/UI step should pass real candidate sets (owned items) to `analyzeRelevance` so these drop out.

### Tests
- `src/data/classData.test.ts` (10): spell keys and behaviour field; every class spell (all four classes) has a behaviour; every behaviour is modelled or explains why not; sources/notes on all behaviours, pet/class/stance effects and defaults (wiki.gg or Fandom URLs); Rubedo/Ritual Disk counted casts; pet tiers; defaults target existing stats; every class spell compiles (in groups of 6); each class compiles with each paired pet; invalid selections are rejected.
- `src/data/buildModel.test.ts` (20): per class (Oni/Shaman/Temporalist) the guide setup compiles with every input labelled/defaulted and a finite preset score; elasticity table; relevance sanity; Centipede ~76 clicks; QI applied off-bar; snapping changes Inc scaling; idle toggle; Oni stance; score lists. **Chronomancer block (5):** setup compiles with no items (selection, Time Helix applied), implied scalings, StF snapping adds exactly 1 to Inc, relevance hidden/shown lists, burst score needs Singularity Beam.

### Known gaps / open assumptions
1. Magnitudes are mostly placeholders; the golden/validate step should revisit them, especially PAP base, CAP base/growth and levels.
2. Clicks are worth `Click.Profit × Prod.Total × Click.ProductionShare` (base share 1 is a placeholder; flat click mana not modelled). Centipede's click profit is read as multiplying that value.
3. Main producing building per class (Oni 6, Shaman 2, Temporalist 8, Chronomancer 8) is assumed. Temporalist and Chronomancer bursts cast Gem Resonance (Mana Gems), which adds nothing while Mana Gems' share is 0.
4. Gem Resonance and Cataclysm: temporary sources assumed to scale that building's production in proportion to the amount owned.
5. Mechanos Apexis KBB rate = pet charging speed / period. Reality Prism's KBB efficiency multiplies KBB mana.
6. `I` in Herald of Rot/Risen Giant/Zombie/Dreaded Script = `Idle.Factor` (1 outside Idle mode). Risen Giant and Zombie use pet game time; HoR summon term uses game days, profit term real hours.
7. Snapping replaces the snapped spell's Incantation (and StF's consumed TD) with inputs; the other burst-set items don't reach those spells.
8. The Magnifier, `Spell.AccumulatedStartingCasts` and `Spell.AccumulatedCastGain` act at cast time over the run, so they aren't wired into burst scores (inert there). The Rubedo and Ritual Disk factors are applied at burst time.
9. Oni's Defense stance divisor and Archivist/Interrogator incantation duration are encoded but no score uses durations (every selected spell is assumed active).
10. `Pet.RealTime` shows in Temporalist's relevance although MA's Evo is ≫1 at the defaults (numeric-check extremes); not investigated.
11. Chronomancer hero ability units for T and S (both taken in hours; only rescales every set while the term is ≫ 1); Time Helix reads current Inc.

## 7. What was built in this step (plan todo `encode-chronomancer`: done, blind)

### Guide extraction (`scripts/validation/chronomancer-setup.mjs`, `npm run chronomancer-setup`)
- Fandom only, via the API: `action=parse&prop=sections` for headings, then `prop=wikitext&section=N` per selected section, each cut at its first subheading. Default page `Chronomancer Guide Updated` (`--page` overrides). Headings mentioning gear/items/BiS/equip/enchant/sets/weapon/loadout/slot/mythic/quality/rings/amulet/trophy/phylactery (and everything under them) are excluded; item-named headings too.
- Filter, all before printing/saving: HTML comments; `[[File:]]`/`[[Image:]]`; links to item pages; templates whose name matches item/bis/gear/equip/enchant/set/preset/loadout (except `Spell*` templates, e.g. `SpellSet`, which render only `spell_N_name/autocast`); template params matching item/gear/bis/enchant/set/preset/equip/loadout and preset-like id lists; tables containing item references or gear words; list lines with item references (except attribute lines); sentences with gear/enchant/slot words (attribute lines keep only "Attribute: value"); then every item and set name from `items.json` (full names, names without "The", distinctive non-dictionary name words, acronyms; spell/pet/class names protected) → `[item]`. Aborts without writing if any full item name survives. Sections with > 50% of prose removed keep only setup boxes (GuideBox pet/spells/stance, SpellSet spells).
- Debug modes that never print values: `--list` (redacted headings + selection), `--inventory` (template names, param keys, table sizes). `--file <wikitext> --out <md>` dry-runs on a local guide (verified on the Oni and Temporalist guides: burst spell sets recovered, no item names).
- Output `validation/chronomancer/guide-setup.md` (committed); `validation/chronomancer/setup-used.md` records what was used and assumed.

### Guide sections (headings only)
Used: (introduction), Attributes, Phase 1: Build up Levels, Phase 2: Build up Superposition and Ritual of Power, Phase 3: PreBurst, Phase 4: Bursting. Prose dropped, spell set kept: High Level Snapshot Optimization (73% item discussion). No gear headings exist on the page. The Fandom class page (Description, Unlocking, Guides, Hero Ability, Spells, Upgrades) was also read through the filter; it has no setup.

### Guide-stated setup (Fandom, "Updated for v1.35.0", e90–e220+ Mysteries, run 10 min – 10 h)
- Burst (Phase 4): Singularity Beam, Superposition, Converge Timelines, Ritual Of Power, Gem Resonance, Stabilize the Flow (all Reckless).
- Pre-burst (Phase 3): Void Radiance for VM (no Voidterror swap because Risen Giant stacked with Wormhole skipped time is too good); stop Temporal Distortion, cast Stabilize The Flow, swap to the burst set. Set: Singularity Beam, Temporal Distortion, Void Lure, Void Radiance, Spell Focus, Stabilize the Flow (None). High Level Snapshot set: same with Gem Resonance instead of Spell Focus.
- Phase 1 (levels): Pixie autoclicks during Wormhole (don't upgrade her), then Archivist for Void entities. Set: Singularity Beam, Wormhole, Ritual Of Power, Synthetic Entity, Temporal Distortion (Careful), Spell Focus.
- Phase 2 (stacking): Archivist (raises skipped time and Synthetic Entity entities); first set Singularity Beam, Wormhole, Ritual Of Power, Superposition, Synthetic Entity, Spell Focus; at higher Mysteries a second set with Time Helix instead of Synthetic Entity (Geode helps with level requirements). Risen Giant scales with pet time gained from Wormhole.
- Pets listed: Archivist, Geode, Simulacrum, Zombie, Risen Giant. Attributes: Int 25, Ins 25, Wis 25, Pat 40, Mas 25 (Patience "benefits this build the most" via Risen Giant's idle scaling; Spellcraft next once Patience is maxed; Wisdom for cast rate at low Mysteries).

### Encoding (`CHRONOMANCER` in `classes.ts`)
- Hero ability on `Prod.Global`: `L^2·C·((Char.ClassTimeHours + SkippedYears·8760)·G)^0.64·0.25 + 1` (unverified units note). `stats`: `Misc.TemporalAnchors` = `Building.8.Count`. `augments: [101]` (Time Helix). `pairedPets`: risen-giant, archivist, pixie, geode, simulacrum, zombie. `defaultSpells [65, 17, 73, 60, 4, 69]`, `defaultPet risen-giant`, `defaultSnapped [69]`, `defaultScore chronomancer-burst`, no stances, main building 8 ("Temporal Anchors").
- Defaults: guide attributes (fromGuide, Fandom `#Attributes`); SC/Dom/Emp 0 (inferred, not listed); snapped StF TD 10 (inferred: base max) and Inc 1e3 (placeholder); class time 10 h and Mysteries 1e150 (inferred from the intro); skipped time 1 year (placeholder) and pet game time 1 year (inferred to match); Superposition/RoP casts 1e5, Time Helix 100, spells cast 1e7, char level 1000, pet level 300, CAP 1e6, growth 10, Evo/Inc bases 1e3, Temporal Anchors 3000, Void mana 1e10, idle base 100, expeditions 50 (placeholders). Legion left off (not stated).
- Open choices worth revisiting in the blind check (listed, don't tune to match): Gem Resonance unsnapped by default (the high-level variant snaps it too: `snapped: [69, 4]`); Mana Gems share 0; the burst bar's Reckless Stabilize The Flow recasts are ignored.

## 8. Engine APIs from earlier steps (unchanged)

### `src/engine/expr.ts`
Expr AST `num | ref | bin(+ - * / ^) | neg | fn`. `f(source, bindings)` parses infix: dotted identifiers are stat ids, single letters (or any undotted name) must be bound (`{ P: "Pet.AbilityPower" }` or to an Expr). `^` is right-associative and binds tighter than unary minus (`-2^2 = -4`; write `x ^ (-1)`). Functions: `log10 ln log(base,x) max min sqrt ge lt if(c,a,b) floor abs` (no equality; round = `floor(x + 0.5)`). Helpers: `num ref bin mul add pow call(fn, ...args)`, `refsOf`, `toInfix`, `toPostfix`. Avoid negative bases with `^` (use `max(…, 0)`).

### `src/engine/stats.ts`
`inputStat(id, label, group, spec, extras)`, `multiplierStat`, `additiveStat`, `constantStat`, `derivedStat`. `StatRegistry`: `add` (rejects duplicates, bad ids, input+base), `extend`, `withInputDefaults({id: value})`, `has/get/require/all`. `createGenericRegistry()` in `src/data/stats.ts`.

### `src/engine/graph.ts`
- `compileGraph(spec)` (throws `GraphError { issues }`), `tryCompileGraph`. `GraphSpec = { stats, effects?, score, items?: ItemEffectSpec }`. Only stats reachable from the score are compiled. Issues: `unknown-ref`, `unknown-target`, `cycle`, `missing-input`. `StatGraph`: `stats`, `index`, `score`, `inputs`, `dynamic`, `inertItemStats`. Helpers `statIndex`, `exprItemDependent`, `exprInputs`.
- `ItemModifiers = { add, logMul, dynamic }`; `createModifiers(graph, { add?, mul?, dynamic? })`. A stat's value is `(base + Σadd effects + add[i] + Σ active dynamic adds) × Π mul effects × 10^logMul[i] × Π active dynamic muls`.
- `FloatEvaluator(graph, inputs?)` (signed log10 arithmetic; item-independent stats cached): `scoreLog10(mods?)`, `evaluate(mods?)`, `statLog10(id)`/`statSign(id)` (values of the last evaluation), `setInputs`/`setInput`, `inputValues()`. `InputValues = Record<id, number | Decimal | boolean>`. Decimal fallback `evaluateDecimal`, `resultToDecimal`. ~1.1M float evaluations/s on a 35-stat graph; class models have ~100–115 compiled stats.

### `src/engine/relevance.ts`
`analyzeRelevance(graph, { inputs?, candidates?, epsilon? })` → `{ inputs: InputRelevance[] (id, label, group, shown, method, reason, maxDeviation?), terms }`. Structural log-decomposition plus numeric ratio invariance over sampled input values (`sampleValues`). `syntheticCandidates(graph)` probes each item stat alone and "everything on". Limitations: a whole-score exponent input is shown although it can't change the order; synthetic candidates may miss combination-only interactions; the numeric check holds other inputs at current values; inputs consumed by the modifier builder (`Items.LegionReward`, enchant levels) never appear in the graph; tiny deviations (×1.00x) count as shown.

## 9. Tests (`npm test`: 116 passing in 12 files)
- Engine: `expr`, `graph`, `stats`, `relevance`, `decimal`, `loadout` tests.
- Data: `itemText` (15), `items` (10), `attributes` (10), `coverage` (3), `classData` (10), `buildModel` (20).

## 10. Next steps

### Remaining plan order
1. **optimizer + worker** (next): filter items (not owned, unmet requirements via `unmetRequirements`, excluded slot, no effect on the score via `graph.inertItemStats`/relevance, Mythics off by default), rank per slot (standalone best case with sets counted fully, then marginal against a greedy set; keep 2 for Finger/Trophy), test set subsets, DFS branch-and-bound with an optimistic per-stat bound, Resonator in/out branches, enchant sweep 0–55 with per-item overrides, per-item contribution = score with vs. without the item. Item quality defaults to max; owned defaults to all non-Mythic items. Pass real candidate sets into `analyzeRelevance`. Use `buildModel` for the graph and `itemCatalog()` for modifiers; build `ItemModifiers` arrays directly for speed. Put it in `src/engine/optimizer.ts` with a Web Worker wrapper; keep Chronomancer's gear out of any test fixture.
2. Then **ui**, **validate** (golden tests from the presets, the scaling tables above and the Temporalist enchant-priority table — use them to test item assumption 2 and the placeholder magnitudes), **chronomancer-blind-check**, and **deploy** (`.github/workflows/deploy.yml`).

### Remaining blind protocol for `chronomancer-blind-check` (do this exactly)
1. Still before reading any gear: run the optimizer on `defaultSelection("chronomancer")` (and, as documented variants, `snapped: [69, 4]` and Legion on/off) and write `validation/chronomancer/tool-result.md`: best set at a few enchant levels (e.g. 0, 5, 10, 20, 40), each item's contribution (score with vs. without), the inputs used (copy from `setup-used.md` plus any the optimizer adds) and the relevance summary. Consider restricting "owned" to items obtainable in the guide's era (e90–e220+ Mysteries, v1.35.0) if `items.json` acquisition data states Mysteries unlocks; record the rule used. Commit and push it.
2. Only then read the guide's gear: fetch `Chronomancer Guide Updated` from the Fandom API (the phase sections' GuideBox/spell-set neighbours, `items*` params / item templates, and the High Level Snapshot Optimization prose that was dropped). Resolve any item preset codes with `presetItems` (Fandom-era IDs may differ; check names).
3. Write `validation/chronomancer/comparison.md` slot by slot; classify each difference as likely tool bug/missing data (fix it, never just to force a match), different assumption/outdated guide (list it; the guide is v1.35.0 and predates many items), or unclear (say what would settle it). Report the match rate, fixes and open differences.
