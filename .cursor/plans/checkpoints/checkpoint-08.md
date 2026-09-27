# Checkpoint 08: after `validate`, at the start of `chronomancer-blind-check`

Handoff for the next agent. Read this file first, then the plan (`.cursor/plans/idle_wizard_item_optimizer.plan.md`, which is authoritative). This file replaces checkpoint-07: everything still relevant from it is copied here, so you don't need to read the older checkpoints. The project is carried across several agents to limit context rot. When you finish a plan step, write `checkpoint-NN.md` next to this file in the same format, carrying forward everything still relevant.

## 1. The user's constraints (from the original task prompt, not all of it is in the plan)

- Work on branch `feat/item-optimizer`. Never merge into main, never open or edit PRs. Leave the branch for the user to review.
- **Commits and pushes:** the user has given standing permission for any agent to commit and push to this repo at its discretion. Commit in logical steps with brief one-line messages that say what was done (no rationale), and push `feat/item-optimizer`. Merging into main and opening or editing PRs are still NOT allowed. Never stage `.idea/` or other IDE config.
- Follow the plan's todo list in order. Scope for v1: Oni, Shaman and Temporalist (spells, stances, paired pets), the full item DB, plus Chronomancer for the blind check.
- Stack: Vite + React + TS, Vitest, `break_eternity.js`, client-side only, optimizer in a Web Worker, GitHub Pages via Actions with `base: "/idlewizard_item_calc/"`. The deploy workflow triggers on push to main. If Pages can't be enabled, say so in the final report.
- **Hard constraint 1:** every piece of information the calculation needs gets its own separate, labelled input, but ONLY if it can change which item set wins. Anything that scales all sets equally must not be asked for: use the structural log-factor check plus the numeric ratio-invariance check (implemented; the optimizer runs it against real candidate sets, section 9; the UI uses it, section 10). Hidden inputs go in a collapsed section with an explanation. Show scores as relative multipliers.
- **Hard constraint 2: blind Chronomancer check.** The guide is the Fandom page https://idle-wizard.fandom.com/wiki/Chronomancer_Guide_Updated (the Fandom class page https://idle-wizard.fandom.com/wiki/Chronomancer has no setup; its Guides section links this page as "Most up to date"). Its setup has been extracted item-free (section 7). **Its gear/items/enchants/BiS must still not be read** until `validation/chronomancer/tool-result.md` is written and committed (protocol in section 12).
  - Do not open the Fandom guide page directly, do not rerun or modify `scripts/validation/chronomancer-setup.mjs` in a way that prints unfiltered text, and do not web-search Chronomancer builds before the tool result is saved. `validation/chronomancer/guide-setup.md` and `setup-used.md` are safe to read.
  - **Do not open the wiki.gg pages** `Chronomancer Guide`, `Chronomancer Guide Updated` or `In Over Your Head Chronomancer Guide`. The scraper excludes them on purpose. `data-raw/wikigg/Chronomancer.wikitext` (class page) and `Skipped Time.wikitext` are gear-free and safe.
  - **The optimizer has still not been run on the Chronomancer setup** (the `validate` step only ran Oni, Shaman and Temporalist through the optimizer; Chronomancer's no-item elasticity unit tests in `buildModel.test.ts` still run, as before). The first optimizer run belongs to the blind-check step. The UI auto-runs the optimizer for whatever class is selected, so don't select Chronomancer in the UI or in UI tests before that step. Nothing was tuned on Chronomancer; the generic model fixes of `validate` (section 13) apply to it, and its character level default changed from 1000 to 200 for the same generic reason as Oni/Shaman (recorded in `setup-used.md`).
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
23. `11e28f8` Add checkpoint 05 and update plan todo status
24. `74120f6` Add active-coordinate and incremental evaluation, catalog dynamic index lookup and relevance reference/threshold options
25. `79e89cc` Add item optimizer with per-slot pruning, set subset test, branch-and-bound, enchant sweep and preset comparison
26. `adb421e` Add optimizer Web Worker with typed message protocol, progress and cancellation
27. `b794db1` Add optimizer CLI and benchmark doc
28. `d509a17` Include each slot's best alternative in the optimizer's relevance candidates
29. `56eb2ee` Add checkpoint 06 and update plan todo status
30. `b956111` Add UI state model, compact URL encoding, input parsing and relevance field helpers
31. `26ae914` Build React UI with setup, inputs, items and results panels, worker runs, persistence and smoke tests
32. `5d65ccb` Add checkpoint 07 and update plan todo status
33. `b699eb3` Add Experience, Phylactery and Category:Phylactery to the wiki snapshot
34. `6cbc0e5` Count formula attribute bonuses toward item requirements
35. `56d870d` Fix item readings (Razorspaulders PAP, phylactery level reduction, attribute cap, cast-time Rubedo and Ritual Disk) and revise class default magnitudes
36. `ca9e001` Add golden tests, diagnostics script and golden report
37. (this checkpoint, the plan status update and the `setup-used.md` note, committed right after this file was written)

Every commit from 5 onwards typechecks and passes its tests on its own (34 and 35 checked with the archive method below).

Tooling: `npm test` (Vitest, **215 tests in 18 files**, ~9 s), `npm run build` (`tsc -b` + vite), `npm run lint` (all three pass), `npm run ui-smoke` (section 10; needs a prior `npm run build` and Chrome; passed after `validate`), `npm run dev`, `npm run preview` (serves `dist/` at `http://localhost:4173/idlewizard_item_calc/`), `npm run scrape` (needs network; `npm run scrape -- --only "A,B"` fetches just those titles and merges them into `data-raw/manifest.json`), `npm run build-data` (Lua to JSON), `npm run chronomancer-setup` (section 7; needs network), `npm run optimize -- --class <id> …` (section 9), **`node scripts/validation/golden-diagnose.mjs [--variant id] [--brief] [--input Id=value]`** (section 13). `UPDATE_COVERAGE=1 npm test` rewrites `docs/item-coverage.md` (the coverage test fails if the file is stale). `OPTIMIZER_BENCH=1 npx vitest run src/data/optimize.test.ts` runs the full benchmark and rewrites `docs/optimizer-benchmark.md` (not rerun after `validate`; the numbers there predate the new defaults). Versions: Node 22, Vite 8, Vitest 5, TypeScript 6, React 19, ESLint 10 (with `eslint-plugin-react-hooks` 7), jsdom 30, @testing-library/react 16, playwright-core 1.63 (no bundled browser). `.gitignore` covers node_modules, dist, coverage, Playwright artifacts, .env, .idea, .vscode. There is no Prettier in the repo.

Running TS from Node: `src/data/items.ts` and `spells.ts` import JSON without an import attribute, so plain Node (even `--experimental-transform-types`) can't load them. Scripts load TS through Vite's module runner: `runnerImport(path, { root, configFile: false })` from `vite` (see `scripts/run-optimizer.mjs`). **Import one entry module** (`src/data/scriptEntry.ts` re-exports what scripts need, now including `elasticity`, `loadoutModifiers`, `formatMultiplier`, `itemByName`, `presetItems` and the golden helpers): separate `runnerImport` calls get separate module instances, and the item catalog keys formula effects by object identity, so mixing instances throws "formula effect … isn't in the item catalog".

TypeScript projects: `tsconfig.app.json` (src without `*.test.ts`/`*.test.tsx`, browser + WebWorker libs, `resolveJsonModule`), `tsconfig.test.json` (extends app, adds Node types, includes tests; use it for anything needing `node:fs`), `tsconfig.node.json` (vite config). Root `tsconfig.json` references all three. Vitest includes `src/**/*.test.{ts,tsx}` (the golden tests are `src/golden/golden.test.ts`); the default environment is node, component tests opt into jsdom with a `// @vitest-environment jsdom` first line. ESLint lints `scripts/**/*.mjs` with Node globals (no control characters in regexes; browser-side code in Playwright calls must be a string, e.g. `page.waitForFunction('…')`). `vite.config.ts` sets `build.chunkSizeWarningLimit: 1000` because the page and the worker each bundle the whole item/spell DB (~697 kB and ~465 kB minified).

Pushing: `origin`'s push URL is SSH (`git@github.com:ramSilva/idlewizard_item_calc.git`), which authenticates as ramSilva, and `feat/item-optimizer` tracks `origin/feat/item-optimizer`. Plain `git push` works (the sandbox needs `full_network`). Do NOT push over HTTPS: the stored HTTPS credential belongs to the user's work account and returns 403. Do not inspect credential stores. The user wants this work done autonomously: agents may commit, push and spawn subagents without asking.

Git identity is set repo-locally (ramSilva, noreply email). `gh` CLI auth is broken: the active account is a different, invalid user. So `gh` can't be used to check or enable Pages. Report that rather than switching accounts.

Sandbox notes: `git worktree add` fails in the sandbox (can't write `.git/worktrees`), and `.cursor/` can't be created by shell commands in the sandbox (the file tools can edit files there). To check each commit separately: `git archive <sha> | tar -x --exclude='.cursor' -C .verify-<sha>`, symlink `node_modules`, run `npx tsc -b` and `npx vitest run --root .` there, then delete the folder. Vitest 5 swallows `console.log` from passing tests; to inspect data while exploring, use the CLI / `golden-diagnose.mjs`, or a throwaway test that writes a file (e.g. to `/tmp`) and delete it afterwards. zsh doesn't word-split unquoted `$var` (write arguments out; `npm run optimize -- … $v` with a multi-word `$v` fails). Long-running shell commands that exceed the tool timeout keep running in the background; kill them (needs `all` permissions) before starting another heavy run. Background servers started with `&` inside a sandboxed command die with it; start `vite preview` as its own background shell (with `all` permissions) or let `npm run ui-smoke` start it programmatically. Headless Chrome needs `all` permissions. Running scripts from outside the workspace (e.g. `/tmp`) is blocked by auto-review; keep helper scripts inside the repo. The wiki.gg and Fandom APIs need `full_network`.

## 3. Data acquisition (plan todo `scrape`: done)

- **The wiki.gg MediaWiki API works with plain `fetch`/curl** (`https://idlewizard.wiki.gg/api.php`). Cloudflare only blocks `/wiki/...` HTML pages. The sandbox needs `full_network` permission for these hosts. `list=search` works for finding pages (used in `validate` to find phylactery wording across guides).
- `scripts/scrape/wiki.mjs` and `scrape.mjs`: batched `prop=revisions` calls (50 titles each), handling redirects and normalization. The fallback chain is Playwright headless Chromium (`action=raw`, only used if `playwright` is installed; it is not (only `playwright-core` is, for the UI smoke test), and this path is untested), then the Fandom API. `wiki.mjs` also exports `fetchSections`/`fetchSectionWikitext` (Fandom transcluded sections come back with a non-numeric index; `fetchSections` turns it into NaN).
- Snapshot: **286 pages, all from wiki.gg via the API**, nothing missing. Output is in `data-raw/wikigg/*.wikitext` (filenames replace `/:` with `__` and other odd characters with `_`). `data-raw/manifest.json` records title, resolved title, URL, revid, revision timestamp and method for each page. `validate` added `Category:Phylactery` (no text) and manifest entries for `Experience` (→ Basic Mechanics, refreshed) and `Phylactery` (→ Items).
- Covered: modules (`Module:Data/Items`, `Data/Spells`, `Data/Familiars` (familiars, not pets), `Data/Classes`, `Data/ManaSources`, `Module:Items`, `Module:Spells`, `Module:BiS`), mechanics pages (Items, Attributes, Enchantments, Stance, Elixir, Basic Mechanics, Paragon, Expeditions, Collectibles, Catalysts, Skipped Time, plus redirects Mysteries/Void Mana/Idle Mode/Experience → Basic Mechanics, Phylactery → Items), class pages Oni, Shaman, Temporalist and Chronomancer, the guides (Oni Guide, Shaman Guide, Temporalist Guide (e300-e550), Temporalist Guide (e550+)), all of `Category:Pets` and all of `Category:Items`. There are no individual spell pages; spell data comes from `Module:Data/Spells`.
- `scripts/data/lua-table.mjs` is a small Lua data parser; `scripts/data/build-data.mjs` writes `src/data/generated/items.json` (223 items including 20 Mythic, and 12 sets) and `spells.json` (226 spells, with `behavior`: Instant/Buff/Periodic/Augment). Each raw item carries `id, name, slot, set, startQuality, requirements, tiers[{quality, desc}], enchant, acquisition, details, source`. Set tiers carry `pieces` (tier i applies from i+2 pieces, per `Module:Items` SetInfo).
- Fandom API (`https://idle-wizard.fandom.com/api.php`) also works. The BiS Guide was read from Fandom for the algorithm design and is **not** in `data-raw`. Fandom's `Module:Data/Items` (revision 2024-03-02) has older, more verbose item wording ("Increases X by N% (additive)"); `validate` read it through the API to cross-check wording (not saved).

## 4. Game mechanics found so far (all from wiki source; cite these URLs when encoding)

**Items** (`Module:Data/Items`; https://idlewizard.wiki.gg/wiki/Items, https://idlewizard.wiki.gg/wiki/Enchantments):
- 18 slot types; Finger and Trophy hold 2 each, so 20 slots are equipped. Qualities Common..Legendary, plus Unique (fixed max) and Mythic. `Tiers[i]` corresponds to quality `startQuality + i`. Non-Mythic per slot: 10 each, except Finger 16, Offhand 12, Trophy 20, Weapon 17, Phylactery 8. 110 items have attribute requirements; 193 have an enchant.
- Enchanting only on Legendary/Unique, max level 55, cost 100 × 1.5^level. **Levels stack multiplicatively: (1 + x)^level** — the item's "Enchant" text is x ("Evocation efficiency +20%" → 1.2^level; the Enchantments page table is reproduced in tests; the Temporalist enchant-priority golden check confirms it, section 13). 30 items have a negative per-level enchant (Darklight/Shadow items, Holidays, Fossil Seeds, Black Blade, most Mythics); the optimizer handles either sign.
- Bonus enchant levels: the Items page says bonus levels give "a number of free levels (up to 5) to all Enchantments on all items equipped" and only apply to items with ≥ 1 enchant level. The Legion's reward gives +1 (boolean input `Items.LegionReward`), Resonator Ring +1/+2/+3/+4 by quality (Uncommon..Legendary) — the only "all"-scope bonus item. The Enchantments page says "Resonator Ring 4.06% if Enchanting Membrane is equipped and enchanted" = 1.01^4. Slot-scoped: Power Armor 7 pieces "Finger Items Enchantment level +4", Raiments 6 pieces "Hands Items Enchantment level +8", Mythic Burden of the Erased "Shoulder Items Enchantment Level +3", Mythic Endtimes Armor "This Item's Enchantment Level +2".
- Item text conventions: "X +N%" read as a multiplier ×(1+N%) (unverified; evidence: edust bonuses are "multiplicative unless stated otherwise" on the Enchantments page, the Stance page flags additive items explicitly, and Fandom's older data marks only some bonuses "(additive)"); "X (base) +N%" added to the stat's base (Fandom's older data words the same bonuses "(additive)"); "(multiplicative)" explicit multiplier; "Attr +N" added points; "decreases X +N%" read as ×(1−N%); "level requirement reduction +N" / "reduces level requirements +N" add to `Char.LevelRequirementReduction`.
- Wiki formula conventions checked against the source: the Expedition items spell out "+0.132 * Expedition Level (13.2% per Expedition Level)", so formula values are fractions; Pitch-black Cage's Analysis table matches `5 × (bats + 1)^0.5` (Legendary) etc.; Commissar's Torn Sleeve's Notes say the bonus rounds to the nearest point (307 pet levels give +25); Scales of Appraisal matches the Enchantments page's `0.1 × log10(experiments + 1)^0.5`; Enchanting Membrane's Details give 35% at Legendary.
- Weapons' Details use R = (1 + 0.75 × Tier)/4 with Tier Common 0 … Legendary 4, Unique 4 (Chiropteric Rod uses R + 1, Philosopher's Stone R × 0.065, Enchanting Membrane R = Tier × 0.25 + 1).
- Mythic items: inherent effect + random bonuses/imbuement + a user-chosen enchant. Only the inherent effect is encoded; excluded from the default search (the UI lets users mark them owned).
- Requirements: the Attributes page says item attribute bonuses count toward other items' requirements (Legacy's Insight helps Ebon Mantle), but "Fill" ignores them. Implemented as `unmetRequirements` and in the optimizer's leaf check; **formula bonuses that no item can change (Commissar's Torn Sleeve's 0.08 × pet level) now count too** (`itemIndependentValue`).
- **Phylacteries** ("Scales multiplicatively from Character level"): compounding (1 + x)^(level + level requirement reduction). Evidence: the guides' character-experience scalings (Oni 0.39, Shaman 0.88 and "~^0.4 because of Eerie Turquoise Phylactery", Temporalist 1.34; the Prodigy guide quotes "the scaling of levels for phylacteries (^0.484)") need per-level compounding; the Shaman guide says "level reduction also counts for this purpose"; the Oni, Oracle Apprentice, Demiurge Shaman and Tempest Oni guides boost phylacteries with Ley Keeper's level reduction. Paragon 29 unlocks the slot (1e450 Mysteries).
- **Conjured Razorspaulders** Legendary "Pet ability power +100" is +100% (lower tiers +50%/+75%; Fandom: "character and pet ability power by 100%").
- **The Rubedo Engine / Ritual Disk** double casts when they are made (Rubedo's page: "doesn't affect external casts"; guides wear them while stacking; Oni bursts with Disk, Temporalist with Rubedo, each the stronger enchant; the Temporalist enchant table values Ritual Disk only in the snap sets).
- **Attribute cap** (Paragon page: 100, +25 at Paragon 6, 10, 12, 15, 21, 24 → 250): item attribute bonuses are read as stopping at the cap (Shaman burst note: Voidstrike Seal, Encircling Trophies and Bite Sleeves are best only "before maxing out their respective attributes"; Temporalist: "240 in those two" with Innate Aptitude).
- **Expeditions**: expedition level max 100; key-locked locations (Shattered Reality, Eye of Chaos, Cathedral, Secret Altar…) need expedition level 100. Drops: Shattered Reality (Charged Fin-Wing, Beholding Eye, Empowered Water, Heart of the Storm), Eye of Chaos (Abnormal Voidmass, Insidious Lure, Necrotic Powerstone, Anima Core), Cathedral (Warbanner Fragment, Inquisitive Eye, Arcane Engine), Secret Altar (Blessed Armor Scales, Anointed Ashes, Anima Core).
- **Wizard XP** (Basic Mechanics): level n needs (1.09^(n−1) − 1) × 50000/3 total XP (level 200 = 4.67e11, 250 = 3.48e13, 300 = 2.58e15); XP = product of logs of actions × ((sources × boost + 1)^0.855 + 100) × multiplier. Legacy milestones ask for character levels 110 (Legacy 5) … 300 (Legacy 118).
- Time Distortion has a maximum of 10x, raised up to 30x by items and an upgrade (Temporalist/Chronomancer class pages). It doesn't affect spell durations, Mechanos Apexis's activation or weapon charging. It degenerates by 0.1x per real second and Stabilize The Flow consumes all of it.
- Basic Mechanics: Liquid Shadow is an Umbramancer resource; XP pools are Mana, Mana Sources (passive) and Click, Clickables, Spells (active); "the profit of autoclicks provided by summon spells scales 1:1 with summoning efficiency"; no base click value formula is given. Accumulated spells: "some items and Challenges increase the starting cast count of Accumulated spells, giving them significant power without deliberate stacking time"; Persistent spells' active part benefits from The Magnifier.
- Guide item presets like `#7#BURST@104;113;1;29;...` are 20 item IDs from the `IDs` table in `Module:Data/Items` (`-1` = empty). Ordering doesn't matter. They assume Legendary, or Unique for Quality 6. Tab labels like "Living Sin 17+5" mean enchant 17 plus 5 bonus levels (Resonator 4 + Legion 1). All presets resolve to full, slot-valid loadouts (tested). Guide spell lists like `60,2;6,2;…` are spell ids with an autocast mode after the comma (not used).
- **Paragon slot unlocks** (https://idlewizard.wiki.gg/wiki/Paragon): Paragon 9 Head/Chest/Hands/Feet/Research/Trophy (Item Crafting), 11 Shoulder, 13 Waist, 14 Finger, 16 Neck, 17 Enchantments and Experiments, 18 Back, 19 Wrist, 20 Weapon, 23 Offhand, 25 Legs, 26 Mount, 28 Accessory, 29 Phylactery. The BiS bot's SubParagon numbers (12 Shoulder/Waist, 18 Neck/Rings, 24 Back/Wrist, 28 Weapon) don't match this table. Encoded as `PARAGON_SLOT_UNLOCK` / `BOT_SUB_PARAGON` in `src/ui/model.ts`.

**Skipped Time** (https://idlewizard.wiki.gg/wiki/Skipped_Time): only Time Warps (Market) and Wormhole/Refined Wormhole skip time; uncapped since v1.31. Time Warps and Wormhole stop all active spells; Refined Wormhole, or Wormhole with Temporal Stabilizer, don't. Void Mana is set to 0. Grants mana I × O × M × T and spell shards S × T (up to 1 day). Skipped time adds to Skipped and Played Game Time and to Character and Pet Game Time. Counts for on-tick effects and as offline time for pets.

**Attributes** (https://idlewizard.wiki.gg/wiki/Attributes): each point is multiplicative, (1 + B)^X. Per-point: Int 2.5% Mysteries power (Multiplier), Ins 2.5% VM per Entity, SC 3.00% Evo, Wis 2.5% passive shards, Dom 3.0% autoclick profit, Pat 2.5% idle bonus, Mas 2.5% CAP (unlocks Paragon 5), Emp 2.5% PAP (Paragon 8), Vers 1.8% profits (Paragon 38, no perks). Perks every 25 points are all encoded (Int 75 and Mastery 125 "Reduces Level requirements by 1" now add to `Char.LevelRequirementReduction`); Int perks are explicitly additive to the 3% base ("total of 35%" at 225); Insight states "(additive)"/"(multiplier)"; Dominance crit-profit perks multiply. Perk thresholds count item attribute bonuses (Temporalist guide), up to the attribute cap.

**Mysteries** (Basic Mechanics): Mysteries = sqrt(mana / 5e11). Each mystery adds 3% production (base); Int perks raise that to 35%; Int points multiply it; Hungerer multiplies Mysteries power. Encoded as `Mysteries.Factor = 1 + Count × Power` (additive reading flagged unverified).

**Void mana:** production × (1 + VM × per-point). Base per-point value not found; input `Void.ProfitPerPoint` with placeholder default 1.

**Crit** (Basic Mechanics): expected click value = (1 − c) + c × CritProfit. Crit Rating R adds log10(R)% to chance and R% to base crit profit.

**Idle mode:** always burst in idle mode (Basic Mechanics). Boolean input `Idle.Active`.

**Sources (buildings)** (Basic Mechanics): 1 Mana Gems, 2 Grimoires, 3 Spell Fountains, 4 Enchanted Trees, 5 Alchemy Desks, 6 Circles Of Power, 7 Dimensional Rifts, 8 Nexi. Class renames: Oni: Hellholes = 6, Monuments = 3, Grim Trophy = 4. Shaman: Forbidden Tomes = 2, Trees of Life = 4, Witching Cauldron = 5. Temporalist: Ley Temporal Singleton replaces The Nexus (8). Chronomancer: Temporal Anchor replaces The Nexus (8). Item text "Nexi/Nexus/The Nexus profit" → 8, "Circle Of Power" → 6, "Grimoire"/"Enchanted Tree" → 2/4. Mana Source Memetics unlock at e850 Mysteries (Paragon 41).

**BiS bot algorithm** (https://idle-wizard.fandom.com/wiki/BiS_Guide): postfix formula, multiplicative before additive, drops items that don't affect it; per enchant level scores each item best-case (sets counted for the item alone), keeps items per slot until the first non-set item (2 for rings); tests every subset of each set, then every remaining combination; ≥ 40 levels, stops after 15 unchanged levels; Resonator as a separate branch; defaults attributes 175, max paragon; SubParagonN slot exclusions; weapons flagged unreliable.

**Oni** (Oni.wikitext; `Oni Guide.wikitext`, https://idlewizard.wiki.gg/wiki/Oni_Guide):
- Hero ability: PAP × [(PetT·G/3600+1)^0.5 · PetL^0.8 · C^0.5 · L/4e9 + 1] and Inc × [((I+1)·L·G^0.5/100)^0.65 / 250000 + 1], I = Incantation casts this Exile + 1.
- Stances: Meditation (charging only), Defense (FS instant, divides incantation duration by log10(1 + (I+1)·G·C·L²) + 1), Berserk (Evo × [(I+1)·C^0.5·L·G/1e4 + 1]).
- Burst setup: pet Living Sin (fallback Hungerer), stance Berserk. Spells 60 Ritual Of Power, 6 Goblet Of Fire, 88 Iron Blood, 89 Enhanced Strength, 107 Possessed Blade, 86 Furious Strike (score). FS charges cap at 1e9.
- Burst presets: Hungerer 10+5 `104;113;1;29;11;32;48;68;54;83;76;1002;211;301;411;417;91;2007;3005;509`; Hungerer 18+5 `104;113;1;29;18;32;48;68;54;84;72;1002;211;301;411;417;91;2007;3005;509`; LS 13+5 `104;113;6;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509`; LS 17+5 `104;113;1;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509`; LS 39+5 `104;113;1;29;18;31;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509` (LS items: Chronoboost Ring, Resonator Ring, Circlet Of Deep Thoughts, Seclusion Shell, Empowering Handguards, Boots Of Eastern Blessings, Tranquil Spaulders, Sash of Luxury, Lucky Amulet, The Amplifier, Bite Sleeves, Cataclysm, Commissar's Torn Sleeve, Incantations Restructuring, Anima Core, Anointed Ashes, Spellweaving Kilt, Ritual Disk, Smooth Amber Phylactery, Spell Vault).
- Guide scalings (Source Memetics): Inc 7.1438, CAP 1.5517, Evo 1.0421, PAP 2.0614, Char XP 0.3923, Autoclick 0, Summon 0.
- Attributes (Minimum): Int 200, Ins 60, SC 125, Pat 50, Mas 200, Emp 125 (200). The priority table has three columns by Commissar's Torn Sleeve perks (0 / 1 / 2 perks = 0–25 / 25–49 / 50–74 attribute points at 0.08 per pet level); the "2 Perk" column starts "200 (250) Spellcraft, 200 (250) Patience, 250 Insight, 200 (250) Wisdom, 250 Empathy, …". The LS presets need 250 Spellcraft (Spellweaving Kilt).

**Shaman** (Shaman.wikitext; `Shaman Guide.wikitext`, https://idlewizard.wiki.gg/wiki/Shaman_Guide):
- Hero ability: Idle × [((T_G+1)^2/1000)·C^0.30·L^1.6 + L + 1] (T_G softcapped at 720) and Summon × [(1 + A·G^0.25/10000)^0.85 · C^0.155 · L^0.31/400 + 1] (A softcapped above 7e7). Idle bar: Idle × (10·A_cur^0.5 + 1).
- Burst: pet Herald of Rot (alt Risen Giant). Spells 18, 92, 105, 16, 23, 7. "Swap to your sets and use branch active ability".
- Summon table: Conjure Primal Elemental 15, SEF ~80 (= Trees of Life × 0.004), Deepwood 0.5, Spider 6, Centipede ~76 (= log10(Summon)·2.5 + 1), Unholy Avatar 16. Softcaps: 7e7 autoclicks, 30 days class time; Herald of Rot 14 days pet real time and 200 days pet game time.
- Presets: Burst `108;113;4;20;12;33;47;65;59;87;76;1001;206;306;418;406;94;2005;3004;507`; 20+5 `108;113;4;20;12;33;47;61;59;87;73;1001;206;306;418;406;94;2005;3004;507`; 28+5 `108;113;4;20;12;33;47;61;59;88;73;1001;206;306;418;406;94;2005;3004;507`. Burst note: "Voidstrike Seal wins over Morbid Loop until enchant 33+5 with maxed Obscure Talents"; "Before maxing out their respective attributes, Voidstrike Seal, Encircling Trophies and Bite Sleeves are the best in their slots". The enchant list marks The Magnifier and Beholding Eye "(not on burst)". The guide farms Shattered Reality, Eye of Chaos and Cathedral.
- Run scalings (burst): Evo 0, Inc 0.92, Summon 7.76, CAP 1.997, PAP 1.676, Idle 2.62, Void/Autoclick/Click/Crit profit 1, Char XP 0.88. Source-meme table: Inc 2.1895, CAP 1.9978, Autoclick 1, Evo 0, Summon 7.8433, PAP 1.6843, Char XP 1.
- Attributes: basic list Int 150, Ins 90, SC 150 (175), Pat 200, Mas 150 (200 without Rugged Wristcoat), Emp 0 (75 without Bite Sleeves), then Emp 100, Dom 135, Emp 200, Dom 185; e550 variant (the class defaults): Int 150, Ins 90, SC 175, Wis 0, Dom 75, Pat 200, Mas 100, Emp 175, then 200 Mastery, 160 Insight, 250 Mastery, 100 Dominance (250 with Voidstrike), 250 Int, …

**Temporalist** (Temporalist.wikitext; `Temporalist Guide (e550_).wikitext`, https://idlewizard.wiki.gg/wiki/Temporalist_Guide_(e550%2B)):
- Hero ability: profits × [(T^2.15·(S·G/16000)^1.78 + 1)·(X/1e7 + 1)·C^0.5·L/1e10 + 1] and Evo × [(T^0.5/40·(S·G/16000)^1.15 + 1)·C^0.5·L/5e6 + 1].
- Burst: pet Mechanos Apexis (casts KBB: Mana = (CharLvl + 2.5) × Evo × Mana/s × 8). Spells 73, 57, 61, 17, 69, 4. **StF and GR are snapped** (snap sets TD-Charge/StF-Snap `100;113;7;23;18;32;41;68;56;85;72;1005;209;301;411;409;91;2007;3001;509` and Gem-Snap with 40 and 84). Quasi-incantation (93, Augment) stacked all buildup.
- Presets: 11+5 `104;113;6;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`; 15+5 `104;113;1;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`; 22+5 `104;113;1;29;14;36;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`; 34+5 `104;113;1;29;14;36;48;67;59;84;76;1005;207;300;411;408;92;2003;3005;508`.
- Burst scalings: Evo 1, Inc 4, CAP 1, PAP 1, Idle/Void profit 1, Char XP 1.34 (Void mana phase Inc 1.27). Source-meme table: Inc 7.390, CAP 1.008, Evo 1.016, PAP 1.016, Char XP 1.60, extra Nexus source scaling 2.14.
- Enchant Priority table: "exact profit bonus per enchant" per item; Incantation enchants sum burst (4) + snaps (StF 1 + GR 1.12) + Void mana (~1.2) (section 13).
- Lucky vs Miniaturized: they tie at 1.4e8·(1.25/1.2)^(Ench·10/3) catalysts (1.6e8 at enchant 1, 3.2e10 at 40).
- Attributes: Int 155, Ins 140, SC 250, Wis 200, Dom 0, Pat 150, Mas 250, Emp 175.

**Chronomancer** (Chronomancer.wikitext): hero ability Sources profit × [L² × C × ((T + S) × G)^0.64 × 0.25 + 1]; Compressed Time max L × 5; spells 4, 17, 26, 29, 30, 33, 34, 60, 65, 66, 67, 68, 69, 71, 73, 101, 104; Wormhole (66) and Time Helix (101) as encoded. Guide setup: section 7.

**Pets** (from `data-raw/wikigg/<Pet>.wikitext`, all encoded): T3 Living Sin, Greater Chimaera, Mechanos Apexis, Herald of Rot; T2 Hungerer, Pit Lord, Simulacrum, Archivist, Ley Keeper, Risen Giant, Ent, Voidterror, Arcanaworg; T1 Interrogator, Pixie, Geode, Zombie. Level requirement reductions of pets (Ley Keeper, Geode) are not encoded; they belong in the `Char.LevelRequirementReduction` input.

**Spell math** is in `spells.json` (`math`, LaTeX); every Oni/Shaman/Temporalist/Chronomancer spell is encoded.

## 5. Item model and data

### Stats (`src/data/stats.ts`, `src/data/attributes.ts`)
- Attributes: inputs `AttrPoints.<A>`; derived `Attr.<A>` (points + item bonuses; requirements use it); **new** `AttrEffective.<A>` = min(`Attr.<A>`, `Misc.AttributeCap`) feeds per-point bonuses and perks; **new** input `Misc.AttributeCap` (default 250, Paragon page); constants `AttrBonus.<A>`. Helpers `attributePoints(a)`, `attributeStat(a)`, `attributeEffective(a)`, `ATTRIBUTE_CAP`.
- **New:** input `Char.LevelRequirementReduction` (default 0; "from Renown, challenges and pets such as Ley Keeper or Geode; items and attribute perks are added by the tool") and derived `Char.PhylacteryLevel` = `Char.Level + Char.LevelRequirementReduction`.
- `GENERIC_EFFECTS` = `PRODUCTION_EFFECTS` + `ATTRIBUTE_EFFECTS` (9 per-point multipliers + 74 perks). `UNMODELLED_PERKS` (6).
- Input labels say "without item and attribute bonuses" for CAP, CAP growth, PAP, Void profit per point, idle bonus, autoclicks/s, crit chance and rating, passive shard generation.
- Stat groups (`StatGroup`): Character, Pet, Attributes, Spells, Production, Clicks, Void, Items, Misc.
- Item-facing stats as before (`Spell.*Duration*`, `Spell.CostReduction`, `Spell.ChargingCostReduction`, `Spell.ChargeSpeed`, `Spell.AccumulatedStartingCasts`, `Spell.AccumulatedCastGain`, `Spell.MaxCastRate`, `Spell.AutoclicksFromSpells`, `Spell.AccumulatedCastCountFactor` (Rubedo), `Spell.AugmentCastCountFactor` (Ritual Disk), `Spell.PersistentActiveAccumulationFactor` (Magnifier), `Spell.KelphiorsBlackBeamEfficiency`, `Pet.ExperienceFlat`, `Pet.ChargeSpeed`, `Pet.Tier`, `Void.*`, `Click.HallowedProfit`, `Click.ProductionShare`, `Shards.*`, `Time.MaxDistortion`, `Time.CompressedTimeGain`, `Items.*`). **The three cast-count factors and `Spell.AccumulatedStartingCasts`/`AccumulatedCastGain` are read by no score** (cast counts are inputs).
- Formula/perk inputs and `Spell.*Efficiency` inputs as before (section 6 of checkpoint-07; unchanged list: `Spell.CastsThisExile`, `Misc.*`, `Pet.TimeCurrent`, `Expeditions.Level`, weapon inputs, `Elixir.*Ingredients`, `Building.<b>.Count/Share`, …). Derived `Click.ManaPerClick = Click.Profit × Prod.Total × Click.ProductionShare`.

### Item model, parser, overrides, database, loadouts, coverage
- `src/engine/model.ts`: `ItemEffect`, `UnmodelledClause`, `BonusEnchant`, `EffectBlock`, `ItemTier`, `SetTier`, `EnchantDef`, `ItemDef`, `SetDef`.
- `src/data/itemText.ts`: `normalizeText`, `splitClauses`, `parseEffectText`, `parseEnchant`, `overrideEffect`. Phrase table `PHRASES` ("pet ability power" is now percent-only; "level requirement reduction"/"reduces level requirements" → `Char.LevelRequirementReduction`), `UNMODELLED_RULES`, phylactery scaling `factor ^ Char.PhylacteryLevel`, Expedition formulas, bonus-enchant patterns, carried values.
- `src/data/itemOverrides.ts` (`ITEM_OVERRIDES`): formula items (Pitch-black Cage, Ceaseless Hunger, Murmuring Spellbook, Arcane Accelerator, Black Vortex, Commissar's Torn Sleeve, Miniaturized Accelerator, Enigmatic Parchment, Collar Of Obedience, **Conjured Razorspaulders (PAP ×2, verified)**, Symbol Of Authority, Simple Memento, Paukan, Recaller Stone, Habitstone, Scales of Appraisal, The Bond, Rubedo, Ritual Disk, Magnifier) and weapons (Chiropteric Rod, Head Of The All-Eater, Thunderbird, Reality Prism, Philosopher's Stone, Black Blade, Shard Of A Lost Dimension, Enchanting Membrane, Branch of the Great Cycle (verified), Cataclysm (unverified)). Still `mechanic`: Heart of the Grave, Redeemer, Temporal Stabilizer, Berzerker, Spellstealer, The Accumulator, Shadow-Scryer's Crystal Ball, Broomstaff Of Klevdariah.
- `src/data/items.ts`: `ITEMS` (223), `SETS` (12), `itemByKey/itemByName/itemById`, `itemKey(name)`, `tierOf`, `qualitiesOf`, `qualityRank`, `setByNameOf`, `presetItems(code)`, `ITEM_DATA_URL`.
- `src/engine/loadout.ts`: `resolveLoadout(equipped, { legion, sets })`, `validateLoadout`, `ItemCatalog(items, sets)` (`spec`, `modifierSpec(resolved)`, `dynamicIndexOf(effect)`), `unmetRequirements(equipped, assigned, sets, formulaValue?)` (**new optional `formulaValue`** for formula attribute bonuses), `MAX_ENCHANT_LEVEL`, `GLOBAL_BONUS_ENCHANT_CAP`. Effective enchant level = 0 if no real level, else real + min(5, Legion + Σ "all") + slot bonuses + self bonuses.
- `src/engine/graph.ts` **new** `itemIndependentValue(graph, inputs)` → `(expr) => number | undefined` (evaluates formulas whose refs no item can change, at the inputs; used by the optimizer's requirement data and `comparePreset`).
- `src/data/coverage.ts`, `docs/item-coverage.md`: max-quality tiers **404 modelled clauses**, 17 not-production, 26 mechanic, 20 mythic-random, 0 unparsed. Pinned in `coverage.test.ts`.

### Unverified item assumptions (each carries a note in the data; the UI's Results tab lists the ones behind each result)
1. Percentage item bonuses multiply ×(1+N%) (and percentage perks without "(additive)"). Supported by Fandom marking only some bonuses "(additive)".
2. "(base)" adds to the stat's base value (Fandom: "(additive)"). Mysteries-power items: Circlet "(base) +20%" adds 0.20 to the 0.03 + Int-perk base. The golden matches are consistent with it but don't prove it (section 13).
3. Set tiers cumulative.
4. Slot-/self-scoped bonus enchant levels are not capped at 5 (Raiments offers +8).
5. Phylacteries: (1 + x)^(level + level requirement reduction), "decreases X +N%" = (1 − N%)^level. Supported by the guides' character-experience scalings (section 13); still unverified.
6. Formula values as fractions ×(1 + value) (Cage, Hunger, Murmuring, Accelerator, Black Vortex, Collar, Symbol); "X by (formula)" = ×formula (Miniaturized Accelerator, Enigmatic Parchment); formulas with their own "+ 1" are the factor (Memento, Paukan, Habitstone).
7. Weapon abilities active during the burst (Thunderbird, Black Blade, Shard Of A Lost Dimension, Cataclysm); Reality Prism charges at maximum; Head Of The All-Eater's "log10^2" = squared log.
8. Recaller Stone's "Autoclicks" = autoclicks this Exile; Arcane/Miniaturized Accelerator's catalyst shards are one input.
9. (Resolved: Conjured Razorspaulders is +100% PAP, verified.)
10. Spirit's Guidance Legendary's trailing "150%" applies to critical rating.
11. Mutated Mycelium Rare: factor 0.021 vs "(2.7% per Expedition Level)"; the factor is used.
12. Item attribute bonuses count as points for per-point bonuses and perks (thresholds: Temporalist guide), **up to the attribute cap** (new, unverified; section 4); Int 150's "trained" points = assigned points.
13. Cost reductions add up; crit chance items add percentage points; "Entities" = Void entities; flat pet XP and flat VM/entity combine in undocumented ways.
14. Units: `Pet.TimeCurrent` seconds; Void entity spawn rate and passive shard generation units unknown.
15. **New:** The Rubedo Engine and Ritual Disk double casts at cast time; per-spell cast inputs are the counts the game shows (unverified; evidence in section 4).
16. **New:** Level requirement reduction (items, Int 75, Mastery 125) only matters through phylacteries; spell/class/pet level requirements aren't modelled.

## 6. Classes, pets, spells, scores and the model builder

### Types (`src/engine/model.ts`)
- `SpellDef` (`key`, `behavior`, `duration`), `AutoclickSource`, `UnmodelledPart`, `SpellBehaviour { spellId, effects, mana?, autoclicks?, voidManaPerSecond?, stats, snap?, unmodelled, source }`, `StanceDef`, `DefaultValue { value, source }`, `ClassDef { id, name, effects, stances, stats, augments, pairedPets, defaultSpells, defaultPet, defaultStance?, defaultSnapped, defaultScore, defaults, mainBuilding, buildingNames, unmodelled, source }`, `PetDef { id, name, tier, effects, stats, autoclicks?, casts?, voidManaPerSecond?, defaults?, unmodelled, source }`.

### Spells (`src/data/spells.ts`, `src/data/spellBehaviours.ts`)
- `SPELLS`, `spellById`, `classSpells(className)`, `spellKey(name)`, `spellStat(spell, name)` → `Spell.<Key>.<Name>`, `SPELL_SOURCE`.
- `SPELL_BEHAVIOURS` (55 spells: every Oni, Shaman, Temporalist and Chronomancer spell, tested) and `behaviourOf(id)`. `SpellBuilder` DSL: **`casts()` creates input `Spell.<Key>.CastsThisExile` bound directly to `C`** (no more `CountedCasts`; the input's hint explains the Rubedo/Disk doubling at cast time; unverified source note); `realmCasts()` input `CastsThisRealm` bound to `R`; `charges(max)` (`Q`); `snapped(stat, label)`; `effect(...)`; `manaPerCast/manaPerSecond`; `clicks(...)`; `voidMana`; `skip`; `note`. Bindings: E/I/S efficiencies, M = `Prod.Total`, L = `Char.Level`, A = `Click.AutoclicksThisExile`, K, AP, CP = `Click.ManaPerClick`, CRIT.
- Encoded readings as in checkpoint-07 (instant evocations → mana per cast; Hellstorm → mana per second; profit incantations → `Prod.Global`; Goblet → Hellholes, Force Of Nature → Trees of Life, Dreaded Script → Forbidden Tomes; **Gem Resonance → Mana Gems profit × (1 + temporary gems / gems owned)**, temporary gems = G × (log10(I) × 1.6 + 1) per its Math; Iron Blood/Converge Timelines/TTS passive → CAP; Stabilize The Flow uses `Time.MaxDistortion` (snapped); Superposition 365-day years; summons autoclick per their Math; Centipede multiplies `Click.ManaPerClick`; Spider/Unholy Avatar per their Math; Wormhole skip-only; Time Helix casts() + `Prod.Global × (C·(log10(I)·0.95+1)·0.9 + 1)`; unmodelled parts with notes).

### Pets (`src/data/pets.ts`)
- `PETS` (17) and `petById(id)` (kebab-case ids). As in checkpoint-07 (Mechanos Apexis KBB rate unverified, Risen Giant/Zombie time readings unverified, Geode all unmodelled). Pet bindings: P = PAP, L = pet level, X = `Pet.ExperienceTotal`, N = `Spell.ActiveSummons`.

### Classes (`src/data/classes.ts`)
- `ONI`, `SHAMAN`, `TEMPORALIST`, `CHRONOMANCER`, `CLASSES`, `classById`. Hero abilities and stances as in section 4. Temporalist `stats` replace `Misc.LeyApexes`/`Misc.TemporalAnchors` with `Building.8.Count`; `augments: [93]`; `defaultSnapped: [69, 4]`. **Temporalist `mainBuilding` is now 1 (Mana Gems).**
- `pairedPets`: Oni living-sin, hungerer, interrogator, archivist, ley-keeper, ent, pixie, voidterror, greater-chimaera, simulacrum, geode, pit-lord; Shaman herald-of-rot, risen-giant, ley-keeper, voidterror, ent, pixie; Temporalist mechanos-apexis, risen-giant, greater-chimaera, pixie, simulacrum, arcanaworg, ley-keeper; Chronomancer risen-giant, archivist, pixie, geode, simulacrum, zombie.
- Defaults (`fromGuide` verified, `inferred` unverified with reasoning, `placeholder` unverified "Placeholder magnitude, not stated by a guide"); helpers **`characterLevel(value, note)`** (inferred from the Wizard XP table and Legacy milestones), **`experienceForLevel(level)`**, **`maxExpeditionLevel(item, location, guide)`** (fromGuide):
  - Guide-stated: attribute points (section 4), Oni Hellholes share 1 and Shaman Forbidden Tomes share 1 (unverified choices), Legion on (not Chronomancer), FS charges 1e9, Branch charges 2e6, HoR 200 game days / 14 real days, StF consumed TD 30 (Temporalist), **expedition level 100 for Oni (Anointed Ashes/Secret Altar), Shaman (Warbanner Fragment/Cathedral) and Temporalist (Necrotic Powerstone/Eye of Chaos)**.
  - Inferred: **character level 200 (Oni, Shaman, Chronomancer) and 250 (Temporalist); Temporalist total XP 3.48e13 (XP table at level 250); Oni pet level 750 (2 Commissar perks need pet levels 625–925; 600 gave only 1 perk); Temporalist Mana Gems share 1 (Ley Temporal Singletons 0)**, max pet level 1000 (Oni), Shaman class time 86 h, Trees of Life 20000, Temporalist 72 h class time and 3 days MA real time, catalyst shards 2e9, Shaman Summon base 3e19 (calibrated to ~76 Centipede clicks).
  - Placeholders: CAP base 1e6, CAP growth 10, efficiency bases 1e3, cast counts (1e4–1e8), pet XP 1e20, skipped years 1e6 (Temporalist), Hellholes 1e4, Cataclysm charges 1e5, Ley Temporal Singletons 5000, Void mana 1e10, idle base 100, snapped Inc 1e30 (Temporalist), crit chance 10% / crit profit 200%, Mysteries.Count 1e300 (Oni/Shaman/Temporalist), PAP base 1, Chronomancer expedition level 50 (unchanged).

### Scores (`src/data/scores.ts`)
- `oni-burst` (Furious Strike mana per cast), `temporalist-burst` (`Pet.CastManaPerSecond`), `shaman-burst` (10 × (autoclick mana + Branch multiplier × click mana × autoclick profit × crit)), `chronomancer-burst` (Singularity Beam mana per cast; null without spell 65), `production`, `autoclick-mana`, `void-mana`, `stat:<id>`, `spell:<Key>` / `spell:<Key>:per-second`.

### Model builder (`src/data/buildModel.ts`)
- `buildModel(selection, { relevance? = true }) → BuiltModel`; `ModelSelection { classId, petId, spells (≤ 6), stance?, idle?, snapped?, scoreId? }`; `defaultSelection(classId)`; `MAX_SPELLS`; `itemCatalog()`. `BuiltModel { selection, cls, pet, stance, spells, stats, effects, score {def, expr}, scores, catalog, graph, relevance, unmodelled }`. Helpers `loadoutModifiers(model, equipped, legion)`, `elasticity(model, statId, baseMods, inputs?, step = 0.01)`.

### How to add things
- **Spell:** entry in `DEFINITIONS` in `spellBehaviours.ts`; new generic inputs in `stats.ts` with a source.
- **Pet:** `pet(name, tier, b => …)` in `PETS`.
- **Class:** a `ClassDef` in `classes.ts` added to `CLASSES` (update the class-list assertions in `classData.test.ts` and `state.test.ts`).
- **Score:** a `ScoreDef` in `SCORES` returning null when unavailable.
- **Golden case:** presets in `GUIDE_CASES`, variants in `GUIDE_VARIANTS` (`src/data/golden.ts`), expected missing items in `EXPECTED` (`src/golden/golden.test.ts`), and a classification in `validation/golden-report.md`.

### Elasticity results at the guide burst presets (unchanged by `validate`; tests in `src/data/buildModel.test.ts`)

| Class (preset) | Stat | Ours | Guide | Note |
|---|---|---|---|---|
| Oni (LS 17+5) | Evo / Inc / CAP / PAP | 1.000 / 6.075 / 1.175 / 1.350 | 1.0421 / 7.1438 / 1.5517 / 2.0614 | documented wider tolerances |
| Shaman (20+5) | Evo / Inc / Summon / CAP / PAP / Idle / Autoclick, Void | 0 / 0.920 / 7.726 / 1.992 / 1.260 (1.443 maxed attributes) / 2.649 / 1, 1 | 0 / 0.92 / 7.76 / 1.997 / 1.676 / 2.62 / 1 | PAP: Herald of Rot's (P^x + 1) terms unsaturated |
| Temporalist (15+5) | Evo / Inc / CAP / PAP / Idle, Void | 1 / 4.013 / 1.013 / 1 / 1, 1 | 1 / 4 / 1 / 1 / 1 | Inc only because StF and GR are snapped |
| Chronomancer (no items) | Evo / Inc / CAP / PAP / Idle | 1 / 3.107 / 1 / 0.300 / 2.016 | — | |

### Build-time relevance at the defaults (synthetic candidates; tested)
- Oni: hidden `Spell.FuriousStrike.Charges`, `Pet.ExperienceTotal`, `Mysteries.Count`, `Spell.EvocationEfficiency`; shown `Pet.Level`, `Hero.AbilityPower`, `Weapon.CataclysmCharges`, `Spell.IronBlood.CastsThisExile`.
- Temporalist: hidden snapped inputs, `Char.ExperienceTotal`, `Mysteries.Count`; shown `Spell.QuasiIncantation.CastsThisExile`, CAP, PAP.
- Shaman: shown `Weapon.BranchCharges`; hidden `Mysteries.Count`.
- Chronomancer: hidden snapped StF inputs, `Spell.EvocationEfficiency`, `Hero.AbilityPower`, `Hero.AbilityPowerGrowth`, `Char.ClassTimeHours`, `Mysteries.Count`; shown `Building.8.Count`, `Spell.TimeHelix.CastsThisExile`, attribute points.
- The UI smoke test after `validate`: Oni "Inputs (20)" shown / 48 hidden at enchant 0.

### Known gaps / open assumptions (model)
1. Magnitudes are still mostly placeholders (PAP base, CAP base/growth, cast counts, spells cast, Void mana, idle base). The golden report lists which remaining mismatches depend on them (spells cast for Murmuring Spellbook, accumulated cast counts for The Eastern Tale).
2. Clicks are worth `Click.Profit × Prod.Total × Click.ProductionShare` (base share 1 is a placeholder).
3. Main producing building per class: Oni 6, Shaman 2 (unverified), **Temporalist 1 (Mana Gems; evidence in section 13)**, Chronomancer 8 (Temporal Anchors) — Chronomancer's Gem Resonance still adds nothing at Mana Gems share 0 (open choice for the blind check; don't copy the Temporalist evidence over without Chronomancer-setup reasons, and record any change in `tool-result.md` before reading gear).
4. Gem Resonance and Cataclysm: temporary sources assumed to scale that building's production in proportion to the amount owned. Gem Resonance's snapped Incantation scales ~0.01 in the model vs ~1.12 implied by the Temporalist guide (doesn't change burst rankings).
5. Mechanos Apexis KBB rate = pet charging speed / period. Reality Prism's KBB efficiency multiplies KBB mana.
6. `I` in Herald of Rot/Risen Giant/Zombie/Dreaded Script = `Idle.Factor`.
7. Snapping replaces the snapped spell's Incantation (and StF's consumed TD) with inputs; the other burst-set items don't reach those spells.
8. The Magnifier, The Rubedo Engine, Ritual Disk, `Spell.AccumulatedStartingCasts` and `Spell.AccumulatedCastGain` act while casting over the run, so they aren't wired into burst scores (inert there). **Starting casts are an open question** (the Oni and Temporalist 34+5 presets use Eastern Tale / The Amplifier, possibly for them).
9. Oni's Defense stance divisor and Archivist/Interrogator incantation duration are encoded but no score uses durations.
10. `Pet.RealTime` shows in Temporalist's relevance although MA's Evo is ≫1 at the defaults; not investigated.
11. Chronomancer hero ability units for T and S (hours); Time Helix reads current Inc.
12. Elixirs aren't a setup choice.
13. **New:** character-experience scalings are higher than the guides' (Oni 0.63 vs 0.39, Shaman 1.11 vs 0.88, Temporalist 1.48 vs 1.34); the guides' values would imply character levels of ~400–700 under this model.

## 7. Chronomancer setup (from `encode-chronomancer`; blind, unchanged except the generic character level)

### Guide extraction (`scripts/validation/chronomancer-setup.mjs`, `npm run chronomancer-setup`)
- Fandom only, via the API: `action=parse&prop=sections` for headings, then `prop=wikitext&section=N` per selected section, each cut at its first subheading. Default page `Chronomancer Guide Updated` (`--page` overrides). Headings mentioning gear/items/BiS/equip/enchant/sets/weapon/loadout/slot/mythic/quality/rings/amulet/trophy/phylactery (and everything under them) are excluded; item-named headings too.
- Filter, all before printing/saving: HTML comments; `[[File:]]`/`[[Image:]]`; links to item pages; templates whose name matches item/bis/gear/equip/enchant/set/preset/loadout (except `Spell*` templates); template params matching item/gear/bis/enchant/set/preset/equip/loadout and preset-like id lists; tables containing item references or gear words; list lines with item references (except attribute lines); sentences with gear/enchant/slot words; then every item and set name from `items.json` → `[item]`. Aborts without writing if any full item name survives. Sections with > 50% of prose removed keep only setup boxes.
- Debug modes that never print values: `--list`, `--inventory`. `--file <wikitext> --out <md>` dry-runs on a local guide.
- Output `validation/chronomancer/guide-setup.md` (committed); `validation/chronomancer/setup-used.md` records what was used and assumed (updated in `validate` with the character level and the generic model changes).

### Guide sections (headings only)
Used: (introduction), Attributes, Phase 1: Build up Levels, Phase 2: Build up Superposition and Ritual of Power, Phase 3: PreBurst, Phase 4: Bursting. Prose dropped, spell set kept: High Level Snapshot Optimization (73% item discussion). No gear headings exist on the page.

### Guide-stated setup (Fandom, "Updated for v1.35.0", e90–e220+ Mysteries, run 10 min – 10 h)
- Burst (Phase 4): Singularity Beam, Superposition, Converge Timelines, Ritual Of Power, Gem Resonance, Stabilize the Flow (all Reckless).
- Pre-burst (Phase 3): Void Radiance for VM (no Voidterror swap because Risen Giant stacked with Wormhole skipped time is too good); stop Temporal Distortion, cast Stabilize The Flow, swap to the burst set. Set: Singularity Beam, Temporal Distortion, Void Lure, Void Radiance, Spell Focus, Stabilize the Flow (None). High Level Snapshot set: same with Gem Resonance instead of Spell Focus.
- Phase 1 (levels): Pixie autoclicks during Wormhole, then Archivist for Void entities. Set: Singularity Beam, Wormhole, Ritual Of Power, Synthetic Entity, Temporal Distortion (Careful), Spell Focus.
- Phase 2 (stacking): Archivist; first set Singularity Beam, Wormhole, Ritual Of Power, Superposition, Synthetic Entity, Spell Focus; at higher Mysteries a second set with Time Helix instead of Synthetic Entity (Geode helps with level requirements).
- Pets listed: Archivist, Geode, Simulacrum, Zombie, Risen Giant. Attributes: Int 25, Ins 25, Wis 25, Pat 40, Mas 25.

### Encoding (`CHRONOMANCER` in `classes.ts`)
- Hero ability on `Prod.Global`: `L^2·C·((Char.ClassTimeHours + SkippedYears·8760)·G)^0.64·0.25 + 1` (unverified units). `stats`: `Misc.TemporalAnchors` = `Building.8.Count`. `augments: [101]`. `defaultSpells [65, 17, 73, 60, 4, 69]`, `defaultPet risen-giant`, `defaultSnapped [69]`, `defaultScore chronomancer-burst`, main building 8.
- Defaults: guide attributes (fromGuide); SC/Dom/Emp 0 (inferred); snapped StF TD 10 (inferred) and Inc 1e3 (placeholder); class time 10 h and Mysteries 1e150 (inferred); skipped time 1 year (placeholder) and pet game time 1 year (inferred); Superposition/RoP casts 1e5, Time Helix 100, spells cast 1e7, **character level 200 (inferred, generic; was 1000)**, pet level 300, CAP 1e6, growth 10, Evo/Inc bases 1e3, Temporal Anchors 3000, Void mana 1e10, idle base 100, expeditions 50 (placeholders). Legion off.
- Open choices worth revisiting in the blind check (listed, don't tune to match): Gem Resonance unsnapped by default (the high-level variant: `snapped: [69, 4]`); Mana Gems share 0; the burst bar's Reckless StF recasts ignored; low guide attributes (Int/Ins/Mas 25, no SC/Emp) filter many items by requirement (the optimizer's `excluded` list, reason `requirements`); the guide era's Paragon level: at e90–e220 Mysteries (Paragon 1e80 → P9 … 1e220 → P18) only Head/Chest/Hands/Feet/Research/Trophy, Shoulder, Waist, Finger, Neck and maybe Back are unlocked, Enchantments need P17 (1e200), and the attribute cap is lower (Paragon 6/10/12/15 → 125/150/175/200; set `Misc.AttributeCap` accordingly); expedition level (the guide era may be below 100); if you restrict slots, enchant levels or the cap for that reason, record the rule in `tool-result.md` before reading the gear.

## 8. Engine APIs from earlier steps

### `src/engine/expr.ts`
Expr AST `num | ref | bin(+ - * / ^) | neg | fn`. `f(source, bindings)` parses infix: dotted identifiers are stat ids, single letters must be bound. `^` is right-associative and binds tighter than unary minus. Functions: `log10 ln log(base,x) max min sqrt ge lt if(c,a,b) floor abs` (no equality; round = `floor(x + 0.5)`). Helpers: `num ref bin mul add pow call`, `refsOf`, `toInfix`, `toPostfix`. Avoid negative bases with `^`.

### `src/engine/stats.ts`
`inputStat(id, label, group, spec, extras)`, `multiplierStat`, `additiveStat`, `constantStat`, `derivedStat`. `StatRegistry`: `add`, `extend`, `withInputDefaults`, `has/get/require/all`. `createGenericRegistry()` in `src/data/stats.ts`. `InputSpec { default, kind: number|integer|boolean, min?, max?, logScale?, unit?, hint? }`.

### `src/engine/graph.ts`
- `compileGraph(spec)` (throws `GraphError { issues }`), `tryCompileGraph`. `GraphSpec = { stats, effects?, score, items?: ItemEffectSpec }`. Only stats reachable from the score are compiled. `StatGraph`: `stats`, `index`, `score`, `inputs`, `dynamic`, `inertItemStats`. Helpers `statIndex`, `exprItemDependent`, `exprInputs`, **`itemIndependentValue`**.
- `ItemModifiers = { add, logMul, dynamic }`; `createModifiers(graph, { add?, mul?, dynamic? })`. A stat's value is `(base + Σadd effects + add[i] + Σ active dynamic adds) × Π mul effects × 10^logMul[i] × Π active dynamic muls`.
- `FloatEvaluator(graph, inputs?, options?)`: `scoreLog10(mods?)`, `evaluate(mods?)`, `statLog10(id)`/`statSign(id)`, `setInputs`/`setInput`, `inputValues()`; options `activeItems`, `incremental`. Decimal fallback `evaluateDecimal`, `evalDecimalExpr`, `resultToDecimal`.

### `src/engine/relevance.ts`
`analyzeRelevance(graph, { inputs?, candidates?, epsilon?, reference?, threshold? })` → `{ inputs: InputRelevance[], terms }`. Structural log-decomposition plus numeric ratio invariance. Limitations: whole-score exponent inputs are shown; the numeric check holds other inputs at current values; inputs consumed by the modifier builder never appear; attribute points also gate requirements (the UI forces them visible).

## 9. Optimizer (plan todo `optimizer`: done; changed in `validate` only for formula attribute bonuses)

### Core (`src/engine/optimizer.ts`)
- `new Optimizer(problem, options)`; `problem: OptimizerProblem { graph, catalog, items, sets, inputs?, attributes? }`. Methods: `optimizeLevel(level, previous?)`, `sweep(levels = ENCHANT_LEVELS, onLevel?)`, `sweepResult(rows)`, `scoreOf(keys, level)`, `modifiersFor(keys, level)`, `relevance(row, { threshold, maxCandidates = 40 })`. Fields: `excluded` (reasons `not-owned | mythic | excluded-slot | requirements | no-effect | resonator-disabled`), `baselineLog10`, `legion`. Helpers `optimize`, `enchantSweep`, `ENCHANT_LEVELS` (0..55). **Item attribute bonuses given by item-independent formulas (Commissar's Torn Sleeve) now count in the requirement data (`blockInfo` takes a `formulaValue`).**
- `OptimizerOptions`: `owned?`, `excludedSlots`, `enchant`, `enchantOverrides`, `legion`, `resonator` (default true), `pruning: "bot" | "none"`, `marginalTolerance` (log10 1.05), `runnersUp` (0), `polishDepth` (0), `nodeBudget` (200 000).
- Results: `LevelResult { level, best, branches, changed }`; `SetResult { items: ChosenItem[], scoreLog10, gainLog10, forced, candidates, stats }`; `ChosenItem { key, name, slot, quality, set, enchant, effectiveEnchant, contributionLog10 }` (Infinity = "required"); `SearchStats { candidates, positions, leaves, bounds, evaluations, exhaustive, complete, ms }`; `SweepResult { baselineLog10, excluded, levels, changes }`.
- Pipeline per level and branch: pool filter + structural "no effect"; standalone best-case ranking and bot rule per slot; greedy coordinate ascent; finalists; set-subset test; exact branch-and-bound over open positions with an optimistic per-coordinate bound (directions measured at three sample points); 1-swap polish (and optional pair polish); Resonator excluded/forced branches; contributions and effective levels.

### Data glue and reports
- `src/data/optimize.ts`: `optimizerProblem(model, inputs)`, `createOptimizer(model, inputs, options)` (Legion defaults to the model's `Items.LegionReward` default), `SerializedInputs` + `serializeInputs`/`deserializeInputs`.
- `src/data/optimizerReport.ts`: `formatMultiplier(log10)`, `comparePreset(opt, model, row, presetCode, inputs)` → `{ shared, onlyPreset, onlyBest, gapLog10, presetScoreLog10, unmetRequirements, … }` (requirements now evaluate formula bonuses), `presetReport`, `sweepReport`.
- **`src/data/golden.ts`** (section 13): `GUIDE_CASES`, `GUIDE_VARIANTS`, `TEMPORALIST_ENCHANT_PRIORITY`, `equipAt`, `presetLoadout`, `setItems`, `loadoutScore`, `removalGains`, `swapGains`, `perLevelGain`, `experienceElasticity`, `catalystTie`.
- `src/data/scriptEntry.ts`: single re-export entry for Node scripts.

### Web Worker (`src/worker/`)
- `protocol.ts` (`OptimizeRequest`, `WorkerRequest`, `WorkerResponse`), `optimizerHost.ts` (`OptimizerHost(post)`), `optimizer.worker.ts`, `optimizerClient.ts` (`OptimizerClient`, `OptimizeCancelled`, `WorkerLike`), `inProcessWorker.ts` (`InProcessWorker` for tests).

### CLI (`scripts/run-optimizer.mjs`, `npm run optimize -- …`)
`--class <id>` (required), `--levels 0-55 | 0,10,20`, `--all-levels`, `--pet`, `--spells 60,6,88`, `--stance`, `--snapped 69,4` (empty string = none), `--score`, `--no-idle`, `--legion on|off`, `--no-resonator`, `--input Id=value` (repeatable; big values like `1e400` → Decimal), `--override item-key=level`, `--exclude-slot Slot`, `--pruning bot|none`, `--thorough` (pair polish depth 2, node budget 1e6), `--preset "<ids>" --preset-level N`, `--relevance N`, `--json out.json`. Example: `npm run optimize -- --class oni --levels 17 --preset "104;113;1;29;18;32;48;68;54;84;76;1002;211;301;411;417;91;2007;3003;509" --preset-level 17`.

### Performance
`docs/optimizer-benchmark.md` (before `validate`: Oni 2.6 s, Shaman 8.7 s, Temporalist 7.7 s full sweeps). After `validate`, the Shaman browser sweep 0–55 took 5.3 s in the UI smoke test and golden levels take ~25–150 ms each. `npm test` runs a 4-level performance test (< 20 s total).

### Accuracy tests
- `src/engine/optimizer.test.ts` (random catalogues vs brute force: `pruning: "none"` exact on 12/12 seeds; bot pruning ≥ 30 of 36 seed×level cases, ≥ 32 with `polishDepth: 2`; branches, bonus levels, set pieces, requirements, overrides, exclusion reasons, sweep change detection, relevance).
- `src/data/optimize.test.ts`: per class at the guide level — valid loadout, complete search, Resonator forced, effective level = level + 5, ≥ preset score when the preset meets requirements, ≥ 6 shared items; relevance; performance.
- `src/worker/optimizerHost.test.ts`: protocol, progress, cancellation, errors, Decimal inputs.

### Known limitations of the optimizer
1. The default pruning is a heuristic; only `pruning: "none"` is exhaustive, and it relies on the assumed monotonicity.
2. The per-coordinate bound is loose; adding runners-up makes the search explode.
3. Requirement enablers are only found if the greedy/marginal ranking picks them up.
4. Cancellation in the worker takes effect between levels; `terminate()` stops at once.
5. One set of inputs for all levels; per-item quality from `owned`; Mythics only if owned (inherent effects only).
6. The "changed" flag compares item keys only.
7. `relevance()` costs ≈0.3–0.5 s; `Idle.Active` always shows.

## 10. UI (plan todo `ui`: done; unchanged in `validate`)

- `App.tsx` (state, model on the main thread, two worker requests with `sweepKey`/`quickKey`, persistence, tabs Setup / Inputs (N shown) / Items / Results, "Copy share link"), `useOptimizer.ts` (quick run 500 ms after changes with relevance at the global level; full sweep on "Run" with progress and cancel), `SetupPanel.tsx`, `InputsPanel.tsx` (shown fields by group, hidden in a collapsed "Doesn't affect the ranking (N)" section; attribute points that any item requires are always shown), `ItemsPanel.tsx` (global enchant, Legion, Resonator, slots with Paragon unlocks and SubParagon buttons, owned items table with quality and enchant overrides, `ItemDetails.tsx`), `ResultsPanel.tsx` (sweep/quick results, branch comparison, 20-row table, change table, assumptions and unverified data, items left out, compute time), `state.ts` (state model, input parsing, URL/compact encoding), `model.ts` (`buildUiModel`, `inputFields`, `GROUP_ORDER`, `PARAGON_SLOT_UNLOCK`, `PARAGON_SOURCE`, `BOT_SUB_PARAGON`, `botSubParagonSlots`), `persistence.ts`, `format.ts`, `styles.css`.
- State / URL format: `#s=<base64url(JSON)>` (and localStorage `idlewizard-item-calc:state:v1`), keys only when differing from `defaultState(c)`: `c` class, `p` pet, `s` spells, `t` stance, `d` idle, `n` snapped, `o` score, `i` inputs, `e` enchant, `v` overrides, `q` owned differences (indices into QUALITIES, -1 = not owned), `x` excluded slots (indices into ITEM_SLOTS), `r` Resonator, `l` Legion, `w` full sweep. If ITEM_SLOTS or QUALITIES order changes, bump the format. New inputs (`Misc.AttributeCap`, `Char.LevelRequirementReduction`) appear automatically in the inputs form when relevant.
- Run locally: `npm run dev` → http://localhost:5173/idlewizard_item_calc/; `npm run build && npm run preview` → http://localhost:4173/idlewizard_item_calc/; `npm run build && npm run ui-smoke` (headless Chrome via `playwright-core`, `CHROME_PATH` overrides; `SCREENSHOTS=<dir>`; needs `all` permissions; never selects Chronomancer).
- Known UI limitations: page bundle includes the whole data layer; quick run re-optimizes on every change; relevance only at the global level; SubParagon buttons use the bot's numbering (assumption); changing class resets inputs; **no "compare with guide preset" in the UI** (the CLI and `golden-diagnose.mjs` have it).

## 11. Tests (`npm test`: 215 passing in 18 files)
- Engine: `expr`, `graph`, `stats`, `relevance`, `decimal`, `loadout` (11, incl. formula attribute bonuses), `optimizer` tests.
- Data: `itemText`, `items` (12, incl. Razorspaulders and phylactery/level-reduction worked examples), `attributes` (12, incl. attribute cap and level-requirement perks), `coverage` (3), `classData` (10, incl. cast counts not doubled at burst), `buildModel` (20), `optimize` (7).
- **Golden: `src/golden/golden.test.ts` (42)**: every preset × variant (expected missing items pinned; gap bounds), the Temporalist enchant priority (21 items), the Lucky/Miniaturized tie, character-experience scalings, snapped-spell scalings.
- Worker: `optimizerHost` (4). UI: `state` (12), `App` (3, jsdom).

## 12. Next steps

### Remaining plan order
1. **chronomancer-blind-check** (next; protocol below).
2. **deploy**: `.github/workflows/deploy.yml` (build with `npm ci && npm test && npm run build`, upload `dist/` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`; trigger on push to main). The repo exists at `github.com/ramSilva/idlewizard_item_calc`; enabling Pages can't be done via `gh` here (auth broken) — report it for the user to enable (Settings → Pages → Source: GitHub Actions).

### Remaining blind protocol for `chronomancer-blind-check` (do this exactly)
1. Still before reading any gear: run the optimizer on `defaultSelection("chronomancer")` (and, as documented variants, `snapped: [69, 4]` and Legion on/off), e.g. `npm run optimize -- --class chronomancer --levels 0,5,10,20,40 --all-levels --relevance 20` (add `--thorough` for the final numbers; `--snapped 69,4` and `--legion on` for the variants), and write `validation/chronomancer/tool-result.md`: best set at a few enchant levels (e.g. 0, 5, 10, 20, 40), each item's contribution (score with vs. without), the inputs used (copy from `setup-used.md` plus any the optimizer adds, e.g. Legion off by default, all non-Mythic items owned at max quality, attribute cap 250) and the relevance summary, plus the excluded-by-requirement items (the guide's attributes are low). Consider restricting "owned" to items obtainable in the guide's era (e90–e220+ Mysteries, v1.35.0) if `items.json` acquisition data states Mysteries unlocks, and the slots/enchanting/attribute cap unlocked at that Paragon level (section 7); record the rule used. Commit and push it.
2. Only then read the guide's gear: fetch `Chronomancer Guide Updated` from the Fandom API (the phase sections' GuideBox/spell-set neighbours, `items*` params / item templates, and the High Level Snapshot Optimization prose that was dropped). Resolve any item preset codes with `presetItems` (Fandom-era IDs may differ; check names). `comparePreset` gives shared/only-in lists; `golden-diagnose.mjs`-style removal/swap gains (`removalGains`, `swapGains` in `src/data/golden.ts`) explain each difference.
3. Write `validation/chronomancer/comparison.md` slot by slot; classify each difference as likely tool bug/missing data (fix it, never just to force a match), different assumption/outdated guide (list it; the guide is v1.35.0 and predates many items), or unclear (say what would settle it). Report the match rate, fixes and open differences.

## 13. What was done in `validate` (plan todo: done)

Full write-up with evidence and classifications: `validation/golden-report.md`. Tools: `src/data/golden.ts`, `src/golden/golden.test.ts`, `scripts/validation/golden-diagnose.mjs`.

### Golden match rates (slots matched / 20; ratio best / preset under the model)
| Case | Before | After (defaults) | After (guide-attribute variant) |
|---|---|---|---|
| Oni LS 13+5 / 17+5 / 39+5 | 10 / 9 / 10 | 14 / 14 / 17 | `oni-spellcraft` (Spellcraft 200): 15 / 15 / 18 |
| Shaman 20+5 / 28+5 | 14 / 15 | 16 / 17 | `shaman-maxed` (Dom/Emp/Pat 250, Mas 200): 19 / 20 |
| Temporalist 11+5 / 15+5 / 22+5 / 34+5 | 11 / 13 / 15 / 12 | 16 / 18 / 19 / 16 | — |

Totals 109/180 → 147/180 (defaults) → 156/180 (with variants). Gaps shrank from ×1e3–×1.4e5 to ×1–×47 (defaults: Shaman ×7.7e3 at 20+5 because of the attribute state; the variant gives ×3.0).

### Fixes (evidence in section 4 and the report)
1. Phylactery exponent = character level + level requirement reduction (items, Int 75/Mastery 125 perks, input for pets/Renown); compounding reading kept.
2. Character level defaults 1000/2000 → 200 (Oni, Shaman, Chronomancer) / 250 (Temporalist, total XP 3.48e13) from the Wizard XP table and Legacy milestones.
3. Conjured Razorspaulders PAP +100% (verified via lower tiers and Fandom).
4. The Rubedo Engine / Ritual Disk double casts at cast time (inert in burst).
5. Formula attribute bonuses (Commissar's Torn Sleeve) count toward requirements; Oni pet level 600 → 750 (2 perks).
6. Item attribute bonuses capped at the attribute cap (`Misc.AttributeCap`, 250).
7. Expedition level 50 → 100 (Oni, Shaman, Temporalist: presets use key-locked-location drops).
8. Temporalist production on Mana Gems (share 1; Ley Temporal Singletons 0).
9. "(base)" = additive evidence noted (Fandom), reading unchanged.
Suspects that turned out not to be bugs: Symbol Of Authority (×1e17 before) is now modest at level 200 and not chosen; Inert Jade (×2e21 at enchant 0) is now ×8e6 at level 200 and is in both the preset and the best set; Necrotic Powerstone is now chosen for Temporalist; Gemshoes (the guide's feet up to 15+5) still loses to Boots Of Concentration, which the guide only takes from 22+5.

### Enchant-priority check (Temporalist)
18 of 21 listed items match the guide's per-enchant profit exactly (Clockcarers/Chronoboost 30%, Raiments pieces and Tranquil 25%, the 20% items, CAP items 20.28% vs 20%, Rubedo 12.5%, Tangerine 10%). Reality Prism (21.6% vs 42.9%) and The Amplifier (21.6% vs 28.4%) match on their burst part (the guide also counts the snap sets and the Void mana set); Anima Core (17.0% vs 8.67%) is a guide inconsistency (listed at the snap-only rate though it's in every burst preset). Lucky/Miniaturized tie: ours 4.3e7 / 6.6e9 catalysts at enchant 1 / 40 vs the guide's 1.6e8 / 3.2e10 (same slope, ×4 offset; unclear).

### Elasticities
Stat scalings unchanged (section 6 table). Character-experience scaling: Oni 0.63 (guide 0.39), Shaman 1.11 (0.88), Temporalist 1.48 (1.34) (unclear; see gap 13). Stabilize The Flow snapped Inc ~1 (guide ~1); Gem Resonance snapped Inc ~0.01 (guide ~1.12; unclear, no ranking effect).

### Remaining open differences (classified in the report)
- Oni: Spellweaving Kilt at the Minimum attributes (assumption); Raiments + Eastern Tale vs Power Armor (unclear: accumulated starting casts and the attribute cap with Commissar's +60); Incantations Restructuring vs Daemonics Reverse-Engineering (unclear; contradicts the guide's own scalings).
- Shaman: Morbid Loop / Rugged Wristcoat / Chemical Toolbelt at the e550 starting attributes (assumption, per the guide's note); Falconer's Warm Cape vs The Magnifier at 20+5 (unclear: close crossover, our PAP scaling 1.44 vs 1.68).
- Temporalist: Murmuring Spellbook vs Arcane Accelerator (placeholders: Murmuring wins above ~1.5e11 spells cast at 2e9 catalysts); Gemshoes / Conjured Ragecrown / Collar Of Obedience vs earlier 5-piece Raiments (unclear); 34+5 Miniaturized vs Lucky (the ×4 tie offset), The Amplifier vs Flaming Cape (starting casts, unclear), Destabilized Evocations vs Self-Reflection (×1.01 tie).
