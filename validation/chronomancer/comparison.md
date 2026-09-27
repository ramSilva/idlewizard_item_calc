# Chronomancer blind check: comparison with the guide's gear (part 2)

Part 2 of the plan's `chronomancer-blind-check`. The blind tool result ([`tool-result.md`](tool-result.md) and `tool-result*.json`) was committed in `7b01f3a` (2026-09-27T15:12:31+01:00) before any gear was read, and it is unchanged. Everything here was written afterwards.

## Summary

- **The guide names no items.** The source guide ([Fandom Chronomancer Guide Updated](https://idle-wizard.fandom.com/wiki/Chronomancer_Guide_Updated), revision 15488, "Updated for v1.35.0") gives gear only as stat priorities per phase. None of its 24 revisions (14304–15488, Dec 2021–Mar 2023) names an item or has an item preset, and its only templates are `PetTooltip`, `SpellTooltip` and `SpellSet`. So a slot-by-slot item match rate **can't be computed: 0 of 13 slots have a guide item.** What the guide does give, and what is compared, is the list of burst stats: "items that increase maximum Temporal Distortion and provides bonuses to incantation efficiency, evocation efficiency, character ability power and idle bonus for bursting".
- **Headline blind match (`era-notes` at enchant 10, as recorded; pre-declared):**
  - **13/13 slots** hold an item that supplies at least one of the guide's burst stats (worth more than ×1.05 in that slot). Only 66 of the 118 items available in that run (56%) carry any of those stats.
  - **10/13 slots** get their largest contribution from a guide stat.
  - **4/5** of the guide's burst stat categories are present. **Maximum Time Distortion is missing.**
  - The picture holds across the recorded sweep (enchant 0–40): 12–13/13 slots, 10–11/13 on the largest contribution, and Maximum Time Distortion missing at every level.
- **Fixes: one tool bug**, found while checking the guide's pre-burst gear advice (commit `81da1e4`). The inputs `Void.ActiveTraps` and spell `Charges` defaulted to 0. Because Void Radiance's mana is proportional to the trap count, and the charged spells' Math has a `floor(k × (Charges − 1)) + 1` factor, the `void-mana` score (all four classes that can cast Void Radiance) and Shaman's `spell:PlagueZombie` score were 0 for every set, so nothing could be ranked. Both now default to 1, and a new test checks that every score is nonzero at the defaults with any class spell on the bar. **Effect:** the blind headline is unchanged (rerun gives the same 13 items at enchant 10), the golden diagnostics output is byte-identical, and `npm test` passes (216 tests).
- **Open differences by class** (details below):
  - **(a) tool bug / missing data:** none open (the one found is fixed).
  - **(b) likely different assumption or outdated guide:** 3.
    - B1, Maximum Time Distortion items: the tool snaps Stabilize The Flow with the pre-burst gear. Cast with the burst gear, the tool picks both max-TD items.
    - B2, three slots whose main stat is generic profit or Void mana profit, which the guide doesn't list.
    - B3, pet ability power scaling 0.30 vs 0.6, a PAP-base placeholder with no ranking effect.
  - **(c) unclear:** 2.
    - C1, the guide's "3% idle" per Patience point vs 2.5% on both wikis' Attributes pages (can't change the ranking).
    - C2, the build-phase gear (Evocation, pet experience), which the tool has no score for.
  - **Tie:** Incantation scaling 3.09 vs 3.

## Sources read in this step

| Page | Revision | Role |
|---|---|---|
| [Fandom: Chronomancer Guide Updated](https://idle-wizard.fandom.com/wiki/Chronomancer_Guide_Updated) | 15488 (2023-03-24) | **the blind-check source**; all 24 revisions scanned for item names (none) |
| [Fandom: Chronomancer](https://idle-wizard.fandom.com/wiki/Chronomancer) | 16884 | class page (links the guide above as "Most up to date") |
| [Fandom: Chronomancer Guide](https://idle-wizard.fandom.com/wiki/Chronomancer_Guide) | 14312 | older guide, e80–e140; names only Stabilizing Pauldrons ("increase it up to 20x total distortion at legendary"); context |
| [Fandom: Tito's Chronomancer Build](https://idle-wizard.fandom.com/wiki/Tito%27s_Chronomancer_Build) | 14311 | the same author's earlier version; no items; context |
| [Fandom: In Over Your Head Chronomancer Guide](https://idle-wizard.fandom.com/wiki/In_Over_Your_Head_Chronomancer_Guide) | 16563 | a different, much later setup; context |
| [wiki.gg: Chronomancer Guide](https://idlewizard.wiki.gg/wiki/Chronomancer_Guide) (wiki.gg's `Chronomancer_Guide_Updated` redirects here) | 31289 (2026-09-25, "VersionUpdated 1.78.0") | successor guide with the same burst bar; names no burst set but gives burst **scalings**; context only |
| [wiki.gg: In Over Your Head Chronomancer Guide](https://idlewizard.wiki.gg/wiki/In_Over_Your_Head_Chronomancer_Guide) | 30817 | item presets, but for another setup (Time Fork, Temporal Paradox, Realm/Heritage era, no Singularity Beam in the burst); not comparable, context only |

Raw wikitext: Fandom pages in [`data-raw/fandom/`](../../data-raw/fandom/) (manifest with URL and revid), wiki.gg guides in [`context/`](context/) (kept out of `data-raw/wikigg`, which the scraper owns and which excludes these guides).

## What the guide says about gear (complete)

- **Introduction:** "At this range, **items** are still being discovered. Focus on using items that increase maximum Temporal Distortion and provides bonuses to incantation efficiency, evocation efficiency, character ability power and idle bonus for bursting. Naturally, during set-up, evocation efficiency and pet experience are always welcome. Incantation efficiency is normally best in slot for burst, but if you are snapshotting Stabilize the Flow and Gem Resonance other stats will work better in burst."
- **Attributes:** "Always distribute your attributes based on the perks you'll obtain from them, after filling for your best items, and then dump the excess in the designated 'dump' attribute." The Patience line cut by the part-1 filter reads in full: "Patience: **40** for Risen Giant and as much as possible without losing gear otherwise. Your best attribute."
- **Phase 1 and Phase 2:** "Gear priority this phase is evocation efficiency and pet experience."
- **Phase 3 (PreBurst):** "For gear for this phase, pieces with void mana per entity are priority, followed by incantation efficiency."
- **High Level Snapshot Optimization:** "This section applies mostly if you have high rarity gear or enchants post e200. … you can 'snapshot' the values by equipping your highest incantation efficiency gear and casting them [Gem Resonance / Stabilize The Flow], and then switching to your regular burst gear and your burst set."
- Phase 4 (Bursting) has no gear text.

There are no enchant levels, no "N+5" tabs, and nothing about The Legion or Resonator Ring, so the guide's enchant level and bonus levels can't be inferred. The comparison uses the headline's pre-declared enchant 10 and checks every recorded sweep level.

## How the comparison is scored

The guide's gear advice is a list of stat categories, so the slot-by-slot check asks what each of the tool's items contributes, using the model. `scripts/validation/chronomancer-compare.mjs` reads the recorded blind JSON (never rewrites it) and, for each chosen item, removes one stat at a time from that item (its quality-tier effects and enchant; set bonuses are reported per set) and measures the score change. It reproduces every recorded contribution exactly.

- A slot **supplies** a guide stat when that stat alone is worth more than ×1.05 there (smaller is a tie, per the protocol).
- The slot's **main stat** is its largest single-stat share.
- The guide's burst categories map to the model's `Time.MaxDistortion`, `Spell.IncantationEfficiency`, `Spell.EvocationEfficiency`, `Hero.AbilityPower` and `Idle.Bonus`.

The scoring rule had to be defined after reading the guide, because the guide's format (stats, not items) only became known then. It is applied unchanged to the recorded headline set, which was fixed beforehand.

## Primary: the headline blind result (`era-notes`, enchant 10, as recorded)

Score ×1.13e24 vs no items. Slots locked in the era (Wrist, Weapon, Offhand, Legs, Mount, Accessory, Phylactery) are left out, as in the blind record. Full output: [`secondary/compare-era-notes-10.txt`](secondary/compare-era-notes-10.txt).

| Slot | Tool item (blind) | Contribution | Guide burst stats it supplies (share) | Main stat | Verdict |
|---|---|---|---|---|---|
| Head | The Artificer's Crown | ×12.1 | Evocation ×4.05, CAP ×3 | Evocation | matches |
| Chest | The Ribcage | ×254 | Idle ×67.6 | Idle | matches |
| Hands | Empowering Handguards | ×21.3 | Incantation ×8.52, Evocation ×2.5 | Incantation | matches |
| Feet | Boots Of Concentration | ×226 | Idle ×4.04 | profits ×9.31 (enchant), Mysteries power ×6 | supplies; main stat not listed (B2) |
| Shoulder | Mantle Of The Crypt | ×203 | Idle ×67.6, CAP ×2 | Idle | matches (guide's max-TD Shoulder, Stabilizing Pauldrons, not chosen: B1) |
| Neck | Searing Gaze | ×18.6 | Evocation ×18.6 | Evocation | matches |
| Waist | Encircling Trophies | ×46.9 | CAP ×4.05, Idle ×3.09 | CAP | matches |
| Back | Flaming Cape | ×65.1 | Evocation ×18.6, Incantation ×3.5 | Evocation | matches (guide's max-TD Back, Timeshroud, not chosen: B1) |
| Research | Servants Overclocking | ×361 | Idle ×361 | Idle | matches |
| Finger | Morbid Loop | ×73.6 | CAP ×6.07, Idle ×4.04 | CAP | matches |
| Finger | Spell Helix | ×41.4 | Evocation ×3 | profits ×13.8 (enchant) | supplies; main stat not listed (B2) |
| Trophy | Mutated Mycelium | ×89.4 | Idle ×89.4 | Idle | matches |
| Trophy | Necrotic Powerstone | ×100 | Idle ×4.04 | Void mana profit ×24.8 | supplies; main stat not listed (B2) |

Set bonuses: Ancient Bones (4 pieces: Summoning +35%, Idle +50%, CAP +50%) is worth ×1.19e8 in total; Power Armor and Raiments have one piece each (no set bonus).

**Match: 13/13 slots supply a guide burst stat, 10/13 have a guide stat as main stat, 4/5 categories present (no Maximum Time Distortion).** The model's burst scalings at this set are Idle 2.016, Incantation 3.09, Evocation 1, CAP 1, PAP 0.30, so Incantation and Idle are the strongest per percent. The guide's "Incantation efficiency is normally best in slot for burst, but if you are snapshotting … other stats will work better" fits this: with Stabilize The Flow snapped, the tool fills most slots with Idle, Evocation and CAP items and only two with Incantation.

**Across the recorded sweep** ([`secondary/compare-sweep.txt`](secondary/compare-sweep.txt)):

| Enchant | 0 | 1 | 3 | 5 | 9 | 10 | 12 | 15 | 20 | 21 | 30 | 40 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| supply a guide stat (/13) | 13 | 13 | 12 | 13 | 13 | 13 | 13 | 13 | 13 | 13 | 13 | 13 |
| main stat is a guide stat (/13) | 11 | 10 | 10 | 11 | 10 | 10 | 10 | 10 | 10 | 11 | 11 | 11 |
| Max Time Distortion present | no | no | no | no | no | no | no | no | no | no | no | no |

At enchant 3, Collection Of Samples (Trophy; "All profits +900%") supplies none of the listed stats. The main stats outside the list are always generic profits, Mysteries power, Nexus profit (Anomalous Essence at 0–1) or Void mana profit.

Other blind variants at enchant 10, as recorded (same rule):
- `notes` (all slots, Patience/Spellcraft 250): 18/20 supply, 12/20 main stat, Maximum Time Distortion missing.
- `main` (literal attributes, all slots): 16/19 supply, 10/19 main stat, Maximum Time Distortion and Evocation missing, with 3 slots on pet ability power (Conjured Claws, Bite Sleeves, The Bond).

The guide's full Patience line ("as much as possible without losing gear otherwise") and "after filling for your best items" rule out the literal reading. That supports the headline's notes reading, which part 1 chose before seeing that line.

## Differences and classification

| # | Difference | Class | Reason |
|---|---|---|---|
| B1 | No Maximum Time Distortion item: the guide names it for bursting; the tool picks neither max-TD item (swapping Stabilizing Pauldrons in for Mantle Of The Crypt gives ×0.20, Timeshroud for Flaming Cape ×0.57) | (b) different assumption | The headline snaps Stabilize The Flow with the pre-burst gear (Phase 3: "stop casting Temporal Distortion, cast Stabilize The Flow and swap to the burst spellset"), so the burst gear's max TD can't reach it. Informed rerun `unsnapped-stf` (Stabilize The Flow cast with the burst gear) **picks both Stabilizing Pauldrons (×5470) and Timeshroud (×666)** and moves Head/Neck/Finger to Incantation items, with all 5 guide categories present (13/13, 11/13). Context: the wiki.gg successor guide puts both items in its Snap set ("incredible here"), and "In Over Your Head" says their enchants don't matter there. The tool only optimizes the burst set and has no score for Stabilize The Flow's own multiplier, so the gear worn while snapping isn't optimized (a scope limit, listed below). |
| B2 | Three slots whose main stat isn't in the guide's list: Boots Of Concentration and Spell Helix (enchant "Profits +25%/+30%"), Necrotic Powerstone ("Void Mana profits +300%") | (b) guide's list is not exhaustive | Generic profit and Void mana profit multiply every burst equally (^1), so the guide doesn't list them (the wiki.gg successor states: "If an obvious stat is not mentioned (like generic profit), then it is ^1"). Void mana is what the guide's own Phase 3 collects. All three also supply idle bonus or Evocation. Sensitivities, not differences: Boots' ×6 Mysteries-power share rests on the unverified "(base) = additive" reading, and Necrotic Powerstone's share on Void mana ≫ 1 (placeholder 1e10). |
| B3 | Pet ability power scaling 0.30 (model) vs 0.6 (wiki.gg successor, context) | (b) placeholder | Risen Giant's Math is `(P^0.6 + 1)`, encoded as on its page. At the placeholder PAP base 1 the term is half saturated; the successor's 0.6 implies PAP ≫ 1. Informed run `pap-1e3` (PAP base 1000): **the same 13 items**, so no ranking effect here (PAP items need Empathy, which the reading keeps at 0). |
| — | Incantation scaling 3.09 (model) vs 3 (successor, with Gem Resonance and Stabilize The Flow snapped) | tie | The extra 0.09 is Time Helix's `log10(I)` term, which reads the current Incantation (the successor confirms Time Helix "updates itself automatically when swapping gear"). It changes any Incantation item's value by less than ×1.03. The other scalings match: Idle 2.016 vs ^2.0155, Evocation 1 vs ^1, CAP 1 vs ^1, and the pre-burst Void mana phase VpE ^1 and Incantation ^1.2 vs the successor's "VMpE^1 and IncEff^1.2". |
| C1 | "Risen Giant scales with 3% idle": the guide's Patience value vs wiki.gg Attributes' 2.5% per point | (c) unclear | Fandom's Attributes page (2024 revision) also says 2.5%, so the "3%" is either an older value or loose wording. It can't change the ranking: Patience is a fixed input and every idle effect multiplies Idle bonus. Settled by the v1.35 patch notes or an Attributes revision from that time. |
| C2 | Build-phase gear ("evocation efficiency and pet experience") | (c) not compared | The tool has no score for the build phases (pet experience, Wormhole skipping, accumulated casts). Settled by adding such a score; out of scope for the burst optimizer. |
| A1 | Pre-burst gear ("void mana per entity are priority, followed by incantation efficiency") could not be checked: the `void-mana` score was 0 for every set | (a) tool bug, **fixed** (`81da1e4`) | `Void.ActiveTraps` defaulted to 0 and Void Radiance's Math is "Incantation^1.2 × Active traps × Vpe / 30" ([Module:Data/Spells](https://idlewizard.wiki.gg/wiki/Module:Data/Spells)). Because the score is proportional to the input, the relevance filter would also have hidden it. The same pattern hit charged spells: `floor(0.15 × (Charges − 1)) + 1` is 0 at 0 charges (Plague Zombie). Both inputs now default to 1 (any value ≥ 1 ranks sets the same). New test: every score of every class is finite with any of the class's spells on the bar (it failed on exactly these five cases before the fix). After the fix, informed run `preburst-void` (Phase 3 bar: Singularity Beam, Temporal Distortion, Void Lure, Void Radiance, Spell Focus, Stabilize the Flow; score `void-mana`) picks **Void Sampling (×61.9) and Anomalous Essence (×24.8), the two Void-mana-per-Entity items, and Incantation items in the other 10 slots**, which is the guide's stated priority. |

Not differences, but checked:
- **Burst pet** Risen Giant and the burst bar match the setup used.
- **Enchanting** "post e200" matches the era choice (enchanting at Paragon 17, 1e200).
- "Items are still being discovered" fits the era restriction but can't test it item by item.

### Scope limits this check exposed (not fixed, listed for the report)

1. The tool optimizes one set per score. The snap set (gear worn while casting Stabilize The Flow / Gem Resonance) and the pre-burst set are separate sets in the guide. The pre-burst set can now be optimized with the `void-mana` score. The snap set has no score of its own, and its effect enters the burst only through the snapped inputs (`Spell.StabilizeTheFlow.SnappedMaxDistortion`, `…SnappedIncantationEfficiency`).
2. There is no build-phase score (C2).

## Secondary (non-blind) runs

All are the headline `era-notes` setup at enchant 10 with one change, run with `scripts/validation/chronomancer-secondary-runs.sh` after the fix. The CLI output and JSON are in [`secondary/`](secondary/).

| Run | Change | Result |
|---|---|---|
| `rerun` | none (post-fix code) | identical to the blind headline: same 13 items, ×1.13e24 |
| `unsnapped-stf` | `--snapped ""` (Stabilize The Flow cast with the burst gear) | Empowering Headguard, Empowering Handguards, The Ribcage, Boots Of Concentration, **Stabilizing Pauldrons**, Torc Of Privilege, Encircling Trophies, **Timeshroud**, Servants Overclocking, Frosty Ring + Morbid Loop, Mutated Mycelium + Necrotic Powerstone; Incantation scaling 4.08; 13/13 supply, 11/13 main stat, 5/5 categories |
| `pap-1e3` | `Pet.AbilityPower=1000` | same 13 items as the headline |
| `preburst-void` | Phase 3 bar, score `void-mana`, Stabilize The Flow live | Empowering Headguard, Empowering Handguards, Empowering Chestguard, Boots Of Eastern Blessings, (no Shoulder), Torc Of Privilege, Sash of Luxury, The Amplifier, Void Sampling, Fiery Ring + Frosty Ring, Anima Core + Anomalous Essence (Void mana per Entity: Void Sampling, Anomalous Essence; Incantation: the rest) |

## Golden tests after the fix

The fix touches only inputs that no golden setup or Chronomancer burst setup uses (Void Radiance and Plague Zombie aren't on those bars). `node scripts/validation/golden-diagnose.mjs --brief` gives byte-identical output before and after. `npm test` passes (216 tests, including the 42 golden tests), and `validation/golden-report.md` is unchanged.

## Reproduce

```bash
scripts/validation/chronomancer-secondary-runs.sh            # informed runs into secondary/
node scripts/validation/chronomancer-compare.mjs             # headline slot-by-slot stat breakdown
node scripts/validation/chronomancer-compare.mjs --brief --level 3
node scripts/validation/chronomancer-compare.mjs --file validation/chronomancer/secondary/unsnapped-stf.json
```
