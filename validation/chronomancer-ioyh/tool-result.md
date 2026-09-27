# Chronomancer blind check 2 ("In Over Your Head"): the tool's result, written before reading the guide's gear

Part 1 of the second Chronomancer blind check. The guide is the Fandom [In Over Your Head Chronomancer Guide](https://idle-wizard.fandom.com/wiki/In_Over_Your_Head_Chronomancer_Guide) (revid 16563, 2024-02-13; raw wikitext saved earlier in `data-raw/fandom/In Over Your Head Chronomancer Guide.wikitext`). Unlike the first guide it has `ItemPreset` item lists per phase. The model was **not** changed in this step.

## How the guide was read (blindness record)

- The raw guide file was never opened, printed or searched directly. It was read only through `scripts/validation/chronomancer-setup.mjs`, which filters before anything is printed or saved: `node scripts/validation/chronomancer-setup.mjs --set-headings --keep Attributes --page "In Over Your Head Chronomancer Guide" --file "data-raw/fandom/In Over Your Head Chronomancer Guide.wikitext" --out validation/chronomancer-ioyh/guide-setup.md`. Output: [`guide-setup.md`](guide-setup.md). The script's `--list` and `--inventory` modes (headings, template names and parameter keys only, never values) were used first.
- What the script strips: the whole Items section (gear heading); item templates (`ItemPreset`, `ItemTooltip`) with their `itemcodes`/`itempreset_code` values; item-page links and links to pages outside the wiki snapshot; item tables; list lines with items; sentences with gear/enchant/slot words; every item and set name, distinctive name token and (new) capitalised item-name abbreviation, redacted to `[item]`. It refuses to write if a full item name survives. Spell sets are decoded from `spellset_code` into spell names and autocast modes (Module:Spells: 0 None, 1 Careful, 2 Reckless) only if every id is a known spell.
- Changes to the script for this guide (all opt-in except the stricter redaction): `--set-headings` (phase subsections are named "… Set"), `--keep <heading>` (keep a filtered section that is mostly item discussion), `--table-cells` (item-table cells without items or gear words; used once to check, it found only the spell-set text again and a "Goal" column header, so it isn't used for the output), spell-set code decoding, unknown-page link redaction, and capitalised-abbreviation redaction.
- **One exposure, disclosed here:** the first filtered output (before the abbreviation redaction existed) kept a sentence from the Attributes section with three shortened item names: "Kilt", "Amp" and "Torc", in a note that Spellcraft 250 is needed for the first "in snap" and 150 for the other two. I read that sentence before tightening the redactor; the regenerated `guide-setup.md` no longer contains it. No choice below uses it: the attribute values come from the section's list lines, the model and item data weren't touched, and no run input or option targets those items. Part 2 should keep this in mind for the Legs, Offhand and Neck slots (the headline picks Mesmerizing Pants, Murmuring Spellbook and Lucky Amulet there).
- The Accumulator was identified from the wiki (its page says it adds Ritual Of Potency to the spellbook, and Ritual Of Potency is on the guide's burst bar), not from the guide's gear.
- Other sources used: wiki.gg pages in `data-raw/wikigg/` ([Temporal Paradox](https://idlewizard.wiki.gg/wiki/Temporal_Paradox), [The Accumulator](https://idlewizard.wiki.gg/wiki/The_Accumulator), [Chronomancer](https://idlewizard.wiki.gg/wiki/Chronomancer), `Module:Spells` and `Module:Data/Spells` for Time Fork / Ritual Of Potency / autocast codes, [Paragon](https://idlewizard.wiki.gg/wiki/Paragon), [Attributes](https://idlewizard.wiki.gg/wiki/Attributes), [Basic Mechanics](https://idlewizard.wiki.gg/wiki/Basic_Mechanics)) and one sentence of the allowed [Temporalist Guide (e550+)](https://idlewizard.wiki.gg/wiki/Temporalist_Guide_(e550%2B)) on Innate Aptitude. No Chronomancer build was web-searched; `validation/chronomancer/comparison.md`, the compare scripts and `validation/chronomancer/context/` weren't opened.

Reproduce: `scripts/validation/chronomancer-ioyh-runs.sh` (all variants, `--thorough`, enchant 0–55; writes `tool-result*.json` and the CLI text in `cli/`), then `node scripts/validation/chronomancer-ioyh-report.mjs` (prints the generated sections below this header).

## What the filtered guide says (setup only)

- **Rules:** "Chronomancer with new Temporal Paradox pet, no class or pet changes. Pet Ability Power increased based on pet level. (1.15 ^ pet lvl)"; "(Time Fork, level requirement = pet level)". The wiki's Temporal Paradox page: unique pet of the In Over Your Head Quasi-Realm; mana per activation (once per second) A = 100 × Mana/s × PAP² × (1 + (L − 1)⁴ / 100); +Compressed Time per tick; gains one level per Time Fork cast while Generate Paradox is active, no experience.
- **Scaling** ("Overall Scaling to Profits"): Inc ^7.39, PAP ^2, Char Exp ^? ("valuable since Char lvl = pet lvl"), Idle, Profit, CAP, VpE, Void Mana ^1, Evo ^0.016.
- **Attributes:** "Important Perks"; "Spc & Wis left at 240+10"; "Dom left at 0"; "Rest fully cap before Vers".
- **Run:** level pet, stack spells, pet levelling, skip time, Void mana phase, quick burst, Void mana phase, burst.
- **Burst Set spells:** Stabilize The Flow, Gem Resonance, Converge Timelines, Ritual Of Potency (111), Superposition, Ritual Of Power (all Reckless). **Snap Set 1:** Stabilize The Flow (None), Gem Resonance (None), Temporal Distortion (None), Void Lure, Void Radiance, Ritual Of Power. **Snap Set 2:** the same with Gem Resonance Reckless. Void Mana, Spell Stacking, Pet Levelling (×2) and Skipped Time sets are listed in `guide-setup.md`. The phase subsections' prose was all item discussion and was dropped.

## Setup used (shared by every run unless a variant says otherwise)

| What | Value | Why |
|---|---|---|
| Class | Chronomancer | |
| Pet | **Simulacrum (stand-in for Temporal Paradox)** | choice 2 |
| Spells | Stabilize The Flow (69), Gem Resonance (4), Converge Timelines (73), Superposition (17), Ritual Of Power (60); Ritual Of Potency (111) left out | Burst Set; choice 3 |
| Snapped | Stabilize The Flow and Gem Resonance (69, 4) | both are cast manually (autocast None) in Snap Set 1 before the burst |
| Augment | Time Helix (101, always on for Chronomancer), standing in for Time Fork | choice 6 |
| Score | `production`: mana per second with every selected spell active | choice 1 |
| Idle mode | on | Basic Mechanics: bursts happen in idle mode; the guide lists Idle ^1 |
| Items | every non-Mythic item owned at max quality, all 20 slots; Weapon: only The Accumulator | choices 4 and 8 |
| Legion / Resonator | Legion on; Resonator Ring allowed (Int 250 meets its 150) | choice 9 |
| Inputs set | AttrPoints Int/Ins/SC/Wis/Pat/Mas/Emp 250, Dom 10, Vers 10; Expeditions.Level 100; Pet.Level 200; Pet.AbilityPower 1.37e12; Spell.TimeHelix.CastsThisExile 300 | choices 5–11 |
| Everything else | Chronomancer class defaults (placeholders listed in the inputs table below) | |
| Search | `--thorough`, enchant 0–55, every level complete | |

## Choices and assumptions (made before reading the gear)

1. **Score = `production`.** The burst bar has no mana-per-cast spell (no Singularity Beam), only profit buffs, so `chronomancer-burst` doesn't apply. Temporal Paradox's mana yield is 100 × Mana/s × PAP² × f(L) per second, so burst mana ∝ production × PAP²; `production` covers the first factor and the stand-in pet part of the second.
2. **Temporal Paradox isn't in the model**, and this step may not change the model. Stand-in: **Simulacrum**, whose Prod.Global × (5 × PAP × L + 1) is the closest encoded shape (a production multiplier linear in PAP; none of the 17 encoded pets has PAP²). Consequence: PAP counts ^1 instead of ^2, so PAP items are undervalued relative to the guide's setup. Brackets: `burst-chimaera` (Greater Chimaera, the same formula at tier 3) differs only in one ring at enchant 0–10; `burst-risen-giant` (the class default) switches about ten slots to the idle set (The Ribcage, Mantle Of The Crypt, Lordic Greaves, Tribal Dressing, Servants Overclocking, Burial Urn, Blessed Tapestry, Inert Jade Phylactery, Mutated Mycelium). **The pet stand-in is the largest single assumption.**
3. **Ritual Of Potency (111) left out:** the model only accepts Chronomancer spells and 111 has no class in the spell data. Its Math ((RealCastsThisExile + 1)^0.8 × Incantation × 0.5 + 1) is one more Incantation^1 profit factor, so our Incantation scaling is about 1 lower than the guide's setup would give. Incantation items are somewhat undervalued.
4. **Weapon = The Accumulator, fixed by the setup:** it is the only source of Ritual Of Potency (wiki.gg The Accumulator), so every other Weapon is marked not owned. Its modelled value is only its enchant (Incantation +5% per level). `burst-weapon-free` shows what the tool would pick otherwise (Cataclysm at 0, Thunderbird from 5); the other 19 slots don't change.
5. **Snapping:** Stabilize The Flow and Gem Resonance are snapped. Their snapped values are inputs shared by every burst set, so they are hidden inputs; the burst bar's Reckless recasts with little Time Distortion are ignored (as in the first check).
6. **Time Fork → Time Helix:** Time Fork's Math is Time Helix's with 1.5× casts ((C × 1.5) × (log10(Inc) × 0.95 + 1) × 0.9 + 1); Time Helix is the Chronomancer augment the model always applies. Casts 300 = 1.5 × 200 Time Fork casts (one per pet level, pet level 200). Shown input, small effect (×1.17 over 0–3e8).
7. **Attributes:** "Rest fully cap" → Int, Ins, Pat, Mas, Emp 250. "Spc & Wis left at 240+10": the Temporalist guide says maxed Innate Aptitude (not an item) lets 240 points reach 250, so Spellcraft and Wisdom count 250. Dominance 0 + 10 and Versatility (leftovers, unknown) 0 + 10, reading Innate Aptitude as applying to every attribute. `burst-literal-attrs` (SC/Wis 240, Dom/Vers 0) differs only in Trophy 1 from enchant 20 (Charged Fin-Wing instead of Beholding Eye). Attribute cap 250: Versatility unlocks at Paragon 38 (Attributes page) and the cap reaches 250 at Paragon 24.
8. **Era and ownership:** Paragon 38+ means every slot is open (Phylactery at 29) and the key-locked Expedition locations (Paragon 36) are reachable, so all non-Mythic items are owned, including the key-locked Trophies, and `Expeditions.Level` = 100 (key-locked locations need 100; the Oni/Shaman/Temporalist defaults use 100 for the same reason). Mythics are excluded (Forge at Paragon 45 unknown; only their inherent effects are modelled). Items added after 2024-02 can't be filtered (no release data).
9. **Legion on:** the Legion page isn't in the snapshot; the late-game guides of the other three classes all show "+5" tabs (Resonator 4 + Legion 1). `burst-no-legion` changes one Trophy at enchant 20 (Collection Of Samples instead of Beholding Eye) and shifts the change levels by one.
10. **PAP base 1.37e12** = 1.15^200 (Rules: PAP × 1.15^pet level; pet level = character level 200, because Time Fork's level requirement is the pet level and the class default character level is 200). Both `Pet.AbilityPower` and `Pet.Level` turn out hidden (they scale every set equally with Simulacrum).
11. **Production share:** Temporal Anchors 1, Mana Gems 0 (class default, as in the first check). `burst-gems-mixed` (Mana Gems share 1, 3000 gems, snapped Gem Resonance at Incantation 1e3) picks Necrotic Powerstone instead of Blessed Armor Scales at enchant 0–10 (and leaves the Mount and Weapon, worth ×1 there, empty at 0) and matches the headline from 12 up.
12. **No snap-phase score:** the snap sets exist to maximise Stabilize The Flow's multiplier at cast (TDConsumed^(1 + 0.1 × TD) × Incantation × 2.5 + 1) and Gem Resonance's temporary gems. The model's spell scores are mana per cast only, and `stat:Spell.IncantationEfficiency` would ignore maximum Time Distortion, so no score matches; no snap run was made. The Void Mana, stacking and pet-levelling sets aren't scored either.

## Pre-declared headline for part 2

- **Headline run: `burst`** (`tool-result.json`, CLI text `cli/burst.txt`).
- **Compare with the guide's Burst Set item preset** at the real enchant level the guide gives it (N in "N+5"; bonus levels excluded, since the tool adds Resonator/Legion itself). If the guide has several Burst tabs, compare each at its level; if it gives no level, use **enchant 20**.
- **Slots counted: 19.** The Weapon slot is fixed by the setup (choice 4) and is reported separately as a check of that inference. Finger and Trophy pairs are compared as unordered pairs. Empty guide slots (`-1`) aren't counted.
- The variants are sensitivity checks for classifying differences, not alternative headlines. The snap, Void mana, stacking and pet-levelling sets aren't compared item by item (no matching score); part 2 may describe them qualitatively.

## Headline at enchant 20 (summary)

Score ×4.82e56 vs no items; search complete; Resonator branch chosen.

| Slot | Item | Contribution |
|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | ×866 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | ×3170 |
| Hands | Talented Gloves (Jester's Privilege) | ×2150 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | ×1800 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | ×3820 |
| Neck | Lucky Amulet | ×2110 |
| Waist | Colourful Belt (Jester's Privilege) | ×1380 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | ×624 |
| Back | Fancy Cape (Jester's Privilege) | ×1720 |
| Legs | Mesmerizing Pants (Jester's Privilege) | ×2150 |
| Offhand | Murmuring Spellbook | ×6400 |
| Research | Daemonics Reverse-Engineering | ×954 |
| Accessory | Bag Of Tricks (Jester's Privilege) | ×6950 |
| Mount | The Rubedo Engine | ×19 |
| Phylactery | Robust Tangerine Phylactery | ×1070 |
| Weapon | The Accumulator (fixed by the setup) | ×43.1 |
| Finger | Resonator Ring + Spell Helix | ×2.35e6, ×706 |
| Trophy | Beholding Eye + Blessed Armor Scales | ×958, ×5560 |

Sweep change levels 0, 1, 12, 13, 20. Enchant 0 is a different, Conjured-heavy set (Conjured Ragecrown, Thornmail, Spiked Stompers, Razorspaulders, Sawrings, Inert Jade Phylactery, Warp Basilisk, Morbid Loop + The Bond, Anima Core + Blessed Armor Scales). From enchant 1 the set is the one above, except Finger 2 (The Bond until 12, Spell Helix from 13) and the Trophies (Anima Core + Blessed Armor Scales until 11, Blessed Armor Scales + Collection Of Samples at 12–19, Beholding Eye + Blessed Armor Scales from 20).

## What most affects this result (read before comparing)

1. **Model scope:** Temporal Paradox (PAP²), Ritual Of Potency and Time Fork aren't encoded (choices 2, 3, 6). PAP and Incantation items are undervalued relative to the guide's setup; the scaling table below shows the gap (PAP 1 vs 2, Incantation 3.08 vs 7.39).
2. **Placeholders shown as ranking-relevant** at enchant 20 (full table below): `Idle.Active` (×6400), `Expeditions.Level` 100 (×27), attribute points (Empathy ×481, Intelligence ×15, Mastery ×14), `Spell.CastsThisExile` 1e7 (Murmuring Spellbook), `Spell.IncantationEfficiency` 1e3, `Building.8.Count` 3000, `Click.AutoclicksThisExile` 0, `Char.LevelRequirementReduction` 0 and `Char.Level` 200 (phylacteries), `Idle.Bonus` 100, `Idle.TimeThisExile` 0, the building shares.
3. **Scalings (informational):** the guide's Incantation ^7.39 and Evo ^0.016 equal the Temporalist Guide's source-meme table (Inc 7.390, Evo 1.016), so they may be "overall" values over several phases; ours is the burst only. Ours: Incantation 3.08 (Superposition, Ritual Of Power, Converge Timelines via CAP, Time Helix's log term; no Ritual Of Potency; Stabilize The Flow and Gem Resonance snapped), PAP 1.00 (stand-in pet), CAP/Idle/Profit/Void profit 1.00 (guide 1), Evo 0 (guide 0.016), VpE 0 (guide 1; Void mana per Entity only matters in the Void mana phase, which isn't scored).
4. **Unverified readings** behind the picks: percentage bonuses as multipliers, "(base)" as additive (the Raiments pieces' Mysteries power), set tiers cumulative (5-piece Raiments and 5-piece Jester's Privilege), phylactery compounding, Murmuring Spellbook's formula as a fraction, cost reductions adding up (Spell Helix). Listed at the end.

---

The sections below are generated by `node scripts/validation/chronomancer-ioyh-report.mjs`.

## Headline result (burst)

Run: pet simulacrum; spells 69,4,73,17,60; snapped 69,4; score production; idle on; Legion on; Resonator allowed; all slots; Weapon: only The Accumulator owned (16 other Weapons not owned); every other non-Mythic item owned at max quality; inputs AttrPoints.Intelligence=250, AttrPoints.Insight=250, AttrPoints.Spellcraft=250, AttrPoints.Wisdom=250, AttrPoints.Dominance=10, AttrPoints.Patience=250, AttrPoints.Mastery=250, AttrPoints.Empathy=250, AttrPoints.Versatility=10, Expeditions.Level=100, Pet.Level=200, Pet.AbilityPower=1370000000000, Spell.TimeHelix.CastsThisExile=300.

| Slot | E0 | E1 | E5 | E10 | E12 | E13 | E15 | E20 | E30 | E40 | E55 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Head | Conjured Ragecrown | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts |
| Chest | Conjured Thornmail | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell |
| Hands | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves |
| Feet | Conjured Spiked Stompers | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration |
| Shoulder | Conjured Razorspaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders |
| Neck | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet |
| Waist | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt |
| Wrist | Conjured Sawrings | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers |
| Back | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape |
| Legs | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants |
| Offhand | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook |
| Research | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering |
| Accessory | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks |
| Mount | Warp Basilisk | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine |
| Phylactery | Inert Jade Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery |
| Weapon | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator |
| Finger 1 | Morbid Loop | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring |
| Finger 2 | The Bond | The Bond | The Bond | The Bond | The Bond | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anima Core | Anima Core | Anima Core | Anima Core | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Beholding Eye | Beholding Eye | Beholding Eye | Beholding Eye |
| Trophy 2 | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Collection Of Samples | Collection Of Samples | Collection Of Samples | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales |
| score vs no items | ×1.62e20 | ×3.17e27 | ×3.27e33 | ×1.08e41 | ×1.15e44 | ×3.94e45 | ×5.79e48 | ×4.82e56 | ×4.05e72 | ×3.41e88 | ×2.62e112 |

## Scalings: ours vs the guide's "Overall Scaling to Profits" (informational)

d ln(score) / d ln(stat), measured by scaling the stat like an item multiplier.

| Stat | Guide | Ours, no items | Ours, headline set at enchant 20 |
|---|---|---|---|
| Inc (`Spell.IncantationEfficiency`) | ^7.39 | 3.099 | 3.081 |
| PAP (`Pet.AbilityPower`) | ^2 | 1.000 | 1.000 |
| Evo (`Spell.EvocationEfficiency`) | ^0.016 | 0.000 | 0.000 |
| CAP (`Hero.AbilityPower`) | ^1 | 1.000 | 1.000 |
| Idle (`Idle.Bonus`) | ^1 | 1.000 | 1.000 |
| Profit (`Prod.Global`) | ^1 | 1.000 | 1.000 |
| VpE (`Void.ManaPerEntity`) | ^1 | 0.000 | 0.000 |
| Void Mana (profit per point) (`Void.ProfitPerPoint`) | ^1 | 1.000 | 1.000 |
| Char Exp (per the XP table) | ^? | 0.209 | 0.473 |

## All variants at a glance

### burst

Run: pet simulacrum; spells 69,4,73,17,60; snapped 69,4; score production; idle on; Legion on; Resonator allowed; all slots; Weapon: only The Accumulator owned (16 other Weapons not owned); every other non-Mythic item owned at max quality; inputs AttrPoints.Intelligence=250, AttrPoints.Insight=250, AttrPoints.Spellcraft=250, AttrPoints.Wisdom=250, AttrPoints.Dominance=10, AttrPoints.Patience=250, AttrPoints.Mastery=250, AttrPoints.Empathy=250, AttrPoints.Versatility=10, Expeditions.Level=100, Pet.Level=200, Pet.AbilityPower=1370000000000, Spell.TimeHelix.CastsThisExile=300. File: `tool-result.json`. Levels run: 0–55. Change levels: 0, 1, 12, 13, 20.

| Slot | E0 | E5 | E10 | E15 | E20 | E30 | E40 | E55 |
|---|---|---|---|---|---|---|---|---|
| Head | Conjured Ragecrown | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts |
| Chest | Conjured Thornmail | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell |
| Hands | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves |
| Feet | Conjured Spiked Stompers | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration |
| Shoulder | Conjured Razorspaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders |
| Neck | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet |
| Waist | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt |
| Wrist | Conjured Sawrings | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers |
| Back | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape |
| Legs | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants |
| Offhand | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook |
| Research | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering |
| Accessory | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks |
| Mount | Warp Basilisk | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine |
| Phylactery | Inert Jade Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery |
| Weapon | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator |
| Finger 1 | Morbid Loop | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring |
| Finger 2 | The Bond | The Bond | The Bond | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anima Core | Anima Core | Anima Core | Blessed Armor Scales | Beholding Eye | Beholding Eye | Beholding Eye | Beholding Eye |
| Trophy 2 | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Collection Of Samples | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales |
| score vs no items | ×1.62e20 | ×3.27e33 | ×1.08e41 | ×5.79e48 | ×4.82e56 | ×4.05e72 | ×3.41e88 | ×2.62e112 |

Search hit the node budget at levels: none.

Items left out:

- not-owned (36)
- no-effect (29): Acclimatized Summons, Arcane Accelerator, Arcane Engine, Binding Sigil, Chemical Toolbelt, Cold-blooded Ring, Crystallized Echo, Destabilized Evocations, Devious Violet Phylactery, Eerie Turquoise Phylactery, Efficient Minion Tactics, Fey Glider, Gravemoss Waistband, Hectic Lime Phylactery, Holidays, Insidious Lure, Paukan, The Spider, Perfected Kata Bracers, Pitch-black Cage, Scales of Appraisal, Spirit's Guidance, Symbiotic Loop, Symbol Of Authority, Temporal Scabbard, The Magnifier, Vita Bulwark, Void Sampling, WrathSeed, Zenith, The Champion's Steed

### burst-chimaera

Run: pet greater-chimaera; spells 69,4,73,17,60; snapped 69,4; score production; idle on; Legion on; Resonator allowed; all slots; Weapon: only The Accumulator owned (16 other Weapons not owned); every other non-Mythic item owned at max quality; inputs AttrPoints.Intelligence=250, AttrPoints.Insight=250, AttrPoints.Spellcraft=250, AttrPoints.Wisdom=250, AttrPoints.Dominance=10, AttrPoints.Patience=250, AttrPoints.Mastery=250, AttrPoints.Empathy=250, AttrPoints.Versatility=10, Expeditions.Level=100, Pet.Level=200, Pet.AbilityPower=1370000000000, Spell.TimeHelix.CastsThisExile=300. File: `tool-result-burst-chimaera.json`. Levels run: 0–55. Change levels: 0, 1, 10, 12, 20.

| Slot | E0 | E5 | E10 | E15 | E20 | E30 | E40 | E55 |
|---|---|---|---|---|---|---|---|---|
| Head | Conjured Ragecrown | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts |
| Chest | Conjured Thornmail | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell |
| Hands | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves |
| Feet | Conjured Spiked Stompers | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration |
| Shoulder | Conjured Razorspaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders |
| Neck | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet |
| Waist | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt |
| Wrist | Conjured Sawrings | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers |
| Back | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape |
| Legs | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants |
| Offhand | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook |
| Research | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering |
| Accessory | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks |
| Mount | Warp Basilisk | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine |
| Phylactery | Inert Jade Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery |
| Weapon | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator |
| Finger 1 | Chronoboost Ring | Morbid Loop | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring |
| Finger 2 | Morbid Loop | Resonator Ring | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anima Core | Anima Core | Anima Core | Blessed Armor Scales | Beholding Eye | Beholding Eye | Beholding Eye | Beholding Eye |
| Trophy 2 | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Collection Of Samples | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales |
| score vs no items | ×7.17e19 | ×2.18e33 | ×7.52e40 | ×5.79e48 | ×4.82e56 | ×4.05e72 | ×3.41e88 | ×2.62e112 |

Search hit the node budget at levels: none.

Items left out:

- not-owned (36)
- no-effect (29): Acclimatized Summons, Arcane Accelerator, Arcane Engine, Binding Sigil, Chemical Toolbelt, Cold-blooded Ring, Crystallized Echo, Destabilized Evocations, Devious Violet Phylactery, Eerie Turquoise Phylactery, Efficient Minion Tactics, Fey Glider, Gravemoss Waistband, Hectic Lime Phylactery, Holidays, Insidious Lure, Paukan, The Spider, Perfected Kata Bracers, Pitch-black Cage, Scales of Appraisal, Spirit's Guidance, Symbiotic Loop, Symbol Of Authority, Temporal Scabbard, The Magnifier, Vita Bulwark, Void Sampling, WrathSeed, Zenith, The Champion's Steed

### burst-risen-giant

Run: pet risen-giant; spells 69,4,73,17,60; snapped 69,4; score production; idle on; Legion on; Resonator allowed; all slots; Weapon: only The Accumulator owned (16 other Weapons not owned); every other non-Mythic item owned at max quality; inputs AttrPoints.Intelligence=250, AttrPoints.Insight=250, AttrPoints.Spellcraft=250, AttrPoints.Wisdom=250, AttrPoints.Dominance=10, AttrPoints.Patience=250, AttrPoints.Mastery=250, AttrPoints.Empathy=250, AttrPoints.Versatility=10, Expeditions.Level=100, Pet.Level=200, Pet.AbilityPower=1370000000000, Spell.TimeHelix.CastsThisExile=300. File: `tool-result-burst-risen-giant.json`. Levels run: 0–55. Change levels: 0, 1, 4, 5, 16, 43, 53.

| Slot | E0 | E5 | E10 | E15 | E20 | E30 | E40 | E55 |
|---|---|---|---|---|---|---|---|---|
| Head | Conjured Ragecrown | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts |
| Chest | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage |
| Hands | Conjured Claws | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves |
| Feet | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves |
| Shoulder | Conjured Razorspaulders | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt |
| Neck | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Light Of Eighth Star |
| Waist | Encircling Trophies | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt |
| Wrist | Conjured Sawrings | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers |
| Back | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape |
| Legs | Tribal Dressing | Tribal Dressing | Tribal Dressing | Tribal Dressing | Tribal Dressing | Tribal Dressing | Tribal Dressing | Tribal Dressing |
| Offhand | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Black Vortex |
| Research | Self-Reflection | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking |
| Accessory | Bag Of Tricks | Burial Urn | Burial Urn | Burial Urn | Burial Urn | Burial Urn | Burial Urn | Burial Urn |
| Mount | — | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry |
| Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery |
| Weapon | — | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator |
| Finger 1 | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring |
| Finger 2 | The Bond | Resonator Ring | Resonator Ring | Resonator Ring | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anima Core | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales |
| Trophy 2 | Blessed Armor Scales | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium |
| score vs no items | ×7.42e23 | ×1.71e41 | ×4.88e50 | ×1.39e60 | ×6.98e69 | ×1.92e89 | ×5.28e108 | ×1.92e138 |

Search hit the node budget at levels: none.

Items left out:

- not-owned (36)
- no-effect (29): Acclimatized Summons, Arcane Accelerator, Arcane Engine, Binding Sigil, Chemical Toolbelt, Cold-blooded Ring, Crystallized Echo, Destabilized Evocations, Devious Violet Phylactery, Eerie Turquoise Phylactery, Efficient Minion Tactics, Fey Glider, Gravemoss Waistband, Hectic Lime Phylactery, Holidays, Insidious Lure, Paukan, The Spider, Perfected Kata Bracers, Pitch-black Cage, Scales of Appraisal, Spirit's Guidance, Symbiotic Loop, Symbol Of Authority, Temporal Scabbard, The Magnifier, Vita Bulwark, Void Sampling, WrathSeed, Zenith, The Champion's Steed

### burst-weapon-free

Run: pet simulacrum; spells 69,4,73,17,60; snapped 69,4; score production; idle on; Legion on; Resonator allowed; all slots; all Weapons owned; every other non-Mythic item owned at max quality; inputs AttrPoints.Intelligence=250, AttrPoints.Insight=250, AttrPoints.Spellcraft=250, AttrPoints.Wisdom=250, AttrPoints.Dominance=10, AttrPoints.Patience=250, AttrPoints.Mastery=250, AttrPoints.Empathy=250, AttrPoints.Versatility=10, Expeditions.Level=100, Pet.Level=200, Pet.AbilityPower=1370000000000, Spell.TimeHelix.CastsThisExile=300. File: `tool-result-burst-weapon-free.json`. Levels run: 0–55. Change levels: 0, 1, 12, 13, 20.

| Slot | E0 | E5 | E10 | E15 | E20 | E30 | E40 | E55 |
|---|---|---|---|---|---|---|---|---|
| Head | Conjured Ragecrown | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts |
| Chest | Conjured Thornmail | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell |
| Hands | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves |
| Feet | Conjured Spiked Stompers | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration |
| Shoulder | Conjured Razorspaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders |
| Neck | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet |
| Waist | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt |
| Wrist | Conjured Sawrings | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers |
| Back | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape |
| Legs | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants |
| Offhand | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook |
| Research | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering |
| Accessory | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks |
| Mount | Warp Basilisk | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine |
| Phylactery | Inert Jade Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery |
| Weapon | Cataclysm | Thunderbird | Thunderbird | Thunderbird | Thunderbird | Thunderbird | Thunderbird | Thunderbird |
| Finger 1 | Morbid Loop | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring |
| Finger 2 | The Bond | The Bond | The Bond | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anima Core | Anima Core | Anima Core | Blessed Armor Scales | Beholding Eye | Beholding Eye | Beholding Eye | Beholding Eye |
| Trophy 2 | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Collection Of Samples | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales |
| score vs no items | ×1.62e20 | ×1.00e34 | ×5.80e41 | ×5.42e49 | ×7.89e57 | ×2.04e74 | ×5.26e90 | ×2.18e115 |

Search hit the node budget at levels: none.

Items left out:

- mythic (20)
- no-effect (33): Acclimatized Summons, Arcane Accelerator, Arcane Engine, Binding Sigil, Branch of the Great Cycle, Chemical Toolbelt, Cold-blooded Ring, Crystallized Echo, Destabilized Evocations, Devious Violet Phylactery, Eerie Turquoise Phylactery, Efficient Minion Tactics, Enchanting Membrane, Fey Glider, Gravemoss Waistband, Hectic Lime Phylactery, Holidays, Insidious Lure, Paukan, The Spider, Perfected Kata Bracers, Pitch-black Cage, Redeemer, Scales of Appraisal, Spellstealer, Spirit's Guidance, Symbiotic Loop, Symbol Of Authority, Temporal Scabbard, The Magnifier, Vita Bulwark, Void Sampling, WrathSeed, Zenith, The Champion's Steed

### burst-no-legion

Run: pet simulacrum; spells 69,4,73,17,60; snapped 69,4; score production; idle on; Legion off; Resonator allowed; all slots; Weapon: only The Accumulator owned (16 other Weapons not owned); every other non-Mythic item owned at max quality; inputs AttrPoints.Intelligence=250, AttrPoints.Insight=250, AttrPoints.Spellcraft=250, AttrPoints.Wisdom=250, AttrPoints.Dominance=10, AttrPoints.Patience=250, AttrPoints.Mastery=250, AttrPoints.Empathy=250, AttrPoints.Versatility=10, Expeditions.Level=100, Pet.Level=200, Pet.AbilityPower=1370000000000, Spell.TimeHelix.CastsThisExile=300. File: `tool-result-burst-no-legion.json`. Levels run: 0–55. Change levels: 0, 1, 2, 13, 14, 21.

| Slot | E0 | E5 | E10 | E15 | E20 | E30 | E40 | E55 |
|---|---|---|---|---|---|---|---|---|
| Head | Conjured Ragecrown | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts |
| Chest | Conjured Thornmail | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell |
| Hands | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves |
| Feet | Conjured Spiked Stompers | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration |
| Shoulder | Conjured Razorspaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders |
| Neck | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet |
| Waist | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt |
| Wrist | Conjured Sawrings | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers |
| Back | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape |
| Legs | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants |
| Offhand | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook |
| Research | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering |
| Accessory | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks |
| Mount | Warp Basilisk | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine |
| Phylactery | Inert Jade Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery |
| Weapon | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator |
| Finger 1 | Morbid Loop | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring |
| Finger 2 | The Bond | The Bond | The Bond | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anima Core | Anima Core | Anima Core | Blessed Armor Scales | Blessed Armor Scales | Beholding Eye | Beholding Eye | Beholding Eye |
| Trophy 2 | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Collection Of Samples | Collection Of Samples | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales |
| score vs no items | ×1.62e20 | ×1.03e32 | ×3.37e39 | ×1.51e47 | ×1.25e55 | ×1.04e71 | ×8.71e86 | ×6.69e110 |

Search hit the node budget at levels: none.

Items left out:

- not-owned (36)
- no-effect (29): Acclimatized Summons, Arcane Accelerator, Arcane Engine, Binding Sigil, Chemical Toolbelt, Cold-blooded Ring, Crystallized Echo, Destabilized Evocations, Devious Violet Phylactery, Eerie Turquoise Phylactery, Efficient Minion Tactics, Fey Glider, Gravemoss Waistband, Hectic Lime Phylactery, Holidays, Insidious Lure, Paukan, The Spider, Perfected Kata Bracers, Pitch-black Cage, Scales of Appraisal, Spirit's Guidance, Symbiotic Loop, Symbol Of Authority, Temporal Scabbard, The Magnifier, Vita Bulwark, Void Sampling, WrathSeed, Zenith, The Champion's Steed

### burst-literal-attrs

Run: pet simulacrum; spells 69,4,73,17,60; snapped 69,4; score production; idle on; Legion on; Resonator allowed; all slots; Weapon: only The Accumulator owned (16 other Weapons not owned); every other non-Mythic item owned at max quality; inputs AttrPoints.Intelligence=250, AttrPoints.Insight=250, AttrPoints.Spellcraft=240, AttrPoints.Wisdom=240, AttrPoints.Dominance=0, AttrPoints.Patience=250, AttrPoints.Mastery=250, AttrPoints.Empathy=250, AttrPoints.Versatility=0, Expeditions.Level=100, Pet.Level=200, Pet.AbilityPower=1370000000000, Spell.TimeHelix.CastsThisExile=300. File: `tool-result-burst-literal-attrs.json`. Levels run: 0–55. Change levels: 0, 1, 12, 13, 20.

| Slot | E0 | E5 | E10 | E15 | E20 | E30 | E40 | E55 |
|---|---|---|---|---|---|---|---|---|
| Head | Conjured Ragecrown | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts |
| Chest | Conjured Thornmail | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell |
| Hands | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves |
| Feet | Conjured Spiked Stompers | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration |
| Shoulder | Conjured Razorspaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders |
| Neck | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet |
| Waist | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt |
| Wrist | Conjured Sawrings | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers |
| Back | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape |
| Legs | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants |
| Offhand | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook |
| Research | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering |
| Accessory | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks |
| Mount | — | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine |
| Phylactery | Inert Jade Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery |
| Weapon | — | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator |
| Finger 1 | Morbid Loop | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring |
| Finger 2 | The Bond | The Bond | The Bond | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anima Core | Anima Core | Anima Core | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales |
| Trophy 2 | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Collection Of Samples | Charged Fin-Wing | Charged Fin-Wing | Charged Fin-Wing | Charged Fin-Wing |
| score vs no items | ×1.62e20 | ×3.27e33 | ×1.08e41 | ×5.79e48 | ×4.82e56 | ×4.05e72 | ×3.41e88 | ×2.62e112 |

Search hit the node budget at levels: none.

Items left out:

- not-owned (36)
- no-effect (29): Acclimatized Summons, Arcane Accelerator, Arcane Engine, Binding Sigil, Chemical Toolbelt, Cold-blooded Ring, Crystallized Echo, Destabilized Evocations, Devious Violet Phylactery, Eerie Turquoise Phylactery, Efficient Minion Tactics, Fey Glider, Gravemoss Waistband, Hectic Lime Phylactery, Holidays, Insidious Lure, Paukan, The Spider, Perfected Kata Bracers, Pitch-black Cage, Scales of Appraisal, Spirit's Guidance, Symbiotic Loop, Symbol Of Authority, Temporal Scabbard, The Magnifier, Vita Bulwark, Void Sampling, WrathSeed, Zenith, The Champion's Steed

### burst-gems-mixed

Run: pet simulacrum; spells 69,4,73,17,60; snapped 69,4; score production; idle on; Legion on; Resonator allowed; all slots; Weapon: only The Accumulator owned (16 other Weapons not owned); every other non-Mythic item owned at max quality; inputs AttrPoints.Intelligence=250, AttrPoints.Insight=250, AttrPoints.Spellcraft=250, AttrPoints.Wisdom=250, AttrPoints.Dominance=10, AttrPoints.Patience=250, AttrPoints.Mastery=250, AttrPoints.Empathy=250, AttrPoints.Versatility=10, Expeditions.Level=100, Pet.Level=200, Pet.AbilityPower=1370000000000, Spell.TimeHelix.CastsThisExile=300, Building.1.Share=1, Building.1.Count=3000, Spell.GemResonance.SnappedIncantationEfficiency=1000. File: `tool-result-burst-gems-mixed.json`. Levels run: 0–55. Change levels: 0, 1, 12, 13, 20.

| Slot | E0 | E5 | E10 | E15 | E20 | E30 | E40 | E55 |
|---|---|---|---|---|---|---|---|---|
| Head | Conjured Ragecrown | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts |
| Chest | Conjured Thornmail | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell | Seclusion Shell |
| Hands | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves | Talented Gloves |
| Feet | Conjured Spiked Stompers | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration |
| Shoulder | Conjured Razorspaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders | Tranquil Spaulders |
| Neck | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet |
| Waist | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt |
| Wrist | Conjured Sawrings | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers |
| Back | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape | Fancy Cape |
| Legs | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants | Mesmerizing Pants |
| Offhand | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook |
| Research | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering |
| Accessory | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks | Bag Of Tricks |
| Mount | — | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine | The Rubedo Engine |
| Phylactery | Inert Jade Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery | Robust Tangerine Phylactery |
| Weapon | — | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator | The Accumulator |
| Finger 1 | Morbid Loop | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring | Resonator Ring |
| Finger 2 | The Bond | The Bond | The Bond | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anima Core | Anima Core | Anima Core | Blessed Armor Scales | Beholding Eye | Beholding Eye | Beholding Eye | Beholding Eye |
| Trophy 2 | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Collection Of Samples | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales |
| score vs no items | ×1.63e20 | ×2.18e33 | ×5.85e40 | ×2.79e48 | ×2.32e56 | ×1.95e72 | ×1.64e88 | ×1.26e112 |

Search hit the node budget at levels: none.

Items left out:

- not-owned (36)
- no-effect (29): Acclimatized Summons, Arcane Accelerator, Arcane Engine, Binding Sigil, Chemical Toolbelt, Cold-blooded Ring, Crystallized Echo, Destabilized Evocations, Devious Violet Phylactery, Eerie Turquoise Phylactery, Efficient Minion Tactics, Fey Glider, Gravemoss Waistband, Hectic Lime Phylactery, Holidays, Insidious Lure, Paukan, The Spider, Perfected Kata Bracers, Pitch-black Cage, Scales of Appraisal, Spirit's Guidance, Symbiotic Loop, Symbol Of Authority, Temporal Scabbard, The Magnifier, Vita Bulwark, Void Sampling, WrathSeed, Zenith, The Champion's Steed

## Detailed sets and contributions

Contribution = the set's score divided by the score with that item removed (slot left empty); "required" = removing it breaks another chosen item's attribute requirement.

### burst: best set per enchant level

File: `tool-result.json`. Sweep change levels (the set differs from the previous level): 0, 1, 12, 13, 20.

**Enchant 0**: score ×1.62e20 vs no items; branches forced ×1.62e20, forced ×2.70e19; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Conjured Ragecrown (Conjurer's Chains) | Legendary | 0 (0) | ×14 |
| Chest | Conjured Thornmail (Conjurer's Chains) | Legendary | 0 (0) | ×14 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 0 (0) | ×22.5 |
| Feet | Conjured Spiked Stompers (Conjurer's Chains) | Legendary | 0 (0) | ×10.7 |
| Shoulder | Conjured Razorspaulders (Conjurer's Chains) | Legendary | 0 (0) | ×27.9 |
| Neck | Lucky Amulet | Legendary | 0 (0) | ×7.97 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 0 (0) | ×14.4 |
| Wrist | Conjured Sawrings (Conjurer's Chains) | Legendary | 0 (0) | ×17.5 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 0 (0) | ×18 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 0 (0) | ×22.5 |
| Offhand | Murmuring Spellbook | Legendary | 0 (0) | ×67.1 |
| Research | Daemonics Reverse-Engineering | Legendary | 0 (0) | ×10 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 0 (0) | ×26.2 |
| Mount | Warp Basilisk | Unique | 0 (0) | ×1 |
| Phylactery | Inert Jade Phylactery | Legendary | 0 (0) | ×98.8 |
| Weapon | The Accumulator | Legendary | 0 (0) | ×1 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 0 (0) | ×6 |
| Finger 2 | The Bond | Unique | 0 (0) | ×9 |
| Trophy 1 | Anima Core | Legendary | 0 (0) | ×27.4 |
| Trophy 2 | Blessed Armor Scales | Legendary | 0 (0) | ×21 |

**Enchant 1**: score ×3.17e27 vs no items; branches forced ×1.03e23, forced ×3.17e27; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 1 (6) | ×12.5 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | Legendary | 1 (6) | ×45.6 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 1 (6) | ×67.2 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 1 (6) | ×26 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | Legendary | 1 (6) | ×55 |
| Neck | Lucky Amulet | Legendary | 1 (6) | ×30.3 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 1 (6) | ×43.1 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 1 (6) | ×19.5 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 1 (6) | ×53.7 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 1 (6) | ×67.2 |
| Offhand | Murmuring Spellbook | Legendary | 1 (6) | ×200 |
| Research | Daemonics Reverse-Engineering | Legendary | 1 (6) | ×29.9 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 1 (6) | ×100 |
| Mount | The Rubedo Engine | Unique | 1 (6) | ×2.03 |
| Phylactery | Robust Tangerine Phylactery | Legendary | 1 (6) | ×175 |
| Weapon | The Accumulator | Legendary | 1 (6) | ×2.46 |
| Finger 1 | Resonator Ring | Legendary | 0 (0) | ×1.03e6 |
| Finger 2 | The Bond | Unique | 1 (6) | ×20.8 |
| Trophy 1 | Anima Core | Legendary | 1 (6) | ×56.2 |
| Trophy 2 | Blessed Armor Scales | Legendary | 1 (6) | ×80.1 |

**Enchant 5**: score ×3.27e33 vs no items; branches forced ×4.39e28, forced ×3.27e33; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 5 (10) | ×30.4 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | Legendary | 5 (10) | ×111 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 5 (10) | ×139 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 5 (10) | ×63.4 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | Legendary | 5 (10) | ×134 |
| Neck | Lucky Amulet | Legendary | 5 (10) | ×74 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 5 (10) | ×89.4 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 5 (10) | ×40.5 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 5 (10) | ×111 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 5 (10) | ×139 |
| Offhand | Murmuring Spellbook | Legendary | 5 (10) | ×415 |
| Research | Daemonics Reverse-Engineering | Legendary | 5 (10) | ×61.9 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 5 (10) | ×244 |
| Mount | The Rubedo Engine | Unique | 5 (10) | ×3.25 |
| Phylactery | Robust Tangerine Phylactery | Legendary | 5 (10) | ×256 |
| Weapon | The Accumulator | Legendary | 5 (10) | ×4.49 |
| Finger 1 | Resonator Ring | Legendary | 0 (0) | ×1.03e6 |
| Finger 2 | The Bond | Unique | 5 (10) | ×36.4 |
| Trophy 1 | Anima Core | Legendary | 5 (10) | ×90.9 |
| Trophy 2 | Blessed Armor Scales | Legendary | 5 (10) | ×196 |

**Enchant 10**: score ×1.08e41 vs no items; branches forced ×2.91e36, forced ×1.08e41; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 10 (15) | ×92.8 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | Legendary | 10 (15) | ×339 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 10 (15) | ×347 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 10 (15) | ×193 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | Legendary | 10 (15) | ×409 |
| Neck | Lucky Amulet | Legendary | 10 (15) | ×226 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 10 (15) | ×222 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 10 (15) | ×101 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 10 (15) | ×277 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 10 (15) | ×347 |
| Offhand | Murmuring Spellbook | Legendary | 10 (15) | ×1030 |
| Research | Daemonics Reverse-Engineering | Legendary | 10 (15) | ×154 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 10 (15) | ×746 |
| Mount | The Rubedo Engine | Unique | 10 (15) | ×5.85 |
| Phylactery | Robust Tangerine Phylactery | Legendary | 10 (15) | ×413 |
| Weapon | The Accumulator | Legendary | 10 (15) | ×9.5 |
| Finger 1 | Resonator Ring | Legendary | 0 (0) | ×1.03e6 |
| Finger 2 | The Bond | Unique | 10 (15) | ×73.2 |
| Trophy 1 | Anima Core | Legendary | 10 (15) | ×166 |
| Trophy 2 | Blessed Armor Scales | Legendary | 10 (15) | ×597 |

**Enchant 12**: score ×1.15e44 vs no items; branches forced ×3.91e39, forced ×1.15e44; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 12 (17) | ×145 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | Legendary | 12 (17) | ×532 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 12 (17) | ×499 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 12 (17) | ×303 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | Legendary | 12 (17) | ×643 |
| Neck | Lucky Amulet | Legendary | 12 (17) | ×354 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 12 (17) | ×320 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 12 (17) | ×145 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 12 (17) | ×399 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 12 (17) | ×499 |
| Offhand | Murmuring Spellbook | Legendary | 12 (17) | ×1490 |
| Research | Daemonics Reverse-Engineering | Legendary | 12 (17) | ×222 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 12 (17) | ×1170 |
| Mount | The Rubedo Engine | Unique | 12 (17) | ×7.41 |
| Phylactery | Robust Tangerine Phylactery | Legendary | 12 (17) | ×500 |
| Weapon | The Accumulator | Legendary | 12 (17) | ×12.9 |
| Finger 1 | Resonator Ring | Legendary | 0 (0) | ×1.32e6 |
| Finger 2 | The Bond | Unique | 12 (17) | ×96.9 |
| Trophy 1 | Blessed Armor Scales | Legendary | 12 (17) | ×933 |
| Trophy 2 | Collection Of Samples | Legendary | 12 (17) | ×222 |

**Enchant 13**: score ×3.94e45 vs no items; branches forced ×1.43e41, forced ×3.94e45; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 13 (18) | ×182 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | Legendary | 13 (18) | ×665 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 13 (18) | ×599 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 13 (18) | ×379 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | Legendary | 13 (18) | ×803 |
| Neck | Lucky Amulet | Legendary | 13 (18) | ×442 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 13 (18) | ×384 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 13 (18) | ×174 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 13 (18) | ×479 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 13 (18) | ×599 |
| Offhand | Murmuring Spellbook | Legendary | 13 (18) | ×1790 |
| Research | Daemonics Reverse-Engineering | Legendary | 13 (18) | ×266 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 13 (18) | ×1460 |
| Mount | The Rubedo Engine | Unique | 13 (18) | ×8.33 |
| Phylactery | Robust Tangerine Phylactery | Legendary | 13 (18) | ×549 |
| Weapon | The Accumulator | Legendary | 13 (18) | ×15 |
| Finger 1 | Resonator Ring | Legendary | 0 (0) | ×2.16e6 |
| Finger 2 | Spell Helix | Legendary | 13 (18) | ×112 |
| Trophy 1 | Blessed Armor Scales | Legendary | 13 (18) | ×1170 |
| Trophy 2 | Collection Of Samples | Legendary | 13 (18) | ×266 |

**Enchant 15**: score ×5.79e48 vs no items; branches forced ×2.28e44, forced ×5.79e48; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 15 (20) | ×284 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | Legendary | 15 (20) | ×1040 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 15 (20) | ×863 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 15 (20) | ×592 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | Legendary | 15 (20) | ×1250 |
| Neck | Lucky Amulet | Legendary | 15 (20) | ×690 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 15 (20) | ×553 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 15 (20) | ×251 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 15 (20) | ×690 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 15 (20) | ×863 |
| Offhand | Murmuring Spellbook | Legendary | 15 (20) | ×2570 |
| Research | Daemonics Reverse-Engineering | Legendary | 15 (20) | ×383 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 15 (20) | ×2280 |
| Mount | The Rubedo Engine | Unique | 15 (20) | ×10.5 |
| Phylactery | Robust Tangerine Phylactery | Legendary | 15 (20) | ×665 |
| Weapon | The Accumulator | Legendary | 15 (20) | ×20.3 |
| Finger 1 | Resonator Ring | Legendary | 0 (0) | ×2.16e6 |
| Finger 2 | Spell Helix | Legendary | 15 (20) | ×190 |
| Trophy 1 | Blessed Armor Scales | Legendary | 15 (20) | ×1820 |
| Trophy 2 | Collection Of Samples | Legendary | 15 (20) | ×383 |

**Enchant 20**: score ×4.82e56 vs no items; branches forced ×3.76e52, forced ×4.82e56; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 20 (25) | ×866 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | Legendary | 20 (25) | ×3170 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 20 (25) | ×2150 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 20 (25) | ×1800 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | Legendary | 20 (25) | ×3820 |
| Neck | Lucky Amulet | Legendary | 20 (25) | ×2110 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 20 (25) | ×1380 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 20 (25) | ×624 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 20 (25) | ×1720 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 20 (25) | ×2150 |
| Offhand | Murmuring Spellbook | Legendary | 20 (25) | ×6400 |
| Research | Daemonics Reverse-Engineering | Legendary | 20 (25) | ×954 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 20 (25) | ×6950 |
| Mount | The Rubedo Engine | Unique | 20 (25) | ×19 |
| Phylactery | Robust Tangerine Phylactery | Legendary | 20 (25) | ×1070 |
| Weapon | The Accumulator | Legendary | 20 (25) | ×43.1 |
| Finger 1 | Resonator Ring | Legendary | 0 (0) | ×2.35e6 |
| Finger 2 | Spell Helix | Legendary | 20 (25) | ×706 |
| Trophy 1 | Beholding Eye | Legendary | 20 (25) | ×958 |
| Trophy 2 | Blessed Armor Scales | Legendary | 20 (25) | ×5560 |

**Enchant 30**: score ×4.05e72 vs no items; branches forced ×1.18e69, forced ×4.05e72; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 30 (35) | ×8060 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | Legendary | 30 (35) | ×29400 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 30 (35) | ×13300 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 30 (35) | ×16800 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | Legendary | 30 (35) | ×35500 |
| Neck | Lucky Amulet | Legendary | 30 (35) | ×19600 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 30 (35) | ×8530 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 30 (35) | ×3860 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 30 (35) | ×10600 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 30 (35) | ×13300 |
| Offhand | Murmuring Spellbook | Legendary | 30 (35) | ×39600 |
| Research | Daemonics Reverse-Engineering | Legendary | 30 (35) | ×5910 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 30 (35) | ×64700 |
| Mount | The Rubedo Engine | Unique | 30 (35) | ×61.7 |
| Phylactery | Robust Tangerine Phylactery | Legendary | 30 (35) | ×2780 |
| Weapon | The Accumulator | Legendary | 30 (35) | ×194 |
| Finger 1 | Resonator Ring | Legendary | 0 (0) | ×2.34e6 |
| Finger 2 | Spell Helix | Legendary | 30 (35) | ×9730 |
| Trophy 1 | Beholding Eye | Legendary | 30 (35) | ×7290 |
| Trophy 2 | Blessed Armor Scales | Legendary | 30 (35) | ×51800 |

**Enchant 40**: score ×3.41e88 vs no items; branches forced ×5.97e85, forced ×3.41e88; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 40 (45) | ×75000 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | Legendary | 40 (45) | ×274000 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 40 (45) | ×82300 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 40 (45) | ×156000 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | Legendary | 40 (45) | ×330000 |
| Neck | Lucky Amulet | Legendary | 40 (45) | ×182000 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 40 (45) | ×52800 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 40 (45) | ×23900 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 40 (45) | ×65800 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 40 (45) | ×82300 |
| Offhand | Murmuring Spellbook | Legendary | 40 (45) | ×245000 |
| Research | Daemonics Reverse-Engineering | Legendary | 40 (45) | ×36600 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 40 (45) | ×603000 |
| Mount | The Rubedo Engine | Unique | 40 (45) | ×200 |
| Phylactery | Robust Tangerine Phylactery | Legendary | 40 (45) | ×7200 |
| Weapon | The Accumulator | Legendary | 40 (45) | ×868 |
| Finger 1 | Resonator Ring | Legendary | 0 (0) | ×2.34e6 |
| Finger 2 | Spell Helix | Legendary | 40 (45) | ×134000 |
| Trophy 1 | Beholding Eye | Legendary | 40 (45) | ×55500 |
| Trophy 2 | Blessed Armor Scales | Legendary | 40 (45) | ×482000 |

**Enchant 55**: score ×2.62e112 vs no items; branches forced ×9.64e110, forced ×2.62e112; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 55 (60) | ×2.13e6 |
| Chest | Seclusion Shell (Raiments Of The Perfect Mind) | Legendary | 55 (60) | ×7.76e6 |
| Hands | Talented Gloves (Jester's Privilege) | Legendary | 55 (60) | ×1.27e6 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 55 (60) | ×4.43e6 |
| Shoulder | Tranquil Spaulders (Raiments Of The Perfect Mind) | Legendary | 55 (60) | ×9.37e6 |
| Neck | Lucky Amulet | Legendary | 55 (60) | ×5.18e6 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 55 (60) | ×814000 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 55 (60) | ×367000 |
| Back | Fancy Cape (Jester's Privilege) | Legendary | 55 (60) | ×1.01e6 |
| Legs | Mesmerizing Pants (Jester's Privilege) | Legendary | 55 (60) | ×1.27e6 |
| Offhand | Murmuring Spellbook | Legendary | 55 (60) | ×3.78e6 |
| Research | Daemonics Reverse-Engineering | Legendary | 55 (60) | ×563000 |
| Accessory | Bag Of Tricks (Jester's Privilege) | Legendary | 55 (60) | ×1.71e7 |
| Mount | The Rubedo Engine | Unique | 55 (60) | ×1170 |
| Phylactery | Robust Tangerine Phylactery | Legendary | 55 (60) | ×30100 |
| Weapon | The Accumulator | Legendary | 55 (60) | ×8230 |
| Finger 1 | Resonator Ring | Legendary | 0 (0) | ×2.34e6 |
| Finger 2 | Spell Helix | Legendary | 55 (60) | ×6.86e6 |
| Trophy 1 | Beholding Eye | Legendary | 55 (60) | ×1.16e6 |
| Trophy 2 | Blessed Armor Scales | Legendary | 55 (60) | ×1.37e7 |


## Inputs of burst (relevance at enchant 20)

Shown: 20; hidden (can't change which set wins, so the UI would not ask for them): 47.

Hidden inputs: `Mysteries.Count`, `Pet.Level`, `Void.Mana`, `AttrPoints.Insight`, `Void.ProfitPerPoint`, `AttrPoints.Versatility`, `AttrPoints.Spellcraft`, `AttrPoints.Wisdom`, `AttrPoints.Dominance`, `Misc.AchievementsUnlocked`, `Misc.UpgradesBought`, `Void.EntitiesThisExile`, `Shards.CollectedThisExile`, `Shards.PassiveGeneration`, `Misc.SourcesOwned`, `Misc.AchievementPoints`, `Spell.EvocationCastsThisExile`, `Misc.Laboratories`, `Elixir.IncantationIngredients`, `Items.EnchantingDustThisExile`, `Hero.AbilityPower`, `Char.ClassTimeHours`, `Time.SkippedYears`, `Hero.AbilityPowerGrowth`, `Pet.TimeCurrent`, `Pet.AbilityPower`, `Spell.StabilizeTheFlow.SnappedMaxDistortion`, `Spell.StabilizeTheFlow.SnappedIncantationEfficiency`, `Spell.Superposition.CastsThisExile`, `Spell.RitualOfPower.CastsThisExile`, `Misc.CatalystShards`, `Misc.LiquidShadow`, `Misc.ShadowCoals`, `Misc.BatsThisExile`, `Misc.MaxManaAccrued`, `Void.ManaAccrued`, `Click.AutoclicksAccrued`, `Spell.CastsAccrued`, `Void.EntitiesAccrued`, `Spell.GemResonance.SnappedIncantationEfficiency`, `Building.1.Count`, `Building.3.Share`, `Building.4.Share`, `Weapon.CataclysmCharges`, `Building.6.Count`, `Building.7.Share`, `Building.8.Share`.

| Input | Value | Source of the value | Ranking relevance (enchant 20) |
|---|---|---|---|
| `Mysteries.Count` (Mysteries) | 1.00e150 | class/pet default, unverified: The guide covers e90–e220+ Mysteries. | hidden: Varying it from 1e144 to 1e156 changes every item set's score by the same factor. |
| `AttrPoints.Intelligence` (Intelligence points assigned) | 250 | set for this run (see choices) | **shown**: Changes how much items are worth: varying it from 0 to 1000 moves the gap between item sets by up to ×15.47. |
| `Pet.Level` (Pet level) | 200 | set for this run (see choices) | hidden: Varying it from 1 to 200000000.000 changes every item set's score by the same factor. |
| `Misc.AttributeCap` (Attribute cap) | 250 | generic default | **shown**: Changes how much items are worth: varying it from 100 to 250 moves the gap between item sets by up to ×1.927. |
| `Char.Level` (Character level) | 200 | class/pet default, unverified: Character level after the level buildup (same generic magnitude as the other classes). The Wizard XP table (level 300 = 2.58e15 XP) and Legacy's level milestones (110–300) put late-game levels in the low hundreds. | **shown**: Changes how much items are worth: varying it from 1 to 200000000.000 moves the gap between item sets. |
| `AttrPoints.Mastery` (Mastery points assigned) | 250 | set for this run (see choices) | **shown**: Changes how much items are worth: varying it from 0 to 1000 moves the gap between item sets by up to ×13.75. |
| `Char.LevelRequirementReduction` (Level requirement reduction without items) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 100 moves the gap between item sets by up to ×2.193. |
| `Void.Mana` (Void mana collected at burst time) | 1.00e10 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: Void mana gathered with Void Radiance in the pre-burst. | hidden: Varying it from 10000 to 1e16 moves the gap between item sets by at most ×1, which is below the noise threshold. |
| `AttrPoints.Insight` (Insight points assigned) | 250 | set for this run (see choices) | hidden: Varying it from 0 to 1000 changes every item set's score by the same factor. |
| `AttrPoints.Patience` (Patience points assigned) | 250 | set for this run (see choices) | **shown**: Changes how much items are worth: varying it from 0 to 1000 moves the gap between item sets by up to ×2.871. |
| `Idle.TimeThisExile` (Idle time this Exile (seconds)) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×1.61. |
| `Spell.CastsThisExile` (Spells cast this Exile) | 1.00e7 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: spells cast this Exile (phases 1 and 2 cast recklessly). | **shown**: Changes how much items are worth: varying it from 10 to 10000000000000.000 moves the gap between item sets by up to ×837.5. |
| `Expeditions.Level` (Expedition level) | 100 | set for this run (see choices) | **shown**: Changes how much items are worth: varying it from 0 to 100 moves the gap between item sets by up to ×26.9. |
| `Idle.Bonus` (Idle bonus multiplier without item and attribute bonuses) | 100 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: idle bonus before items and attributes (the guide's Patience note relies on Risen Giant's idle scaling). | **shown**: Changes how much items are worth: varying it from 1 to 100000000.000 moves the gap between item sets by up to ×32.8. |
| `Void.ProfitPerPoint` (Profit per Void mana point without item and attribute bonuses) | 1 | generic default | hidden: Varying it from 0.000 to 1000000.000 changes every item set's score by the same factor. |
| `Idle.Active` (Burst in Idle mode) | 1 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×6398. |
| `AttrPoints.Versatility` (Versatility points assigned) | 10 | set for this run (see choices) | hidden: Varying it from 0 to 40 changes every item set's score by the same factor. |
| `AttrPoints.Spellcraft` (Spellcraft points assigned) | 250 | set for this run (see choices) | hidden: Varying it from 0 to 1000 moves the gap between item sets by at most ×1.009, which is below the noise threshold. |
| `AttrPoints.Wisdom` (Wisdom points assigned) | 250 | set for this run (see choices) | hidden: Varying it from 0 to 1000 changes every item set's score by the same factor. |
| `AttrPoints.Dominance` (Dominance points assigned) | 10 | set for this run (see choices) | hidden: Varying it from 0 to 40 changes every item set's score by the same factor. |
| `AttrPoints.Empathy` (Empathy points assigned) | 250 | set for this run (see choices) | **shown**: Changes how much items are worth: varying it from 0 to 1000 moves the gap between item sets by up to ×481. |
| `Misc.AchievementsUnlocked` (Achievements unlocked) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Misc.UpgradesBought` (Upgrades bought) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Void.EntitiesThisExile` (Void entities collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Shards.CollectedThisExile` (Spell shards collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Shards.PassiveGeneration` (Passive spell shard generation without item and attribute bonuses) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Click.AutoclicksThisExile` (Autoclicks this Exile) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×3.4. |
| `Misc.SourcesOwned` (Total amount of mana sources owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.AchievementPoints` (Achievement points) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Building.8.Count` (Nexi owned) | 3000 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: Temporal Anchors owned (unlocking the class takes 1500 of The Nexus). | **shown**: Changes how much items are worth: varying it from 0 to 3000000000.000 moves the gap between item sets by up to ×7.784. |
| `Spell.EvocationCastsThisExile` (Evocation spells cast this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 moves the gap between item sets by at most ×1.01, which is below the noise threshold. |
| `Misc.Laboratories` (Laboratories owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Elixir.IncantationIngredients` (Incantation ingredients in the cauldron) | 0 | generic default | hidden: Varying it from 0 to 5 changes every item set's score by the same factor. |
| `Spell.IncantationEfficiency` (Incantation efficiency from sources the tool doesn't model) | 1000 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: Incantation efficiency from upgrades and other unmodelled sources. | **shown**: Changes how much items are worth: varying it from 0.001 to 1000000000.000 moves the gap between item sets by up to ×7.858. |
| `Items.EnchantingDustThisExile` (Enchanting dust collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Hero.AbilityPower` (Character ability power (CAP) without item and attribute bonuses) | 1.00e6 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: CAP before items and attributes. | hidden: Varying it from 1 to 1000000000000.000 changes every item set's score by the same factor. |
| `Char.ClassTimeHours` (Time played as this class this Exile (hours)) | 10 | class/pet default, unverified: The guide gives a run duration of 10 minutes to 10 hours; the upper end is used. | hidden: Varying it from 0.000 to 10000000.000 changes every item set's score by the same factor. |
| `Time.SkippedYears` (Skipped time this Exile (years)) | 1 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: time skipped with Wormhole in phases 1 and 2. | hidden: Varying it from 0.000 to 1000000.000 moves the gap between item sets by at most ×1, which is below the noise threshold. |
| `Hero.AbilityPowerGrowth` (CAP growth rate without item and attribute bonuses) | 10 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: CAP growth rate. | hidden: Varying it from 0.000 to 10000000.000 changes every item set's score by the same factor. |
| `Pet.TimeCurrent` (Current pet time (seconds)) | 3.15e7 | class/pet default, unverified: Risen Giant scales with the pet game time gained from Wormhole, so its pet time matches the skipped-time default. | hidden: Varying it from 31.54 to 31536000000000.000 changes every item set's score by the same factor. |
| `Pet.AbilityPower` (Pet ability power (PAP) without item and attribute bonuses) | 1.37e12 | set for this run (see choices) | hidden: Varying it from 1370000.000 to 1.37e18 changes every item set's score by the same factor. |
| `Spell.StabilizeTheFlow.SnappedMaxDistortion` (Stabilize The Flow: Time Distortion consumed when it was cast (snapped)) | 10 | class/pet default, unverified: The pre-burst casts Temporal Distortion until Stabilize The Flow is cast; 10x is the class page's base maximum (items and an upgrade raise it to 30x). | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Spell.StabilizeTheFlow.SnappedIncantationEfficiency` (Stabilize The Flow: Incantation efficiency when it was cast (snapped)) | 1000 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: Incantation efficiency of the pre-burst set that casts Stabilize The Flow. | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Spell.Superposition.CastsThisExile` (Superposition: casts this Exile) | 1.00e5 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: Superposition casts stacked in phase 2. | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Spell.RitualOfPower.CastsThisExile` (Ritual Of Power: casts this Exile) | 1.00e5 | class/pet default, unverified: Placeholder magnitude, not stated by a guide: Ritual Of Power casts stacked in phase 2. | hidden: Varying it from 0.1 to 100000000000.000 moves the gap between item sets by at most ×1, which is below the noise threshold. |
| `Spell.TimeHelix.CastsThisExile` (Time Helix: casts this Exile) | 300 | set for this run (see choices) | **shown**: Changes how much items are worth: varying it from 0.000 to 300000000.000 moves the gap between item sets by up to ×1.166. |
| `Misc.CatalystShards` (Catalyst shards collected) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.LiquidShadow` (Liquid Shadow held) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.ShadowCoals` (Shadow Coals owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.BatsThisExile` (Bats collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.MaxManaAccrued` (Maximum mana accrued) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Void.ManaAccrued` (Void mana accrued) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Click.AutoclicksAccrued` (Autoclicks accrued) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Spell.CastsAccrued` (Spellcasts accrued) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Void.EntitiesAccrued` (Void entities accrued) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.1.Share` (Mana Gems share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×3.484. |
| `Spell.GemResonance.SnappedIncantationEfficiency` (Gem Resonance: Incantation efficiency when it was cast (snapped)) | 1 | generic default | hidden: Varying it from 0.000 to 1000000.000 changes every item set's score by the same factor. |
| `Building.1.Count` (Mana Gems owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.2.Share` (Grimoires share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×1.136. |
| `Building.3.Share` (Spell Fountains share of production) | 0 | generic default | hidden: Varying it from 0 to 1 changes every item set's score by the same factor. |
| `Building.4.Share` (Enchanted Trees share of production) | 0 | generic default | hidden: Varying it from 0 to 1 changes every item set's score by the same factor. |
| `Building.5.Share` (Alchemy Desks share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×2.5. |
| `Building.6.Share` (Circles Of Power share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×1.136. |
| `Weapon.CataclysmCharges` (Cataclysm charges (temporary Hellholes when activated)) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.6.Count` (Circles Of Power owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.7.Share` (Dimensional Rifts share of production) | 0 | generic default | hidden: Varying it from 0 to 1 changes every item set's score by the same factor. |
| `Building.8.Share` (Nexi share of production) | 1 | class/pet default, unverified: Assumed: Temporal Anchors (The Nexus's replacement) hold the production; the burst also casts Gem Resonance (Mana Gems). | hidden: Varying it from 0 to 1 changes every item set's score by the same factor. |

## Unverified data behind burst at enchant 20

- Set Raiments Of The Perfect Mind (5 pieces): Set tier N applies from N + 1 pieces (Module:Items SetInfo); tiers are assumed to be cumulative.
- Set Jester's Privilege (5 pieces): Set tier N applies from N + 1 pieces (Module:Items SetInfo); tiers are assumed to be cumulative.
- Percentage item bonuses are read as multipliers ×(1 + N%) (edust bonuses are "multiplicative unless stated otherwise", Enchantments page). Affects: Talented Gloves ("Profits +200%"); Talented Gloves ("character ability power +150%"); Seclusion Shell ("character ability power +100%"); Seclusion Shell ("Incantation efficiency +20%"); Boots Of Concentration ("Idle bonus +100%"); Tranquil Spaulders ("character ability power +75%"); Tranquil Spaulders ("Incantation efficiency +35%"); Lucky Amulet ("Profits +100%"); Lucky Amulet ("Idle bonus +100%"); Lucky Amulet ("Incantation efficiency +25%"); Colourful Belt ("Profits +175%"); Colourful Belt ("character ability power +75%"); Focusing Bracers ("character ability power +100%"); Fancy Cape ("Profits +200%"); Fancy Cape ("pet ability power +100%"); Mesmerizing Pants ("Profits +275%"); Mesmerizing Pants ("character ability power +100%"); Daemonics Reverse-Engineering ("Pet ability power +900%"); Bag Of Tricks ("Profits +250.00%"); Bag Of Tricks ("Character Ability Power +150.00%"); Spell Helix ("Evocation efficiency +200%"); Beholding Eye ("Character ability power +500%"); Blessed Armor Scales ("Alchemy Desk +2000%"); Blessed Armor Scales ("The Nexus profit +2000%").
- "(base)" is read as an addition to the stat's base value; the older Fandom item data words the same bonuses "(additive)". Affects: Circlet Of Deep Thoughts ("Mysteries power (base) +20%"); Seclusion Shell ("Mysteries power (base) +25%"); Boots Of Concentration ("Mysteries power (base) +25%"); Tranquil Spaulders ("Mysteries power (base) +20%"); Focusing Bracers ("Mysteries power (base) +20%").
- The formula value is read as a fraction applied as ×(1 + value), like the Expedition Level items whose text spells out "(N% per Expedition Level)". Affects: Murmuring Spellbook ("Idle bonus +1 * (Spells + 1)^(0.26), based on spell casts in this Exile").
- Percentage item bonuses are read as multipliers ×(1 + N%) (edust bonuses are "multiplicative unless stated otherwise", Enchantments page). "Scales multiplicatively from Character level" is read as raising the per-level factor to the power of the character level plus level requirement reduction. The guides' character-experience scalings (Oni 0.39, Shaman 0.88, Temporalist 1.34) are only reached this way; a linear reading would make phylacteries nearly insensitive to levels. Affects: Robust Tangerine Phylactery ("Mysteries power +2.3%").
- Ignored (mechanic): Adds the Ritual of Potency spell; spell availability is not modelled. Affects: The Accumulator ("Adds the Ritual of Potency spell to your spellbook. On activation increase the amount of Ritual of Potency casts").
- Cost reductions are assumed to add up. Affects: Spell Helix ("Reduces Spells costs reduction +20%").
- Not modelled (Compressed Time (maximum L × 5)): Compressed Time isn't modelled.
- Not modelled (Time Distortion speeds up game time (not spell durations or weapon charging)): Time over the run isn't modelled; times are inputs.
- Not modelled (Grants one mana source periodically): Granting mana sources over the run isn't modelled; source counts are inputs.
- Not modelled (Resets Character Experience, Mana, Void Mana, and various Exile statistics): Resets over the run aren't modelled; the affected totals are inputs.

