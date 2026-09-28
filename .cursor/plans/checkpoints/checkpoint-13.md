# Checkpoint 13 (final): all plan todos done; source for the final report

> **Addendum (2026-09-27, after the report): Pages is now enabled and the site is live.** Sections 6 and 8 below describe the earlier state.
> - Pages was enabled without `gh` by pushing a built `dist/` (from `fbd0161`) as an orphan `gh-pages` branch over SSH. GitHub auto-enabled Pages from that branch: the repo API reports `has_pages: true`, and the "pages build and deployment" run succeeded. https://ramsilva.github.io/idlewizard_item_calc/ returns 200, and its JS, CSS and worker assets load under the base path.
> - `SMOKE_URL=https://ramsilva.github.io/idlewizard_item_calc/ npm run ui-smoke` passes against the live site (Oni auto result, Shaman sweep 0–55 in about 5 s, share-link restore, no errors).
> - Because Pages serves `gh-pages` rather than Actions, `deploy.yml` now builds and force-pushes `dist/` to `gh-pages` with `GITHUB_TOKEN` (`contents: write`) instead of using `actions/deploy-pages`. That keeps working without changing repository settings. It still runs only on push to `main` or manually, so it takes over once the branch is merged. Until then the live site is the manual deploy of `fbd0161`.
> - Remaining manual step: review and merge `feat/item-optimizer` into `main`. Agents must not merge.
>
> **Addendum 2 (2026-09-28): attribute cap corrected after an in-game test.** In an Oni setup (205 Empathy assigned, pet level 827, so Commissar's Torn Sleeve pushes Empathy past 250), the player found that Bite Sleeves beats the suggested Conjured Sawrings with nothing else swapped. The model had capped assigned points plus item bonuses at `Misc.AttributeCap`. `AttrEffective.<A>` is now `Attr.<A> − max(AttrPoints.<A> − cap, 0)`: only assigned points are capped. That setup now picks Bite Sleeves (×17.8 over Sawrings), pinned by the "in-game check" test in `src/data/optimize.test.ts`.
> - **Golden results:** Oni LS 17+5 goes from 14 to 16 of 20 and its Spellcraft variant from 15 to 17. Shaman and Temporalist picks, the enchant-priority check and the scalings are unchanged. Totals: 149/180 with defaults (was 147) and 158/180 with the variants (was 156).
> - **Second Chronomancer check** (secondary, non-blind): 17/18 at enchant 20 (was 16/18). Shoulder and Wrist now match the guide; a new Waist tie appears (Encircling Trophies vs Collar Of Obedience, ×1.01).
> - **First Chronomancer check:** unchanged. The blind files were not touched.
> - Details are in `validation/golden-report.md` (fix 6) and `validation/chronomancer-ioyh/comparison.md` (addendum). Sections 4, 5 and 7 below show the earlier numbers.

Final handoff. Every plan todo in `.cursor/plans/idle_wizard_item_optimizer.plan.md` is `completed`. This file is the source for the final report to the user. Deep technical detail (game mechanics with wiki URLs, engine APIs, stat lists, per-run Chronomancer data, how to add classes/spells/pets) is in `checkpoint-12.md` (committed in `e836e09`), which stays valid: nothing in the engine, data or validation changed in this step.

## 1. Constraints (unchanged)

- Branch `feat/item-optimizer`; never merge into main, never open or edit PRs. Standing permission to commit and push (one-line messages; SSH push URL only, never HTTPS; never inspect credential stores). Never stage `.idea/`.
- `gh` CLI auth is broken for ramSilva (active account is another, invalid user), so Pages can't be checked or enabled through `gh`. Don't try to fix auth.
- Never edit the blind records: `validation/chronomancer/tool-result.md`, `tool-result*.json`, `cli/`; `validation/chronomancer-ioyh/guide-setup.md`, `tool-result.md`, `tool-result*.json`, `cli/`.

## 2. Repo state

Commits on `feat/item-optimizer` (all pushed): the 50 listed in checkpoint-12 section 2, then
- `e836e09` Add checkpoint 12 and mark the second Chronomancer blind check completed
- **`0f4bde4` Add GitHub Pages deploy workflow and branch CI workflow**
- **`807282c` Add README**
- (this checkpoint and the plan status, committed right after this file was written)

`origin/main` is at `eac6a89` (untouched by this work). Repo https://github.com/ramSilva/idlewizard_item_calc is public, default branch `main`.

## 3. What was implemented, per plan todo

1. **setup-repo:** repo at `~/Documents/dev/personal/idlewizard_item_calc`, repo-local ramSilva noreply identity, Vite 8 + React 19 + TypeScript 6 + Vitest 5 + ESLint 10 + `break_eternity.js`, `base: "/idlewizard_item_calc/"` (`425772a`). Public GitHub repo under ramSilva with SSH push.
2. **scrape:** `scripts/scrape/` fetches wikitext through the wiki.gg MediaWiki API (Cloudflare only blocks `/wiki/` HTML), with a Playwright `action=raw` fallback and then the Fandom API. Snapshot: **287 pages, all from wiki.gg via the API**, in `data-raw/wikigg/` + `data-raw/manifest.json` (revids). `scripts/data/` parses the Lua data modules into `src/data/generated/items.json` (223 items incl. 20 Mythic, 12 sets) and `spells.json` (226 spells). Fandom guides for validation in `data-raw/fandom/`.
3. **effect-model:** stat registry (`src/engine/stats.ts`, `src/data/stats.ts`), expression AST/parser (`expr.ts`), stat graph compiler with float and Decimal evaluators and incremental evaluation (`graph.ts`), required-input discovery.
4. **input-relevance:** `src/engine/relevance.ts`: structural log-factor decomposition drops constant terms and their inputs; numeric ratio-invariance check for mixed terms; one labelled input per value; hidden inputs listed with reasons. The optimizer runs it against real candidate sets; the UI shows hidden inputs in a collapsed "Doesn't affect the ranking" section; scores shown as relative multipliers.
5. **encode-data:** item text parser (`itemText.ts`) + formula overrides (`itemOverrides.ts`) for all 223 items: 405 modelled clauses at max quality, 17 not-production, 26 mechanic (unmodelled), 20 Mythic-random, 0 unparsed (`docs/item-coverage.md`, pinned by a test). Sets (cumulative tiers), enchant (1 + x)^level, bonus enchant levels (Resonator/Legion capped at 5; slot/self bonuses), attribute per-point bonuses and 74 perks, attribute cap, requirements (incl. item and formula attribute bonuses), phylacteries, Paragon slot unlocks.
6. **encode-classes:** Oni, Shaman, Temporalist hero abilities, stances and all spells (`spellBehaviours.ts`, 56 spells incl. Chronomancer and Ritual Of Potency), 18 pets (`pets.ts`), class defaults with source/verified flags (`classes.ts`), scores (`scores.ts`), model builder with elasticity helper (`buildModel.ts`).
7. **encode-chronomancer:** hero ability, Wormhole, Time Helix augment, Zombie, burst score; guide setup extracted blind with a filtering script (`scripts/validation/chronomancer-setup.mjs`) that strips all gear content.
8. **optimizer:** `src/engine/optimizer.ts`: pool filter (owned, requirements, excluded slots, no effect), per-slot best-case ranking with the BiS bot's keep rule, greedy ascent, set-subset test, exact branch-and-bound with optimistic bounds, 1-swap/pair polish, Resonator excluded/forced branches, marginal contributions, enchant sweep 0–55 with change detection. Web Worker with progress and cancellation (`src/worker/`); CLI `npm run optimize`.
9. **ui:** tabs Setup / Inputs / Items / Results (`src/ui/`): class, pet, stance, spells, snapped spells, score; generated input form grouped by stat group; items (global enchant, per-item overrides, owned/quality, Legion, Resonator, slot exclusion with Paragon unlocks and SubParagon buttons); results (best set, per-item contributions, branch comparison, per-level table and change table, unverified assumptions behind the result, excluded items). State in localStorage and a shareable `#s=` URL.
10. **validate:** unit tests for effect math and golden tests against the guide BiS presets (section 4); fixes listed in checkpoint-12 section 13.
11. **chronomancer-blind-check:** blind result committed (`7b01f3a`) before reading gear; comparison `06d2154`; fix `81da1e4` (section 5).
12. **chronomancer-blind-check-2:** blind result `ee64799`; comparison `f57f014`; fix `140bd65` (section 5).
13. **deploy:** `.github/workflows/deploy.yml` and `.github/workflows/ci.yml` (`0f4bde4`), `README.md` (`807282c`) (section 6).

## 4. Test results

- **Local, from a clean state** (`rm -rf node_modules dist && npm ci && npm run lint && npm test && npm run build`, Node 22.23.2, npm 10.9.8, in the network-restricted sandbox, so the tests don't reach the wikis): `npm ci` 0 vulnerabilities; lint clean; **221 tests passing in 18 files** (~9 s); build OK (page 699 kB, worker 468 kB; `dist/index.html` and the worker URL use `/idlewizard_item_calc/`).
- Test breakdown: engine (`expr`, `graph`, `stats`, `relevance`, `decimal`, `loadout`, `optimizer` incl. random catalogues vs brute force: `pruning: "none"` exact 12/12 seeds, bot pruning ≥ 30/36), data (`itemText`, `items`, `attributes`, `coverage`, `classData`, `buildModel` 26, `optimize` 7), **golden 42** (`src/golden/golden.test.ts`), worker 4, UI `state` 12 + `App` 3 (jsdom).
- UI smoke test (`npm run ui-smoke`, headless Chrome): last passed after `validate`; not rerun in this step (no UI changes).
- **Golden match rates** (slots matched / 20 against guide BiS presets; `validation/golden-report.md`): Oni LS 13+5 / 17+5 / 39+5: 14 / 14 / 17 (defaults), 15 / 15 / 18 (`oni-spellcraft`); Shaman 20+5 / 28+5: 16 / 17, 19 / 20 (`shaman-maxed`); Temporalist 11+5 / 15+5 / 22+5 / 34+5: 16 / 18 / 19 / 16. **Totals 109/180 before validate → 147/180 (defaults) → 156/180 (with guide-attribute variants).** Gaps (best/preset under the model) shrank from ×1e3–×1.4e5 to ×1–×47.
- **Enchant-priority check (Temporalist):** 18 of 21 listed items match the guide's per-enchant profit exactly; Reality Prism and The Amplifier match on their burst part (guide also counts snap/Void sets); Anima Core is a guide inconsistency. Lucky/Miniaturized tie: same slope, ×4 offset (unclear).
- **Elasticities** (ours vs guide): Oni Evo/Inc/CAP/PAP 1.000/6.075/1.175/1.350 vs 1.04/7.14/1.55/2.06; Shaman Inc/Summon/CAP/PAP/Idle 0.920/7.726/1.992/1.260/2.649 vs 0.92/7.76/1.997/1.676/2.62; Temporalist Evo/Inc/CAP/PAP 1/4.013/1.013/1 vs 1/4/1/1; Chronomancer (successor guide) Idle 2.016 vs 2.0155, Inc 3.1 vs 3; In Over Your Head Inc/PAP 4.10/2.000 vs 7.39 (whole-run figure)/2. Character-experience scalings higher than the guides (Oni 0.63 vs 0.39, Shaman 1.11 vs 0.88, Temporalist 1.48 vs 1.34; unclear).

## 5. Chronomancer comparisons

### First: Fandom "Chronomancer Guide Updated" (stat-level; `validation/chronomancer/comparison.md`)
- **The guide names no items** in any of its 24 revisions, so item-level match is n/a (0/13 slots have a guide item). Its gear advice is stat priorities; a stat-level rule was defined after reading and applied to the recorded blind set.
- **Blind headline (`era-notes`, enchant 10): 13/13 slots supply a guide burst stat, 10/13 have a guide stat as main stat, 4/5 guide stat categories present** (maximum Time Distortion missing because Stabilize The Flow is snapped with the pre-burst gear). Base rate: 56% of available items carry any guide burst stat.
- Fix: `81da1e4` (zero defaults of Void traps / spell charges made the `void-mana` and charged-spell scores 0 for every set).
- Open: B1 no max-TD item (informed `unsnapped-stf` run picks both max-TD items); B2 generic-profit main stats; B3 PAP scaling 0.30 vs successor 0.6 (placeholder PAP base); C1 guide's 3% idle per Patience vs 2.5% on the wikis (ranking-invariant); C2 build-phase gear not compared (no build-phase score).

### Second: Fandom "In Over Your Head Chronomancer Guide" (item-level; `validation/chronomancer-ioyh/comparison.md`)
- Pre-declared rule: Burst Set preset at enchant 20 (no enchant label in the guide), 18 compared slots (Weapon fixed by setup, no Accessory in the Fandom preset).
- **Blind headline: 2/18 (11%); 2/15 (13%) without the three slots exposed by a disclosed filter leak** ("Kilt/Amp/Torc", items only in the guide's Snap sets). All 16 differences classified (a) missing data: the unique pet Temporal Paradox (PAP², charging speed) had been replaced by a Simulacrum stand-in. The Weapon inference (The Accumulator) was confirmed.
- Fix `140bd65`: Temporal Paradox + `production-with-pet` score; Ritual Of Potency granted by The Accumulator (5 new tests).
- **Secondary non-blind rerun: 16/18 (89%); 13/15 (87%) without exposed slots**; tool set ×2.17 the guide preset under the model; tool's Accessory = Falconer's Treats (= wiki.gg successor's).
- Open: Shoulder/Wrist coupled pair (b, attribute-cap assumption: Bite Sleeves' +75 Empathy lost at Empathy 250; an Empathy-175 sensitivity gives 18/18 at enchant 11–24 and a Razorspaulders → Leather Wrappings switch at 25, matching the successor's "24+5" note); Temporal Paradox tier (c, unstated; encoded 3); Incantation scaling 4.10 vs 7.39 (b, whole-run figure). No golden regression; first check's headline rerun identical.

## 6. Deployment and CI

- **`.github/workflows/deploy.yml`:** on push to `main` + `workflow_dispatch`; permissions contents read, pages write, id-token write; concurrency group `pages` (no cancel); build job: `actions/checkout@v7`, `actions/setup-node@v7` (Node 22, npm cache), `npm ci`, `npm run lint`, `npm test`, `npm run build`, `actions/configure-pages@v6`, `actions/upload-pages-artifact@v5` (`dist`); deploy job: environment `github-pages`, `actions/deploy-pages@v5`. Major versions checked with `git ls-remote --tags` on 2026-09-27 (latest: checkout v7.0.1, setup-node v7.0.0, configure-pages v6.0.0, upload-pages-artifact v5.0.0, deploy-pages v5.0.1) and their `action.yml` inputs read.
- **`.github/workflows/ci.yml`:** push to any branch except `main`, and pull requests; contents read; per-ref concurrency with cancel; same checkout/setup-node/ci/lint/test/build steps.
- Both validated locally: `@action-validator/cli` (schema) and `yaml@2 valid` (parser) pass.
- **CI run on `0f4bde4`: success** — https://github.com/ramSilva/idlewizard_item_calc/actions/runs/36329096827 (all steps green, ~50 s). One notice annotation: "The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026" (informational). CI on `807282c` (README): success (section 9).
- **The deploy workflow has not run** (it only triggers on `main`, which agents must not touch).
- **Pages is NOT enabled** (evidence, unauthenticated, 2026-09-27): `GET https://api.github.com/repos/ramSilva/idlewizard_item_calc/pages` → 404 `Not Found`; `GET https://api.github.com/repos/ramSilva/idlewizard_item_calc` → 200 with `has_pages: false`, `private: false`, `default_branch: main`; `GET https://ramsilva.github.io/idlewizard_item_calc/` → 404. `configure-pages` runs with `enablement: false`, so the first deploy fails until Pages is enabled.

## 7. Data that couldn't be obtained or verified

- **Unverified readings** (each carries a note; Results tab lists those behind a result): percentage item bonuses multiply ×(1+N%); "(base)" adds to the base; set tiers cumulative; slot/self bonus enchant levels uncapped at 5; phylacteries compound per character level + level requirement reduction; formula values read as fractions; weapon abilities (Thunderbird, Black Blade, Shard Of A Lost Dimension, Cataclysm) active during burst, Reality Prism fully charged; item attribute bonuses count for perks and per-point bonuses above the attribute cap, which limits assigned points only (corrected 2026-09-28, see addendum 2); Rubedo/Ritual Disk double casts at cast time; cost reductions add; unit of pet time (seconds), Void entity spawn rate and passive shard units unknown; Mysteries power additive; Chronomancer hero-ability time units; Mechanos Apexis KBB rate; Temporal Paradox tier (unstated, encoded 3) and "activations per second" read as pet charging speed; Ritual Of Potency's "RealCastsThisExile" read as the cast-count input.
- **Missing mechanics / data:** 26 item clauses unmodelled (`mechanic`, e.g. Heart of the Grave, Redeemer, Temporal Stabilizer, Berzerker, Spellstealer, Shadow-Scryer's Crystal Ball, Broomstaff Of Klevdariah, The Accumulator's activation); Mythic random bonuses; base Void profit per point, base click value, many magnitudes (class defaults are placeholders: CAP/PAP bases, efficiency bases, cast counts, Void mana, idle base); one set per score (no snapshot-set or build-phase scores); Time Fork not encoded (equivalent to Time Helix with 1.5× casts); spell/class/pet level requirements and pet level-requirement reductions (Ley Keeper, Geode) not modelled; elixirs not a setup choice; items have no release/era data; The Legion page not in the snapshot; the In Over Your Head Quasi-Realm's "PAP based on pet level" rule has no formula.
- **Playwright fallback:** implemented in `scripts/scrape/wiki.mjs` but **untested**: the wiki.gg API worked for all 287 pages, and only `playwright-core` (no bundled browser; used by the UI smoke test) is installed, not `playwright`.

## 8. Manual steps for the user

1. Review `feat/item-optimizer` (CI results on the branch's Actions page).
2. Enable Pages: repository Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Merge `feat/item-optimizer` into `main` (your call) to trigger the first deploy, or run "Deploy to GitHub Pages" manually from the Actions tab once it's on `main`. Site: https://ramsilva.github.io/idlewizard_item_calc/.
4. Optionally fix `gh` auth for ramSilva (not required for the above).
5. When using the app, replace placeholder magnitudes that the Inputs tab shows as ranking-relevant with real values from your save.

## 9. CI runs on `feat/item-optimizer`

| Commit | Run | Result |
|---|---|---|
| `0f4bde4` (workflows) | https://github.com/ramSilva/idlewizard_item_calc/actions/runs/36329096827 | success |
| `807282c` (README) | https://github.com/ramSilva/idlewizard_item_calc/actions/runs/36329186182 | success |

The commit that adds this checkpoint also triggers CI; its result is in the final report.
