# Chronomancer blind check: the tool's result (written before reading the guide's gear)

Part 1 of the plan's `chronomancer-blind-check`. The guide's gear, items, BiS and enchant recommendations have **not** been read: no Fandom or wiki.gg Chronomancer guide page was fetched in this step and nothing was un-redacted. The setup comes only from [`guide-setup.md`](guide-setup.md) and [`setup-used.md`](setup-used.md) (the item-redacted setup extracted earlier), the wiki.gg [Chronomancer](https://idlewizard.wiki.gg/wiki/Chronomancer) class page, the mechanics pages in `data-raw/wikigg/` ([Paragon](https://idlewizard.wiki.gg/wiki/Paragon), [Items](https://idlewizard.wiki.gg/wiki/Items), [Expeditions](https://idlewizard.wiki.gg/wiki/Expeditions), [Attributes](https://idlewizard.wiki.gg/wiki/Attributes), [Basic Mechanics](https://idlewizard.wiki.gg/wiki/Basic_Mechanics)), `Module:Data/Spells` and the item data. The model was not changed in this step. Tooling only: the optimizer CLI gained `--not-owned <item-key>` and now writes the run options and the relevance result into its JSON.

Reproduce: `scripts/validation/chronomancer-blind-runs.sh` (all variants, `--thorough` search; writes `tool-result*.json` and the CLI text output in `cli/`), then `node scripts/validation/chronomancer-blind-report.mjs` (prints the generated sections below).

## Setup shared by every run

| What | Value | Why |
|---|---|---|
| Class | Chronomancer | |
| Pet | Risen Giant | Phase 3: "Risen Giant stacked with wormhole skipped time is so good" (no Voidterror swap) |
| Burst spells | Singularity Beam (65), Superposition (17), Converge Timelines (73), Ritual Of Power (60), Gem Resonance (4), Stabilize The Flow (69) | Phase 4 spell set |
| Stance | none (the class has none) | |
| Idle mode | on | Attributes note: Patience is best "because of how well Risen Giant scales with 3% idle" |
| Snapped | Stabilize The Flow (cast at the end of the pre-burst, then swap to the burst set); Gem Resonance only in the `gems` variants | Phase 3 |
| Augment | Time Helix (101) active until Exile | Phase 2, second spell set |
| Score | `chronomancer-burst`: mana of one Singularity Beam cast, (L + 10) × Evo × Mana/s × 20 | assumed in the encode step (`setup-used.md`) |
| Items | every non-Mythic item owned at its maximum quality unless a variant says otherwise; Mythics excluded | no per-item release data (see choice 2) |
| Enchant | the same real level on every Legendary/Unique item, swept per level | |
| Legion | off (on in `era-notes-legion`) | choice 4 |
| Resonator Ring | allowed, but its Intelligence 150 requirement is never met, so no run uses it | Int 25 in every reading |
| Search | `--thorough` (pair polish, node budget 1e6) | |

All other inputs are the class defaults recorded in `setup-used.md` (full table with values, sources and relevance in the generated "Inputs of …" sections). The ones set per run are listed with each variant.

## Setup choices made before reading the gear

### 1. Attribute points: headline uses the guide's notes, not the bare numbers

The Attributes section lists Intelligence 25, Insight 25, Wisdom 25, Patience 40 (the rest of that line was removed by the item filter) and Mastery 25, with Int/Ins/Wis/Mas in bold as "very effective attributes, but feel free to tinker". Its notes say "Patience benefits this build the most … After patience is maxed, SPC is very good".

- **Literal reading** (the class defaults, runs `main` and `era`): exactly those points, Spellcraft/Dominance/Empathy 0. That is 140 points, and it blocks almost every item with a requirement: in the era slot set no Head, Hands, Shoulder, Waist or Back item qualifies, so those slots stay empty (checked: every candidate there needs more Intelligence, Insight, Dominance, Spellcraft or Empathy than the listed points, and the items that grant attributes are in locked slots).
- **Notes reading** (runs `notes`, `era-notes` and its variants; **headline**): Int/Ins/Wis/Mas 25 as listed, Patience and Spellcraft at the attribute cap (250 in `notes`, 200 in the era runs), Dominance/Empathy 0.
- Why the headline uses the notes reading: the notes say Patience gets maxed and Spellcraft comes next, the bold 25s are the first perk threshold (perks every 25 points, Attributes page), and the Attributes page says the game's "Fill" button spends free points to meet item requirements, so a player's gear isn't limited to the listed points. The Legacy table's order also suggests players have several hundred points by then: "Earn 500 Attribute Points" (Legacy 20) comes just before the character-level-150 milestone (Legacy 25) and "Earn 700" (Legacy 27) between the level-150 and level-175 milestones (the class default is level 200), enough for both maxed attributes plus the listed 25s. The amount of any remaining points is unknown, so Dominance and Empathy stay 0 (Empathy and more Mastery would allow Conjured Claws/Razorspaulders, Dominance Brightwing Helmet etc.).

### 2. Items and slots available in the guide's era (e90–e220+ Mysteries, v1.35.0)

The item data has no release version or Mysteries unlock per item (`acquisition` is only Non-craftable / Event-only / Forged), so item-by-item era filtering isn't possible from data. What the data does say:

- **Slots** unlock by Paragon level, and Paragon has to be re-earned in every Realm (Paragon page), so this holds whatever Realm the guide's player was in: 1e80 (P9) Head, Chest, Hands, Feet, Research, Trophy; 1e120 (P11) Shoulder; 1e140 (P13) Waist; 1e150 (P14) Finger; 1e180 (P16) Neck; **1e200 (P17) Enchantments**; 1e220 (P18) Back; 1e240 Wrist; 1e260 Weapon; 1e320 Offhand; 1e360 Legs; 1e380 Mount; 1e425 Accessory; 1e450 Phylactery.
- **Key-locked Expedition locations** need Paragon 36 (1e650 Mysteries; Expeditions and Paragon pages). Trophies that drop only there are unavailable: Charged Fin-Wing, Beholding Eye (Shattered Reality), Abnormal Voidmass, Insidious Lure (Eye of Chaos), Warbanner Fragment, Inquisitive Eye (Cathedral), Blessed Armor Scales, Anointed Ashes (Secret Altar). Trophies also dropping in normal locations stay available.
- **Enchanting** needs Paragon 17 (1e200), and "initially, each item can be enchanted up to 20 times" until Heritage/Paramnesics Realm upgrades raise it (Items page). So enchant levels above 0 only exist at e200+, and in a first Realm they stop at 20.
- **Attribute cap**: 150 at 1e100, 175 at 1e130, 200 at 1e160 (Paragon 10/12/15).
- Mythic items need the Forge (Paragon 45).

Runs:
- `main` / `notes`: no era restriction (all slots, all non-Mythic items, cap 250), the protocol's baseline.
- `era` / `era-notes` (**headline**): the slots open at 1e220 (the top of the guide's range and the first point where both enchanting and the Back slot exist), so Wrist, Weapon, Offhand, Legs, Mount, Accessory and Phylactery are excluded; the 8 key-locked Trophies are not owned; attribute cap 200. Swept 0–40 although a first-Realm player stops at 20 (later-Realm players can go higher).
- `era-e150`: the slots at 1e150 (also no Neck/Back, no enchanting; cap 175, Patience/Spellcraft 175), enchant 0 only. This is the lower-middle of the guide's range.
- Not restricted (no data): individual items added after v1.35.0. The `e220+` in the guide's range may mean Wrist (1e240) and Weapon (1e260) were open for some players.

### 3. Production share and Gem Resonance: Temporal Anchors hold production (default kept)

- The data favours Temporal Anchors: they replace The Nexus and "benefit from all effects affecting Nexi" (Basic Mechanics); a Nexus starts at 1.29857e6 mana/s against 0.25 for a Mana Gem, and with costs growing 1.23× vs 1.16× per purchase the count gap can't close that (e.g. at 1e300 mana ≈ 3200 Nexi vs ≈ 4650 Gems, a base-profit ratio of ~4e6 : 1). Converge Timelines also scales with Temporal Anchors.
- The setup text is the only hint the other way: the burst bar casts Gem Resonance and the "High Level Snapshot Optimization" pre-burst snaps it (prose dropped, only its spell set kept). But in the burst the 6th slot has no other profit buff to choose from (the class's other spells are Revert, the summons, Void spells, Wormhole, Temporal Distortion, Synthetic Entity and Spell Focus), so Gem Resonance can be a filler at lower Mysteries, which fits the snapshot being a "High Level" optimization.
- Headline: `Building.8.Share` = 1, `Building.1.Share` = 0, Gem Resonance unsnapped (it then adds nothing). Brackets: `era-notes-gems-mixed` (Gem Resonance snapped at Incantation 1e3, the same placeholder as the snapped Stabilize The Flow; 3000 Mana Gems, the same placeholder as the Temporal Anchors; both buildings weighted 1) and `era-notes-gems-only` (the same with `Building.8.Share` = 0). **Both give the headline's items at every level run except Trophy 1 at enchant 0–2 (Collection Of Samples instead of Anomalous Essence).** The share doesn't change the era picks because the Nexus-profit items are out of reach there (Blessed Armor Scales is key-locked, The Clockcarers needs Int 90, Stabilizing Pauldrons loses to Mantle Of The Crypt).

### 4. Legion and Resonator

The Legion page isn't in the snapshot and the guide's item tabs were stripped, so the era of its reward is unknown: off by default, on in `era-notes-legion` (at every level run, its set at enchant N is the headline's set at N + 1). Resonator Ring needs Intelligence 150; every reading keeps Int at 25 and no chosen item grants enough Intelligence, so it is excluded by requirement in every run and there are no Resonator bonus levels.

### 5. Headline enchant level

In a first Realm the era's enchant cap is 20 (choice 2), so the "mid" level used for the headline is **enchant 10**. The tables below cover 0, 1, 5, 10, 15, 20, 30, 40 and every sweep change level.

## Headline: `era-notes` at enchant 10

Score ×1.13e24 vs no items; search complete. Slots locked in the era are left out.

| Slot | Item | Contribution (score ÷ score with the slot empty) |
|---|---|---|
| Head | The Artificer's Crown (Unique) | ×12.1 |
| Chest | The Ribcage (Ancient Bones) | ×254 |
| Hands | Empowering Handguards (Power Armor) | ×21.3 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | ×226 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | ×203 |
| Neck | Searing Gaze | ×18.6 |
| Waist | Encircling Trophies (Ancient Bones) | ×46.9 |
| Back | Flaming Cape | ×65.1 |
| Research | Servants Overclocking | ×361 |
| Finger | Morbid Loop (Ancient Bones) | ×73.6 |
| Finger | Spell Helix | ×41.4 |
| Trophy | Mutated Mycelium | ×89.4 |
| Trophy | Necrotic Powerstone | ×100 |

Headline sweep change levels: 0, 1, 3, 5, 9, 12, 21 (Head: Empowering Headguard → The Artificer's Crown at 9; Neck: Torc Of Privilege → Searing Gaze at 5 → Light Of Eighth Star at 12; Feet: Boots Of Concentration → Lordic Greaves at 21; Research: Destabilized Evocations → Servants Overclocking at 1; rings and trophies shuffle at 1, 3, 5, 9 and 21).

For the full item set (`main`, literal attributes) at enchant 10 the tool picks Circlet Of Deep Thoughts, Pompous Tunic, Conjured Claws, Lordic Greaves, Conjured Razorspaulders, Light Of Eighth Star, Colourful Belt, Bite Sleeves, (no Back), Conjured Painguards, Murmuring Spellbook, Servants Overclocking, Ethereal Veil, Blessed Tapestry, Inert Jade Phylactery, Heart of the Grave, Morbid Loop + The Bond, Blessed Armor Scales + Necrotic Powerstone. With the notes attributes and all slots (`notes`, enchant 10): Circlet Of Deep Thoughts, The Ribcage, Empowering Handguards, Boots Of Concentration, Mantle Of The Crypt, Lucky Amulet, Encircling Trophies, Focusing Bracers, Flaming Cape, Tribal Dressing, Murmuring Spellbook, Servants Overclocking, Ethereal Veil, Blessed Tapestry, Inert Jade Phylactery, Heart of the Grave, Morbid Loop + Spell Helix, Blessed Armor Scales + Necrotic Powerstone.

## What most affects this result (read before comparing)

1. **The attribute reading** is the largest choice. The literal reading's sets (`main`, `era`) are built around attribute enablers (Circlet Of Deep Thoughts and Ethereal Veil +20 Intelligence, Pompous Tunic +25 Mastery, Bite Sleeves +75 Empathy, Voidstrike Seal +150 Dominance, so other items qualify) and leave slots empty; the notes reading switches to the Ancient Bones idle set (The Ribcage, Mantle Of The Crypt, Encircling Trophies, Morbid Loop), Boots Of Concentration, Empowering Handguards/Headguard and Flaming Cape.
2. **Era slot restriction**: the headline has no Wrist, Weapon, Offhand, Legs, Mount, Accessory or Phylactery item. If the guide lists items in those slots, compare against `notes` (all slots) instead.
3. **Search completeness**: every notes-reading run is exhaustive within the bot pruning (search complete at every level). The literal-reading runs hit the node budget at `main` enchant 0–14 and at most `era` levels, so those sets are the best found, not proven best (the thorough search beat the default search by up to ×5 there by finding The Bond).
4. **Placeholder inputs the headline's ranking depends on** (shown by the relevance check at enchant 10; the value used and why):
   - `Misc.AttributeCap` 200 and `AttrPoints.Patience` 200 (choice 1–2); Patience moves the gap up to ×12.
   - `Pet.AbilityPower` 1 (PAP base, placeholder) — up to ×11.9; a higher PAP base would favour PAP items (Conjured Claws/Razorspaulders, Falconer's pieces) if Empathy allowed them.
   - `Expeditions.Level` 50 (placeholder) — up to ×18; Mutated Mycelium's idle bonus is 3.24% per expedition level.
   - `Misc.CatalystShards` 0 (generic default) — up to ×63; the catalyst-scaled items (Arcane/Miniaturized Accelerator) are worth nothing at 0.
   - `Click.AutoclicksThisExile` 0, `Spell.IncantationEfficiency` 1e3, `Building.8.Count` 3000, `Spell.TimeHelix.CastsThisExile` 100, `AttrPoints.Intelligence`/`Empathy` (guide / 0), and the building shares (choice 3).
   - Only in the all-slot runs: `Spell.CastsThisExile` 1e7 (Murmuring Spellbook, ×1.9e5 at enchant 10 in `main`), `Misc.BatsThisExile` 0 (Chiropteric Rod is worth ×1 at 0 bats; any real bat count would make it a Weapon candidate), `Char.LevelRequirementReduction` 0 and character level 200 (Inert Jade Phylactery compounds per level).
5. **Unverified readings** behind the chosen items: percentage bonuses as multipliers, "(base)" as additive (Boots Of Concentration, Circlet, Ethereal Veil), set tiers cumulative (Ancient Bones 4 pieces in the headline), "reduces X +N%" as ×(1 − N%) (Searing Gaze), cost reductions adding up (Spell Helix), phylactery compounding (`main`/`notes` only). Listed per item at the end of this file.
6. **Not modelled**: Compressed Time, Time Distortion over the run, Time Helix's resets (their totals are inputs), accumulated starting casts (Empowering Headguard/Handguards' "+N starting casts" are inert in the burst score), Heart of the Grave's Plague Zombie augment, Gem Resonance's value when unsnapped at Mana Gems share 0.

## Headline result (era-notes)

Run: snapped 69; Legion off; Resonator allowed; excluded slots Wrist, Weapon, Offhand, Legs, Mount, Accessory, Phylactery; not owned: Charged Fin-Wing, Beholding Eye, Abnormal Voidmass, Insidious Lure, Warbanner Fragment, Inquisitive Eye, Blessed Armor Scales, Anointed Ashes; inputs Misc.AttributeCap=200, AttrPoints.Patience=200, AttrPoints.Spellcraft=200.

| Slot | E0 | E1 | E3 | E5 | E9 | E10 | E12 | E15 | E20 | E21 | E30 | E40 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Head | Empowering Headguard | Empowering Headguard | Empowering Headguard | Empowering Headguard | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown |
| Chest | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage |
| Hands | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards |
| Feet | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Lordic Greaves | Lordic Greaves | Lordic Greaves |
| Shoulder | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt |
| Neck | Torc Of Privilege | Torc Of Privilege | Torc Of Privilege | Searing Gaze | Searing Gaze | Searing Gaze | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star |
| Waist | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies |
| Wrist | — | — | — | — | — | — | — | — | — | — | — | — |
| Back | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape |
| Legs | — | — | — | — | — | — | — | — | — | — | — | — |
| Offhand | — | — | — | — | — | — | — | — | — | — | — | — |
| Research | Destabilized Evocations | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking |
| Accessory | — | — | — | — | — | — | — | — | — | — | — | — |
| Mount | — | — | — | — | — | — | — | — | — | — | — | — |
| Phylactery | — | — | — | — | — | — | — | — | — | — | — | — |
| Weapon | — | — | — | — | — | — | — | — | — | — | — | — |
| Finger 1 | Fiery Ring | Frosty Ring | Frosty Ring | Frosty Ring | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Frosty Ring | Frosty Ring | Frosty Ring |
| Finger 2 | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anomalous Essence | Anomalous Essence | Collection Of Samples | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium |
| Trophy 2 | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone |
| score vs no items | ×1.22e13 | ×1.03e14 | ×1.21e16 | ×1.81e18 | ×7.14e22 | ×1.13e24 | ×3.08e26 | ×1.63e30 | ×2.63e36 | ×4.93e37 | ×1.82e49 | ×1.29e62 |

## All variants at a glance

### main

Run: snapped 69; Legion off; Resonator allowed; all slots; all non-Mythic items owned at max quality; class default inputs. File: `tool-result.json`. Levels run: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55. Change levels: 0, 1, 2, 12, 15.

| Slot | E0 | E1 | E5 | E10 | E15 | E20 | E30 | E40 |
|---|---|---|---|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts |
| Chest | The Ribcage | Pompous Tunic | Pompous Tunic | Pompous Tunic | Pompous Tunic | Pompous Tunic | Pompous Tunic | Pompous Tunic |
| Hands | — | Conjured Claws | Conjured Claws | Conjured Claws | Conjured Claws | Conjured Claws | Conjured Claws | Conjured Claws |
| Feet | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves |
| Shoulder | Empowering Shoulderguard | Conjured Razorspaulders | Conjured Razorspaulders | Conjured Razorspaulders | Conjured Razorspaulders | Conjured Razorspaulders | Conjured Razorspaulders | Conjured Razorspaulders |
| Neck | Shadow Tendril | Shadow Tendril | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star |
| Waist | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt |
| Wrist | Focusing Bracers | Bite Sleeves | Bite Sleeves | Bite Sleeves | Bite Sleeves | Bite Sleeves | Bite Sleeves | Bite Sleeves |
| Back | — | — | — | — | — | — | — | — |
| Legs | — | Conjured Painguards | Conjured Painguards | Conjured Painguards | Conjured Painguards | Conjured Painguards | Conjured Painguards | Conjured Painguards |
| Offhand | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook |
| Research | Destabilized Evocations | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking |
| Accessory | Ethereal Veil | Ethereal Veil | Ethereal Veil | Ethereal Veil | Ethereal Veil | Ethereal Veil | Ethereal Veil | Ethereal Veil |
| Mount | — | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry |
| Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery |
| Weapon | Thunderbird | Thunderbird | Heart of the Grave | Heart of the Grave | Heart of the Grave | Heart of the Grave | Heart of the Grave | Heart of the Grave |
| Finger 1 | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop |
| Finger 2 | — | The Bond | The Bond | The Bond | Voidstrike Seal | Voidstrike Seal | Voidstrike Seal | Voidstrike Seal |
| Trophy 1 | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales |
| Trophy 2 | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium |
| score vs no items | ×3.92e18 | ×2.51e22 | ×1.15e29 | ×3.19e37 | ×1.18e46 | ×8.55e54 | ×4.51e72 | ×2.38e90 |

Search hit the node budget at levels: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14.

Items left out:

- mythic (20)
- no-effect (25): Acclimatized Summons, Binding Sigil, Branch of the Great Cycle, Cold-blooded Ring, Crystallized Echo, Devious Violet Phylactery, Eerie Turquoise Phylactery, Efficient Minion Tactics, Enchanting Membrane, Fey Glider, Gravemoss Waistband, Hectic Lime Phylactery, Holidays, Insidious Lure, Paukan, The Spider, Pitch-black Cage, Redeemer, Scales of Appraisal, Spirit's Guidance, Symbiotic Loop, Symbol Of Authority, Temporal Scabbard, Vita Bulwark, Void Sampling, WrathSeed
- requirements (27): Chaos Mantle, Collar Of Obedience, Commissar's Torn Sleeve, Concealing Shroud, Conjured Sawrings, Darklight Claws, Darklight Mantle, Empowering Legguards, Encircling Trophies, Falconer's Warm Cape, Fancy Cape, Folds of Magma, Hollow Eye Pendant, Mesmerizing Pants, Nomadic Wrists, Perfected Kata Bracers, Precise Wristband, Resonator Ring, Sash of Luxury, Searing Gaze, Spellweaving Kilt, The Amplifier, The Artificer's Crown, The Magnifier, Torc Of Privilege, Tranquil Spaulders, Tribal Dressing

### notes

Run: snapped 69; Legion off; Resonator allowed; all slots; all non-Mythic items owned at max quality; inputs AttrPoints.Patience=250, AttrPoints.Spellcraft=250. File: `tool-result-notes.json`. Levels run: 0, 1, 2, 5, 10, 12, 15, 20, 25, 30, 40, 55. Change levels: 0, 1, 2, 10, 12, 15, 30, 55.

| Slot | E0 | E1 | E5 | E10 | E15 | E20 | E30 | E40 |
|---|---|---|---|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts | Circlet Of Deep Thoughts |
| Chest | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage |
| Hands | Grasp Of The Grave | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards |
| Feet | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves |
| Shoulder | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt |
| Neck | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet | Lucky Amulet |
| Waist | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Colourful Belt | Colourful Belt | Colourful Belt | Colourful Belt |
| Wrist | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers | Focusing Bracers |
| Back | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape |
| Legs | Tribal Dressing | Tribal Dressing | Tribal Dressing | Tribal Dressing | Tribal Dressing | Tribal Dressing | Tribal Dressing | Tribal Dressing |
| Offhand | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook | Murmuring Spellbook |
| Research | Destabilized Evocations | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking |
| Accessory | Ethereal Veil | Ethereal Veil | Ethereal Veil | Ethereal Veil | Ethereal Veil | Ethereal Veil | Ethereal Veil | Ethereal Veil |
| Mount | Zenith, The Champion's Steed | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry | Blessed Tapestry |
| Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery | Inert Jade Phylactery |
| Weapon | Thunderbird | Thunderbird | Heart of the Grave | Heart of the Grave | Heart of the Grave | Heart of the Grave | Heart of the Grave | Heart of the Grave |
| Finger 1 | Fiery Ring | Frosty Ring | Frosty Ring | Morbid Loop | Morbid Loop | Morbid Loop | Frosty Ring | Frosty Ring |
| Finger 2 | Morbid Loop | Morbid Loop | Morbid Loop | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales | Blessed Armor Scales |
| Trophy 2 | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium |
| score vs no items | ×7.19e24 | ×4.63e26 | ×2.39e34 | ×1.29e44 | ×1.31e54 | ×2.24e64 | ×7.74e84 | ×3.47e105 |

Search hit the node budget at levels: none.

Items left out:

- mythic (20)
- no-effect (25): Acclimatized Summons, Binding Sigil, Branch of the Great Cycle, Cold-blooded Ring, Crystallized Echo, Devious Violet Phylactery, Eerie Turquoise Phylactery, Efficient Minion Tactics, Enchanting Membrane, Fey Glider, Gravemoss Waistband, Hectic Lime Phylactery, Holidays, Insidious Lure, Paukan, The Spider, Pitch-black Cage, Redeemer, Scales of Appraisal, Spirit's Guidance, Symbiotic Loop, Symbol Of Authority, Temporal Scabbard, Vita Bulwark, Void Sampling, WrathSeed
- requirements (15): Chaos Mantle, Collar Of Obedience, Commissar's Torn Sleeve, Concealing Shroud, Conjured Sawrings, Darklight Claws, Darklight Mantle, Falconer's Warm Cape, Fancy Cape, Hollow Eye Pendant, Mesmerizing Pants, Nomadic Wrists, Precise Wristband, Resonator Ring, Tranquil Spaulders

### era

Run: snapped 69; Legion off; Resonator allowed; excluded slots Wrist, Weapon, Offhand, Legs, Mount, Accessory, Phylactery; not owned: Charged Fin-Wing, Beholding Eye, Abnormal Voidmass, Insidious Lure, Warbanner Fragment, Inquisitive Eye, Blessed Armor Scales, Anointed Ashes; inputs Misc.AttributeCap=200. File: `tool-result-era.json`. Levels run: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40. Change levels: 0, 1, 3, 5.

| Slot | E0 | E1 | E5 | E10 | E15 | E20 | E30 | E40 |
|---|---|---|---|---|---|---|---|---|
| Head | — | — | — | — | — | — | — | — |
| Chest | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage |
| Hands | — | — | — | — | — | — | — | — |
| Feet | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves | Lordic Greaves |
| Shoulder | — | — | — | — | — | — | — | — |
| Neck | — | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star |
| Waist | — | — | — | — | — | — | — | — |
| Wrist | — | — | — | — | — | — | — | — |
| Back | — | — | — | — | — | — | — | — |
| Legs | — | — | — | — | — | — | — | — |
| Offhand | — | — | — | — | — | — | — | — |
| Research | Destabilized Evocations | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking |
| Accessory | — | — | — | — | — | — | — | — |
| Mount | — | — | — | — | — | — | — | — |
| Phylactery | — | — | — | — | — | — | — | — |
| Weapon | — | — | — | — | — | — | — | — |
| Finger 1 | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop | Morbid Loop |
| Finger 2 | — | Voidstrike Seal | Voidstrike Seal | Voidstrike Seal | Voidstrike Seal | Voidstrike Seal | Voidstrike Seal | Voidstrike Seal |
| Trophy 1 | Anomalous Essence | Anomalous Essence | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium |
| Trophy 2 | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone |
| score vs no items | ×4.70e6 | ×2.22e7 | ×3.86e10 | ×8.20e14 | ×1.74e19 | ×3.70e23 | ×1.67e32 | ×7.54e40 |

Search hit the node budget at levels: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38.

Items left out:

- excluded-slot (77)
- not-owned (28): Abnormal Voidmass, Anointed Ashes, Beholding Eye, Blessed Armor Scales, Burden of the Erased, Charged Fin-Wing, Crown of the First Realm, Embrace of the Erased, Endtimes Armor, Endtimes Failsafe, Endtimes Gear, Endtimes Visor, Godflesh Appendages, Godflesh Dominion, Godflesh Grasp, Godflesh Heart, Godflesh Veil, Inquisitive Eye, Insidious Lure, Legacy of the Erased, Mantle of the First Realm, Pillars of the First Realm, Power of the First Realm, Pride of the First Realm, Realmwalkers, The Starmap, Voice of the Erased, Warbanner Fragment
- no-effect (9): Acclimatized Summons, Binding Sigil, Cold-blooded Ring, Efficient Minion Tactics, Gravemoss Waistband, Holidays, Symbiotic Loop, Void Sampling, WrathSeed
- requirements (43): Artificer's Shoulderpads, Boots Of Eastern Blessings, Boots Of Harsh Trials, Chaos Mantle, Collar Of Obedience, Concealing Shroud, Conjured Spiked Stompers, Darklight Claws, Darklight Mantle, Easymind Hat, Empowering Ankleguards, Empowering Chestguard, Empowering Handguards, Empowering Headguard, Empowering Waistguard, Encircling Trophies, Falconer's Ranger Hat, Falconer's Warm Cape, Fancy Cape, Fiery Ring, Flaming Cape, Frosty Ring, Hollow Eye Pendant, Mantle Of The Crypt, Nether Chain, Netherloop, Resonator Ring, Sash of Luxury, Searing Gaze, Seclusion Shell, Seeping Shadow Signet, Shadowflame Loop, Spell Helix, Strange Spaulders, Talented Gloves, The Amplifier, The Artificer's Crown, The Clockcarers, The Magnifier, Timeshroud, Torc Of Privilege, Tranquil Spaulders, Umbral Coil

### era-notes

Run: snapped 69; Legion off; Resonator allowed; excluded slots Wrist, Weapon, Offhand, Legs, Mount, Accessory, Phylactery; not owned: Charged Fin-Wing, Beholding Eye, Abnormal Voidmass, Insidious Lure, Warbanner Fragment, Inquisitive Eye, Blessed Armor Scales, Anointed Ashes; inputs Misc.AttributeCap=200, AttrPoints.Patience=200, AttrPoints.Spellcraft=200. File: `tool-result-era-notes.json`. Levels run: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40. Change levels: 0, 1, 3, 5, 9, 12, 21.

| Slot | E0 | E1 | E5 | E10 | E15 | E20 | E30 | E40 |
|---|---|---|---|---|---|---|---|---|
| Head | Empowering Headguard | Empowering Headguard | Empowering Headguard | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown |
| Chest | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage |
| Hands | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards |
| Feet | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Lordic Greaves | Lordic Greaves |
| Shoulder | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt |
| Neck | Torc Of Privilege | Torc Of Privilege | Searing Gaze | Searing Gaze | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star |
| Waist | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies |
| Wrist | — | — | — | — | — | — | — | — |
| Back | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape |
| Legs | — | — | — | — | — | — | — | — |
| Offhand | — | — | — | — | — | — | — | — |
| Research | Destabilized Evocations | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking |
| Accessory | — | — | — | — | — | — | — | — |
| Mount | — | — | — | — | — | — | — | — |
| Phylactery | — | — | — | — | — | — | — | — |
| Weapon | — | — | — | — | — | — | — | — |
| Finger 1 | Fiery Ring | Frosty Ring | Frosty Ring | Morbid Loop | Morbid Loop | Morbid Loop | Frosty Ring | Frosty Ring |
| Finger 2 | Morbid Loop | Morbid Loop | Morbid Loop | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anomalous Essence | Anomalous Essence | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium |
| Trophy 2 | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone |
| score vs no items | ×1.22e13 | ×1.03e14 | ×1.81e18 | ×1.13e24 | ×1.63e30 | ×2.63e36 | ×1.82e49 | ×1.29e62 |

Search hit the node budget at levels: none.

Items left out:

- excluded-slot (77)
- not-owned (28): Abnormal Voidmass, Anointed Ashes, Beholding Eye, Blessed Armor Scales, Burden of the Erased, Charged Fin-Wing, Crown of the First Realm, Embrace of the Erased, Endtimes Armor, Endtimes Failsafe, Endtimes Gear, Endtimes Visor, Godflesh Appendages, Godflesh Dominion, Godflesh Grasp, Godflesh Heart, Godflesh Veil, Inquisitive Eye, Insidious Lure, Legacy of the Erased, Mantle of the First Realm, Pillars of the First Realm, Power of the First Realm, Pride of the First Realm, Realmwalkers, The Starmap, Voice of the Erased, Warbanner Fragment
- no-effect (9): Acclimatized Summons, Binding Sigil, Cold-blooded Ring, Efficient Minion Tactics, Gravemoss Waistband, Holidays, Symbiotic Loop, Void Sampling, WrathSeed
- requirements (24): Artificer's Shoulderpads, Boots Of Harsh Trials, Chaos Mantle, Collar Of Obedience, Concealing Shroud, Conjured Spiked Stompers, Darklight Claws, Darklight Mantle, Easymind Hat, Falconer's Ranger Hat, Falconer's Warm Cape, Fancy Cape, Hollow Eye Pendant, Nether Chain, Netherloop, Resonator Ring, Seclusion Shell, Seeping Shadow Signet, Shadowflame Loop, Strange Spaulders, Talented Gloves, The Clockcarers, Tranquil Spaulders, Umbral Coil

### era-e150

Run: snapped 69; Legion off; Resonator allowed; excluded slots Wrist, Weapon, Offhand, Legs, Mount, Accessory, Phylactery, Neck, Back; not owned: Charged Fin-Wing, Beholding Eye, Abnormal Voidmass, Insidious Lure, Warbanner Fragment, Inquisitive Eye, Blessed Armor Scales, Anointed Ashes; inputs Misc.AttributeCap=175, AttrPoints.Patience=175, AttrPoints.Spellcraft=175. File: `tool-result-era-e150.json`. Levels run: 0. Change levels: 0.

| Slot | E0 |
|---|---|
| Head | Empowering Headguard |
| Chest | The Ribcage |
| Hands | Empowering Handguards |
| Feet | Boots Of Concentration |
| Shoulder | Mantle Of The Crypt |
| Neck | — |
| Waist | Encircling Trophies |
| Wrist | — |
| Back | — |
| Legs | — |
| Offhand | — |
| Research | Destabilized Evocations |
| Accessory | — |
| Mount | — |
| Phylactery | — |
| Weapon | — |
| Finger 1 | Fiery Ring |
| Finger 2 | Morbid Loop |
| Trophy 1 | Anomalous Essence |
| Trophy 2 | Necrotic Powerstone |
| score vs no items | ×2.87e11 |

Search hit the node budget at levels: none.

Items left out:

- excluded-slot (97)
- not-owned (28): Abnormal Voidmass, Anointed Ashes, Beholding Eye, Blessed Armor Scales, Burden of the Erased, Charged Fin-Wing, Crown of the First Realm, Embrace of the Erased, Endtimes Armor, Endtimes Failsafe, Endtimes Gear, Endtimes Visor, Godflesh Appendages, Godflesh Dominion, Godflesh Grasp, Godflesh Heart, Godflesh Veil, Inquisitive Eye, Insidious Lure, Legacy of the Erased, Mantle of the First Realm, Pillars of the First Realm, Power of the First Realm, Pride of the First Realm, Realmwalkers, The Starmap, Voice of the Erased, Warbanner Fragment
- no-effect (9): Acclimatized Summons, Binding Sigil, Cold-blooded Ring, Efficient Minion Tactics, Gravemoss Waistband, Holidays, Symbiotic Loop, Void Sampling, WrathSeed
- requirements (17): Artificer's Shoulderpads, Boots Of Harsh Trials, Collar Of Obedience, Conjured Spiked Stompers, Darklight Claws, Easymind Hat, Falconer's Ranger Hat, Netherloop, Resonator Ring, Seclusion Shell, Seeping Shadow Signet, Shadowflame Loop, Strange Spaulders, Talented Gloves, The Clockcarers, Tranquil Spaulders, Umbral Coil

### era-notes-legion

Run: snapped 69; Legion on; Resonator allowed; excluded slots Wrist, Weapon, Offhand, Legs, Mount, Accessory, Phylactery; not owned: Charged Fin-Wing, Beholding Eye, Abnormal Voidmass, Insidious Lure, Warbanner Fragment, Inquisitive Eye, Blessed Armor Scales, Anointed Ashes; inputs Misc.AttributeCap=200, AttrPoints.Patience=200, AttrPoints.Spellcraft=200. File: `tool-result-era-notes-legion.json`. Levels run: 0, 1, 2, 5, 10, 12, 15, 20, 30, 40. Change levels: 0, 1, 2, 5, 10, 12, 20.

| Slot | E0 | E1 | E5 | E10 | E15 | E20 | E30 | E40 |
|---|---|---|---|---|---|---|---|---|
| Head | Empowering Headguard | Empowering Headguard | Empowering Headguard | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown |
| Chest | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage |
| Hands | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards |
| Feet | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Lordic Greaves | Lordic Greaves | Lordic Greaves |
| Shoulder | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt |
| Neck | Torc Of Privilege | Torc Of Privilege | Searing Gaze | Searing Gaze | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star |
| Waist | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies |
| Wrist | — | — | — | — | — | — | — | — |
| Back | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape |
| Legs | — | — | — | — | — | — | — | — |
| Offhand | — | — | — | — | — | — | — | — |
| Research | Destabilized Evocations | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking |
| Accessory | — | — | — | — | — | — | — | — |
| Mount | — | — | — | — | — | — | — | — |
| Phylactery | — | — | — | — | — | — | — | — |
| Weapon | — | — | — | — | — | — | — | — |
| Finger 1 | Fiery Ring | Frosty Ring | Frosty Ring | Morbid Loop | Morbid Loop | Frosty Ring | Frosty Ring | Frosty Ring |
| Finger 2 | Morbid Loop | Morbid Loop | Morbid Loop | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Anomalous Essence | Anomalous Essence | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium |
| Trophy 2 | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone |
| score vs no items | ×1.22e13 | ×1.04e15 | ×2.51e19 | ×1.78e25 | ×2.85e31 | ×4.93e37 | ×3.51e50 | ×2.49e63 |

Search hit the node budget at levels: none.

Items left out:

- excluded-slot (77)
- not-owned (28): Abnormal Voidmass, Anointed Ashes, Beholding Eye, Blessed Armor Scales, Burden of the Erased, Charged Fin-Wing, Crown of the First Realm, Embrace of the Erased, Endtimes Armor, Endtimes Failsafe, Endtimes Gear, Endtimes Visor, Godflesh Appendages, Godflesh Dominion, Godflesh Grasp, Godflesh Heart, Godflesh Veil, Inquisitive Eye, Insidious Lure, Legacy of the Erased, Mantle of the First Realm, Pillars of the First Realm, Power of the First Realm, Pride of the First Realm, Realmwalkers, The Starmap, Voice of the Erased, Warbanner Fragment
- no-effect (9): Acclimatized Summons, Binding Sigil, Cold-blooded Ring, Efficient Minion Tactics, Gravemoss Waistband, Holidays, Symbiotic Loop, Void Sampling, WrathSeed
- requirements (24): Artificer's Shoulderpads, Boots Of Harsh Trials, Chaos Mantle, Collar Of Obedience, Concealing Shroud, Conjured Spiked Stompers, Darklight Claws, Darklight Mantle, Easymind Hat, Falconer's Ranger Hat, Falconer's Warm Cape, Fancy Cape, Hollow Eye Pendant, Nether Chain, Netherloop, Resonator Ring, Seclusion Shell, Seeping Shadow Signet, Shadowflame Loop, Strange Spaulders, Talented Gloves, The Clockcarers, Tranquil Spaulders, Umbral Coil

### era-notes-gems-mixed

Run: snapped 69,4; Legion off; Resonator allowed; excluded slots Wrist, Weapon, Offhand, Legs, Mount, Accessory, Phylactery; not owned: Charged Fin-Wing, Beholding Eye, Abnormal Voidmass, Insidious Lure, Warbanner Fragment, Inquisitive Eye, Blessed Armor Scales, Anointed Ashes; inputs Misc.AttributeCap=200, AttrPoints.Patience=200, AttrPoints.Spellcraft=200, Building.1.Share=1, Building.1.Count=3000, Spell.GemResonance.SnappedIncantationEfficiency=1000. File: `tool-result-era-notes-gems-mixed.json`. Levels run: 0, 1, 2, 5, 10, 12, 15, 20, 30, 40. Change levels: 0, 1, 5, 10, 12, 30.

| Slot | E0 | E1 | E5 | E10 | E15 | E20 | E30 | E40 |
|---|---|---|---|---|---|---|---|---|
| Head | Empowering Headguard | Empowering Headguard | Empowering Headguard | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown |
| Chest | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage |
| Hands | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards |
| Feet | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Lordic Greaves | Lordic Greaves |
| Shoulder | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt |
| Neck | Torc Of Privilege | Torc Of Privilege | Searing Gaze | Searing Gaze | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star |
| Waist | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies |
| Wrist | — | — | — | — | — | — | — | — |
| Back | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape |
| Legs | — | — | — | — | — | — | — | — |
| Offhand | — | — | — | — | — | — | — | — |
| Research | Destabilized Evocations | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking |
| Accessory | — | — | — | — | — | — | — | — |
| Mount | — | — | — | — | — | — | — | — |
| Phylactery | — | — | — | — | — | — | — | — |
| Weapon | — | — | — | — | — | — | — | — |
| Finger 1 | Fiery Ring | Frosty Ring | Frosty Ring | Morbid Loop | Morbid Loop | Morbid Loop | Frosty Ring | Frosty Ring |
| Finger 2 | Morbid Loop | Morbid Loop | Morbid Loop | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Collection Of Samples | Collection Of Samples | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium |
| Trophy 2 | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone |
| score vs no items | ×2.14e13 | ×2.16e14 | ×4.76e18 | ×2.97e24 | ×4.30e30 | ×6.93e36 | ×4.79e49 | ×3.40e62 |

Search hit the node budget at levels: none.

Items left out:

- excluded-slot (77)
- not-owned (28): Abnormal Voidmass, Anointed Ashes, Beholding Eye, Blessed Armor Scales, Burden of the Erased, Charged Fin-Wing, Crown of the First Realm, Embrace of the Erased, Endtimes Armor, Endtimes Failsafe, Endtimes Gear, Endtimes Visor, Godflesh Appendages, Godflesh Dominion, Godflesh Grasp, Godflesh Heart, Godflesh Veil, Inquisitive Eye, Insidious Lure, Legacy of the Erased, Mantle of the First Realm, Pillars of the First Realm, Power of the First Realm, Pride of the First Realm, Realmwalkers, The Starmap, Voice of the Erased, Warbanner Fragment
- no-effect (9): Acclimatized Summons, Binding Sigil, Cold-blooded Ring, Efficient Minion Tactics, Gravemoss Waistband, Holidays, Symbiotic Loop, Void Sampling, WrathSeed
- requirements (24): Artificer's Shoulderpads, Boots Of Harsh Trials, Chaos Mantle, Collar Of Obedience, Concealing Shroud, Conjured Spiked Stompers, Darklight Claws, Darklight Mantle, Easymind Hat, Falconer's Ranger Hat, Falconer's Warm Cape, Fancy Cape, Hollow Eye Pendant, Nether Chain, Netherloop, Resonator Ring, Seclusion Shell, Seeping Shadow Signet, Shadowflame Loop, Strange Spaulders, Talented Gloves, The Clockcarers, Tranquil Spaulders, Umbral Coil

### era-notes-gems-only

Run: snapped 69,4; Legion off; Resonator allowed; excluded slots Wrist, Weapon, Offhand, Legs, Mount, Accessory, Phylactery; not owned: Charged Fin-Wing, Beholding Eye, Abnormal Voidmass, Insidious Lure, Warbanner Fragment, Inquisitive Eye, Blessed Armor Scales, Anointed Ashes; inputs Misc.AttributeCap=200, AttrPoints.Patience=200, AttrPoints.Spellcraft=200, Building.1.Share=1, Building.1.Count=3000, Spell.GemResonance.SnappedIncantationEfficiency=1000, Building.8.Share=0. File: `tool-result-era-notes-gems-only.json`. Levels run: 0, 1, 2, 5, 10, 12, 15, 20, 30, 40. Change levels: 0, 1, 5, 10, 12, 30.

| Slot | E0 | E1 | E5 | E10 | E15 | E20 | E30 | E40 |
|---|---|---|---|---|---|---|---|---|
| Head | Empowering Headguard | Empowering Headguard | Empowering Headguard | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown | The Artificer's Crown |
| Chest | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage | The Ribcage |
| Hands | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards | Empowering Handguards |
| Feet | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Boots Of Concentration | Lordic Greaves | Lordic Greaves |
| Shoulder | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt | Mantle Of The Crypt |
| Neck | Torc Of Privilege | Torc Of Privilege | Searing Gaze | Searing Gaze | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star | Light Of Eighth Star |
| Waist | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies | Encircling Trophies |
| Wrist | — | — | — | — | — | — | — | — |
| Back | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape | Flaming Cape |
| Legs | — | — | — | — | — | — | — | — |
| Offhand | — | — | — | — | — | — | — | — |
| Research | Destabilized Evocations | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking | Servants Overclocking |
| Accessory | — | — | — | — | — | — | — | — |
| Mount | — | — | — | — | — | — | — | — |
| Phylactery | — | — | — | — | — | — | — | — |
| Weapon | — | — | — | — | — | — | — | — |
| Finger 1 | Fiery Ring | Frosty Ring | Frosty Ring | Morbid Loop | Morbid Loop | Morbid Loop | Frosty Ring | Frosty Ring |
| Finger 2 | Morbid Loop | Morbid Loop | Morbid Loop | Spell Helix | Spell Helix | Spell Helix | Spell Helix | Spell Helix |
| Trophy 1 | Collection Of Samples | Collection Of Samples | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium | Mutated Mycelium |
| Trophy 2 | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone | Necrotic Powerstone |
| score vs no items | ×3.25e13 | ×3.28e14 | ×7.23e18 | ×4.51e24 | ×6.54e30 | ×1.05e37 | ×7.28e49 | ×5.17e62 |

Search hit the node budget at levels: none.

Items left out:

- excluded-slot (77)
- not-owned (28): Abnormal Voidmass, Anointed Ashes, Beholding Eye, Blessed Armor Scales, Burden of the Erased, Charged Fin-Wing, Crown of the First Realm, Embrace of the Erased, Endtimes Armor, Endtimes Failsafe, Endtimes Gear, Endtimes Visor, Godflesh Appendages, Godflesh Dominion, Godflesh Grasp, Godflesh Heart, Godflesh Veil, Inquisitive Eye, Insidious Lure, Legacy of the Erased, Mantle of the First Realm, Pillars of the First Realm, Power of the First Realm, Pride of the First Realm, Realmwalkers, The Starmap, Voice of the Erased, Warbanner Fragment
- no-effect (9): Acclimatized Summons, Binding Sigil, Cold-blooded Ring, Efficient Minion Tactics, Gravemoss Waistband, Holidays, Symbiotic Loop, Void Sampling, WrathSeed
- requirements (24): Artificer's Shoulderpads, Boots Of Harsh Trials, Chaos Mantle, Collar Of Obedience, Concealing Shroud, Conjured Spiked Stompers, Darklight Claws, Darklight Mantle, Easymind Hat, Falconer's Ranger Hat, Falconer's Warm Cape, Fancy Cape, Hollow Eye Pendant, Nether Chain, Netherloop, Resonator Ring, Seclusion Shell, Seeping Shadow Signet, Shadowflame Loop, Strange Spaulders, Talented Gloves, The Clockcarers, Tranquil Spaulders, Umbral Coil

## Detailed sets and contributions

Contribution = the set's score divided by the score with that item removed (slot left empty); "required" = removing it breaks another chosen item's attribute requirement.

### era-notes: best set per enchant level

Run: snapped 69; Legion off; Resonator allowed; excluded slots Wrist, Weapon, Offhand, Legs, Mount, Accessory, Phylactery; not owned: Charged Fin-Wing, Beholding Eye, Abnormal Voidmass, Insidious Lure, Warbanner Fragment, Inquisitive Eye, Blessed Armor Scales, Anointed Ashes; inputs Misc.AttributeCap=200, AttrPoints.Patience=200, AttrPoints.Spellcraft=200. File: `tool-result-era-notes.json`. Sweep change levels (the set differs from the previous level): 0, 1, 3, 5, 9, 12, 21.

**Enchant 0**: score ×1.22e13 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Empowering Headguard (Power Armor) | Legendary | 0 (0) | ×4.5 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 0 (0) | ×15.2 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 0 (0) | ×9.49 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 0 (0) | ×24.3 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 0 (0) | ×12.1 |
| Neck | Torc Of Privilege (The Eastern Tale) | Legendary | 0 (0) | ×4.03 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 0 (0) | ×11.6 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 0 (0) | ×10.5 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Destabilized Evocations | Legendary | 0 (0) | ×11 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Fiery Ring | Legendary | 0 (0) | ×5.98 |
| Finger 2 | Morbid Loop (Ancient Bones) | Legendary | 0 (0) | ×18.2 |
| Trophy 1 | Anomalous Essence | Legendary | 0 (0) | ×15 |
| Trophy 2 | Necrotic Powerstone | Legendary | 0 (0) | ×16.2 |

**Enchant 1**: score ×1.03e14 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Empowering Headguard (Power Armor) | Legendary | 1 (1) | ×4.93 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 1 (1) | ×20.1 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 1 (1) | ×10.7 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 1 (1) | ×30.3 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 1 (1) | ×16.1 |
| Neck | Torc Of Privilege (The Eastern Tale) | Legendary | 1 (1) | ×4.55 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 1 (1) | ×13.3 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 1 (1) | ×12.6 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 1 (1) | ×13.2 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Frosty Ring | Legendary | 1 (1) | ×7.18 |
| Finger 2 | Morbid Loop (Ancient Bones) | Legendary | 1 (1) | ×20.9 |
| Trophy 1 | Anomalous Essence | Legendary | 0 (0) | ×15 |
| Trophy 2 | Necrotic Powerstone | Legendary | 1 (1) | ×19.4 |

**Enchant 3**: score ×1.21e16 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Empowering Headguard (Power Armor) | Legendary | 3 (3) | ×5.92 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 3 (3) | ×35.3 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 3 (3) | ×13.6 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 3 (3) | ×47.4 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 3 (3) | ×28.2 |
| Neck | Torc Of Privilege (The Eastern Tale) | Legendary | 3 (3) | ×5.79 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 3 (3) | ×17.6 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 3 (3) | ×18.2 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 3 (3) | ×27.6 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Frosty Ring | Legendary | 3 (3) | ×10.3 |
| Finger 2 | Morbid Loop (Ancient Bones) | Legendary | 3 (3) | ×27.7 |
| Trophy 1 | Collection Of Samples | Legendary | 3 (3) | ×17.3 |
| Trophy 2 | Necrotic Powerstone | Legendary | 3 (3) | ×27.9 |

**Enchant 5**: score ×1.81e18 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Empowering Headguard (Power Armor) | Legendary | 5 (5) | ×7.1 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 5 (5) | ×62 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 5 (5) | ×17.4 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 5 (5) | ×74 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 5 (5) | ×49.6 |
| Neck | Searing Gaze | Legendary | 5 (5) | ×7.46 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 5 (5) | ×23.3 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 5 (5) | ×26.1 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 5 (5) | ×57.5 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Frosty Ring | Legendary | 5 (5) | ×14.9 |
| Finger 2 | Morbid Loop (Ancient Bones) | Legendary | 5 (5) | ×36.6 |
| Trophy 1 | Mutated Mycelium | Legendary | 5 (5) | ×25 |
| Trophy 2 | Necrotic Powerstone | Legendary | 5 (5) | ×40.2 |

**Enchant 9**: score ×7.14e22 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | The Artificer's Crown | Unique | 9 (9) | ×10.6 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 9 (9) | ×191 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 9 (9) | ×18.9 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 9 (9) | ×181 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 9 (9) | ×153 |
| Neck | Searing Gaze | Legendary | 9 (9) | ×15.5 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 9 (9) | ×40.8 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 9 (9) | ×54.2 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 9 (9) | ×250 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 9 (9) | ×64 |
| Finger 2 | Spell Helix | Legendary | 9 (9) | ×31.8 |
| Trophy 1 | Mutated Mycelium | Legendary | 9 (9) | ×69.3 |
| Trophy 2 | Necrotic Powerstone | Legendary | 9 (9) | ×83.4 |

**Enchant 10**: score ×1.13e24 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | The Artificer's Crown | Unique | 10 (10) | ×12.1 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 10 (10) | ×254 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 10 (10) | ×21.3 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 10 (10) | ×226 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 10 (10) | ×203 |
| Neck | Searing Gaze | Legendary | 10 (10) | ×18.6 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 10 (10) | ×46.9 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 10 (10) | ×65.1 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 10 (10) | ×361 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 10 (10) | ×73.6 |
| Finger 2 | Spell Helix | Legendary | 10 (10) | ×41.4 |
| Trophy 1 | Mutated Mycelium | Legendary | 10 (10) | ×89.4 |
| Trophy 2 | Necrotic Powerstone | Legendary | 10 (10) | ×100 |

**Enchant 12**: score ×3.08e26 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | The Artificer's Crown | Unique | 12 (12) | ×16.1 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 12 (12) | ×445 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 12 (12) | ×27.1 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 12 (12) | ×353 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 12 (12) | ×356 |
| Neck | Light Of Eighth Star | Unique | 12 (12) | ×29.4 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 12 (12) | ×62 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 12 (12) | ×93.7 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 12 (12) | ×753 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 12 (12) | ×97.3 |
| Finger 2 | Spell Helix | Legendary | 12 (12) | ×69.9 |
| Trophy 1 | Mutated Mycelium | Legendary | 12 (12) | ×149 |
| Trophy 2 | Necrotic Powerstone | Legendary | 12 (12) | ×144 |

**Enchant 15**: score ×1.63e30 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | The Artificer's Crown | Unique | 15 (15) | ×24.4 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 15 (15) | ×1040 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 15 (15) | ×39 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 15 (15) | ×689 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 15 (15) | ×830 |
| Neck | Light Of Eighth Star | Unique | 15 (15) | ×68.4 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 15 (15) | ×94.3 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 15 (15) | ×162 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 15 (15) | ×2270 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 15 (15) | ×148 |
| Finger 2 | Spell Helix | Legendary | 15 (15) | ×154 |
| Trophy 1 | Mutated Mycelium | Legendary | 15 (15) | ×320 |
| Trophy 2 | Necrotic Powerstone | Legendary | 15 (15) | ×249 |

**Enchant 20**: score ×2.63e36 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | The Artificer's Crown | Unique | 20 (20) | ×49.1 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 20 (20) | ×4240 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 20 (20) | ×71.5 |
| Feet | Boots Of Concentration (Raiments Of The Perfect Mind) | Legendary | 20 (20) | ×2100 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 20 (20) | ×3390 |
| Neck | Light Of Eighth Star | Unique | 20 (20) | ×280 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 20 (20) | ×190 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 20 (20) | ×402 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 20 (20) | ×14200 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 20 (20) | ×298 |
| Finger 2 | Spell Helix | Legendary | 20 (20) | ×570 |
| Trophy 1 | Mutated Mycelium | Legendary | 20 (20) | ×1150 |
| Trophy 2 | Necrotic Powerstone | Legendary | 20 (20) | ×620 |

**Enchant 21**: score ×4.93e37 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | The Artificer's Crown | Unique | 21 (21) | ×56.5 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 21 (21) | ×5620 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 21 (21) | ×80.6 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 21 (21) | ×3530 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 21 (21) | ×4500 |
| Neck | Light Of Eighth Star | Unique | 21 (21) | ×371 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 21 (21) | ×218 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 21 (21) | ×483 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 21 (21) | ×20600 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Frosty Ring | Legendary | 21 (21) | ×275 |
| Finger 2 | Spell Helix | Legendary | 21 (21) | ×741 |
| Trophy 1 | Mutated Mycelium | Legendary | 21 (21) | ×1480 |
| Trophy 2 | Necrotic Powerstone | Legendary | 21 (21) | ×744 |

**Enchant 30**: score ×1.82e49 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | The Artificer's Crown | Unique | 30 (30) | ×199 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 30 (30) | ×70900 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 30 (30) | ×239 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 30 (30) | ×44500 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 30 (30) | ×56800 |
| Neck | Light Of Eighth Star | Unique | 30 (30) | ×4680 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 30 (30) | ×767 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 30 (30) | ×2490 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 30 (30) | ×562000 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Frosty Ring | Legendary | 30 (30) | ×1420 |
| Finger 2 | Spell Helix | Legendary | 30 (30) | ×7860 |
| Trophy 1 | Mutated Mycelium | Legendary | 30 (30) | ×14700 |
| Trophy 2 | Necrotic Powerstone | Legendary | 30 (30) | ×3840 |

**Enchant 40**: score ×1.29e62 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | The Artificer's Crown | Unique | 40 (40) | ×804 |
| Chest | The Ribcage (Ancient Bones) | Legendary | 40 (40) | ×1.19e6 |
| Hands | Empowering Handguards (Power Armor) | Legendary | 40 (40) | ×801 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 40 (40) | ×744000 |
| Shoulder | Mantle Of The Crypt (Ancient Bones) | Legendary | 40 (40) | ×949000 |
| Neck | Light Of Eighth Star | Unique | 40 (40) | ×78300 |
| Waist | Encircling Trophies (Ancient Bones) | Legendary | 40 (40) | ×3100 |
| Wrist | — | | | |
| Back | Flaming Cape | Legendary | 40 (40) | ×15400 |
| Legs | — | | | |
| Offhand | — | | | |
| Research | Servants Overclocking | Legendary | 40 (40) | ×2.21e7 |
| Accessory | — | | | |
| Mount | — | | | |
| Phylactery | — | | | |
| Weapon | — | | | |
| Finger 1 | Frosty Ring | Legendary | 40 (40) | ×8770 |
| Finger 2 | Spell Helix | Legendary | 40 (40) | ×108000 |
| Trophy 1 | Mutated Mycelium | Legendary | 40 (40) | ×189000 |
| Trophy 2 | Necrotic Powerstone | Legendary | 40 (40) | ×23800 |


### main: best set per enchant level

Run: snapped 69; Legion off; Resonator allowed; all slots; all non-Mythic items owned at max quality; class default inputs. File: `tool-result.json`. Sweep change levels (the set differs from the previous level): 0, 1, 2, 12, 15.

**Enchant 0**: score ×3.92e18 vs no items; search hit the node budget (best found, not proven best).

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 0 (0) | required |
| Chest | The Ribcage (Ancient Bones) | Legendary | 0 (0) | ×22.9 |
| Hands | — | | | |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 0 (0) | ×14.4 |
| Shoulder | Empowering Shoulderguard (Power Armor) | Legendary | 0 (0) | ×2.5 |
| Neck | Shadow Tendril (Regalia Of Shadow) | Legendary | 0 (0) | ×1.26 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 0 (0) | ×4.81 |
| Wrist | Focusing Bracers (Raiments Of The Perfect Mind) | Legendary | 0 (0) | ×4.85 |
| Back | — | | | |
| Legs | — | | | |
| Offhand | Murmuring Spellbook | Legendary | 0 (0) | ×4800 |
| Research | Destabilized Evocations | Legendary | 0 (0) | ×11 |
| Accessory | Ethereal Veil (Raiments Of The Perfect Mind) | Legendary | 0 (0) | required |
| Mount | — | | | |
| Phylactery | Inert Jade Phylactery | Legendary | 0 (0) | ×9570 |
| Weapon | Thunderbird | Legendary | 0 (0) | ×1.2 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 0 (0) | ×27.5 |
| Finger 2 | — | | | |
| Trophy 1 | Blessed Armor Scales | Legendary | 0 (0) | ×21 |
| Trophy 2 | Necrotic Powerstone | Legendary | 0 (0) | ×16.2 |

**Enchant 1**: score ×2.51e22 vs no items; search hit the node budget (best found, not proven best).

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 1 (1) | required |
| Chest | Pompous Tunic (Jester's Privilege) | Legendary | 1 (1) | required |
| Hands | Conjured Claws (Conjurer's Chains) | Legendary | 1 (1) | ×7.04 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 1 (1) | ×8.4 |
| Shoulder | Conjured Razorspaulders (Conjurer's Chains) | Legendary | 1 (1) | ×11.9 |
| Neck | Shadow Tendril (Regalia Of Shadow) | Legendary | 0 (0) | ×1.51 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 1 (1) | ×8.66 |
| Wrist | Bite Sleeves | Legendary | 1 (1) | required |
| Back | — | | | |
| Legs | Conjured Painguards (Conjurer's Chains) | Legendary | 1 (1) | ×6.8 |
| Offhand | Murmuring Spellbook | Legendary | 1 (1) | ×6930 |
| Research | Servants Overclocking | Legendary | 1 (1) | ×13.2 |
| Accessory | Ethereal Veil (Raiments Of The Perfect Mind) | Legendary | 1 (1) | required |
| Mount | Blessed Tapestry | Legendary | 1 (1) | ×1.17 |
| Phylactery | Inert Jade Phylactery | Legendary | 1 (1) | ×12800 |
| Weapon | Thunderbird | Legendary | 1 (1) | ×1.56 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 1 (1) | ×13.9 |
| Finger 2 | The Bond | Unique | 1 (1) | ×6.25 |
| Trophy 1 | Blessed Armor Scales | Legendary | 1 (1) | ×26.2 |
| Trophy 2 | Necrotic Powerstone | Legendary | 1 (1) | ×19.4 |

**Enchant 2**: score ×9.93e23 vs no items; search hit the node budget (best found, not proven best).

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 2 (2) | required |
| Chest | Pompous Tunic (Jester's Privilege) | Legendary | 2 (2) | required |
| Hands | Conjured Claws (Conjurer's Chains) | Legendary | 2 (2) | ×7.62 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 2 (2) | ×11.1 |
| Shoulder | Conjured Razorspaulders (Conjurer's Chains) | Legendary | 2 (2) | ×13.7 |
| Neck | Light Of Eighth Star | Unique | 2 (2) | ×1.76 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 2 (2) | ×10.4 |
| Wrist | Bite Sleeves | Legendary | 2 (2) | required |
| Back | — | | | |
| Legs | Conjured Painguards (Conjurer's Chains) | Legendary | 2 (2) | ×7.8 |
| Offhand | Murmuring Spellbook | Legendary | 2 (2) | ×10000 |
| Research | Servants Overclocking | Legendary | 2 (2) | ×19.1 |
| Accessory | Ethereal Veil (Raiments Of The Perfect Mind) | Legendary | 2 (2) | required |
| Mount | Blessed Tapestry | Legendary | 2 (2) | ×1.36 |
| Phylactery | Inert Jade Phylactery | Legendary | 2 (2) | ×15000 |
| Weapon | Heart of the Grave | Legendary | 2 (2) | ×2.09 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 2 (2) | ×16 |
| Finger 2 | The Bond | Unique | 2 (2) | ×6.78 |
| Trophy 1 | Blessed Armor Scales | Legendary | 2 (2) | ×32.8 |
| Trophy 2 | Necrotic Powerstone | Legendary | 2 (2) | ×23.3 |

**Enchant 5**: score ×1.15e29 vs no items; search hit the node budget (best found, not proven best).

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 5 (5) | required |
| Chest | Pompous Tunic (Jester's Privilege) | Legendary | 5 (5) | required |
| Hands | Conjured Claws (Conjurer's Chains) | Legendary | 5 (5) | ×9.87 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 5 (5) | ×25.9 |
| Shoulder | Conjured Razorspaulders (Conjurer's Chains) | Legendary | 5 (5) | ×21 |
| Neck | Light Of Eighth Star | Unique | 5 (5) | ×4.09 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 5 (5) | ×18 |
| Wrist | Bite Sleeves | Legendary | 5 (5) | required |
| Back | — | | | |
| Legs | Conjured Painguards (Conjurer's Chains) | Legendary | 5 (5) | ×12 |
| Offhand | Murmuring Spellbook | Legendary | 5 (5) | ×30200 |
| Research | Servants Overclocking | Legendary | 5 (5) | ×57.5 |
| Accessory | Ethereal Veil (Raiments Of The Perfect Mind) | Legendary | 5 (5) | required |
| Mount | Blessed Tapestry | Legendary | 5 (5) | ×2.17 |
| Phylactery | Inert Jade Phylactery | Legendary | 5 (5) | ×23800 |
| Weapon | Heart of the Grave | Legendary | 5 (5) | ×6.28 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 5 (5) | ×24.4 |
| Finger 2 | The Bond | Unique | 5 (5) | ×8.75 |
| Trophy 1 | Blessed Armor Scales | Legendary | 5 (5) | ×64.1 |
| Trophy 2 | Necrotic Powerstone | Legendary | 5 (5) | ×40.2 |

**Enchant 10**: score ×3.19e37 vs no items; search hit the node budget (best found, not proven best).

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 10 (10) | required |
| Chest | Pompous Tunic (Jester's Privilege) | Legendary | 10 (10) | required |
| Hands | Conjured Claws (Conjurer's Chains) | Legendary | 10 (10) | ×15.1 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 10 (10) | ×106 |
| Shoulder | Conjured Razorspaulders (Conjurer's Chains) | Legendary | 10 (10) | ×42.4 |
| Neck | Light Of Eighth Star | Unique | 10 (10) | ×16.7 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 10 (10) | ×44.7 |
| Wrist | Bite Sleeves | Legendary | 10 (10) | required |
| Back | — | | | |
| Legs | Conjured Painguards (Conjurer's Chains) | Legendary | 10 (10) | ×24.2 |
| Offhand | Murmuring Spellbook | Legendary | 10 (10) | ×189000 |
| Research | Servants Overclocking | Legendary | 10 (10) | ×361 |
| Accessory | Ethereal Veil (Raiments Of The Perfect Mind) | Legendary | 10 (10) | required |
| Mount | Blessed Tapestry | Legendary | 10 (10) | ×4.72 |
| Phylactery | Inert Jade Phylactery | Legendary | 10 (10) | ×51800 |
| Weapon | Heart of the Grave | Legendary | 10 (10) | ×39.4 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 10 (10) | ×49.1 |
| Finger 2 | The Bond | Unique | 10 (10) | ×13.4 |
| Trophy 1 | Blessed Armor Scales | Legendary | 10 (10) | ×196 |
| Trophy 2 | Necrotic Powerstone | Legendary | 10 (10) | ×100 |

**Enchant 12**: score ×7.88e40 vs no items; search hit the node budget (best found, not proven best).

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 12 (12) | required |
| Chest | Pompous Tunic (Jester's Privilege) | Legendary | 12 (12) | required |
| Hands | Conjured Claws (Conjurer's Chains) | Legendary | 12 (12) | ×17.9 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 12 (12) | ×186 |
| Shoulder | Conjured Razorspaulders (Conjurer's Chains) | Legendary | 12 (12) | ×56.1 |
| Neck | Light Of Eighth Star | Unique | 12 (12) | ×29.4 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 12 (12) | ×64.4 |
| Wrist | Bite Sleeves | Legendary | 12 (12) | required |
| Back | — | | | |
| Legs | Conjured Painguards (Conjurer's Chains) | Legendary | 12 (12) | ×32.1 |
| Offhand | Murmuring Spellbook | Legendary | 12 (12) | ×395000 |
| Research | Servants Overclocking | Legendary | 12 (12) | ×753 |
| Accessory | Ethereal Veil (Raiments Of The Perfect Mind) | Legendary | 12 (12) | required |
| Mount | Blessed Tapestry | Legendary | 12 (12) | ×6.43 |
| Phylactery | Inert Jade Phylactery | Legendary | 12 (12) | ×70600 |
| Weapon | Heart of the Grave | Legendary | 12 (12) | ×82.2 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 12 (12) | ×64.9 |
| Finger 2 | The Bond | Unique | 12 (12) | ×15.8 |
| Trophy 1 | Blessed Armor Scales | Legendary | 12 (12) | ×306 |
| Trophy 2 | Mutated Mycelium | Legendary | 12 (12) | ×149 |

**Enchant 15**: score ×1.18e46 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 15 (15) | required |
| Chest | Pompous Tunic (Jester's Privilege) | Legendary | 15 (15) | required |
| Hands | Conjured Claws (Conjurer's Chains) | Legendary | 15 (15) | ×22.8 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 15 (15) | ×434 |
| Shoulder | Conjured Razorspaulders (Conjurer's Chains) | Legendary | 15 (15) | ×85.2 |
| Neck | Light Of Eighth Star | Unique | 15 (15) | ×68.4 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 15 (15) | ×111 |
| Wrist | Bite Sleeves | Legendary | 15 (15) | required |
| Back | — | | | |
| Legs | Conjured Painguards (Conjurer's Chains) | Legendary | 15 (15) | ×48.7 |
| Offhand | Murmuring Spellbook | Legendary | 15 (15) | ×1.19e6 |
| Research | Servants Overclocking | Legendary | 15 (15) | ×2270 |
| Accessory | Ethereal Veil (Raiments Of The Perfect Mind) | Legendary | 15 (15) | required |
| Mount | Blessed Tapestry | Legendary | 15 (15) | ×10.2 |
| Phylactery | Inert Jade Phylactery | Legendary | 15 (15) | ×112000 |
| Weapon | Heart of the Grave | Legendary | 15 (15) | ×248 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 15 (15) | ×98.7 |
| Finger 2 | Voidstrike Seal | Legendary | 15 (15) | ×21 |
| Trophy 1 | Blessed Armor Scales | Legendary | 15 (15) | ×597 |
| Trophy 2 | Mutated Mycelium | Legendary | 15 (15) | ×320 |

**Enchant 20**: score ×8.55e54 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 20 (20) | required |
| Chest | Pompous Tunic (Jester's Privilege) | Legendary | 20 (20) | required |
| Hands | Conjured Claws (Conjurer's Chains) | Legendary | 20 (20) | ×34.8 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 20 (20) | ×1770 |
| Shoulder | Conjured Razorspaulders (Conjurer's Chains) | Legendary | 20 (20) | ×172 |
| Neck | Light Of Eighth Star | Unique | 20 (20) | ×280 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 20 (20) | ×277 |
| Wrist | Bite Sleeves | Legendary | 20 (20) | required |
| Back | — | | | |
| Legs | Conjured Painguards (Conjurer's Chains) | Legendary | 20 (20) | ×98.2 |
| Offhand | Murmuring Spellbook | Legendary | 20 (20) | ×7.47e6 |
| Research | Servants Overclocking | Legendary | 20 (20) | ×14200 |
| Accessory | Ethereal Veil (Raiments Of The Perfect Mind) | Legendary | 20 (20) | required |
| Mount | Blessed Tapestry | Legendary | 20 (20) | ×22.2 |
| Phylactery | Inert Jade Phylactery | Legendary | 20 (20) | ×244000 |
| Weapon | Heart of the Grave | Legendary | 20 (20) | ×1560 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 20 (20) | ×199 |
| Finger 2 | Voidstrike Seal | Legendary | 20 (20) | ×57.9 |
| Trophy 1 | Blessed Armor Scales | Legendary | 20 (20) | ×1820 |
| Trophy 2 | Mutated Mycelium | Legendary | 20 (20) | ×1150 |

**Enchant 30**: score ×4.51e72 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 30 (30) | required |
| Chest | Pompous Tunic (Jester's Privilege) | Legendary | 30 (30) | required |
| Hands | Conjured Claws (Conjurer's Chains) | Legendary | 30 (30) | ×81 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 30 (30) | ×29700 |
| Shoulder | Conjured Razorspaulders (Conjurer's Chains) | Legendary | 30 (30) | ×695 |
| Neck | Light Of Eighth Star | Unique | 30 (30) | ×4680 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 30 (30) | ×1710 |
| Wrist | Bite Sleeves | Legendary | 30 (30) | required |
| Back | — | | | |
| Legs | Conjured Painguards (Conjurer's Chains) | Legendary | 30 (30) | ×398 |
| Offhand | Murmuring Spellbook | Legendary | 30 (30) | ×2.95e8 |
| Research | Servants Overclocking | Legendary | 30 (30) | ×562000 |
| Accessory | Ethereal Veil (Raiments Of The Perfect Mind) | Legendary | 30 (30) | required |
| Mount | Blessed Tapestry | Legendary | 30 (30) | ×105 |
| Phylactery | Inert Jade Phylactery | Legendary | 30 (30) | ×1.15e6 |
| Weapon | Heart of the Grave | Legendary | 30 (30) | ×61300 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 30 (30) | ×803 |
| Finger 2 | Voidstrike Seal | Legendary | 30 (30) | ×441 |
| Trophy 1 | Blessed Armor Scales | Legendary | 30 (30) | ×17000 |
| Trophy 2 | Mutated Mycelium | Legendary | 30 (30) | ×14700 |

**Enchant 40**: score ×2.38e90 vs no items; search complete.

| Slot | Item | Quality | Enchant (effective) | Contribution |
|---|---|---|---|---|
| Head | Circlet Of Deep Thoughts (Raiments Of The Perfect Mind) | Legendary | 40 (40) | required |
| Chest | Pompous Tunic (Jester's Privilege) | Legendary | 40 (40) | required |
| Hands | Conjured Claws (Conjurer's Chains) | Legendary | 40 (40) | ×188 |
| Feet | Lordic Greaves (Ancient Bones) | Legendary | 40 (40) | ×496000 |
| Shoulder | Conjured Razorspaulders (Conjurer's Chains) | Legendary | 40 (40) | ×2810 |
| Neck | Light Of Eighth Star | Unique | 40 (40) | ×78300 |
| Waist | Colourful Belt (Jester's Privilege) | Legendary | 40 (40) | ×10600 |
| Wrist | Bite Sleeves | Legendary | 40 (40) | required |
| Back | — | | | |
| Legs | Conjured Painguards (Conjurer's Chains) | Legendary | 40 (40) | ×1610 |
| Offhand | Murmuring Spellbook | Legendary | 40 (40) | ×1.16e10 |
| Research | Servants Overclocking | Legendary | 40 (40) | ×2.21e7 |
| Accessory | Ethereal Veil (Raiments Of The Perfect Mind) | Legendary | 40 (40) | required |
| Mount | Blessed Tapestry | Legendary | 40 (40) | ×495 |
| Phylactery | Inert Jade Phylactery | Legendary | 40 (40) | ×5.44e6 |
| Weapon | Heart of the Grave | Legendary | 40 (40) | ×2.42e6 |
| Finger 1 | Morbid Loop (Ancient Bones) | Legendary | 40 (40) | ×3250 |
| Finger 2 | Voidstrike Seal | Legendary | 40 (40) | ×3350 |
| Trophy 1 | Blessed Armor Scales | Legendary | 40 (40) | ×158000 |
| Trophy 2 | Mutated Mycelium | Legendary | 40 (40) | ×189000 |


## Inputs of era-notes (relevance at enchant 10)

Shown: 19; hidden (can't change which set wins, so the UI would not ask for them): 52.

Hidden inputs: `Char.Level`, `AttrPoints.Spellcraft`, `Pet.Level`, `Spell.AccumulatedCastsThisExile`, `Weapon.ThunderbirdCharges`, `Misc.Arcanasprings`, `Misc.Laboratories`, `Elixir.EvocationIngredients`, `AttrPoints.Mastery`, `Char.LevelRequirementReduction`, `Spell.EvocationEfficiency`, `Mysteries.Count`, `Void.Mana`, `AttrPoints.Insight`, `Idle.TimeThisExile`, `Spell.CastsThisExile`, `Idle.Bonus`, `Void.ProfitPerPoint`, `AttrPoints.Versatility`, `AttrPoints.Wisdom`, `AttrPoints.Dominance`, `Misc.AchievementsUnlocked`, `Misc.UpgradesBought`, `Void.EntitiesThisExile`, `Shards.CollectedThisExile`, `Shards.PassiveGeneration`, `Misc.SourcesOwned`, `Misc.AchievementPoints`, `Spell.EvocationCastsThisExile`, `Elixir.IncantationIngredients`, `Items.EnchantingDustThisExile`, `Hero.AbilityPower`, `Char.ClassTimeHours`, `Time.SkippedYears`, `Hero.AbilityPowerGrowth`, `Pet.TimeCurrent`, `Spell.Superposition.CastsThisExile`, `Spell.RitualOfPower.CastsThisExile`, `Spell.StabilizeTheFlow.SnappedMaxDistortion`, `Spell.StabilizeTheFlow.SnappedIncantationEfficiency`, `Misc.LiquidShadow`, `Misc.ShadowCoals`, `Misc.BatsThisExile`, `Misc.MaxManaAccrued`, `Void.ManaAccrued`, `Click.AutoclicksAccrued`, `Spell.CastsAccrued`, `Void.EntitiesAccrued`, `Building.1.Count`, `Weapon.CataclysmCharges`, `Building.6.Count`, `Building.8.Share`.

| Input | Value | Source of the value | Ranking relevance (enchant 10) |
|---|---|---|---|
| `Char.Level` (Character level) | 200 | unverified: Character level after the level buildup (same generic magnitude as the other classes). The Wizard XP table (level 300 = 2.58e15 XP) and Legacy's level milestones (110–300) put late-game levels in the low hundreds. | hidden: Varying it from 1 to 200000000.000 changes every item set's score by the same factor. |
| `AttrPoints.Spellcraft` (Spellcraft points assigned) | 200 | set for this run (see choices) | hidden: Varying it from 0 to 800 moves the gap between item sets by at most ×1.005, which is below the noise threshold. |
| `Pet.Level` (Pet level) | 300 | unverified: Placeholder magnitude, not stated by a guide: Risen Giant level at the burst. | hidden: Varying it from 1 to 300000000.000 changes every item set's score by the same factor. |
| `Misc.AttributeCap` (Attribute cap) | 200 | set for this run (see choices) | **shown**: Changes how much items are worth: varying it from 100 to 250 moves the gap between item sets by up to ×12.05. |
| `Spell.AccumulatedCastsThisExile` (Accumulated and persistent spells cast this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.CatalystShards` (Catalyst shards collected) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×63.1. |
| `Expeditions.Level` (Expedition level) | 50 | unverified: Placeholder magnitude, not stated by a guide: expedition level. | **shown**: Changes how much items are worth: varying it from 0 to 100 moves the gap between item sets by up to ×18.39. |
| `Weapon.ThunderbirdCharges` (Thunderbird charges) | 0 | generic default | hidden: Varying it from 0 to 10000 changes every item set's score by the same factor. |
| `Misc.Arcanasprings` (Arcanasprings owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.Laboratories` (Laboratories owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Elixir.EvocationIngredients` (Evocation ingredients in the cauldron) | 0 | generic default | hidden: Varying it from 0 to 5 changes every item set's score by the same factor. |
| `AttrPoints.Intelligence` (Intelligence points assigned) | 25 | guide/wiki | **shown**: Changes how much items are worth: varying it from 0 to 100 moves the gap between item sets by up to ×2.667. |
| `AttrPoints.Mastery` (Mastery points assigned) | 25 | guide/wiki | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Char.LevelRequirementReduction` (Level requirement reduction without items) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Spell.EvocationEfficiency` (Evocation efficiency from sources the tool doesn't model) | 1000 | unverified: Placeholder magnitude, not stated by a guide: Evocation efficiency from upgrades and other unmodelled sources. | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Mysteries.Count` (Mysteries) | 1.00e150 | unverified: The guide covers e90–e220+ Mysteries. | hidden: Varying it from 1e144 to 1e156 changes every item set's score by the same factor. |
| `Void.Mana` (Void mana collected at burst time) | 1.00e10 | unverified: Placeholder magnitude, not stated by a guide: Void mana gathered with Void Radiance in the pre-burst. | hidden: Varying it from 10000 to 1e16 moves the gap between item sets by at most ×1, which is below the noise threshold. |
| `AttrPoints.Insight` (Insight points assigned) | 25 | guide/wiki | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `AttrPoints.Patience` (Patience points assigned) | 200 | set for this run (see choices) | **shown**: Changes how much items are worth: varying it from 0 to 800 moves the gap between item sets by up to ×12.04. |
| `Idle.TimeThisExile` (Idle time this Exile (seconds)) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Spell.CastsThisExile` (Spells cast this Exile) | 1.00e7 | unverified: Placeholder magnitude, not stated by a guide: spells cast this Exile (phases 1 and 2 cast recklessly). | hidden: Varying it from 10 to 10000000000000.000 changes every item set's score by the same factor. |
| `Idle.Bonus` (Idle bonus multiplier without item and attribute bonuses) | 100 | unverified: Placeholder magnitude, not stated by a guide: idle bonus before items and attributes (the guide's Patience note relies on Risen Giant's idle scaling). | hidden: Varying it from 1 to 100000000.000 changes every item set's score by the same factor. |
| `Void.ProfitPerPoint` (Profit per Void mana point without item and attribute bonuses) | 1 | generic default | hidden: Varying it from 0.000 to 1000000.000 changes every item set's score by the same factor. |
| `Idle.Active` (Burst in Idle mode) | 1 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×361. |
| `AttrPoints.Versatility` (Versatility points assigned) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `AttrPoints.Wisdom` (Wisdom points assigned) | 25 | guide/wiki | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `AttrPoints.Dominance` (Dominance points assigned) | 0 | unverified: Not listed in the guide's attribute points. | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `AttrPoints.Empathy` (Empathy points assigned) | 0 | unverified: Not listed in the guide's attribute points. | **shown**: Changes how much items are worth: varying it from 0 to 100 moves the gap between item sets by up to ×1.532. |
| `Misc.AchievementsUnlocked` (Achievements unlocked) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Misc.UpgradesBought` (Upgrades bought) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Void.EntitiesThisExile` (Void entities collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Shards.CollectedThisExile` (Spell shards collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Shards.PassiveGeneration` (Passive spell shard generation without item and attribute bonuses) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Click.AutoclicksThisExile` (Autoclicks this Exile) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×3.4. |
| `Misc.SourcesOwned` (Total amount of mana sources owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.AchievementPoints` (Achievement points) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Building.8.Count` (Nexi owned) | 3000 | unverified: Placeholder magnitude, not stated by a guide: Temporal Anchors owned (unlocking the class takes 1500 of The Nexus). | **shown**: Changes how much items are worth: varying it from 0 to 3000000000.000 moves the gap between item sets by up to ×2.901. |
| `Spell.EvocationCastsThisExile` (Evocation spells cast this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Elixir.IncantationIngredients` (Incantation ingredients in the cauldron) | 0 | generic default | hidden: Varying it from 0 to 5 changes every item set's score by the same factor. |
| `Spell.IncantationEfficiency` (Incantation efficiency from sources the tool doesn't model) | 1000 | unverified: Placeholder magnitude, not stated by a guide: Incantation efficiency from upgrades and other unmodelled sources. | **shown**: Changes how much items are worth: varying it from 0.001 to 1000000000.000 moves the gap between item sets by up to ×3.886. |
| `Items.EnchantingDustThisExile` (Enchanting dust collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Hero.AbilityPower` (Character ability power (CAP) without item and attribute bonuses) | 1.00e6 | unverified: Placeholder magnitude, not stated by a guide: CAP before items and attributes. | hidden: Varying it from 1 to 1000000000000.000 changes every item set's score by the same factor. |
| `Char.ClassTimeHours` (Time played as this class this Exile (hours)) | 10 | unverified: The guide gives a run duration of 10 minutes to 10 hours; the upper end is used. | hidden: Varying it from 0.000 to 10000000.000 changes every item set's score by the same factor. |
| `Time.SkippedYears` (Skipped time this Exile (years)) | 1 | unverified: Placeholder magnitude, not stated by a guide: time skipped with Wormhole in phases 1 and 2. | hidden: Varying it from 0.000 to 1000000.000 moves the gap between item sets by at most ×1, which is below the noise threshold. |
| `Hero.AbilityPowerGrowth` (CAP growth rate without item and attribute bonuses) | 10 | unverified: Placeholder magnitude, not stated by a guide: CAP growth rate. | hidden: Varying it from 0.000 to 10000000.000 changes every item set's score by the same factor. |
| `Pet.TimeCurrent` (Current pet time (seconds)) | 3.15e7 | unverified: Risen Giant scales with the pet game time gained from Wormhole, so its pet time matches the skipped-time default. | hidden: Varying it from 31.54 to 31536000000000.000 moves the gap between item sets by at most ×1, which is below the noise threshold. |
| `Pet.AbilityPower` (Pet ability power (PAP) without item and attribute bonuses) | 1 | generic default | **shown**: Changes how much items are worth: varying it from 0.000 to 1000000.000 moves the gap between item sets by up to ×11.85. |
| `Spell.Superposition.CastsThisExile` (Superposition: casts this Exile) | 1.00e5 | unverified: Placeholder magnitude, not stated by a guide: Superposition casts stacked in phase 2. | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Spell.RitualOfPower.CastsThisExile` (Ritual Of Power: casts this Exile) | 1.00e5 | unverified: Placeholder magnitude, not stated by a guide: Ritual Of Power casts stacked in phase 2. | hidden: Varying it from 0.1 to 100000000000.000 moves the gap between item sets by at most ×1, which is below the noise threshold. |
| `Spell.StabilizeTheFlow.SnappedMaxDistortion` (Stabilize The Flow: Time Distortion consumed when it was cast (snapped)) | 10 | unverified: The pre-burst casts Temporal Distortion until Stabilize The Flow is cast; 10x is the class page's base maximum (items and an upgrade raise it to 30x). | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Spell.StabilizeTheFlow.SnappedIncantationEfficiency` (Stabilize The Flow: Incantation efficiency when it was cast (snapped)) | 1000 | unverified: Placeholder magnitude, not stated by a guide: Incantation efficiency of the pre-burst set that casts Stabilize The Flow. | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Spell.TimeHelix.CastsThisExile` (Time Helix: casts this Exile) | 100 | unverified: Placeholder magnitude, not stated by a guide: Time Helix casts from phase 2's second spell set. | **shown**: Changes how much items are worth: varying it from 0.000 to 100000000.000 moves the gap between item sets by up to ×1.097. |
| `Misc.LiquidShadow` (Liquid Shadow held) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.ShadowCoals` (Shadow Coals owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.BatsThisExile` (Bats collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.MaxManaAccrued` (Maximum mana accrued) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Void.ManaAccrued` (Void mana accrued) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Click.AutoclicksAccrued` (Autoclicks accrued) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Spell.CastsAccrued` (Spellcasts accrued) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Void.EntitiesAccrued` (Void entities accrued) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.1.Share` (Mana Gems share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×5.989. |
| `Building.1.Count` (Mana Gems owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.2.Share` (Grimoires share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×2.5. |
| `Building.3.Share` (Spell Fountains share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×8.5. |
| `Building.4.Share` (Enchanted Trees share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×2.5. |
| `Building.5.Share` (Alchemy Desks share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×2.5. |
| `Building.6.Share` (Circles Of Power share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×2.5. |
| `Weapon.CataclysmCharges` (Cataclysm charges (temporary Hellholes when activated)) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.6.Count` (Circles Of Power owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.7.Share` (Dimensional Rifts share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×5.5. |
| `Building.8.Share` (Nexi share of production) | 1 | unverified: Assumed: Temporal Anchors (The Nexus's replacement) hold the production; the burst also casts Gem Resonance (Mana Gems). | hidden: Varying it from 0 to 1 changes every item set's score by the same factor. |

## Inputs of main (relevance at enchant 10)

Shown: 30; hidden (can't change which set wins, so the UI would not ask for them): 41.

Hidden inputs: `AttrPoints.Spellcraft`, `Pet.Level`, `Misc.AttributeCap`, `Spell.AccumulatedCastsThisExile`, `Misc.CatalystShards`, `Weapon.ThunderbirdCharges`, `Misc.Arcanasprings`, `Elixir.EvocationIngredients`, `Spell.EvocationEfficiency`, `Mysteries.Count`, `Void.Mana`, `Idle.TimeThisExile`, `AttrPoints.Versatility`, `AttrPoints.Wisdom`, `AttrPoints.Dominance`, `AttrPoints.Empathy`, `Misc.AchievementsUnlocked`, `Misc.UpgradesBought`, `Void.EntitiesThisExile`, `Shards.CollectedThisExile`, `Shards.PassiveGeneration`, `Misc.SourcesOwned`, `Misc.AchievementPoints`, `Spell.EvocationCastsThisExile`, `Elixir.IncantationIngredients`, `Items.EnchantingDustThisExile`, `Hero.AbilityPower`, `Char.ClassTimeHours`, `Time.SkippedYears`, `Hero.AbilityPowerGrowth`, `Pet.TimeCurrent`, `Spell.Superposition.CastsThisExile`, `Spell.RitualOfPower.CastsThisExile`, `Spell.StabilizeTheFlow.SnappedMaxDistortion`, `Spell.StabilizeTheFlow.SnappedIncantationEfficiency`, `Misc.LiquidShadow`, `Misc.ShadowCoals`, `Building.1.Count`, `Weapon.CataclysmCharges`, `Building.6.Count`, `Building.8.Share`.

| Input | Value | Source of the value | Ranking relevance (enchant 10) |
|---|---|---|---|
| `Char.Level` (Character level) | 200 | unverified: Character level after the level buildup (same generic magnitude as the other classes). The Wizard XP table (level 300 = 2.58e15 XP) and Legacy's level milestones (110–300) put late-game levels in the low hundreds. | **shown**: Changes how much items are worth: varying it from 1 to 200000000.000 moves the gap between item sets. |
| `AttrPoints.Spellcraft` (Spellcraft points assigned) | 0 | unverified: Not listed in the guide's attribute points. | hidden: Varying it from 0 to 100 moves the gap between item sets by at most ×1.003, which is below the noise threshold. |
| `Pet.Level` (Pet level) | 300 | unverified: Placeholder magnitude, not stated by a guide: Risen Giant level at the burst. | hidden: Varying it from 1 to 300000000.000 changes every item set's score by the same factor. |
| `Misc.AttributeCap` (Attribute cap) | 250 | generic default | hidden: Varying it from 100 to 250 changes every item set's score by the same factor. |
| `Spell.AccumulatedCastsThisExile` (Accumulated and persistent spells cast this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.CatalystShards` (Catalyst shards collected) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Expeditions.Level` (Expedition level) | 50 | unverified: Placeholder magnitude, not stated by a guide: expedition level. | **shown**: Changes how much items are worth: varying it from 0 to 100 moves the gap between item sets by up to ×27.47. |
| `Weapon.ThunderbirdCharges` (Thunderbird charges) | 0 | generic default | hidden: Varying it from 0 to 10000 changes every item set's score by the same factor. |
| `Misc.Arcanasprings` (Arcanasprings owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.Laboratories` (Laboratories owned) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×91462388.429. |
| `Elixir.EvocationIngredients` (Evocation ingredients in the cauldron) | 0 | generic default | hidden: Varying it from 0 to 5 changes every item set's score by the same factor. |
| `AttrPoints.Intelligence` (Intelligence points assigned) | 25 | guide/wiki | **shown**: Changes how much items are worth: varying it from 0 to 100 moves the gap between item sets by up to ×1.023. |
| `AttrPoints.Mastery` (Mastery points assigned) | 25 | guide/wiki | **shown**: Changes how much items are worth: varying it from 0 to 100 moves the gap between item sets by up to ×1.023. |
| `Char.LevelRequirementReduction` (Level requirement reduction without items) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 100 moves the gap between item sets by up to ×10.07. |
| `Spell.EvocationEfficiency` (Evocation efficiency from sources the tool doesn't model) | 1000 | unverified: Placeholder magnitude, not stated by a guide: Evocation efficiency from upgrades and other unmodelled sources. | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Mysteries.Count` (Mysteries) | 1.00e150 | unverified: The guide covers e90–e220+ Mysteries. | hidden: Varying it from 1e144 to 1e156 changes every item set's score by the same factor. |
| `Void.Mana` (Void mana collected at burst time) | 1.00e10 | unverified: Placeholder magnitude, not stated by a guide: Void mana gathered with Void Radiance in the pre-burst. | hidden: Varying it from 10000 to 1e16 moves the gap between item sets by at most ×1, which is below the noise threshold. |
| `AttrPoints.Insight` (Insight points assigned) | 25 | guide/wiki | **shown**: Changes how much items are worth: varying it from 0 to 100 moves the gap between item sets by up to ×1.01. |
| `AttrPoints.Patience` (Patience points assigned) | 40 | guide/wiki | **shown**: Changes how much items are worth: varying it from 0 to 160 moves the gap between item sets by up to ×2.185. |
| `Idle.TimeThisExile` (Idle time this Exile (seconds)) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Spell.CastsThisExile` (Spells cast this Exile) | 1.00e7 | unverified: Placeholder magnitude, not stated by a guide: spells cast this Exile (phases 1 and 2 cast recklessly). | **shown**: Changes how much items are worth: varying it from 10 to 10000000000000.000 moves the gap between item sets by up to ×778700. |
| `Idle.Bonus` (Idle bonus multiplier without item and attribute bonuses) | 100 | unverified: Placeholder magnitude, not stated by a guide: idle bonus before items and attributes (the guide's Patience note relies on Risen Giant's idle scaling). | **shown**: Changes how much items are worth: varying it from 1 to 100000000.000 moves the gap between item sets by up to ×38.55. |
| `Void.ProfitPerPoint` (Profit per Void mana point without item and attribute bonuses) | 1 | generic default | **shown**: Changes how much items are worth: varying it from 0.000 to 1000000.000 moves the gap between item sets by up to ×1.417. |
| `Idle.Active` (Burst in Idle mode) | 1 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×189400. |
| `AttrPoints.Versatility` (Versatility points assigned) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `AttrPoints.Wisdom` (Wisdom points assigned) | 25 | guide/wiki | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `AttrPoints.Dominance` (Dominance points assigned) | 0 | unverified: Not listed in the guide's attribute points. | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `AttrPoints.Empathy` (Empathy points assigned) | 0 | unverified: Not listed in the guide's attribute points. | hidden: Varying it from 0 to 100 moves the gap between item sets by at most ×1.003, which is below the noise threshold. |
| `Misc.AchievementsUnlocked` (Achievements unlocked) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Misc.UpgradesBought` (Upgrades bought) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Void.EntitiesThisExile` (Void entities collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Shards.CollectedThisExile` (Spell shards collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Shards.PassiveGeneration` (Passive spell shard generation without item and attribute bonuses) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Click.AutoclicksThisExile` (Autoclicks this Exile) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×3.4. |
| `Misc.SourcesOwned` (Total amount of mana sources owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.AchievementPoints` (Achievement points) | 0 | generic default | hidden: Varying it from 0 to 100 changes every item set's score by the same factor. |
| `Building.8.Count` (Nexi owned) | 3000 | unverified: Placeholder magnitude, not stated by a guide: Temporal Anchors owned (unlocking the class takes 1500 of The Nexus). | **shown**: Changes how much items are worth: varying it from 0 to 3000000000.000 moves the gap between item sets by up to ×2.901. |
| `Spell.EvocationCastsThisExile` (Evocation spells cast this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Elixir.IncantationIngredients` (Incantation ingredients in the cauldron) | 0 | generic default | hidden: Varying it from 0 to 5 changes every item set's score by the same factor. |
| `Spell.IncantationEfficiency` (Incantation efficiency from sources the tool doesn't model) | 1000 | unverified: Placeholder magnitude, not stated by a guide: Incantation efficiency from upgrades and other unmodelled sources. | **shown**: Changes how much items are worth: varying it from 0.001 to 1000000000.000 moves the gap between item sets by up to ×5.779. |
| `Items.EnchantingDustThisExile` (Enchanting dust collected this Exile) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Hero.AbilityPower` (Character ability power (CAP) without item and attribute bonuses) | 1.00e6 | unverified: Placeholder magnitude, not stated by a guide: CAP before items and attributes. | hidden: Varying it from 1 to 1000000000000.000 changes every item set's score by the same factor. |
| `Char.ClassTimeHours` (Time played as this class this Exile (hours)) | 10 | unverified: The guide gives a run duration of 10 minutes to 10 hours; the upper end is used. | hidden: Varying it from 0.000 to 10000000.000 changes every item set's score by the same factor. |
| `Time.SkippedYears` (Skipped time this Exile (years)) | 1 | unverified: Placeholder magnitude, not stated by a guide: time skipped with Wormhole in phases 1 and 2. | hidden: Varying it from 0.000 to 1000000.000 moves the gap between item sets by at most ×1, which is below the noise threshold. |
| `Hero.AbilityPowerGrowth` (CAP growth rate without item and attribute bonuses) | 10 | unverified: Placeholder magnitude, not stated by a guide: CAP growth rate. | hidden: Varying it from 0.000 to 10000000.000 changes every item set's score by the same factor. |
| `Pet.TimeCurrent` (Current pet time (seconds)) | 3.15e7 | unverified: Risen Giant scales with the pet game time gained from Wormhole, so its pet time matches the skipped-time default. | hidden: Varying it from 31.54 to 31536000000000.000 changes every item set's score by the same factor. |
| `Pet.AbilityPower` (Pet ability power (PAP) without item and attribute bonuses) | 1 | generic default | **shown**: Changes how much items are worth: varying it from 0.000 to 1000000.000 moves the gap between item sets by up to ×3.785. |
| `Spell.Superposition.CastsThisExile` (Superposition: casts this Exile) | 1.00e5 | unverified: Placeholder magnitude, not stated by a guide: Superposition casts stacked in phase 2. | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Spell.RitualOfPower.CastsThisExile` (Ritual Of Power: casts this Exile) | 1.00e5 | unverified: Placeholder magnitude, not stated by a guide: Ritual Of Power casts stacked in phase 2. | hidden: Varying it from 0.1 to 100000000000.000 moves the gap between item sets by at most ×1, which is below the noise threshold. |
| `Spell.StabilizeTheFlow.SnappedMaxDistortion` (Stabilize The Flow: Time Distortion consumed when it was cast (snapped)) | 10 | unverified: The pre-burst casts Temporal Distortion until Stabilize The Flow is cast; 10x is the class page's base maximum (items and an upgrade raise it to 30x). | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Spell.StabilizeTheFlow.SnappedIncantationEfficiency` (Stabilize The Flow: Incantation efficiency when it was cast (snapped)) | 1000 | unverified: Placeholder magnitude, not stated by a guide: Incantation efficiency of the pre-burst set that casts Stabilize The Flow. | hidden: Only feeds factors of the score that no item changes, so it scales every item set's score equally. |
| `Spell.TimeHelix.CastsThisExile` (Time Helix: casts this Exile) | 100 | unverified: Placeholder magnitude, not stated by a guide: Time Helix casts from phase 2's second spell set. | **shown**: Changes how much items are worth: varying it from 0.000 to 100000000.000 moves the gap between item sets by up to ×1.107. |
| `Misc.LiquidShadow` (Liquid Shadow held) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.ShadowCoals` (Shadow Coals owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Misc.BatsThisExile` (Bats collected this Exile) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×1000000000001.047. |
| `Misc.MaxManaAccrued` (Maximum mana accrued) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×1.15. |
| `Void.ManaAccrued` (Void mana accrued) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×6.1. |
| `Click.AutoclicksAccrued` (Autoclicks accrued) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×117.6. |
| `Spell.CastsAccrued` (Spellcasts accrued) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×82. |
| `Void.EntitiesAccrued` (Void entities accrued) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1000000.000 moves the gap between item sets by up to ×145. |
| `Building.1.Share` (Mana Gems share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×20.14. |
| `Building.1.Count` (Mana Gems owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.2.Share` (Grimoires share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×1.136. |
| `Building.3.Share` (Spell Fountains share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×1.039. |
| `Building.4.Share` (Enchanted Trees share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×1.136. |
| `Building.5.Share` (Alchemy Desks share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×2.5. |
| `Building.6.Share` (Circles Of Power share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×1.039. |
| `Weapon.CataclysmCharges` (Cataclysm charges (temporary Hellholes when activated)) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.6.Count` (Circles Of Power owned) | 0 | generic default | hidden: Varying it from 0 to 1000000.000 changes every item set's score by the same factor. |
| `Building.7.Share` (Dimensional Rifts share of production) | 0 | generic default | **shown**: Changes how much items are worth: varying it from 0 to 1 moves the gap between item sets by up to ×1.039. |
| `Building.8.Share` (Nexi share of production) | 1 | unverified: Assumed: Temporal Anchors (The Nexus's replacement) hold the production; the burst also casts Gem Resonance (Mana Gems). | hidden: Varying it from 0 to 1 changes every item set's score by the same factor. |

## Unverified data behind era-notes at enchant 10

- Set Ancient Bones (4 pieces): Set tier N applies from N + 1 pieces (Module:Items SetInfo); tiers are assumed to be cumulative.
- Percentage item bonuses are read as multipliers ×(1 + N%) (edust bonuses are "multiplicative unless stated otherwise", Enchantments page). Affects: The Artificer's Crown ("Experiment and Crafting efficiency +10%"); The Artificer's Crown ("Experiment and Crafting efficiency +10%"); The Artificer's Crown ("character ability power +200%"); Empowering Handguards ("Evocation efficiency +150%"); Empowering Handguards ("Incantation efficiency +35%"); The Ribcage ("Profits +150%"); The Ribcage ("Idle bonus +100%"); Boots Of Concentration ("Idle bonus +100%"); Mantle Of The Crypt ("Idle bonus +100%"); Mantle Of The Crypt ("character ability power +100%"); Mantle Of The Crypt ("summoning efficiency +25%"); Searing Gaze ("Evocation efficiency +200%"); Searing Gaze ("Spell Fountains profit +400%"); Encircling Trophies ("Profits +150%"); Encircling Trophies ("Idle bonus +75%"); Flaming Cape ("Evocation efficiency +200%"); Flaming Cape ("Incantation efficiency +50%"); Servants Overclocking ("Idle bonus +200%"); Morbid Loop ("Profits +100%"); Morbid Loop ("Idle bonus +100%"); Morbid Loop ("character ability power +50%"); Spell Helix ("Evocation efficiency +200%"); Mutated Mycelium ("Idle bonus +0.0324 * Expedition Level (3.24% per Expedition Level)"); Necrotic Powerstone ("Void Mana profits +300%"); Necrotic Powerstone ("idle bonus +100%"); Necrotic Powerstone ("Mana Gem profit +300%").
- "(base)" is read as an addition to the stat's base value; the older Fandom item data words the same bonuses "(additive)". Affects: Boots Of Concentration ("Mysteries power (base) +25%").
- Read as a factor ×(1 − N%). Affects: Searing Gaze ("reduces Evocation duration +50%").
- Cost reductions are assumed to add up. Affects: Spell Helix ("Reduces Spells costs reduction +20%").
- Not modelled (Compressed Time (maximum L × 5)): Compressed Time isn't modelled.
- Not modelled (Time Distortion speeds up game time (not spell durations or weapon charging)): Time over the run isn't modelled; times are inputs.
- Not modelled (CompressedTime = CharLvl × 0.2 + 100): Compressed Time isn't modelled.
- Not modelled (Resets Character Experience, Mana, Void Mana, and various Exile statistics): Resets over the run aren't modelled; the affected totals are inputs.

## Unverified data behind main at enchant 10

- Set Raiments Of The Perfect Mind (2 pieces): Set tier N applies from N + 1 pieces (Module:Items SetInfo); tiers are assumed to be cumulative.
- Set Conjurer's Chains (3 pieces): Set tier N applies from N + 1 pieces (Module:Items SetInfo); tiers are assumed to be cumulative.
- Set Jester's Privilege (2 pieces): Set tier N applies from N + 1 pieces (Module:Items SetInfo); tiers are assumed to be cumulative.
- Set Ancient Bones (2 pieces): Set tier N applies from N + 1 pieces (Module:Items SetInfo); tiers are assumed to be cumulative.
- Percentage item bonuses are read as multipliers ×(1 + N%) (edust bonuses are "multiplicative unless stated otherwise", Enchantments page). Affects: Conjured Claws ("Character ability power +150%"); Conjured Claws ("pet ability power +100%"); Pompous Tunic ("Profits +200%"); Pompous Tunic ("character ability power +50%"); Lordic Greaves ("Idle bonus +150%"); Lordic Greaves ("summoning efficiency +50%"); Conjured Razorspaulders ("Character ability power +100%"); Conjured Razorspaulders ("Incantation efficiency +25%"); Colourful Belt ("Profits +175%"); Colourful Belt ("character ability power +75%"); Bite Sleeves ("pet ability power +100%"); Conjured Painguards ("Character ability power +100%"); Conjured Painguards ("pet ability power +150%"); Servants Overclocking ("Idle bonus +200%"); Ethereal Veil ("Incantation Efficiency +50.00%"); Morbid Loop ("Profits +100%"); Morbid Loop ("Idle bonus +100%"); Morbid Loop ("character ability power +50%"); The Bond ("Character Ability Power +200%"); Blessed Armor Scales ("Alchemy Desk +2000%"); Blessed Armor Scales ("The Nexus profit +2000%"); Necrotic Powerstone ("Void Mana profits +300%"); Necrotic Powerstone ("idle bonus +100%"); Necrotic Powerstone ("Mana Gem profit +300%").
- "(base)" is read as an addition to the stat's base value; the older Fandom item data words the same bonuses "(additive)". Affects: Circlet Of Deep Thoughts ("Mysteries power (base) +20%"); Ethereal Veil ("Mysteries Power (base) +25.00%").
- Only phylacteries use it (the guides say level requirement reduction raises their power); spell, class and pet level requirements are not modelled. Affects: Bite Sleeves ("level requirement reduction +3").
- The formula value is read as a fraction applied as ×(1 + value), like the Expedition Level items whose text spells out "(N% per Expedition Level)". Affects: Murmuring Spellbook ("Idle bonus +1 * (Spells + 1)^(0.26), based on spell casts in this Exile").
- Percentage item bonuses are read as multipliers ×(1 + N%) (edust bonuses are "multiplicative unless stated otherwise", Enchantments page). "Scales multiplicatively from Character level" is read as raising the per-level factor to the power of the character level plus level requirement reduction. The guides' character-experience scalings (Oni 0.39, Shaman 0.88, Temporalist 1.34) are only reached this way; a linear reading would make phylacteries nearly insensitive to levels. Affects: Inert Jade Phylactery ("Idle bonus +2.30%").
- A "decreases X +N%" clause is read as a factor ×(1 − N%). "Scales multiplicatively from Character level" is read as raising the per-level factor to the power of the character level plus level requirement reduction. The guides' character-experience scalings (Oni 0.39, Shaman 0.88, Temporalist 1.34) are only reached this way; a linear reading would make phylacteries nearly insensitive to levels. Affects: Inert Jade Phylactery ("decreases Autoclick profit +0.66%").
- Ignored (mechanic): Adds pet played time over the run; pet time is an input. Affects: Heart of the Grave ("Augments Plague Zombie with an effect that increases Pet's Played time whenever a certain amount of Plague Zombie charges is spent").
- Read as multipliers, like other percentage item bonuses. Affects: The Bond ("Pet Ability Power for tier 1 +900%, for tier 2 +200%").
- Not modelled (Compressed Time (maximum L × 5)): Compressed Time isn't modelled.
- Not modelled (Time Distortion speeds up game time (not spell durations or weapon charging)): Time over the run isn't modelled; times are inputs.
- Not modelled (CompressedTime = CharLvl × 0.2 + 100): Compressed Time isn't modelled.
- Not modelled (Resets Character Experience, Mana, Void Mana, and various Exile statistics): Resets over the run aren't modelled; the affected totals are inputs.

