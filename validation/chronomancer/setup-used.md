# Chronomancer setup used by the tool (blind)

Encoded in `src/data/classes.ts` (`CHRONOMANCER`) from the filtered guide text in [`guide-setup.md`](guide-setup.md) and the wiki.gg [Chronomancer](https://idlewizard.wiki.gg/wiki/Chronomancer) class page. The guide's gear, items, enchants and BiS were not read; they are compared only in the later `chronomancer-blind-check` step.

## Which guide

The Fandom class page (https://idle-wizard.fandom.com/wiki/Chronomancer) has no setup sections (Description, Unlocking, Guides, Hero Ability, Spells, Upgrades). Its Guides section links one guide, "Chronomancer_Guide_Updated (Most up to date)", so the setup comes from https://idle-wizard.fandom.com/wiki/Chronomancer_Guide_Updated ("Updated for v1.35.0", range e90–e220+ Mysteries, credits: Tito).

## How the text was extracted

`npm run chronomancer-setup` (`scripts/validation/chronomancer-setup.mjs`) lists the page's sections, skips any heading about gear, items, BiS, equipment, enchants, sets, weapons, loadouts or slots (and everything under it), fetches each remaining section on its own (cut at its first subheading), strips item templates, `items*`/`itemtab*` parameters, images, item-page links, item tables and list lines, and sentences with gear words, then redacts every item and set name from `src/data/generated/items.json` to `[item]`. It aborts without writing if any full item name survives. Sections whose remaining prose is more than half item discussion keep only their spell-set/GuideBox setup fields. `--file` dry-runs the same filter on a local guide (checked on the wiki.gg Oni and Temporalist guides, where it recovered the known burst spells and no item names).

Sections (headings only):

| Section | Used |
|---|---|
| (introduction) | yes (41% of prose removed) |
| Attributes | yes (37% removed; the Patience line kept only its value) |
| Phase 1: Build up Levels | yes |
| Phase 2: Build up Superposition and Ritual of Power | yes |
| Phase 3: PreBurst | yes |
| High Level Snapshot Optimization | prose dropped (73% item discussion); its spell set kept |
| Phase 4: Bursting | yes |

No heading was excluded as a gear heading; the page has none. The item recommendations evidently live inside the phase sections and were stripped there.

## Guide-stated values used

| What | Value | Guide section |
|---|---|---|
| Burst spells | Singularity Beam (65), Superposition (17), Converge Timelines (73), Ritual Of Power (60), Gem Resonance (4), Stabilize The Flow (69) | Phase 4: Bursting |
| Burst pet | Risen Giant ("Risen Giant stacked with wormhole skipped time is so good, we won't be able to pet swap to Voidterror") | Phase 3: PreBurst |
| Stabilize The Flow snapped | cast at the end of the pre-burst, after Temporal Distortion stacking, then swap to the burst set | Phase 3: PreBurst |
| Idle mode | on (Risen Giant's idle scaling is why Patience is the best attribute) | Attributes |
| Attribute points | Intelligence 25, Insight 25, Wisdom 25, Patience 40, Mastery 25 | Attributes |
| Time Helix (augment, 101) | cast in phase 2's second spell set; applied until Exile | Phase 2 |
| Paired pets | Risen Giant, Archivist, Pixie (phase 1), Geode, Simulacrum, Zombie (intro list) | introduction, phases 1–2 |
| Mysteries | e90–e220+ → default 1e150 | introduction |
| Run length | 10 minutes – 10 hours → class time 10 h | introduction |

Other phase spell sets (not scored; kept for reference): Phase 1 Singularity Beam, Wormhole, Ritual Of Power, Synthetic Entity, Temporal Distortion (Careful), Spell Focus; Phase 2 the same with Superposition instead of Temporal Distortion, then with Time Helix instead of Synthetic Entity; Pre-burst Singularity Beam, Temporal Distortion, Void Lure, Void Radiance, Spell Focus, Stabilize the Flow (manual); High Level Snapshot the pre-burst set with Gem Resonance instead of Spell Focus.

## Assumed (not stated by the guide sections read)

- **Score:** `chronomancer-burst` = mana of one Singularity Beam cast, (L + 10) × Evo × Mana/s × 20. The burst bar casts it recklessly and it earns 1260+ seconds of production per cast, so it dominates plain production during the burst.
- **Gem Resonance not snapped by default.** Only the "High Level Snapshot Optimization" set (prose dropped) casts it in the pre-burst; pass `snapped: [69, 4]` to model that variant.
- **Stabilize The Flow stays on the burst bar (Reckless)**, but its snapped pre-burst cast is what's modelled; recasts during the burst with little Time Distortion are ignored.
- **Consumed Time Distortion 10x:** the class page's base maximum; items and an upgrade raise it to 30x, but the pre-burst set is unknown.
- **Spellcraft, Dominance and Empathy 0:** not listed (the notes say Spellcraft is good "after patience is maxed").
- **The Legion off**, no Resonator assumption: the guide's item tabs were stripped, so enchant bonus levels are left to the blind check's inputs.
- **Main building:** Temporal Anchors (building 8, replaces The Nexus) hold all production; Gem Resonance's Mana Gems then add nothing.
- **Hero ability units:** T (character play time) and S (skipped time) are both taken in hours, T = time played as this class this Exile. The term L² × C × ((T + S) × G)^0.64 × 0.25 is ≫ 1 at any realistic value, so the unit only rescales every set equally.
- **Time Helix** uses the current Incantation efficiency (the Math doesn't say it's fixed at cast).
- **Placeholders** (unverified, with notes in the code): character level 1000, Risen Giant level 300, CAP base 1e6, CAP growth 10, Evo/Inc efficiency bases 1e3, snapped Stabilize The Flow Incantation 1e3, skipped time 1 year and pet game time 1 year, Superposition and Ritual Of Power casts 1e5, Time Helix casts 100, spells cast 1e7, Temporal Anchors 3000, Void mana 1e10, idle bonus base 100, expedition level 50.

## Scalings the encoding implies (no items; tested)

The setup sections state no scalings, so there is no guide comparison here. With no items: Evo 1.000, Inc 3.107 (Ritual Of Power, Superposition, Converge Timelines via CAP, Time Helix's log term; 4.107 with Stabilize The Flow unsnapped), CAP 1.000, PAP 0.300 (Risen Giant's P^0.6 + 1 at PAP base 1), Idle 2.016 (idle factor + Risen Giant's ≈ I^1.0155).
