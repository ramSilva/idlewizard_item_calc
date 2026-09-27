#!/usr/bin/env bash
# Optimizer runs behind validation/chronomancer/tool-result.md (blind check, before the guide's gear is read).
# Usage: scripts/validation/chronomancer-blind-runs.sh [variant...]   (default: every variant)
set -euo pipefail
cd "$(dirname "$0")/../.."
out=validation/chronomancer

# Paragon 36 (1e650 Mysteries) opens the key-locked Expedition locations; these Trophies drop only there.
key_locked=(charged-fin-wing beholding-eye abnormal-voidmass insidious-lure warbanner-fragment inquisitive-eye blessed-armor-scales anointed-ashes)
not_owned=()
for k in "${key_locked[@]}"; do not_owned+=(--not-owned "$k"); done

# Slots still locked at 1e220 Mysteries (Paragon 18): Wrist 19, Weapon 20, Offhand 23, Legs 25, Mount 26, Accessory 28, Phylactery 29.
era_slots=(--exclude-slot Wrist --exclude-slot Weapon --exclude-slot Offhand --exclude-slot Legs --exclude-slot Mount --exclude-slot Accessory --exclude-slot Phylactery)
# At 1e150 Mysteries (Paragon 14) Neck (16) and Back (18) are locked too, and enchanting (17) isn't available.
e150_slots=("${era_slots[@]}" --exclude-slot Neck --exclude-slot Back)

key_levels=0,1,2,5,10,12,15,20,25,30,40,55
era_levels=0,1,2,5,10,12,15,20,30,40
era=("${era_slots[@]}" "${not_owned[@]}" --input Misc.AttributeCap=200)
# The guide's notes: Patience maxed, then Spellcraft; the listed Int/Ins/Wis/Mas 25 kept.
notes250=(--input AttrPoints.Patience=250 --input AttrPoints.Spellcraft=250)
notes200=(--input AttrPoints.Patience=200 --input AttrPoints.Spellcraft=200)
# Gem Resonance snapped by the same pre-burst set as Stabilize The Flow (same Incantation placeholder), and as many
# Mana Gems as Temporal Anchors (3000) so its temporary gems stay a modest share instead of multiplying a single gem.
gems=(--snapped 69,4 --input Building.1.Share=1 --input Building.1.Count=3000 --input Spell.GemResonance.SnappedIncantationEfficiency=1000)

run() {
  local name=$1
  shift
  local file=$out/tool-result-$name.json
  [ "$name" = main ] && file=$out/tool-result.json
  echo "== $name"
  npm run --silent optimize -- --class chronomancer --thorough --json "$file" "$@" > "$out/cli/$name.txt"
}

mkdir -p "$out/cli"
variants=("$@")
[ ${#variants[@]} -eq 0 ] && variants=(main notes era era-notes era-e150 era-notes-legion era-notes-gems-mixed era-notes-gems-only)
for v in "${variants[@]}"; do
  case $v in
    main) run main --all-levels --relevance 10 ;;
    notes) run notes --levels "$key_levels" --all-levels "${notes250[@]}" ;;
    era) run era --levels 0-40 --all-levels "${era[@]}" ;;
    era-notes) run era-notes --levels 0-40 --all-levels --relevance 10 "${era[@]}" "${notes200[@]}" ;;
    era-e150) run era-e150 --levels 0 --all-levels "${e150_slots[@]}" "${not_owned[@]}" --input Misc.AttributeCap=175 --input AttrPoints.Patience=175 --input AttrPoints.Spellcraft=175 ;;
    era-notes-legion) run era-notes-legion --levels "$era_levels" --all-levels "${era[@]}" "${notes200[@]}" --legion on ;;
    era-notes-gems-mixed) run era-notes-gems-mixed --levels "$era_levels" --all-levels "${era[@]}" "${notes200[@]}" "${gems[@]}" ;;
    era-notes-gems-only) run era-notes-gems-only --levels "$era_levels" --all-levels "${era[@]}" "${notes200[@]}" "${gems[@]}" --input Building.8.Share=0 ;;
    *) echo "Unknown variant $v" >&2 && exit 1 ;;
  esac
done
