# Idle Wizard item optimizer

A client-side web app that finds the best item set for [Idle Wizard](https://idlewizard.wiki.gg/). Pick a class, pet, stance and up to 6 spells; the app builds a score formula from the encoded game effects, asks only for the inputs that can change which set wins, and searches item combinations (in a Web Worker) at your enchant levels.

Live site: https://ramsilva.github.io/idlewizard_item_calc/

## How scores work

- Every game quantity is a named stat; classes, pets, spells, items and set bonuses are lists of effects on those stats. A score is an expression such as "Furious Strike mana per cast" or "production".
- Scores are shown as **relative multipliers** (against no items, or against another set). Factors that multiply every set equally are dropped, so absolute mana is never shown.
- **Only ranking-relevant inputs are asked for**, one labelled field per value. An input is hidden when it can't change which set wins: the log of the score is split into terms and terms that no item can affect are dropped (structural check); for mixed terms the input is varied across real candidate sets and hidden if the score ratios don't change (numeric check). Hidden inputs stay editable in a collapsed "Doesn't affect the ranking" section.
- Numbers beyond 1e308 use `break_eternity.js`; comparisons run in log space.

## Supported classes

Oni, Shaman and Temporalist (hero abilities, stances, all their spells and paired pets), plus Chronomancer (encoded for the blind validation checks, including the In Over Your Head pet Temporal Paradox). The full item database (223 items including 20 Mythics, 12 sets) is encoded; Mythics only use their inherent effect and are excluded unless marked owned.

## Data sources

- [idlewizard.wiki.gg](https://idlewizard.wiki.gg/) through its MediaWiki API: a committed snapshot of 287 pages in `data-raw/wikigg/` (items, sets, spells, pets, classes, mechanics pages and guides), with revisions in `data-raw/manifest.json`.
- [idle-wizard.fandom.com](https://idle-wizard.fandom.com/): the BiS Guide (algorithm design), the Chronomancer guides used for validation (`data-raw/fandom/`) and older item wording for cross-checks.
- Every encoded entity carries a source URL and a `verified` flag; unverified readings have a note, and the Results tab lists the ones behind each result.

## Development

Requires Node 22.

| Command | What it does |
|---|---|
| `npm run dev` | Dev server at http://localhost:5173/idlewizard_item_calc/ |
| `npm test` | Vitest unit and golden tests (offline) |
| `npm run lint` | ESLint |
| `npm run build` | Typecheck and build to `dist/`; `npm run preview` serves it at http://localhost:4173/idlewizard_item_calc/ |
| `npm run ui-smoke` | Headless Chrome smoke test of the built app (needs Chrome; `CHROME_PATH` overrides) |
| `npm run scrape` | Refresh the wiki snapshot (network); `-- --only "Title A,Title B"` fetches just those pages |
| `npm run build-data` | Convert the snapshot's Lua modules to `src/data/generated/*.json` |
| `npm run optimize -- --class oni --levels 17` | Optimizer CLI (`--pet`, `--spells`, `--snapped`, `--score`, `--input Id=value`, `--preset "<ids>" --preset-level N`, `--thorough`, `--json out.json`, …; see `scripts/run-optimizer.mjs`) |

`UPDATE_COVERAGE=1 npm test` rewrites `docs/item-coverage.md`.

## Validation

- [validation/golden-report.md](validation/golden-report.md): the optimizer against the Oni, Shaman and Temporalist guide presets (156/180 slots with guide-attribute variants), the Temporalist enchant-priority table and stat scalings.
- [validation/chronomancer/comparison.md](validation/chronomancer/comparison.md): blind check against the Fandom "Chronomancer Guide Updated" (the guide names no items, so the comparison is stat-level).
- [validation/chronomancer-ioyh/comparison.md](validation/chronomancer-ioyh/comparison.md): blind check against the Fandom "In Over Your Head Chronomancer Guide" (item-level: 2/18 blind, 16/18 after encoding the missing pet).
- [docs/item-coverage.md](docs/item-coverage.md) and [docs/optimizer-benchmark.md](docs/optimizer-benchmark.md).

## Known limitations

- Many class defaults are placeholder magnitudes (cast counts, CAP/PAP bases, efficiency bases, Void mana); set real values in the Inputs tab.
- Unverified readings include: percentage item bonuses as multipliers, "(base)" bonuses as additive, phylacteries compounding per character level, the attribute cap limiting only assigned points (item bonuses count above it; backed by an in-game test), weapon abilities active during the burst, and Temporal Paradox's tier. Full lists are in the reports above.
- One item set per score: snapshot sets and build-phase gear have no score of their own; snapped spells enter through inputs.
- The default search prunes like the Discord BiS bot, so it's a heuristic; `--thorough` or `pruning: "none"` searches more.

## Deployment

GitHub Pages serves the `gh-pages` branch. `.github/workflows/deploy.yml` lints, tests and builds on every push to `main` (or manually), then force-pushes `dist/` to `gh-pages`. `.github/workflows/ci.yml` runs lint, tests and build on other branches and pull requests. The Vite `base` is `/idlewizard_item_calc/`. `SMOKE_URL=https://ramsilva.github.io/idlewizard_item_calc/ npm run ui-smoke` smoke-tests the deployed site in headless Chrome.
