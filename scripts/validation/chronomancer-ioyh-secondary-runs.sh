#!/usr/bin/env bash
# Informed (non-blind) reruns for validation/chronomancer-ioyh/comparison.md, made after reading the guide's gear and
# encoding Temporal Paradox and Ritual Of Potency. Never writes into the blind tool-result*/cli files.
# Usage: scripts/validation/chronomancer-ioyh-secondary-runs.sh [run...]   (default: every run)
set -euo pipefail
cd "$(dirname "$0")/../.."
out=validation/chronomancer-ioyh/secondary

accumulator=()
while read -r k; do accumulator+=(--not-owned "$k"); done < <(node -e '
const { items } = require("./src/data/generated/items.json");
const key = (n) => n.toLowerCase().replace(/\x27/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
for (const i of items) if (i.slot === "Weapon" && i.name !== "The Accumulator" && i.startQuality !== "Mythic") console.log(key(i.name));
')

attrs=(--input AttrPoints.Intelligence=250 --input AttrPoints.Insight=250 --input AttrPoints.Spellcraft=250 --input AttrPoints.Wisdom=250
  --input AttrPoints.Dominance=10 --input AttrPoints.Patience=250 --input AttrPoints.Mastery=250 --input AttrPoints.Empathy=250
  --input AttrPoints.Versatility=10)
literal_attrs=(--input AttrPoints.Intelligence=250 --input AttrPoints.Insight=250 --input AttrPoints.Spellcraft=240 --input AttrPoints.Wisdom=240
  --input AttrPoints.Dominance=0 --input AttrPoints.Patience=250 --input AttrPoints.Mastery=250 --input AttrPoints.Empathy=250
  --input AttrPoints.Versatility=0)
common=(--input Expeditions.Level=100 --input Pet.Level=200 --input Pet.AbilityPower=1.37e12 --input Spell.TimeHelix.CastsThisExile=300)
# The blind headline's flags, unchanged.
blind=(--class chronomancer --spells 69,4,73,17,60 --snapped 69,4 --score production --pet simulacrum)
# The guide's whole burst bar with the encoded pet; every Weapon owned (Ritual Of Potency now only counts with The Accumulator).
paradox=(--class chronomancer --spells 69,4,73,111,17,60 --snapped 69,4 --score production-with-pet --pet temporal-paradox)

run() {
  local name=$1
  shift
  echo "== $name"
  npm run --silent optimize -- --thorough --levels 0-55 --all-levels --json "$out/$name.json" "$@" > "$out/cli/$name.txt"
}

mkdir -p "$out/cli"
runs=("$@")
[ ${#runs[@]} -eq 0 ] && runs=(rerun-burst paradox paradox-literal-attrs paradox-no-legion paradox-empathy-175)
for r in "${runs[@]}"; do
  case $r in
    rerun-burst) run rerun-burst "${blind[@]}" --legion on "${attrs[@]}" "${common[@]}" "${accumulator[@]}" ;;
    paradox) run paradox "${paradox[@]}" --legion on "${attrs[@]}" "${common[@]}" --relevance 20 ;;
    paradox-literal-attrs) run paradox-literal-attrs "${paradox[@]}" --legion on "${literal_attrs[@]}" "${common[@]}" ;;
    paradox-no-legion) run paradox-no-legion "${paradox[@]}" --legion off "${attrs[@]}" "${common[@]}" ;;
    # Empathy below the cap, so Bite Sleeves' +75 Empathy counts (the guide's "Fill for items").
    paradox-empathy-175) run paradox-empathy-175 "${paradox[@]}" --legion on "${attrs[@]}" --input AttrPoints.Empathy=175 "${common[@]}" ;;
    *) echo "Unknown run $r" >&2 && exit 1 ;;
  esac
done
