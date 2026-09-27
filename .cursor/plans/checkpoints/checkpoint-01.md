# Checkpoint 01: after `setup-repo` and `scrape`, at the start of `effect-model`

Handoff for the next agent. Read this file first, then the plan (`.cursor/plans/idle_wizard_item_optimizer.plan.md`, which is authoritative). The project is carried across several agents to limit context rot. When you finish a plan step, write `checkpoint-NN.md` next to this file in the same format.

## 1. The user's constraints (from the original task prompt, not all of it is in the plan)

- Work on branch `feat/item-optimizer`. Never merge into main, never open or edit PRs. Leave the branch for the user to review.
- **Commits and pushes:** the user has given standing permission for any agent to commit and push to this repo at its discretion. Commit in logical steps with brief one-line messages that say what was done (no rationale), and push `feat/item-optimizer`. Merging into main and opening or editing PRs are still NOT allowed. Never stage `.idea/` or other IDE config.
- Follow the plan's todo list in order. Scope for v1: Oni, Shaman and Temporalist (spells, stances, paired pets), the full item DB, plus Chronomancer for the blind check.
- Stack: Vite + React + TS, Vitest, `break_eternity.js`, client-side only, optimizer in a Web Worker, GitHub Pages via Actions with `base: "/idlewizard_item_calc/"`. The deploy workflow triggers on push to main. If Pages can't be enabled, say so in the final report.
- **Hard constraint 1:** every piece of information the calculation needs gets its own separate, labelled input, but ONLY if it can change which item set wins. Anything that scales all sets equally must not be asked for: use the structural log-factor check plus the numeric ratio-invariance check from the plan. Hidden inputs go in a collapsed section with an explanation. Show scores as relative multipliers.
- **Hard constraint 2: blind Chronomancer check** against https://idle-wizard.fandom.com/wiki/Chronomancer.
  1. Read ONLY the setup sections (spell loadouts per phase, pet, stance/passives, stated values). Filter the fetched page programmatically (e.g. `action=parse&prop=sections`, then fetch only the chosen sections and strip `ItemTooltip`, `items=` params and item lists) so item recommendations never enter your context.
  2. Run the tool and save the result to `validation/chronomancer/tool-result.md` BEFORE looking at the guide's gear.
  3. Then read the gear and write `validation/chronomancer/comparison.md` slot by slot. Classify each difference as bug/missing data (fix it, never just to force a match), different assumptions/outdated guide (list it, don't chase it), or unclear (say what would settle it).
  - **Do not open the wiki.gg pages** `Chronomancer Guide`, `Chronomancer Guide Updated` or `In Over Your Head Chronomancer Guide`. The scraper excludes them on purpose. `data-raw/wikigg/Chronomancer.wikitext` is the class page (hero ability and spell list). Before reading it, check its headings to make sure it has no gear section.
- Never answer from memory about game mechanics. Encode from the wiki source, keep a source URL and a `verified` flag on every encoded entity, and mark anything unverifiable as unverified.
- Code style: only add comments for non-obvious rationale, invariants or external constraints (e.g. wiki quirks).
- Final report must cover: what was done per plan todo; test results (unit, golden, and the Chronomancer comparison with match rate and open differences); data that couldn't be obtained or verified; whether the Pages workflow exists and whether Pages is enabled; and anything the user must do manually.
- The user's rules also say: recommend a better-suited model if there is one; commit messages are one-liners.

## 2. Repo state

Commits on `feat/item-optimizer`:
1. `425772a` Scaffold Vite + React + TypeScript app with Vitest and break_eternity
2. `d5a00e1` Add wiki scraper, raw wikitext snapshot and Lua data conversion

Uncommitted, but typecheck and lint pass:
- `src/engine/expr.ts`: Expr AST (`num`, `ref`, `bin`, `neg`, `fn`), plus an infix parser `f(source, bindings)`. Identifiers containing a dot are stat ids; single letters are bound through `bindings` so formulas read like the wiki's. Supported functions: `log10 ln log(base,x) max min sqrt ge lt if(c,a,b) floor abs`. Also has `refsOf`, `toInfix`, and `toPostfix` (the BiS bot prints formulas in postfix).
- `src/engine/model.ts`: types for `Source`, `StatDef` (value = `(base + Σadd) × Πmul`; base is an input, a constant or an Expr), `Effect`, `InputSpec`, `ItemDef`/`ItemTier`/`ItemEffect`/`EnchantDef`, `SetDef`, `SpellDef`, `SpellBehaviour`, `StanceDef`, `ClassDef`, `PetDef`, `ScoreDef`, plus `ATTRIBUTES`, `QUALITIES`, `ITEM_SLOTS`, `SLOT_CAPACITY`.
- `src/engine/graph.ts` was about to be written and **does not exist yet** (the write was aborted).

Tooling: `npm test` (Vitest, one smoke test), `npm run build`, `npm run lint`, `npm run scrape` (needs network), `npm run build-data` (Lua to JSON). Versions: Node 22, Vite 8, Vitest 5, TypeScript 6, React 19, ESLint 10. `.gitignore` covers node_modules, dist, coverage, Playwright artifacts, .env, .idea, .vscode.

Git identity is set repo-locally (ramSilva, noreply email). `gh` CLI auth is broken: the active account is a different, invalid user. So `gh` can't be used to check or enable Pages. Report that rather than switching accounts.

## 3. Data acquisition (plan todo `scrape`: done)

- **The wiki.gg MediaWiki API works with plain `fetch`/curl right now** (`https://idlewizard.wiki.gg/api.php`). The plan expected a Cloudflare 403, but that only applies to `/wiki/...` HTML pages. The sandbox needs `full_network` permission for these hosts.
- `scripts/scrape/wiki.mjs` and `scrape.mjs`: batched `prop=revisions` calls (50 titles each), handling redirects and normalization. The fallback chain is Playwright headless Chromium (`action=raw`, only used if the `playwright` package is installed; it is not installed and this path is untested), then the Fandom API.
- The latest run fetched **281 pages, all from wiki.gg via the API**, with nothing missing. Output is in `data-raw/wikigg/*.wikitext` (filenames replace `/:` with `__` and other odd characters with `_`, e.g. `Temporalist Guide (e550_).wikitext`). `data-raw/manifest.json` records title, resolved title, URL, revid, revision timestamp and method for each page.
- The scrape covers: modules (`Module:Data/Items`, `Data/Spells`, `Data/Familiars`, `Data/Classes`, `Data/ManaSources`, `Module:Items`, `Module:Spells`, `Module:BiS`), mechanics pages (Items, Attributes, Enchantments, Stance, Elixir, Basic Mechanics, Paragon, plus redirects), the class pages Oni, Shaman, Temporalist and Chronomancer, the guides (Oni Guide, Shaman Guide, Temporalist Guide (e300-e550), Temporalist Guide (e550+)), all of `Category:Pets` and all of `Category:Items`.
- `scripts/data/lua-table.mjs` is a small Lua data parser (tables, strings, long strings, `..` concatenation, references like `p.mythicDescription`). `scripts/data/build-data.mjs` writes `src/data/generated/items.json` (223 items including 20 Mythic, and 12 sets) and `spells.json` (226 spells). Each item carries `id, name, slot, set, startQuality, requirements, tiers[{quality, desc}], enchant, acquisition, details (the item page's ==Details== section, which 17 items have), source`.
- Fandom API (`https://idle-wizard.fandom.com/api.php`) also works. The BiS Guide was read from Fandom for the algorithm design and is **not** in `data-raw`. Scratch files under `/tmp/iw` won't carry over.

## 4. Game mechanics found so far (all from wiki source; cite these URLs when encoding)

**Items** (`Module:Data/Items`; https://idlewizard.wiki.gg/wiki/Items, https://idlewizard.wiki.gg/wiki/Enchantments):
- There are 18 slot types. Finger and Trophy hold 2 each, so 20 slots are equipped. Qualities run Common..Legendary, plus Unique (fixed max) and Mythic. `Tiers[i]` corresponds to quality `startQuality + i`.
- Set tier `i` applies at `i+1` pieces (per `Module:Items` `SetInfo`). I'm assuming tiers are cumulative (unverified).
- Enchanting is only possible on Legendary/Unique items. Max level is 55. Cost is 100 × 1.5^level. **Levels stack multiplicatively: (1 + x)^level.**
- Bonus enchant levels are capped at 5 and only apply to items with at least 1 enchant level. Resonator Ring gives +1/+2/+3/+4 by quality (Legendary = 4). The Legion is a reward (not an item) worth +1; model it as a boolean input. The Power Armor 7-piece bonus "Finger Items Enchantment level +4" and the Raiments bonus "Hands Items Enchantment level +N" are slot-specific. Whether those count toward the cap of 5 is unverified.
- Item text is "X +N%" (read as a multiplier, `×(1+N)`), "X (base) +N%" (additive to the base value) and "Attr +N". Supporting evidence for that reading: the Enchantments page says edust bonuses are "multiplicative unless stated otherwise", and the Stance page explicitly flags additive items (Grasp Of The Grave) versus multiplicative ones (Kata Bracers). The default multiplicative stacking of item bonuses is still unverified, so flag it.
- There are about 275 distinct clause patterns. Formula items that need hand encoding include Pitch-black Cage, Ceaseless Hunger, Commissar's Torn Sleeve ("all attributes N × Pet Level"), Murmuring Spellbook, Arcane Accelerator/Engine, Miniaturized Accelerator, Enigmatic Parchment, Collar Of Obedience, Symbol Of Authority, Simple Memento, Paukan, Recaller Stone, Habitstone, the phylacteries ("Scales multiplicatively from Character level", some "decreases"), and weapons with `details`.
- Mythic items have random bonuses and a user-chosen enchant. Parse only the inherent effect, and exclude them from the default search.
- Requirements check: the wiki note says item attribute bonuses do count toward requirements, but "Fill" ignores them. Plan: requirement met if `assigned + bonuses from other equipped items >= requirement` (unverified).
- Guide item presets like `#7#BURST@104;113;1;29;...` are 20 item IDs from the `IDs` table in `Module:Data/Items` (`-1` means empty). Ordering doesn't matter since IDs are unique. They assume Legendary, or Unique for Quality 6. Tab labels like "Living Sin 17+5" mean enchant 17 plus 5 bonus levels.

**Attributes** (https://idlewizard.wiki.gg/wiki/Attributes): each point is multiplicative, (1 + B)^X. Per-point values: Int 2.5% Mysteries power, Ins 2.5% VM/entity, SC 3.00% Evo, Wis 2.5% passive shards, Dom 3.0% autoclick profit, Pat 2.5% idle bonus, Mas 2.5% CAP, Emp 2.5% PAP, Vers 1.8% profits. The perks at every 25 points are listed on that page; encode them from there. Profit perks are multiplicative `×(1+X)` factors.

**Mysteries** (Basic Mechanics): Mysteries = sqrt(mana / 5e11). Each mystery adds 3% production. Int perks add to that 3% base (25 → 5% total, etc.), Int points multiply it, and Hungerer multiplies Mysteries power. So the production factor is `1 + M × MP`, which is roughly proportional to MP when M is large.

**Void mana:** production × (1 + VM × per-point). I couldn't find the base per-point value on the wiki. Make it an input with an unverified default of 1 (100%). Insight perks are "+12% (additive)" etc. During burst, VM is already collected, so VM-per-entity items don't matter there; VM-profit items do.

**Crit** (Basic Mechanics): expected click value = (1 − c) + c × CritProfit. Crit Rating R adds log10(R)% to chance and R% to base crit profit.

**Idle mode:** Basic Mechanics says to always burst in idle mode. Idle bonus multiplies production. Make "burst in idle mode" a boolean input (default true).

**BiS bot algorithm** (https://idle-wizard.fandom.com/wiki/BiS_Guide, "How it Works" / "Formula Generation"):
- It builds a postfix formula by substituting effects, multiplicative before additive, and drops items that don't affect it.
- Per enchant level, it scores each item "best case", treating every set effect as belonging to that item alone, and keeps items per slot until the first non-set item (2 for rings).
- It then tests every subset of each set against the non-set alternatives, and finally tries every remaining combination.
- It runs at least 40 levels and stops after 15 unchanged levels once the second-best set grows more slowly than the best. Resonator is handled as a separate branch.
- Defaults: attributes 175, max paragon (all slots). Pro=SubParagonN excludes slots: 12 Shoulder/Waist, 18 Neck/Rings, 24 Back/Wrist, 28 Weapon.
- Weapons are flagged as unreliable because their effects are self-scaling.

**Oni** (Oni.wikitext; guide `Oni Guide.wikitext`):
- Hero ability: PAP × [(PetT·G/3600+1)^0.5 · PetL^0.8 · C^0.5 · L/4e9 + 1] and Inc × [((I+1)·L·G^0.5/100)^0.65 / 250000 + 1].
- Stances: Meditation (charging), Defense (FS instant, divides incant duration), Berserk (Evo × [(I+1)·C^0.5·L·G/1e4 + 1]). Variables: G = CAP growth rate, C = CAP, L = char level, I = incantations cast this exile + 1.
- Burst setup: pet Living Sin (fallback Hungerer), stance Berserk. Spells 60 Ritual Of Power, 6 Goblet Of Fire, 88 Iron Blood, 89 Enhanced Strength, 107 Possessed Blade, 86 Furious Strike (score). Hellholes stand in for Circle of Power (building 6), Monuments for Spell Fountain (3), Grim Trophy for Enchanted Tree (4).
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

**Temporalist** (Temporalist.wikitext; `Temporalist Guide (e550_).wikitext`):
- Hero ability: profits × [(T^2.15·(S·G/16000)^1.78 + 1)·(X/1e7 + 1)·C^0.5·L/1e10 + 1] and Evo × [(T^0.5/40·(S·G/16000)^1.15 + 1)·C^0.5·L/5e6 + 1]. S = skipped years, X = total char XP, T = char time in hours, softcapped after 720h.
- Burst: pet Mechanos Apexis, which casts KBB (the score): Mana = (CharLvl + 2.5) × Evo × Mana/s × 8. Spells 73 Converge Timelines, 57 Ley Overdrive, 61 True Sorcery, 17 Superposition, 69 Stabilize The Flow, 4 Gem Resonance.
- Presets:
  - 11+5: `104;113;6;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`
  - 15+5: `104;113;1;29;11;34;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`
  - 22+5: `104;113;1;29;14;36;48;67;59;83;76;1005;207;300;411;408;92;2003;3005;508`
  - 34+5: `104;113;1;29;14;36;48;67;59;84;76;1005;207;300;411;408;92;2003;3005;508`
- Burst scalings: Evo 1, Inc 4, CAP 1, PAP 1, Idle/Void profit 1, Char XP 1.34.
- The guide's "Enchant Priority" section lists each item's exact profit gain per enchant level (e.g. Reality Prism 42.92%, Clockcarers 30%, Rubedo 12.5%). Those make a good golden test.
- Attributes: Int 155, Ins 140, SC 250, Wis 200, Dom 0, Pat 150, Mas 250, Emp 175.

**Pets** (encode from `data-raw/wikigg/<Pet>.wikitext`, "Pet Ability(ies)" sections):
- Living Sin: profits × [log10^5(X+1)·P·L^4·2 + 1], Evo × [P^0.35·L^2·0.001 + 1].
- Hungerer: Mysteries power × [X^0.4·L·P^0.9·100 + 1.5].
- Greater Chimaera: profits × [P·L·5 + 1], plus attributes.
- Herald of Rot, Risen Giant, Mechanos Apexis, Pit Lord, Archivist, Interrogator and Ley Keeper have also been read; their formulas are in those files.

**Spell math** is in `spells.json` (`math`, LaTeX). Summing the exponents gives elasticities close to the guides' tables: Oni about Inc 6.1 / CAP 1.2 / Evo 1.0, Temporalist Inc about 4.5, Shaman Summon about 7.5. That suggests the multiplicative model is structurally right.

## 5. Design decisions for the engine (not yet implemented)

- **Stat graph:** evaluate in topological order; detect cycles and unknown refs at compile time. Stats that nothing produces become inputs and need an `InputSpec`. "Other sources" base values (e.g. PAP from non-item sources) are inputs, and the relevance filter decides whether to show them. For example, Living Sin's `P^0.35·L^2·0.001 + 1` makes absolute PAP matter.
- **Production:** `Prod.Global` (a product of profit multipliers: items, attribute perks, pet, hero, incantations, mysteries, VM, idle) × `Σ_b Building.b.Share × Building.b.Profit`. Shares are inputs, defaulting to 100% in the class's main building (an assumption). Scores are e.g. FS = `Spell.EvocationEfficiency × Prod` (constants dropped), KBB likewise, and Shaman = total autoclick mana. Also offer generic scores (Evo, Inc, Sum, CAP, PAP, AutoClick, VM per entity) like the bot.
- **Evaluator:** a fast float path that keeps `lg[s]` (log10) per stat, sums logs through products and powers, and uses log-sum-exp for `+`. If the result isn't finite, fall back to a break_eternity `Decimal` interpreter. `Decimal` is also used for display and in tests.
- **Item modifiers per evaluation:** per-stat `add[]` and `logMul[]` arrays, plus gated dynamic effects for items whose effect is an Expr over other stats. Leaf evaluation steps: bonus levels B = min(5, Resonator + Legion) for items at level ≥ 1; add slot-specific extra levels; apply tier effects, enchant factor `(level + B + extra) × log10(1 + x)`, and set tiers by piece count.
- **Relevance (`src/engine/relevance.ts`):**
  - Structural pass: split log(score) into terms (mul/div/pow with an item-independent exponent, and a stat's multiplicative effects). Drop terms that reference no item-affected stat. An input used only in dropped terms is hidden. Inputs in the exponent of an item-dependent base stay relevant.
  - Numeric pass on the remaining inputs: evaluate a handful of candidate sets while varying the input (multiplicatively for `logScale` inputs, a range for attributes and thresholds, a flip for booleans). If the log-score differences between sets never change beyond ε, hide the input.
- **Optimizer:**
  1. Filter items: not owned, unmet requirements, excluded slot, or no effect on the score.
  2. Rank items per slot twice: standalone best-case (sets counted fully on the item), then marginal gain against a greedy set. Keep the union of the top candidates (2 for Finger/Trophy).
  3. Test set subsets against the best non-set alternatives.
  4. DFS branch-and-bound with an optimistic per-stat bound (per-stat direction checked numerically); exhaustive when small.
  5. Run separate branches with Resonator forced in and excluded.
  6. Sweep global enchant 0–55 (overrides respected) and report the levels where the best set changes. Per-item contribution = score with vs. without the item (slot empty).
- Item quality defaults to max; owned defaults to all non-Mythic items.

## 6. Next steps (plan order)

1. **effect-model:** write `src/engine/graph.ts` (compile, topological sort, float/log and Decimal evaluators), `src/data/stats.ts` (registry) and the required-input discovery. Unit-test the evaluators against each other and against hand calculations, including values above 1e308. Commit.
2. **input-relevance:** `src/engine/relevance.ts` plus tests, e.g. a blanket ×2 profit input must be hidden and a `P + 1` input must be shown.
3. **encode-data:** `src/data/itemText.ts` (clause parser into `ItemEffect`s, with unmatched clauses kept as `unmodelled`), manual overrides for formula items, set bonuses, bonus-enchant effects, and attribute perks. Add a test that reports how many clauses remain unmodelled.
4. **encode-classes:** Oni, Shaman, Temporalist (hero, stances, spells as `SpellBehaviour`), paired pets, and score definitions.
5. **encode-chronomancer:** follow the blind protocol in section 1.
6. **optimizer + worker**, then **ui**, **validate** (golden tests from the presets and scalings above), **chronomancer-blind-check**, and **deploy** (`.github/workflows/deploy.yml`).
