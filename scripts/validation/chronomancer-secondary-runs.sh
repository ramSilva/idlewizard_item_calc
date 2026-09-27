#!/usr/bin/env bash
# Informed (non-blind) Chronomancer runs for validation/chronomancer/comparison.md, made after the guide's gear was read.
# Each is the headline era-notes setup at enchant 10 with one thing changed. Never writes the blind tool-result files.
# Usage: scripts/validation/chronomancer-secondary-runs.sh [run...]   (default: every run)
set -euo pipefail
cd "$(dirname "$0")/../.."
out=validation/chronomancer/secondary

key_locked=(charged-fin-wing beholding-eye abnormal-voidmass insidious-lure warbanner-fragment inquisitive-eye blessed-armor-scales anointed-ashes)
not_owned=()
for k in "${key_locked[@]}"; do not_owned+=(--not-owned "$k"); done
era_slots=(--exclude-slot Wrist --exclude-slot Weapon --exclude-slot Offhand --exclude-slot Legs --exclude-slot Mount --exclude-slot Accessory --exclude-slot Phylactery)
headline=("${era_slots[@]}" "${not_owned[@]}" --input Misc.AttributeCap=200 --input AttrPoints.Patience=200 --input AttrPoints.Spellcraft=200)

run() {
  local name=$1
  shift
  echo "== $name"
  npm run --silent optimize -- --class chronomancer --thorough --levels 10 --all-levels --json "$out/$name.json" "${headline[@]}" "$@" > "$out/$name.txt"
}

mkdir -p "$out"
runs=("$@")
[ ${#runs[@]} -eq 0 ] && runs=(rerun unsnapped-stf pap-1e3 preburst-void)
for r in "${runs[@]}"; do
  case $r in
    # The headline as the current code computes it (after any fixes).
    rerun) run rerun ;;
    # Stabilize The Flow cast with the burst gear (its Time Distortion then comes from the burst set's maximum).
    unsnapped-stf) run unsnapped-stf --snapped "" ;;
    # PAP base well above 1, so Risen Giant's (P^0.6 + 1) scales ~P^0.6 as wiki.gg's successor guide states.
    pap-1e3) run pap-1e3 --input Pet.AbilityPower=1000 ;;
    # Phase 3 pre-burst set (Singularity Beam, Temporal Distortion, Void Lure, Void Radiance, Spell Focus, Stabilize the
    # Flow) scored on Void mana per second; the guide: "pieces with void mana per entity are priority, followed by
    # incantation efficiency".
    preburst-void) run preburst-void --spells 65,67,30,34,104,69 --snapped "" --score void-mana ;;
    *) echo "Unknown run $r" >&2 && exit 1 ;;
  esac
done
