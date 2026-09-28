# Chronomancer blind check 2 ("In Over Your Head"): comparison with the guide's gear

Part 2 of the second Chronomancer blind check. The blind result ([`tool-result.md`](tool-result.md), headline run `burst`, committed in `ee64799` before the guide's gear was read) is compared with the Burst Set of the Fandom [In Over Your Head Chronomancer Guide](https://idle-wizard.fandom.com/wiki/In_Over_Your_Head_Chronomancer_Guide) (revid 16563, `data-raw/fandom/In Over Your Head Chronomancer Guide.wikitext`). The blind files (`guide-setup.md`, `tool-result*.md/json`, `cli/`) are unchanged.

## Summary

- **Headline blind match (run `burst` as recorded, enchant 20): 2/18 slots (11%)**: Research (Daemonics Reverse-Engineering) and one Finger (Resonator Ring). **Without the three exposed slots (Neck, Legs, Offhand): 2/15 (13%).** The Weapon (not counted, fixed by the setup) is The Accumulator in both, which confirms that part-1 inference. No blind variant does better at enchant 20 (1–3/18). At enchant 0, where the blind tool picked the Conjurer's Chains pieces, it matched 6/18.
- **Main cause, class (a) missing data:** the blind run had to stand in Simulacrum (PAP^1) for the unencoded **Temporal Paradox**. The guide's Burst Set is built around that pet: 16 of its 18 compared items add pet ability power (PAP), and two add pet ability charging speed (Whiplash, Collar Of Obedience). The pet's mana yield is 100 × Mana/s × PAP² × (1 + (L − 1)⁴/100) per activation, and charging speed shortens the time between activations.
- **Fixes (with wiki evidence and tests):** `140bd65` encodes Temporal Paradox (its mana yield and a new `production-with-pet` score), and makes Ritual Of Potency a spell granted by The Accumulator that only counts while the item is equipped (placeholder of 1e5 casts for Chronomancer). `9104e28` adds the Quasi-Realms page to the wiki snapshot. Time Fork needed no code: Time Helix with 1.5× casts is the same formula.
- **Secondary, non-blind rerun (`secondary/paradox`: the encoded pet, the guide's full burst bar, every weapon owned, all other part-1 setup unchanged), enchant 20: 16/18 slots (89%), and 13/15 (87%) without the exposed slots.** The Accumulator is now picked because of Ritual Of Potency (×1.6e9). The two differing slots are Shoulder and Wrist, which change together (see below).
- **Open differences:** Shoulder (Conjured Razorspaulders vs Falconer's Leather Wrappings) and Wrist (Bite Sleeves vs Conjured Sawrings), class (b), attribute assumption. With Empathy assigned at the cap of 250, Bite Sleeves' +75 Empathy is lost to the attribute cap. With Empathy 175 assigned, so that Bite Sleeves brings it to the cap, the rerun matches **18/18 from enchant 11 to 24**. It then switches to Wrappings at enchant 25, and wiki.gg's successor guide independently says "At enchant 24+5 Falconer's Leather Wrappings beats Conjured Razorspaulders". Temporal Paradox's tier isn't on the wiki (class (c)): tier 1 would make The Bond compete with Whiplash. The Incantation scaling is 4.10 vs the guide's 7.39 (class (b)): the guide's figure is a whole-run value.
- **Regressions:** none. The golden diagnostics (Oni, Shaman, Temporalist; `golden-diagnose.mjs --brief`) are byte-identical before and after. The first check's headline rerun and this check's blind-flag rerun (`secondary/rerun-burst`) reproduce their blind results exactly. `npm test` (221 tests), `npm run build` and `npm run lint` pass.

### Addendum (2026-09-28): attribute cap corrected

A player's in-game Oni test showed that item attribute bonuses keep counting above the attribute cap (Bite Sleeves outperformed the suggested wrist item at 205 Empathy assigned plus Commissar's Torn Sleeve). The model now caps only assigned points ([golden report](../golden-report.md), fix 6). That settles the Shoulder/Wrist difference above as a **tool bug (a)**, not an assumption. All `secondary/` runs were rerun with the corrected code; the blind files are unchanged.

- **`secondary/paradox`, enchant 20: 17/18 (94%); 14/15 (93%) without the exposed slots.** Shoulder (Conjured Razorspaulders) and Wrist (Bite Sleeves) now match the guide at Empathy 250, with no attribute change needed. Per level: 18/18 at enchant 21–24, 17/18 from 11 to 20 and from 25 up.
- **New difference, Waist: Collar Of Obedience (guide) vs Encircling Trophies (tool).** A tie: swapping Encircling Trophies into the guide's preset changes it by ×1.01. Encircling Trophies' Patience +50 now counts above the cap. Class (c), unclear: it depends on how much Collar's pet charging speed shortens Temporal Paradox's activations (read as the pet charging speed, unverified).
- `paradox-literal-attrs`, `paradox-no-legion` and `paradox-empathy-175` are all 17/18 at enchant 20 with the same Waist difference. `rerun-burst` (the blind flags with Simulacrum) moves from 2/18 to 3/18.
- The first Chronomancer check's secondary runs pick the same items as before.

## The guide's gear

- **Presets:** every phase has an `ItemPreset` with **19 ids and no Accessory**. No preset has an enchant label ("N+5"), so the pre-declared fallback **enchant 20** is used. Legion and Resonator can't be read from a label either. The Resonator Ring is in the Burst Set, so the Int ≥ 150 requirement is met, as part 1 assumed. Decoded with `presetItems` (Module:Data/Items `IDs`); every id resolves to an item of the matching slot type. All presets are listed in the appendix.
- **Why the Accessory is missing:** wiki.gg's successor guide (revid 30817, context only, in `validation/chronomancer/context/`) has the same Burst list plus an Accessory, id 506 (Falconer's Treats). That suggests the Fandom template simply had no Accessory slot. The Accessory isn't counted. The secondary rerun also picks Falconer's Treats.
- **The "Kilt/Amp/Torc" exposure:** the sentence part 1 read by mistake is the Attributes note "SPC provides very little - Need 250 for Kilt in snap, next is 150 for Amp & Torc in Amp…". Spellweaving Kilt, The Amplifier and Torc Of Privilege are in the **Snap** sets only. None is in the Burst Set, and the blind headline missed the Neck, Legs and Offhand slots anyway. The rate is reported both with and without those slots.
- **Other guide text:** the Items section is empty. The phase subsections only have "Goal" boxes and one note on the stacking set ("enough PaP to cast TF + WH at max casts"). No item-level reasoning is given for the Burst Set.

Reproduce: `node scripts/validation/chronomancer-ioyh-compare.mjs [--file run.json] [--level 20] [--sweep] [--gains]` (the slot table, rates, per-level rates, per-item contributions, swap gains and scalings at the guide preset under the run's model). Secondary runs: `scripts/validation/chronomancer-ioyh-secondary-runs.sh` (writes `secondary/*.json` and `secondary/cli/*.txt`).

## Primary: blind headline `burst` at enchant 20 vs the guide's Burst Set

| Slot | Guide Burst Set | Blind tool (`burst`) | Match | Class | Reason |
|---|---|---|---|---|---|
| Head | Conjured Ragecrown | Circlet Of Deep Thoughts | ✗ | a | PAP item (+100% PAP, set bonuses +150%/+250% PAP); under PAP^1 the Raiments set won. |
| Chest | Conjured Thornmail | Seclusion Shell | ✗ | a | Same (Conjurer's Chains). |
| Hands | Conjured Claws | Talented Gloves | ✗ | a | Same. |
| Feet | Conjured Spiked Stompers | Boots Of Concentration | ✗ | a | Same. |
| Shoulder | Conjured Razorspaulders | Tranquil Spaulders | ✗ | a | Same. After the fix it's the open Shoulder/Wrist pair below. |
| Neck (exposed) | Hollow Eye Pendant | Lucky Amulet | ✗ | a | +100% PAP, PAP enchant. |
| Waist | Collar Of Obedience | Colourful Belt | ✗ | a | Pet charging speed ×(1 + 0.2·log10(CAP + 1)): Temporal Paradox's activation rate. |
| Wrist | Bite Sleeves | Focusing Bracers | ✗ | a | PAP item. After the fix it's the open Shoulder/Wrist pair below. |
| Back | Falconer's Warm Cape | Fancy Cape | ✗ | a | +150% PAP, PAP enchant. |
| Legs (exposed) | Falconer's Bottoms | Mesmerizing Pants | ✗ | a | +200% PAP, PAP enchant. |
| Offhand (exposed) | Ceaseless Hunger | Murmuring Spellbook | ✗ | a | PAP × (1 + (Void entities + 1)^0.3), PAP enchant. |
| Research | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | ✓ | | |
| Accessory | (no slot in the preset) | Bag Of Tricks | not counted | | |
| Mount | Warp Basilisk | The Rubedo Engine | ✗ | a | Its value is its PAP enchant (+8%/level), squared by the pet. |
| Phylactery | Smooth Amber Phylactery | Robust Tangerine Phylactery | ✗ | a | PAP ×1.015^(character level + reduction). |
| Weapon | The Accumulator | The Accumulator | not counted | | Confirms part 1's inference (Ritual Of Potency on the burst bar). |
| Finger ×2 | Resonator Ring + Whiplash | Resonator Ring + Spell Helix | 1/2 | a | Whiplash: +100% PAP and pet charging speed +300%. |
| Trophy ×2 | Charged Fin-Wing + Pheromone Gland | Beholding Eye + Blessed Armor Scales | 0/2 | a | +500% / +300% PAP, PAP enchants. |

**2/18 (11%); without Neck/Legs/Offhand 2/15 (13%).** Under the blind model the tool's set was ×1.1e14 better than the guide's preset (with the successor's Accessory added), so the stand-in model didn't just rank the guide's items a little lower: it valued them completely differently. The blind scalings (PAP 1.00 vs the guide's ^2) already pointed at this, and part 1 named the pet stand-in "the largest single assumption".

Blind variants at enchant 20: `burst-chimaera` 2/18, `burst-risen-giant` 1/18, `burst-weapon-free` 2/18 (Thunderbird), `burst-no-legion` 2/18, `burst-literal-attrs` 3/18 (adds Charged Fin-Wing), `burst-gems-mixed` 2/18. Sweep of `burst`: 6/18 at enchant 0 (the Conjured Ragecrown/Thornmail/Stompers/Razorspaulders, Warp Basilisk and Daemonics picks), 2/18 at every level from 1 to 55.

## Fixes (class (a))

1. **Temporal Paradox** (`140bd65`, [Temporal Paradox](https://idlewizard.wiki.gg/wiki/Temporal_Paradox)).
   - Mana yield per second = 100 × Prod.Total × PAP² × (1 + max(L − 1, 0)⁴/100) × pet charging speed. The page says the ability "activates once per second. Can be reduced by Whiplash, Collar Of Obedience and empathy perks", which are exactly the pet charging speed sources (Whiplash "pet ability charging speed +300%", Collar Of Obedience, Empathy perks at 75/125/225). Reading activations per second as the charging speed is flagged unverified, and so is M = production without the pet's own yield.
   - New score **`production-with-pet`** = Prod.Total + the pet's yield. It exists only for a pet with a mana yield. It is the analogue of part 1's choice 1 ("burst mana ∝ production × PAP²").
   - The Compressed Time bonus, the experience rule (a level per Time Fork cast) and the Quasi-Realm's PAP-by-level rule are listed as unmodelled. The [Quasi-Realms](https://idlewizard.wiki.gg/wiki/Quasi-Realms) page (snapshot `9104e28`) says "Pet Ability Power increased, based on pet level" with no formula, so PAP stays an input. It's hidden (it scales every set equally) and keeps part 1's 1.15^200.
   - **Tier:** not on the page and in no "Tier N Pets" category; encoded as 3 and flagged unverified (see class (c)).
   - Chronomancer's paired pets now include Temporal Paradox.
2. **Ritual Of Potency (111) granted by The Accumulator** (`140bd65`, [The Accumulator](https://idlewizard.wiki.gg/wiki/The_Accumulator), Module:Data/Spells).
   - The item "Adds the Ritual of Potency spell to your spellbook", so spell 111 (no class in the spell data) can go on any class's bar (`ITEM_GRANTED_SPELLS`).
   - Its Math, Profit = (RealCastsThisExile + 1)^0.8 × Inc × 0.5 + 1, only applies while The Accumulator is equipped (`Weapon.RitualOfPotencyGranted`, the item's modelled effect; its activation that adds casts stays unmodelled).
   - This replaces part 1's workaround of marking every other Weapon not owned: the optimizer now values The Accumulator through the spell. "RealCastsThisExile" is read as the cast count input, flagged unverified.
   - Chronomancer placeholder: 1e5 casts, like Superposition and Ritual Of Power. At 0 casts the factor is only 0.5 × Inc, and Cataclysm's +25% PAP enchant (squared by the pet) overtook The Accumulator from enchant 24. Relevance shows this input (at 0 it moved gaps by ×6.3e4 across 0–1e6; at 1e5 by ×5.8e8 across 0.1–1e11, since very low counts hand the Weapon slot to Cataclysm). With 1e5 The Accumulator is picked at every level.
3. **Time Fork (208):** not encoded. Its Math is Time Helix's with 1.5× casts, and Time Helix (always on for Chronomancer) with 300 casts = Time Fork with 200 casts (part 1's choice 6). The Quasi-Realms page confirms that Time Fork replaces Time Helix in this realm.

Tests (`src/data/buildModel.test.ts`, 5 new):
- the yield formula at PAP 3, level 11 with Whiplash (charging speed 4);
- PAP elasticity 2 and charging-speed elasticity 1;
- Whiplash worth exactly ×16 (PAP² ×4 × charging ×4);
- Ritual Of Potency counts only with The Accumulator (Cataclysm gives nothing) and is worth exactly (C + 1)^0.8 × Inc × 0.5 + 1;
- 111 is allowed on any class's bar but 208 is still rejected;
- the pet-yield score exists only with Temporal Paradox, and the pet's tier is flagged unverified.

The coverage report counts The Accumulator's spellbook clause as modelled (405 modelled clauses).

## Secondary (non-blind) rerun

`secondary/paradox` uses the part-1 setup with only the encoded model changes: pet `temporal-paradox`, the guide's full bar 69,4,73,**111**,17,60 (StF and GR snapped), score `production-with-pet`, **every Weapon owned**, Legion on, the same attributes, expedition level, pet level, PAP and Time Helix casts; `--thorough`, enchant 0–55, every level complete.

| Slot | Guide Burst Set | Secondary (`paradox`, enchant 20) | Contribution | Match |
|---|---|---|---|---|
| Head | Conjured Ragecrown | Conjured Ragecrown | ×108000 | ✓ |
| Chest | Conjured Thornmail | Conjured Thornmail | ×108000 | ✓ |
| Hands | Conjured Claws | Conjured Claws | ×135000 | ✓ |
| Feet | Conjured Spiked Stompers | Conjured Spiked Stompers | ×71900 | ✓ |
| Shoulder | Conjured Razorspaulders | Falconer's Leather Wrappings | ×4470 | ✗ (b) |
| Neck (exposed) | Hollow Eye Pendant | Hollow Eye Pendant | ×36400 | ✓ |
| Waist | Collar Of Obedience | Collar Of Obedience | ×462 | ✓ |
| Wrist | Bite Sleeves | Conjured Sawrings | ×168000 | ✗ (b) |
| Back | Falconer's Warm Cape | Falconer's Warm Cape | ×10200 | ✓ |
| Legs (exposed) | Falconer's Bottoms | Falconer's Bottoms | ×14600 | ✓ |
| Offhand (exposed) | Ceaseless Hunger | Ceaseless Hunger | ×36400 | ✓ |
| Research | Daemonics Reverse-Engineering | Daemonics Reverse-Engineering | ×910000 | ✓ |
| Accessory | (no slot; successor: Falconer's Treats) | Falconer's Treats | ×6500 | not counted |
| Mount | Warp Basilisk | Warp Basilisk | ×46.9 | ✓ |
| Phylactery | Smooth Amber Phylactery | Smooth Amber Phylactery | ×49500 | ✓ |
| Weapon | The Accumulator | The Accumulator | ×1.62e9 | not counted (same) |
| Finger ×2 | Resonator Ring + Whiplash | Resonator Ring + Whiplash | ×2.31e9, ×146000 | 2/2 |
| Trophy ×2 | Charged Fin-Wing + Pheromone Gland | Charged Fin-Wing + Pheromone Gland | ×919000, ×17300 | 2/2 |

**16/18 (89%); without Neck/Legs/Offhand 13/15 (87%).** Under this model, the tool's set is ×2.17 better than the guide's preset with the successor's Accessory added (×1.4e4 better than the Accessory-less preset). The swaps are coupled: swapping Sawrings alone into the guide preset is worth ×1.01, and Wrappings alone ×0.52.

The run changes set at enchant 0, 1, 2, 9, 11, 15, 19 and 37; the matched items per level (all slots / without exposed slots) are:
- 8/8 at enchant 0; 11/11 at 1; 14/12 at 2–8;
- 16/14 at 9–10; 17/14 at 11–14;
- 15/12 at 15–18 (Colourful Belt replaces the Collar);
- 16/13 at 19–36; 17/14 at 37–55 (Bite Sleeves comes back).

Other secondary runs (enchant 20):

| Run | Change | Match (all / without exposed) | Note |
|---|---|---|---|
| `rerun-burst` | the blind `burst` flags with the new code | 2/18 / 2/15 | identical to the blind result at every level (111 isn't on its bar) |
| `paradox-literal-attrs` | Spellcraft/Wisdom 240, Dominance/Versatility 0 | 16/18 / 13/15 | the same sets as `paradox` at every level |
| `paradox-no-legion` | Legion off | 16/18 / 13/15 | the change levels from 2 onwards shift up by one |
| `paradox-empathy-175` | Empathy assigned 175 | **18/18 / 15/15** | 18/18 at enchant 11–24; from 25, Wrappings replaces Razorspaulders (17/18) |

## Classification of the secondary rerun's open differences

- **Shoulder: Conjured Razorspaulders (guide) vs Falconer's Leather Wrappings (tool), and Wrist: Bite Sleeves (guide) vs Conjured Sawrings (tool). Class (b), different assumption (attribute allocation).**
  - These two go together: the tool moves the fifth Conjurer's Chains piece (set bonus +250% PAP) from Shoulder to Wrist, freeing the Shoulder for a fourth Falconer's Trust piece. With the successor's Accessory the gap is ×2.17.
  - Bite Sleeves' "+75 Empathy" is worthless when Empathy is assigned at the cap of 250, because item attribute bonuses stop at the cap (assumption 12, unverified).
  - The guide says "Fill for items" and "Rest fully cap before Vers". If "cap" means the effective value including items, then with Bite Sleeves worn the player assigns 175. Under that reading the tool picks exactly the guide's Burst Set from enchant 11 to 24.
  - The tool's switch from Razorspaulders to Wrappings at enchant 25 matches the successor guide's "At enchant 24+5 Falconer's Leather Wrappings beats Conjured Razorspaulders" to within a level. The successor note wasn't used to pick 175, so this is an independent check.
  - Caveat: 175 was chosen after seeing that the guide wears Bite Sleeves, so `paradox-empathy-175` is a sensitivity check, not a result. What would settle it: the guide author's assigned Empathy, or wiki confirmation of whether item attribute bonuses can exceed the attribute cap.
- **Temporal Paradox's tier. Class (c), unclear.** The wiki gives none. As tier 1, The Bond's "+900% PAP for tier 1" (×100 under PAP², enchant +15% PAP) would beat Whiplash (×16, +20% PAP enchant) at enchant 20 by about ×2 on hand estimates. As tier 2 (+200%) or 3, Whiplash wins. The guide's Whiplash pick is consistent with tier 2 or 3. What would settle it: the pet's tier in the game data or on the wiki.
- **Incantation scaling 4.10 (ours, at the guide preset) vs the guide's 7.39. Class (b), different definition.** The fix raised ours from 3.09 by adding Ritual Of Potency's Incantation^1 factor. The guide's table is "Overall Scaling to Profits", and its Inc 7.39 and Evo 0.016 equal the Temporalist Guide's source-meme table (Inc 7.390, Evo 1.016). That guide splits its Incantation into burst ≈ 4, snaps 2.12 and Void mana ≈ 1.2 (see `src/data/golden.ts`), and 4.10 + 2.12 + 1.2 ≈ 7.42. Ours is the burst alone. The other scalings match: PAP 2.000 (guide ^2), CAP 1.017, Idle/Profit/Void profit 1 (guide 1). Evo is 0 (no Evocation on the burst bar; guide 0.016). VpE isn't in the burst score (guide 1, from the Void mana phase).
- **Accessory:** not compared (the Fandom presets have no Accessory). The tool picks Falconer's Treats, which is also the successor guide's Accessory (context only).
- **PAP base:** the successor says PAP = 1.17^pet level, while the Fandom guide says 1.15^pet level. It's hidden (it scales every set equally), so it isn't chased.

## Other guide sets (qualitative; no matching score)

- **Snap sets** (Power Armor, The Eastern Tale, Spellweaving Kilt, Torc Of Privilege, Incantations Restructuring, Anima Core, Heart of the Storm, plus Stabilizing Pauldrons and Timeshroud in Snap 1 or The Amplifier and Artificer's Shoulderpads in Snap 2): Incantation and maximum Time Distortion gear, as their "Goal" boxes say. The tool has no snap-phase score (the known scope limit of one set per score). Snap sets reach the burst only through the snapped inputs.
- **Void Mana set** (Nether's Embrace ×7, Nethershackles, Pitch-black Cage, Void Sampling, Insidious Lure, Anomalous Essence, Chaos Mantle, Legacy, Devious Violet Phylactery): Void mana per Entity gear, the same pattern as the first check's `preburst-void` run.
- **Spell stacking, pet levelling and skipped-time sets:** pet ability power and Time-traveler Gear (Compressed Time, Time Distortion) with pet experience items. No build-phase score exists.

## Appendix: decoded presets (Fandom revid 16563; 19 ids each, no Accessory, no enchant labels)

| Preset | Items |
|---|---|
| Stack (`#0`) | Conjured Ragecrown, Stabilizing Pauldrons, Conjured Thornmail, The Clockcarers, Conjured Spiked Stompers, Hollow Eye Pendant, Chronoboost Ring, Resonator Ring, Architectural Databelt, Timeshroud, Bite Sleeves, The Accumulator, Ceaseless Hunger, Daemonics Reverse-Engineering, Charged Fin-Wing, Pheromone Gland, Temporal Scabbard, Ritual Disk, Smooth Amber Phylactery |
| Pet lvl (`#1`) | as Stack but Searing Gaze, Frosty Ring (for Resonator Ring), Shadow-Scryer's Crystal Ball, Habitstone |
| Plvl 2 (`#8`) | Casque Of Learning, Falconer's Leather Wrappings, Seclusion Shell, The Clockcarers, The Great Journey, Hollow Eye Pendant, Chronoboost Ring, Frosty Ring, Endless Pouches, Concealing Shroud, Nomadic Wrists, Shadow-Scryer's Crystal Ball, Habitstone, Daemonics Reverse-Engineering, Charged Fin-Wing, Pheromone Gland, Temporal Scabbard, Broomstaff Of Klevdariah, Robust Tangerine Phylactery |
| Skip Time (`#2`) | The Artificer's Crown, Stabilizing Pauldrons, Empowering Chestguard, The Clockcarers, Boots Of Harsh Trials, Searing Gaze, Chronoboost Ring, Resonator Ring, Empowering Waistguard, Timeshroud, Precise Wristband, Temporal Stabilizer, Arcane Accelerator, Destabilized Evocations, Charged Fin-Wing, Arcane Engine, Folds of Magma, Zenith, The Champion's Steed, Eerie Turquoise Phylactery |
| VM (`#3`) | The Bright Beacon, Ebon Mantle, Nethershell, Netherfist, Legacy, Nether Chain, Resonator Ring, Netherloop, Sash of Luxury, Chaos Mantle, Nethershackles, The Accumulator, Pitch-black Cage, Void Sampling, Insidious Lure, Anomalous Essence, Nether Barrier, Ritual Disk, Devious Violet Phylactery |
| Snap (`#4`) | Empowering Headguard, Stabilizing Pauldrons, Empowering Chestguard, Empowering Handguards, Boots Of Eastern Blessings, Torc Of Privilege, Resonator Ring, Chronoboost Ring, Sash of Luxury, Timeshroud, Rich Bands, The Accumulator, Habitstone, Incantations Restructuring, Anima Core, Heart of the Storm, Spellweaving Kilt, Ritual Disk, Intricate Crimson Phylactery |
| Snap 2 (`#5`) | as Snap but Artificer's Shoulderpads (Shoulder) and The Amplifier (Back) |
| **Burst (`#6`)** | Conjured Ragecrown, Conjured Razorspaulders, Conjured Thornmail, Conjured Claws, Conjured Spiked Stompers, Hollow Eye Pendant, Resonator Ring, Whiplash, Collar Of Obedience, Falconer's Warm Cape, Bite Sleeves, The Accumulator, Ceaseless Hunger, Daemonics Reverse-Engineering, Charged Fin-Wing, Pheromone Gland, Falconer's Bottoms, Warp Basilisk, Smooth Amber Phylactery |
