#!/usr/bin/env bash
# Optimizer runs behind validation/chronomancer-ioyh/tool-result.md (second blind check, against the Fandom
# "In Over Your Head Chronomancer Guide", before its gear is read).
# Usage: scripts/validation/chronomancer-ioyh-runs.sh [variant...]   (default: every variant)
set -euo pipefail
cd "$(dirname "$0")/../.."
out=validation/chronomancer-ioyh

# Ritual Of Potency is on the burst bar and only The Accumulator (a Weapon) adds it to the spellbook, so every other
# Weapon is marked not owned; the model can't value Ritual Of Potency itself.
accumulator=()
while read -r k; do accumulator+=(--not-owned "$k"); done < <(node -e '
const { items } = require("./src/data/generated/items.json");
const key = (n) => n.toLowerCase().replace(/\x27/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
for (const i of items) if (i.slot === "Weapon" && i.name !== "The Accumulator" && i.startQuality !== "Mythic") console.log(key(i.name));
')

# Burst bar without Ritual Of Potency (111, not a Chronomancer spell in the model); Stabilize The Flow and Gem
# Resonance are cast manually in the snap sets.
burst=(--class chronomancer --spells 69,4,73,17,60 --snapped 69,4 --score production)
# Temporal Paradox isn't modelled; Simulacrum's Prod.Global × (5·PAP·L + 1) is the closest encoded pet.
pet=(--pet simulacrum)
# Spellcraft and Wisdom 240 + 10 from maxed Innate Aptitude, Dominance 0 + 10, the rest capped; Versatility gets leftovers (unknown).
attrs=(--input AttrPoints.Intelligence=250 --input AttrPoints.Insight=250 --input AttrPoints.Spellcraft=250 --input AttrPoints.Wisdom=250
  --input AttrPoints.Dominance=10 --input AttrPoints.Patience=250 --input AttrPoints.Mastery=250 --input AttrPoints.Empathy=250
  --input AttrPoints.Versatility=10)
literal_attrs=(--input AttrPoints.Intelligence=250 --input AttrPoints.Insight=250 --input AttrPoints.Spellcraft=240 --input AttrPoints.Wisdom=240
  --input AttrPoints.Dominance=0 --input AttrPoints.Patience=250 --input AttrPoints.Mastery=250 --input AttrPoints.Empathy=250
  --input AttrPoints.Versatility=0)
# Pet level = character level (Time Fork's level requirement); the Quasi-Realm multiplies PAP by 1.15^pet level;
# Time Helix stands in for Time Fork (same formula with 1.5× casts; one cast per pet level).
common=(--input Expeditions.Level=100 --input Pet.Level=200 --input Pet.AbilityPower=1.37e12 --input Spell.TimeHelix.CastsThisExile=300)
gems=(--input Building.1.Share=1 --input Building.1.Count=3000 --input Spell.GemResonance.SnappedIncantationEfficiency=1000)

run() {
  local name=$1
  shift
  local file=$out/tool-result-$name.json
  [ "$name" = burst ] && file=$out/tool-result.json
  echo "== $name"
  npm run --silent optimize -- --thorough --levels 0-55 --all-levels --json "$file" "$@" > "$out/cli/$name.txt"
}

mkdir -p "$out/cli"
variants=("$@")
[ ${#variants[@]} -eq 0 ] && variants=(burst burst-chimaera burst-risen-giant burst-weapon-free burst-no-legion burst-literal-attrs burst-gems-mixed)
for v in "${variants[@]}"; do
  case $v in
    burst) run burst "${burst[@]}" "${pet[@]}" --legion on "${attrs[@]}" "${common[@]}" "${accumulator[@]}" --relevance 20 ;;
    burst-chimaera) run burst-chimaera "${burst[@]}" --pet greater-chimaera --legion on "${attrs[@]}" "${common[@]}" "${accumulator[@]}" ;;
    burst-risen-giant) run burst-risen-giant "${burst[@]}" --pet risen-giant --legion on "${attrs[@]}" "${common[@]}" "${accumulator[@]}" ;;
    burst-weapon-free) run burst-weapon-free "${burst[@]}" "${pet[@]}" --legion on "${attrs[@]}" "${common[@]}" ;;
    burst-no-legion) run burst-no-legion "${burst[@]}" "${pet[@]}" --legion off "${attrs[@]}" "${common[@]}" "${accumulator[@]}" ;;
    burst-literal-attrs) run burst-literal-attrs "${burst[@]}" "${pet[@]}" --legion on "${literal_attrs[@]}" "${common[@]}" "${accumulator[@]}" ;;
    burst-gems-mixed) run burst-gems-mixed "${burst[@]}" "${pet[@]}" --legion on "${attrs[@]}" "${common[@]}" "${accumulator[@]}" "${gems[@]}" ;;
    *) echo "Unknown variant $v" >&2 && exit 1 ;;
  esac
done
