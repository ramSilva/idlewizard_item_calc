# Checkpoint 02: after `effect-model` and `input-relevance`, at the start of `encode-data`

Handoff for the next agent. Read this file first, then the plan (`.cursor/plans/idle_wizard_item_optimizer.plan.md`, which is authoritative). This file replaces checkpoint-01: everything still relevant from it is copied here, so you don't need to read it. The project is carried across several agents to limit context rot. When you finish a plan step, write `checkpoint-NN.md` next to this file in the same format, carrying forward everything still relevant.

## 1. The user's constraints (from the original task prompt, not all of it is in the plan)

- Work on branch `feat/item-optimizer`. Never merge into main, never open or edit PRs. Leave the branch for the user to review.
- **Commits and pushes:** the user has given standing permission for any agent to commit and push to this repo at its discretion. Commit in logical steps with brief one-line messages that say what was done (no rationale), and push `feat/item-optimizer`. Merging into main and opening or editing PRs are still NOT allowed. Never stage `.idea/` or other IDE config.
- Follow the plan's todo list in order. Scope for v1: Oni, Shaman and Temporalist (spells, stances, paired pets), the full item DB, plus Chronomancer for the blind check.
- Stack: Vite + React + TS, Vitest, `break_eternity.js`, client-side only, optimizer in a Web Worker, GitHub Pages via Actions with `base: "/idlewizard_item_calc/"`. The deploy workflow triggers on push to main. If Pages can't be enabled, say so in the final report.
- **Hard constraint 1:** every piece of information the calculation needs gets its own separate, labelled input, but ONLY if it can change which item set wins. Anything that scales all sets equally must not be asked for: use the structural log-factor check plus the numeric ratio-invariance check from the plan (now implemented, see section 6). Hidden inputs go in a collapsed section with an explanation. Show scores as relative multipliers.
- **Hard constraint 2: blind Chronomancer check** against https://idle-wizard.fandom.com/wiki/Chronomancer.
  1. Read ONLY the setup sections (spell loadouts per phase, pet, stance/passives, stated values). Filter the fetched page programmatically (e.g. `action=parse&prop=sections`, then fetch only the chosen sections and strip `ItemTooltip`, `items=` params and item lists) so item recommendations never enter your context.
  2. Run the tool and save the result to `validation/chronomancer/tool-result.md` BEFORE looking at the guide's gear.
  3. Then read the gear and write `validation/chronomancer/comparison.md` slot by slot. Classify each difference as bug/missing data (fix it, never just to force a match), different assumptions/outdated guide (list it, don't chase it), or unclear (say what would settle it).
  - **Do not open the wiki.gg pages** `Chronomancer Guide`, `Chronomancer Guide Updated` or `In Over Your Head Chronomancer Guide`. The scraper excludes them on purpose. `data-raw/wikigg/Chronomancer.wikitext` is the class page (hero ability and spell list). Before reading it, check its headings to make sure it has no gear section.
- Never answer from memory about game mechanics. Encode from the wiki source, keep a source URL and a `verified` flag on every encoded entity, and mark anything unverifiable as unverified (with a `note`; a test enforces this for the generic stats).
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
8. (this checkpoint and the plan status update, committed right after this file was written)

Every commit from 5 onwards typechecks and passes its tests on its own.

Tooling: `npm test` (Vitest, 38 tests in 5 files), `npm run build`, `npm run lint` (all three pass), `npm run scrape` (needs network), `npm run build-data` (Lua to JSON). Versions: Node 22, Vite 8, Vitest 5, TypeScript 6, React 19, ESLint 10. `.gitignore` covers node_modules, dist, coverage, Playwright artifacts, .env, .idea, .vscode. To run a TS file directly with Node (e.g. a benchmark), use `node --experimental-transform-types` (strip-only mode rejects the parser's parameter properties).

Pushing: `origin`'s push URL is SSH (`git@github.com:ramSilva/idlewizard_item_calc.git`), which authenticates as ramSilva, and `feat/item-optimizer` tracks `origin/feat/item-optimizer`. Plain `git push` works (the sandbox needs `full_network`). Do NOT push over HTTPS: the stored HTTPS credential belongs to the user's work account and returns 403. Do not inspect credential stores. The user wants this work done autonomously: agents may commit, push and spawn subagents without asking.

Git identity is set repo-locally (ramSilva, noreply email). `gh` CLI auth is broken: the active account is a different, invalid user. So `gh` can't be used to check or enable Pages. Report that rather than switching accounts.

Sandbox notes: `git worktree add` fails in the sandbox (can't write `.git/worktrees`), and `.cursor/` can't be created by shell commands in the sandbox (the file tools can edit files there). To check each commit separately, `git archive <sha> | tar -x --exclude='.cursor' -C .verify-<sha>`, symlink `node_modules`, run `tsc -b` and `vitest run` there, then delete the folder.

## 3. Data acquisition (plan todo `scrape`: done)

- **The wiki.gg MediaWiki API works with plain `fetch`/curl** (`https://idlewizard.wiki.gg/api.php`). The plan expected a Cloudflare 403, but that only applies to `/wiki/...` HTML pages. The sandbox needs `full_network` permission for these hosts.
- `scripts/scrape/wiki.mjs` and `scrape.mjs`: batched `prop=revisions` calls (50 titles each), handling redirects and normalization. The fallback chain is Playwright headless Chromium (`action=raw`, only used if the `playwright` package is installed; it is not installed and this path is untested), then the Fandom API.
- The latest run fetched **281 pages, all from wiki.gg via the API**, with nothing missing (278 files on disk because of redirects). Output is in `data-raw/wikigg/*.wikitext` (filenames replace `/:` with `__` and other odd characters with `_`, e.g. `Temporalist Guide (e550_).wikitext`). `data-raw/manifest.json` records title, resolved title, URL, revid, revision timestamp and method for each page.
- The scrape covers: modules (`Module:Data/Items`, `Data/Spells`, `Data/Familiars`, `Data/Classes`, `Data/ManaSources`, `Module:Items`, `Module:Spells`, `Module:BiS`), mechanics pages (Items, Attributes, Enchantments, Stance, Elixir, Basic Mechanics, Paragon, plus redirects), the class pages Oni, Shaman, Temporalist and Chronomancer, the guides (Oni Guide, Shaman Guide, Temporalist Guide (e300-e550), Temporalist Guide (e550+)), all of `Category:Pets` and all of `Category:Items`.
- `scripts/data/lua-table.mjs` is a small Lua data parser (tables, strings, long strings, `..` concatenation, references like `p.mythicDescription`). `scripts/data/build-data.mjs` writes `src/data/generated/items.json` (223 items including 20 Mythic, and 12 sets) and `spells.json` (226 spells). Each item carries `id, name, slot, set, startQuality, requirements, tiers[{quality, desc}], enchant, acquisition, details (the item page's ==Details== section, which 17 items have), source`.
- Fandom API (`https://idle-wizard.fandom.com/api.php`) also works. The BiS Guide was read from Fandom for the algorithm design and is **not** in `data-raw`.

## 4. Game mechanics found so far (all from wiki source; cite these URLs when encoding)

**Items** (`Module:Data/Items`; https://idlewizard.wiki.gg/wiki/Items, https://idlewizard.wiki.gg/wiki/Enchantments):
- There are 18 slot types. Finger and Trophy hold 2 each, so 20 slots are equipped. Qualities run Common..Legendary, plus Unique (fixed max) and Mythic. `Tiers[i]` corresponds to quality `startQuality + i`.
- Set tier `i` applies at `i+1` pieces (per `Module:Items` `SetInfo`). I'm assuming tiers are cumulative (unverified).
- Enchanting is only possible on Legendary/Unique items. Max level is 55. Cost is 100 × 1.5^level. **Levels stack multiplicatively: (1 + x)^level.**
- Bonus enchant levels: the Items page says bonus enchantment levels give "a number of free levels (up to 5) to all Enchantments on all items equipped", and only apply to items with at least 1 enchant level. The Enchantments page says The Legion's reward gives +1 and Resonator Ring +4 ("Enchant Level X+5"). Resonator Ring gives +1/+2/+3/+4 by quality (Legendary = 4). The Legion is a reward (not an item); it's the boolean input `Items.LegionReward`. The Power Armor 7-piece bonus "Finger Items Enchantment level +4" and the Raiments bonus "Hands Items Enchantment level +N" are slot-specific. Whether those count toward the cap of 5 is unverified.
- Item text is "X +N%" (read as a multiplier, `×(1+N)`), "X (base) +N%" (additive to the base value) and "Attr +N". Supporting evidence for that reading: the Enchantments page says edust bonuses are "multiplicative unless stated otherwise", and the Stance page explicitly flags additive items (Grasp Of The Grave) versus multiplicative ones (Kata Bracers). The default multiplicative stacking of item bonuses is still unverified, so flag it.
- There are about 275 distinct clause patterns. Formula items that need hand encoding include Pitch-black Cage, Ceaseless Hunger, Commissar's Torn Sleeve ("all attributes N × Pet Level"), Murmuring Spellbook, Arcane Accelerator/Engine, Miniaturized Accelerator, Enigmatic Parchment, Collar Of Obedience, Symbol Of Authority, Simple Memento, Paukan, Recaller Stone, Habitstone, the phylacteries ("Scales multiplicatively from Character level", some "decreases"), and weapons with `details`.
- Mythic items have random bonuses and a user-chosen enchant. Parse only the inherent effect, and exclude them from the default search.
- Requirements check: the Attributes page says item attribute bonuses do count toward requirements, but "Fill" ignores them. Plan: requirement met if `assigned + bonuses from other equipped items >= requirement` (unverified).
- Guide item presets like `#7#BURST@104;113;1;29;...` are 20 item IDs from the `IDs` table in `Module:Data/Items` (`-1` means empty). Ordering doesn't matter since IDs are unique. They assume Legendary, or Unique for Quality 6. Tab labels like "Living Sin 17+5" mean enchant 17 plus 5 bonus levels.

**Attributes** (https://idlewizard.wiki.gg/wiki/Attributes): each point is multiplicative, (1 + B)^X. Per-point values: Int 2.5% Mysteries power, Ins 2.5% VM per Entity, SC 3.00% Evo, Wis 2.5% passive shards, Dom 3.0% autoclick profit, Pat 2.5% idle bonus, Mas 2.5% CAP (unlocks at Paragon 5), Emp 2.5% PAP (Paragon 8), Vers 1.8% profits (Paragon 38, no perks). The perks at every 25 points are listed on that page; encode them from there (e.g. Int 25/50/100/125/175/225 add +2/+2/+3/+5/+10/+10 points to the 3% Mysteries power; Ins 25 "+12% (additive)" VM profit, 50 "+10% (multiplier)"; SC 25/75/125/225 incantation +15/20/25/25%, 50/100/175 summoning +25/20/30%; Dom 25/75/175/225 crit profit +100/200/300/300%, 50/100 crit chance +5, 125 crit rating +500; Mas 25/100 CAP growth +25/50%, 200 CAP +0.075%×achievement points; Emp 200 PAP +100%×log1.6(pet time×0.0005+1); several "profits +…" perks at 150/200/250 that need inputs such as spells cast, autoclicks, achievements, character level, pet level). Profit perks are multiplicative `×(1+X)` factors.

**Mysteries** (https://idlewizard.wiki.gg/wiki/Basic_Mechanics): Mysteries = sqrt(mana / 5e11). Each mystery adds 3% production. Int perks add to that 3% base (25 → 5% total, etc.), Int points multiply it, and Hungerer multiplies Mysteries power. So the production factor is `1 + M × MP`, which is roughly proportional to MP when M is large. Encoded as `Mysteries.Factor` (additive reading flagged unverified).

**Void mana:** production × (1 + VM × per-point). I couldn't find the base per-point value on the wiki (More Statistics shows "Increase profit by point (%)"). It's the input `Void.ProfitPerPoint` with an unverified default of 1 (100%). Insight perks are "+12% (additive)" etc. During burst, VM is already collected, so VM-per-entity items don't matter there; VM-profit items do.

**Crit** (Basic Mechanics): expected click value = (1 − c) + c × CritProfit. Crit Rating R adds log10(R)% to chance and R% to base crit profit (before multiplication by spells or Dominance). Encoded as `Click.CritChanceTotal` and `Click.CritFactor`; the reading of crit profit % as "a crit earns CritProfit/100 × a normal click" and the 100% chance cap are unverified.

**Idle mode:** Basic Mechanics says to always burst in idle mode. Idle bonus multiplies production. "Burst in idle mode" is the boolean input `Idle.Active` (default true).

**Sources (buildings)** (Basic Mechanics, "Standard Sources"): 1 Mana Gems, 2 Grimoires, 3 Spell Fountains, 4 Enchanted Trees, 5 Alchemy Desks, 6 Circles Of Power, 7 Dimensional Rifts, 8 Nexi. Classes rename some (e.g. Oni: Hellholes = Circle of Power, Monuments = Spell Fountain, Grim Trophy = Enchanted Tree).

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

## 5. What was built in this step (plan todos `effect-model` and `input-relevance`: done)

### `src/engine/expr.ts` (from checkpoint 01, plus `call`)
Expr AST `num | ref | bin(+ - * / ^) | neg | fn`. `f(source, bindings)` parses infix: dotted identifiers are stat ids, single letters must be bound (`{ P: "Pet.AbilityPower" }` or to an Expr). `^` is right-associative and binds tighter than unary minus (`-2^2 = -4`). Functions: `log10 ln log(base,x) max min sqrt ge lt if(c,a,b) floor abs`. Helpers: `num ref bin mul add pow call(fn, ...args)`, `refsOf`, `toInfix`, `toPostfix` (BiS-bot notation).

### `src/engine/model.ts` (unchanged)
Types: `Source {url, verified, note?}`, `StatGroup`, `InputSpec {default, kind: number|integer|boolean, min?, max?, logScale?, unit?, hint?}`, `StatDef {id, label, group, description?, base?: number|Expr, input?: InputSpec, source?}` (value = `(base + Σadd) × Πmul`; a stat has either `input` or `base`), `Effect {stat, op: add|mul, value: Expr, label, source}` ("mul" value is the factor itself, 1.25 for +25%), `ItemEffect {stat, op, value: number|Expr, text}`, `ItemTier`, `EnchantDef {desc, stat, perLevel, op}`, `ItemDef`, `SetDef`, `SpellDef`, `SpellBehaviour`, `StanceDef`, `ClassDef`, `PetDef`, `ScoreDef`, `BuildingId`, plus `ATTRIBUTES`, `QUALITIES`, `ITEM_SLOTS`, `SLOT_CAPACITY`.

### `src/engine/stats.ts`: registry core
- Constructors: `inputStat(id, label, group, spec, extras)`, `multiplierStat` (base 1), `additiveStat` (base 0), `constantStat(…, value)`, `derivedStat(…, expr)`.
- `StatRegistry` (iterable): `add(...defs)` rejects duplicates, ids that don't look like `Namespace.Name` (the parser needs the dot) and defs with both `input` and `base`; `extend(...defs)` returns a copy (use it to add class/pet/spell stats); `withInputDefaults({id: value})` returns a copy with input defaults replaced (use it for class defaults such as the main building share or guide attribute points); `has/get/require/all`.

### `src/data/stats.ts`: generic seed stats (no classes, pets, spells or items)
- `GENERIC_STATS`, `createGenericRegistry()`, `GENERIC_EFFECTS` (Prod.Global × `Mysteries.Factor`, × `Void.Factor`, × `Idle.Factor`), `BUILDINGS`, and id helpers `attributeStat(a)`, `buildingProfit(b)`, `buildingShare(b)`.
- Stat ids: `Spell.EvocationEfficiency`, `Spell.IncantationEfficiency`, `Spell.SummoningEfficiency` (multipliers); `Char.Level` (input), `Hero.AbilityPower` (CAP, input "before item bonuses"), `Hero.AbilityPowerGrowth` (G, input), `Char.ExperienceGain` (multiplier); `Pet.Level`, `Pet.AbilityPower` (PAP, input "before item bonuses"), `Pet.ExperienceGain`; `Attr.<Attribute>` for all 9 attributes (integer inputs = points assigned; items add on top); `Prod.Global` (multiplier), `Building.<1-8>.Profit` (multipliers), `Building.<1-8>.Share` (inputs 0..1, default 0: class encodings must set the main building to 1), `Prod.Total = Prod.Global × Σ Share·Profit`; `Mysteries.Count` (input), `Mysteries.Power` (constant 0.03), `Mysteries.Factor = 1 + Count × Power`; `Void.Mana`, `Void.ProfitPerPoint` (inputs), `Void.ManaPerEntity` (multiplier), `Void.Factor = 1 + Mana × ProfitPerPoint`; `Idle.Active` (boolean input), `Idle.Bonus` (input), `Idle.Factor = if(Idle.Active, Idle.Bonus, 1)`; `Click.Profit`, `Click.AutoclickProfit` (multipliers), `Click.AutoclicksPerSecond`, `Click.CritChance` (%), `Click.CritRating`, `Click.CritProfitBase` (%) (inputs), `Click.CritProfit = CritProfitBase + CritRating`, `Click.CritChanceTotal = min(100, CritChance + log10(max(R,1)))`, `Click.CritFactor = 1 − c/100 + c/100 × CritProfit/100`; `Items.LegionReward` (boolean input, consumed by the modifier builder, not by formulas).
- **Attribute per-point multipliers and perks are NOT wired yet** (that's `encode-data`). When you add them, fix what the CAP/PAP/idle "before item bonuses" inputs must exclude and update those labels and notes. All input defaults are placeholders (mostly 0 or 1); class encodings should set realistic defaults because the numeric relevance check is centred on them.

### `src/engine/graph.ts`: stat graph and evaluators
- `compileGraph(spec: GraphSpec): StatGraph` (throws `GraphError { issues }`) and `tryCompileGraph(spec) → { graph | null, issues }`. `GraphSpec = { stats: Iterable<StatDef> (a StatRegistry works), effects?: Effect[], score: Expr, items?: ItemEffectSpec }`. `ItemEffectSpec = { add?: statId[], mul?: statId[], dynamic?: DynamicEffect[] }`, `DynamicEffect = { stat, op, value: Expr, label? }`.
- Only stats reachable from the score are compiled, in topological order (`stats[i].deps` all `< i`). Deps = refs of the base Expr + refs of effect values + refs of dynamic item effects on that stat. Issues: `unknown-ref` (score, base or effect references an undefined stat), `unknown-target` (effect or item stat not defined), `cycle` (with path), `missing-input` (reachable stat with neither `base` nor `input`: the "needs an InputSpec" discovery). All issues are collected before failing.
- `StatGraph`: `stats: CompiledStat[]`, `index: Map<id, i>`, `score`, `inputs: number[]` (required inputs = reachable stats with an InputSpec), `dynamic: CompiledDynamic[]` (same order as the spec; `target = -1` if unreachable), `inertItemStats` (declared item stats that can't reach the score: items touching only these can be filtered out). `CompiledStat`: `id, index, def, base ({kind: input|const|expr}), adds, muls, dynamic (indices), deps, itemAdd, itemMul, itemDependent, inputs (transitive input indices)`. Helpers: `statIndex`, `exprItemDependent(graph, e)`, `exprInputs(graph, e)`.
- **Item modifiers** (`ItemModifiers = { add: Float64Array, logMul: Float64Array, dynamic: Uint8Array }`, indexed by stat index / dynamic index). `createModifiers(graph, { add?: {id: amount}, mul?: {id: factor}, dynamic?: [k] })` validates that the stat was declared with that op (throws otherwise; silently ignores declared-but-inert stats). A stat's value is `(base + Σadd effects + add[i] + Σ active dynamic adds) × Π mul effects × 10^logMul[i] × Π active dynamic muls`. The optimizer should build these arrays directly (sum `logMul[i] += Σ log10(factor)`, including enchant factors `(level + B + extra) × log10(1 + x)`; `add[i] += amount`; gates for Expr-valued item effects).
- **`FloatEvaluator(graph, inputs?)`**: signed log10 arithmetic (each value is sign + log10|x|; `+`/`−` use log-sum-exp with `log1p`), so magnitudes up to about 10^(1.8e308) stay on the float path. Item-independent stats are cached and recomputed only after `setInputs`/`setInput`. `scoreLog10(mods?) → number` (hot path, falls back automatically), `evaluate(mods?) → EvalResult { log10, sign, fallback, decimal? }`, `statLog10(id)`/`statSign(id)` (from the last float run), `inputValues()`. `InputValues = Record<id, number | Decimal | boolean>` (Decimal lets users enter values above 1e308); missing inputs use their spec default.
- **Decimal fallback**: when the float path can't represent something (the log itself overflows, e.g. `2^(10^400)`, or a domain error such as `log10(x ≤ 0)`, division by zero, a negative base with a fractional exponent) it re-evaluates with `evaluateDecimal(graph, inputs, mods) → { score: Decimal, stat(id) }`. For layer-2 results `log10` is `Infinity` and the exact value is in `decimal`; `resultToDecimal(r)` converts any result. Undefined results give `log10 = NaN` on both paths. Zero gives `log10 = -Infinity, sign 0` without fallback.
- **Deviation from the checkpoint-01 design:** the design said to fall back "if the result isn't finite", with values > 1e308 in mind. Because the float path works in signed log space, results above 1e308 (tested up to 1e2400) don't need the fallback at all; it only triggers for doubly-exponential intermediates and domain errors. This is faster and covers the same range.
- Performance (35-stat generic graph with 7 item-affected stats, on the user's machine under Node 22): about 1.1M float evaluations/s against 78k/s for Decimal.
- Precision notes: the float path is more accurate than Decimal for `1 + tiny` (Decimal rounds `log10(1 + 3.7e-150)` to 0). Both lose precision on catastrophic cancellation (`a − b` with a ≈ b). break_eternity 2.1's `Decimal.sqrt` returns NaN below about 1e-15, so the Decimal evaluator uses `pow(x, 0.5)`; avoid `Decimal.sqrt` elsewhere too.

### `src/engine/relevance.ts`: ranking-relevance filter
- `analyzeRelevance(graph, { inputs?, candidates?, epsilon? = 1e-9 }) → { inputs: InputRelevance[], terms: LogTerm[] }`. `InputRelevance = { id, label, group, shown, method: "structural" | "numeric", reason (user-facing sentence), maxDeviation? }`, one per required input, in graph order.
- **Structural pass** (`decomposeLogScore`): splits log10(score) into terms. `*` and `/` split; `sqrt` and `^` with an item-independent exponent keep splitting the base (the exponent's inputs are attached to the resulting terms); `neg` passes through; a stat reference splits into one "base + additions" term (or recurses into the base Expr / is the input itself when there are no additions) plus one term per multiplicative effect, one for item multipliers, one per dynamic multiplier. Anything else (sums, functions, item-dependent exponents) is one opaque term whose inputs are all transitive inputs. Inputs that appear in no item-dependent term are hidden ("scales every item set's score equally"); if no term is item-dependent at all, every input is hidden ("No item can change the score").
- **Numeric pass** for inputs in item-dependent terms: for each candidate modifier set j, compute `d_j(v) = log10 score(set j) − log10 score(no items)` for sampled values v; hide the input if every `d_j` stays within `epsilon × max(1, |d|)`. Sample points where a score is zero or non-finite are skipped; if nothing could be compared, the input is shown to be safe. `sampleValues(spec, current)`: booleans {0,1}; log-scale inputs current × {1e-6 … 1e6}; bounded inputs 5 evenly spaced points; otherwise current × {0, 0.5, 1, 2, 4} (or {0, 1, 10, 100} for 0); always includes the current value, clamped to min/max, rounded for integers.
- `syntheticCandidates(graph)`: for each item-`add` stat +1/+10/+100, for each item-`mul` stat ×1.5/×100, each dynamic effect alone, and one set with everything on. The optimizer step should pass real candidates (e.g. the top items per slot as modifier sets) through `candidates`, which is more faithful than synthetic ones.
- Tested cases: a blanket ×2 profits input is hidden (structural); inputs in `P^0.35·L^2·0.001 + 1` next to an item-affected P are shown (numeric); inputs only in the exponent of an item-independent base are hidden; an input in the exponent of an item-dependent base is shown; `X·A + X·B` hides X numerically; an input that items add to is shown but hidden if items only multiply it; `Idle.Active` gating an item-affected idle bonus is shown while `Idle.Bonus` itself is hidden; dynamic effects (`Attr.Mastery += 5 × Pet.Level`) make Pet.Level relevant; caller candidates are honoured.
- **Known limitations:** (1) if the whole score is `A^c`, input c is shown although it can't change the order (ratios change, ranking doesn't); this is conservative and fine. (2) Synthetic candidates only probe single stats plus "all on", so an interaction that only appears for a specific combination could be missed; real candidates reduce this. (3) The numeric check holds the other inputs at their current values, so placeholder defaults can hide or show an input differently than realistic values would. (4) Inputs consumed by the modifier builder rather than by formulas (`Items.LegionReward`, enchant levels) never appear in the graph; decide their visibility in the optimizer/UI step (relevant whenever an enchantable item affects the score).

### Tests (`npm test`: 38 passing)
- `src/engine/expr.test.ts`: precedence, right-associative `^` vs unary minus, scientific notation, functions and arity, bindings, error messages, infix/postfix rendering.
- `src/engine/graph.test.ts`: topological order and reachable inputs, cycles (base and effect), unknown refs/targets, missing inputs, item dependence and inert stats, modifier validation, hand-calculated `(base + adds) × muls` with static and dynamic item modifiers, input cache invalidation, float vs Decimal agreement on every operator (negatives, comparisons, `if`, `floor`) and on 300 random formulas, `log1p` precision, tiny `sqrt`, results up to 1e2400 without fallback (including a Decimal input of 1e800), fallback for `log10(log10(2^(10^400)))` and `2^(10^400)`, NaN and zero handling.
- `src/engine/stats.test.ts`: registry validation, `extend`/`withInputDefaults`, the generic stats compile into a production graph with the expected required inputs and hand-checked values, and every generic stat has a source (with a note if unverified).
- `src/engine/relevance.test.ts`: the relevance cases above plus `sampleValues`.
- `src/engine/decimal.test.ts`: break_eternity smoke test.

## 6. How to encode things with this engine (for the next steps)

- **New stats**: `createGenericRegistry().extend(inputStat(…), derivedStat(…, f("…", bindings)), …)`. Every entity needs `source` with `verified` (+ `note` when false).
- **Non-item effects** (attributes, perks, hero, pet, stance, spells): `Effect { stat, op, value: Expr, label, source }`. Attribute per-point multipliers look like `{ stat: "Mysteries.Power", op: "mul", value: f("1.025 ^ Attr.Intelligence") }`; perks with thresholds use `if(ge(Attr.X, 25), …, …)` or `1 + ge(Attr.X, 25) * 0.02`-style additions (additive perks as `op: "add"` on the base).
- **Items**: numeric `ItemEffect`s become static modifiers (declare the stat in `ItemEffectSpec.add`/`mul`, then fill `ItemModifiers` per candidate set); Expr-valued `ItemEffect`s become `DynamicEffect`s gated per set. Set bonuses are the same, applied by piece count. Enchant factors go into `logMul`.
- **Scores**: an Expr over stats (e.g. `Spell.EvocationEfficiency * Prod.Total` for FS, spell mana formulas); compile with `compileGraph({ stats, effects, score, items })`, then `analyzeRelevance(graph)` for the input form and `FloatEvaluator` for the search.

## 7. Next steps (plan order)

1. **encode-data** (next): `src/data/itemText.ts` (clause parser from `items.json` tier/enchant/set text into `ItemEffect`s, with unmatched clauses kept as `unmodelled`), manual overrides for the formula items listed in section 4, set bonuses (tier i at i+1 pieces, cumulative: unverified), bonus-enchant effects (Resonator Ring, slot-specific Power Armor/Raiments levels, cap 5, need ≥ 1 real level), and attribute per-point effects and perks (section 4, Attributes page). Map item stat names onto the stat ids in section 5 (add stats with `extend` where needed). Add a test that reports how many clauses remain unmodelled. Then write `src/engine/items.ts` (or similar) that turns an equipped set + enchant levels + Legion into `ItemModifiers`, if not left to the optimizer step.
2. **encode-classes:** Oni, Shaman, Temporalist (hero, stances, spells as `SpellBehaviour`), paired pets, and score definitions. Set realistic input defaults from the guides with `withInputDefaults` (main building share = 1, guide attributes).
3. **encode-chronomancer:** follow the blind protocol in section 1.
4. **optimizer + worker**: steps from the plan: filter items (not owned, unmet requirements, excluded slot, no effect on the score: use `inertItemStats`/relevance), rank per slot (standalone best case with sets counted fully, then marginal against a greedy set; keep 2 for Finger/Trophy), test set subsets, DFS branch-and-bound with an optimistic per-stat bound, Resonator in/out branches, enchant sweep 0–55 with per-item overrides, per-item contribution = score with vs. without the item. Item quality defaults to max; owned defaults to all non-Mythic items. Pass real candidate sets into `analyzeRelevance`.
5. Then **ui**, **validate** (golden tests from the presets and scalings in section 4), **chronomancer-blind-check**, and **deploy** (`.github/workflows/deploy.yml`).
