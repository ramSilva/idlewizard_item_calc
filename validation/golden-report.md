# Golden report: Oni, Shaman and Temporalist guides

Plan todo `validate`. The golden tests are in `src/golden/golden.test.ts` (run with `npm test`); `node scripts/validation/golden-diagnose.mjs [--variant id] [--brief]` prints the numbers below, each preset item's contribution and the gain of swapping each of the optimizer's items into the preset. Guide cases, variants and the enchant-priority table live in `src/data/golden.ts`.

Setup for every case: the class's guide burst selection (`defaultSelection`), all non-Mythic items owned at maximum quality (Legendary, or Unique where that is the only quality), the preset's real enchant level N on every enchantable item, Resonator Ring (+4) and The Legion (+1) as in the "N+5" tab labels. The preset is scored the same way (`comparePreset`).

Classification (as in the blind check): **tool bug / missing data** (fixed), **different assumptions / outdated guide** (listed), **unclear** (with what would settle it).

## Match rates

Slots matched out of 20, and the model's ratio best / preset (below ×1 only when the preset breaks an item requirement at the model's attributes).

| Case | Before fixes | After fixes |
|---|---|---|
| Oni LS 13+5 | 10/20 (×1.4e5) | 14/20 (×3.3); variant Spellcraft 200: 15/20 (×9.1) |
| Oni LS 17+5 | 9/20 (×3.2e4) | 14/20 (×4.5); variant: 15/20 (×16) |
| Oni LS 39+5 | 10/20 (×0.99) | 17/20 (×0.38, preset breaks Spellweaving Kilt's requirement); variant: 18/20 (×4.5) |
| Shaman 20+5 | 14/20 (×5.1e4) | 16/20 (×7.7e3); variant maxed attributes: 19/20 (×3.0) |
| Shaman 28+5 | 15/20 (×790) | 17/20 (×96); variant: **20/20** (×1) |
| Temporalist 11+5 | 11/20 (×9.5e4) | 16/20 (×47) |
| Temporalist 15+5 | 13/20 (×3.9e4) | 18/20 (×17) |
| Temporalist 22+5 | 15/20 (×1.2e3) | 19/20 (×6.5) |
| Temporalist 34+5 | 12/20 (×5.4e3) | 16/20 (×28) |

Totals: before 109/180 (61%); after, class defaults 147/180 (82%); with the guide-attribute variants for Oni and Shaman 156/180 (87%).

Variants (`GUIDE_VARIANTS`): the class defaults use each guide's starting attribute table, but the presets were evidently computed further along it.
- `oni-spellcraft`: Spellcraft 200, the first step of the Oni guide's "2 Perk" priority column ("200 (250) Spellcraft"). The LS presets need 250 Spellcraft for Spellweaving Kilt; the "Minimum" table (125) plus Commissar's Torn Sleeve (+60 at pet level 750) and Spell Vault (+20) gives 205.
- `shaman-maxed`: Dominance, Empathy and Patience 250 and Mastery 200 (250 with Rugged Wristcoat). The Shaman burst note says "Before maxing out their respective attributes, Voidstrike Seal, Encircling Trophies and Bite Sleeves are the best in their slots"; the presets use none of them.

## Fixes (each from wiki or guide evidence; no constant was tuned to force a match)

1. **Phylactery level and level requirement reduction** (tool bug, partly). "Scales multiplicatively from Character level" stays (1 + x)^level: the guides' character-experience scalings (Oni 0.39, Shaman 0.88, Temporalist 1.34; Shaman: "~^0.4 because of Eerie Turquoise Phylactery") are only reachable with per-level compounding, and the Prodigy guide quotes "the scaling of levels for phylacteries (^0.484)". The exponent is now `Char.PhylacteryLevel` = character level + level requirement reduction: the Shaman guide says "level reduction also counts for this purpose", and the Oni, Oracle Apprentice, Demiurge Shaman and Tempest Oni guides boost phylacteries with Ley Keeper's level reduction. "Level requirement reduction +N" / "reduces level requirements +N" (Bite Sleeves, The Great Journey, Falconer's Leather Wrappings, Nomadic Wrists) and the Intelligence 75 / Mastery 125 perks now add to `Char.LevelRequirementReduction` (input for other sources, default 0). Still `verified: false`.
2. **Character level magnitude** (placeholder revisited). Defaults were 1000 (Oni, Shaman, Chronomancer) and 2000 (Temporalist), which made phylacteries ×1e10–×1e26. The Basic Mechanics Wizard XP table (each level 1.09× the previous; level 300 = 2.58e15 XP) and Legacy's level milestones (110 to 300) put late-game levels in the low hundreds: now 200 (Oni, Shaman, Chronomancer) and 250 (Temporalist), with Temporalist's total XP set to the table's value for level 250 (3.48e13). Inferred, unverified.
3. **Conjured Razorspaulders "Pet ability power +100"** (tool bug). The Legendary text drops the "%": the lower tiers are +50%/+75% and Fandom's older Module:Data/Items says "Increases character and pet ability power by 100%". Now ×2 (verified); the flat-PAP reading is gone. It was in every class's best set (×8e3–×3.5e6).
4. **The Rubedo Engine and Ritual Disk** (tool bug). Their "counted twice for the purpose of Spells' cast count" is now read as doubling casts when they are made (cast counts are inputs as the game shows them), not a burst-time doubling. Evidence: Rubedo's page says it "doesn't affect external casts"; the guides wear Disk/Rubedo while stacking; Oni bursts with Ritual Disk and Temporalist with Rubedo, each exactly the one with the stronger enchant for that class (Oni 1.02^(22·7) vs 1.125^22; Temporalist 1.125^20 vs 1.02^(20·4)); and the Temporalist enchant table values Ritual Disk at 4.29% = 1.02^2.12, i.e. only in the snap sets.
5. **Formula attribute bonuses count toward requirements** (tool bug). Commissar's Torn Sleeve's "+0.08 × pet level" to all attributes was ignored by the requirement check (only flat bonuses counted), so Sash of Luxury and The Amplifier failed Oni's Spellcraft requirement. The optimizer and `comparePreset` now evaluate item-independent formula bonuses (`itemIndependentValue`). The Oni pet level default also moved from 600 to 750: the prior note wanted "2 perks (50–74 points)", but 0.08 × 600 = 48 is 1 perk; 2 perks need pet levels 625–925.
6. **Attribute cap on item bonuses** (missing mechanic, unverified). Per-point bonuses and perks now use min(points + item bonuses, `Misc.AttributeCap`), default 250 (Paragon 24). Evidence: the Shaman note quoted above; the Temporalist guide only needs "240 in those two" with Innate Aptitude's bonus; the Shaman e550 attributes are planned so each item bonus lands exactly on 250.
7. **Expedition level** (placeholder revisited). Every burst preset uses an item that only drops in a key-locked Expedition location (Oni: Anointed Ashes, Secret Altar; Shaman: Warbanner Fragment, Cathedral; Temporalist: Necrotic Powerstone, Eye of Chaos), and those need expedition level 100, the maximum (Expeditions page). Default 50 → 100 for Oni, Shaman and Temporalist. This flips Binding Sigil over Beholding Eye (Shaman) and Anima Core over Anointed Ashes (Temporalist) as the guides have them.
8. **Temporalist production share** (assumption changed, unverified). Mana Gems now hold the burst's production (Mana Gems share 1, Ley Temporal Singletons 0). Gem Resonance did nothing at share 0 although the guide snaps it for the burst; the guide's burst carries Mana Gems profit items (Gemshoes, Necrotic Powerstone) and no Nexus-profit item (Blessed Armor Scales, +2000% Nexus, is never used); and it swaps Fiery Grips for The Clockcarers between 15+5 and 22+5, which the model now reproduces at 16+5 but only if Clockcarers' "Nexi profit +250%" doesn't count. Chronomancer's shares are unchanged (listed for the blind check).
9. **"(base)" = additive** (evidence added, still unverified). Fandom's older data words every "(base)" bonus "(additive)" (e.g. Circlet: "Increases Mysteries power by 20% (additive)"), and marks only those, which also supports reading unmarked percentages as multipliers. The reading of Mysteries-power items is unchanged; the golden matches (Raiments pieces in the Temporalist presets) are consistent with it.

## Enchant priority check (Temporalist, per-level profit gain)

Score ratio for one extra enchant level of each item inside a burst preset (22+5 unless noted), against the guide's "exact profit bonus per enchant". Tolerance 2% of ln(ratio) for burst-only items.

| Item | Ours | Guide | Result |
|---|---|---|---|
| The Clockcarers, Chronoboost Ring | 30.00% | 30% | match |
| Tranquil Spaulders, Circlet Of Deep Thoughts, Seclusion Shell, Boots Of Concentration | 25.00% | 25% | match |
| Bite Sleeves, Destabilized Evocations, Folds of Magma, Flaming Cape, Murmuring Spellbook, Necrotic Powerstone, Gemshoes (15+5), Fiery Grips (15+5) | 20.00% | 20% | match |
| Collar Of Obedience, Miniaturized Accelerator (CAP enchants) | 20.28% | 20% | match (CAP scales 1.013) |
| The Rubedo Engine | 12.50% | 12.5% | match |
| Robust Tangerine Phylactery | 10.00% | 10% | match |
| Reality Prism | 21.63% | 42.92% | burst part only: the guide's 1.05^7.32 = burst 4 + snap sets 2.12 + Void mana set 1.2; the model scores the burst only |
| The Amplifier (34+5) | 21.62% | 28.38% | burst part only: 1.05^5.12 = burst 4 + Gem Resonance snap 1.12 |
| Anima Core | 17.04% | 8.67% | guide inconsistency: listed at the snap-only rate 1.04^2.12 although it is in every burst preset (burst part 1.04^4) |

18 of 21 match exactly; the other three are explained by phases the burst score doesn't model or by the guide table.

Lucky Amulet vs Miniaturized Accelerator (guide: they tie at 1.4e8 × (1.25/1.2)^(Ench·10/3) catalysts, 1.6e8 at enchant 1 and 3.2e10 at 40): ours 4.3e7 and 6.6e9. Same slope within 0.2 decades, offset ×3.7–4.8 in catalysts, i.e. ×1.5 in the items' score ratio. **Unclear**: Lucky's burst value (profits ×2, idle ×2, Incantation 1.25^4) is ×1.5 short of what the guide's constant implies; settle with the guide author's inputs or an in-game swap.

## Scaling checks (d ln score / d ln stat at the preset)

Stat scalings are unchanged by the fixes (they're pinned in `src/data/buildModel.test.ts`): Oni LS 17+5 Evo 1.00 / Inc 6.08 / CAP 1.18 / PAP 1.35 (guide 1.04 / 7.14 / 1.55 / 2.06); Shaman 20+5 Inc 0.92 / Summon 7.73 / CAP 1.99 / PAP 1.26 (1.44 with maxed attributes) / Idle 2.65 (guide 0.92 / 7.76 / 2.00 / 1.68 / 2.62); Temporalist 15+5 Evo 1.00 / Inc 4.01 / CAP 1.01 / PAP 1.00 / Idle 1.00 (guide 1 / 4 / 1 / 1 / 1).

New character-experience check (`experienceElasticity`: per-level score change / ln 1.09, plus Temporalist's direct use of total XP): Oni 0.63 (guide 0.39), Shaman 1.11 (0.88), Temporalist 1.48 (1.34); tolerance 0.3/0.3/0.2. Without the phylactery the Shaman value drops below 0.6, so the compounding reading carries the level-independent part. **Unclear**: our excess comes from level-proportional terms (hero abilities, Mastery 150/250 perks, Berserk) that shrink as 1/level; the guides' values would imply levels of roughly 400–700 under this model, above what the XP table and Legacy milestones suggest. Settle with real late-game character levels.

Snap check: Stabilize The Flow's snapped Incantation scales ~1, as the guide's snap-only items imply. Gem Resonance's snapped Incantation scales ~0.01 in the model (its Math gives temporary gems ∝ log10(Incantation)) against ~1.12 implied by Artificer's Shoulderpads (a Gem-Snap-only item listed at 1.04^1.12). **Unclear**; it can't change the burst ranking (snapped inputs are constant across burst sets). Settle with Gem Resonance's in-game formula or gem-count upgrades.

## Remaining differences

### Oni
- **Spellweaving Kilt** (defaults only): needs 250 Spellcraft, the model has 205. Different assumptions: the preset is computed with more Spellcraft than the guide's Minimum table; the variant fixes it.
- **Raiments + Eastern Tale vs Power Armor** (Seclusion Shell, Circlet Of Deep Thoughts, Boots Of Eastern Blessings, Spell Vault, The Amplifier at 13+5 → Empowering Chestguard/Managuard, Conjured Ragecrown, The Great Journey, Flaming Cape/Folds of Magma). Unclear. Two open mechanics decide it: (a) The Eastern Tale's tiers and several of these items give "Accumulated spells' starting casts", inert in the burst score because cast counts are inputs; with Oni's placeholder 1e7 casts per accumulated spell they'd add nothing, with ~1e4 casts they'd roughly double them; (b) Commissar's +60 puts Intelligence over the cap, so Circlet's Int +20 is worth nothing under fix 6. Settle: the accumulated cast counts at an Oni burst and whether starting casts apply while worn.
- **Incantations Restructuring vs Daemonics Reverse-Engineering** (PAP +900%). Unclear: the guide's own scaling table (Inc 7.14, PAP 2.06) would favour Daemonics even more (×30), so the preset was probably made with other inputs or is outdated.

### Shaman
- **Morbid Loop, Rugged Wristcoat, Chemical Toolbelt** (defaults only, → Voidstrike Seal, Bite Sleeves, Encircling Trophies): different assumptions, per the guide's own note; the maxed variant matches.
- **Falconer's Warm Cape vs The Magnifier at 20+5** (maxed variant, ×3.0): the guide switches to The Magnifier at 28+5, the model already at 20+5. Unclear: a close enchant crossover; with the guide's PAP scaling (1.68 instead of our 1.44) Falconer's would win at 20+5 and lose at 28+5, as in the guide. Our PAP scaling is low because Herald of Rot's (P^x + 1) terms aren't saturated at the placeholder PAP base (raising the base to 1e5 only reaches 1.59).

### Temporalist
- **Murmuring Spellbook vs Arcane Accelerator** (all tabs, ×6.5). Different assumptions (placeholder magnitudes): Murmuring's (spells + 1)^0.26 beats Arcane's 0.15 × (catalysts + 1)^0.4 at the inferred 2e9 catalyst shards only above ~1.5e11 spells cast this Exile; the placeholder is 1e8. Temporalist casts Quasi-incantation "as MUCH as possible", so more is plausible. Settle with real spell counts.
- **Gemshoes (11+5, 15+5) and Conjured Ragecrown, Collar Of Obedience (11+5) vs Raiments pieces / Encircling Trophies**: the model moves to the 5-piece Raiments earlier (at 11+5) than the guide (22+5). Unclear: depends on the "(base)" Mysteries-power reading and the Mana Gems share.
- **34+5: Miniaturized Accelerator vs Lucky Amulet**: consistent with the ×4 catalyst offset above (at 2e9 catalysts and enchant 34 the model is just past the tie). Unclear, same settlement.
- **34+5: The Amplifier vs Flaming Cape**: The Amplifier's "Accumulated spells' starting casts +100%" is inert in the burst score (same open mechanic as Oni); by burst stats alone Flaming Cape is ×3.7 better. Unclear.
- **34+5: Destabilized Evocations vs Self-Reflection**: ×1.01, a tie.

## Data fetched in this step
`npm run scrape -- --only "Experience,Phylactery,Category:Phylactery"`: Experience redirects to Basic Mechanics (refreshed, one line added upstream), Phylactery redirects to Items, and Category:Phylactery has no text. Fandom's `Module:Data/Items` (revision of 2024-03-02) was read through the API for older item wording (not saved). Other guides (Prodigy, Oracle Apprentice, Demiurge Shaman, Defiance/Tempest Oni, Dread Heretic, Redemption Voidmancer) were only searched for phylactery wording.
