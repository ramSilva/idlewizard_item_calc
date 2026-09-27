# Chronomancer guide: setup sections only

Source: https://idle-wizard.fandom.com/wiki/Chronomancer_Guide_Updated (Fandom), fetched 2026-09-27 by `scripts/validation/chronomancer-setup.mjs`.
Item templates, item parameters, images, item lists/tables and sentences about gear, enchants or slots were removed, and item and set names were redacted to `[item]`, before this file was written.

## Sections

- 0. (introduction): used (41% removed)
- 1. Attributes: used (37% removed)
- 2. Phase 1: Build up Levels: used (34% removed)
- 3. Phase 2: Build up Superposition and Ritual of Power: used (27% removed)
- 4. Phase 3: PreBurst: used (28% removed)
- 5. High Level Snapshot Optimization: excluded: mostly item content (73% removed); prose dropped, setup boxes (pet/spells/stance) kept
- 6. Phase 4: Bursting: used (0% removed)

## 0. (introduction)

Chronomancer is a powerful class with a very solid push for mysteries in the post-voidmancer stage. 

Updated for v1.35.0

*Range: e90-e220+ mysteries
*Run duration: 10 minutes - 10 hours. Does not rely on long runs until later.
*Pets: Archivist, Geode, Simulacrum, Zombie, Risen Giant
Naturally, during set-up, evocation efficiency and pet experience are always welcome.

## 1. Attributes

==Attributes==
In '''Bold''' there will be very effective attributes, but feel free to tinker with those as well.

*Intelligence: '''25'''
*Insight: '''25'''
*Wisdom: '''25''' ²
* Patience: 40 (rest of line removed)
*Mastery: '''25''' <blockquote>''1. Patience benefits this build the most because of how well Risen Giant scales with 3% idle. After patience is maxed, SPC is very good because it helps burst and adds additional time skipped in build.''</blockquote><blockquote>''2. Wisdom doesn't help you with profit, so it's a balancing act to keep up your casts in build going at max rate without sacrificing too much profit. At higher mysteries, you won't need this as much because of spell shard upgrades. But at low mysts you may want 25 Wisdom or more to keep casts going quick. ''</blockquote>

## 2. Phase 1: Build up Levels

==Phase 1: Build up Levels==
Spells get interrupted during wormhole, so summons won't give autoclicks, but Pixie will. Using wormhole + Pixie, you can get some autoclicks for levels. Note that Pixie gives more autoclicks than the t2 pet, so don't upgrade her. Just get autoclicks until you aren't gaining substantial experience anymore. Then, switch to Archivist to get some Void entities. 
At low levels, you may want to do a preburst/burst phase real quick to get some more sources for character experience. You may also have trouble using Wormhole and Temporal Distortion on reckless, so you may have to cast those manually.

{{SpellSet
| spell_1_name = Singularity Beam
| spell_1_autocast = Reckless
| spell_2_name = Wormhole
| spell_2_autocast = Reckless
| spell_3_name = Ritual Of Power
| spell_3_autocast = Reckless
| spell_4_name = Synthetic Entity
| spell_4_autocast = Reckless
| spell_5_name = Temporal Distortion
| spell_5_autocast = Careful
| spell_6_name = Spell Focus
| spell_6_autocast = Reckless
}}

## 3. Phase 2: Build up Superposition and Ritual of Power

==Phase 2: Build up Superposition and Ritual of Power==
At lower mysteries you should just use the first spellset here with Archivist. Archivist will also increase your skipped time and the void entities you get from Synthetic Entity. 

When your gains start slowing down, after stacking a bunch of skipped time with the first spellset you can swap to the second spellset with Time Helix. Time Helix resets all experience from things like max mana, autoclicks and void entities. The only thing it doesn't reset is character experience from sources.
It's easier to use at higher mysteries when you won't lose too many levels to use it again, Geode can help with the level requirements, but only use it if you can't recklessly cast Time Helix with Archivist. 
Once you are done stacking in this phase, you'll be at 0 Autoclicks, Void Entities and low max mana because of Time Helix. You'll want to do a quick phase 1 build again with Pixie for AC's and Archivist for skipped time/VE, and a quick vm/burst to get higher max mana. You should gain a large amount of character levels and some upgrades from this.
Risen Giant scales with played pet time you gain from wormhole.

{{SpellSet
| spell_1_name = Singularity Beam
| spell_1_autocast = Reckless
| spell_2_name = Wormhole
| spell_2_autocast = Reckless
| spell_3_name = Ritual Of Power
| spell_3_autocast = Reckless
| spell_4_name = Superposition
| spell_4_autocast = Reckless
| spell_5_name = Synthetic Entity
| spell_5_autocast = Reckless
| spell_6_name = Spell Focus
| spell_6_autocast = Reckless
}}

{{SpellSet
| spell_1_name = Singularity Beam
| spell_1_autocast = Reckless
| spell_2_name = Wormhole
| spell_2_autocast = Reckless
| spell_3_name = Ritual Of Power
| spell_3_autocast = Reckless
| spell_4_name = Superposition
| spell_4_autocast = Reckless
| spell_5_name = Time Helix
| spell_5_autocast = Reckless
| spell_6_name = Spell Focus
| spell_6_autocast = Reckless
}}

## 4. Phase 3: PreBurst

==Phase 3: PreBurst==
Because Risen Giant stacked with wormhole skipped time is so good, we won't be able to pet swap to Voidterror for VM like many other classes. We'll use void radiance to get VM. Once you have enough VM, stop casting Temporal Distortion, cast Stabilize The Flow and swap to the burst spellset.

{{SpellSet
| spell_1_name = Singularity Beam
| spell_1_autocast = Reckless
| spell_2_name = Temporal Distortion
| spell_2_autocast = Reckless
| spell_3_name = Void Lure
| spell_3_autocast = Reckless
| spell_4_name = Void Radiance
| spell_4_autocast = Reckless
| spell_5_name = Spell Focus
| spell_5_autocast = Reckless
| spell_6_name = Stabilize the Flow
| spell_6_autocast = None
}}

## 5. High Level Snapshot Optimization

Prose dropped (mostly item discussion); setup boxes only:

{{SpellSet
| spell_1_name = Singularity Beam
| spell_1_autocast = Reckless
| spell_2_name = Temporal Distortion
| spell_2_autocast = Reckless
| spell_3_name = Void Lure
| spell_3_autocast = Reckless
| spell_4_name = Void Radiance
| spell_4_autocast = Reckless
| spell_5_name = Gem Resonance
| spell_5_autocast = Reckless
| spell_6_name = Stabilize the Flow
| spell_6_autocast = None
}}

## 6. Phase 4: Bursting

==Phase 4: Bursting==
You'll likely gain a lot of mysteries from this burst, and you can repeat it if you're still getting good gains before you exile.

{{SpellSet
| spell_1_name = Singularity Beam
| spell_1_autocast = Reckless
| spell_2_name = Superposition
| spell_2_autocast = Reckless
| spell_3_name = Converge Timelines
| spell_3_autocast = Reckless
| spell_4_name = Ritual Of Power
| spell_4_autocast = Reckless
| spell_5_name = Gem Resonance
| spell_5_autocast = Reckless
| spell_6_name = Stabilize the Flow
| spell_6_autocast = Reckless
}}-

''Credits:''

''Tito - Master Chronomancer -- original guide''
Category:Chronomancer
Category:Guide
