import { MAX_SPELLS } from "../data/buildModel.ts";
import { CLASSES, classById } from "../data/classes.ts";
import { PETS } from "../data/pets.ts";
import { behaviourOf } from "../data/spellBehaviours.ts";
import { classSpells, spellById } from "../data/spells.ts";
import type { UiModel } from "./model.ts";
import type { Selection } from "./state.ts";

interface Props {
  selection: Selection;
  built: UiModel | { error: string };
  onChange(selection: Selection): void;
  onClassChange(classId: string): void;
  onReset(): void;
}

export function SetupPanel({ selection, built, onChange, onClassChange, onReset }: Props) {
  const cls = classById(selection.classId);
  const spells = classSpells(cls.name).sort((a, b) => a.name.localeCompare(b.name));
  const paired = cls.pairedPets.map((id) => PETS.find((p) => p.id === id)!).filter(Boolean);
  const others = PETS.filter((p) => !cls.pairedPets.includes(p.id));
  const slots: (number | null)[] = Array.from({ length: MAX_SPELLS }, (_, i) => selection.spells[i] ?? null);

  const setSpell = (slot: number, id: number | null) => {
    const next = [...slots];
    next[slot] = id;
    const chosen = next.filter((x): x is number => x !== null);
    onChange({ ...selection, spells: chosen, snapped: selection.snapped.filter((s) => chosen.includes(s)) });
  };
  const toggleSnap = (id: number, on: boolean) =>
    onChange({ ...selection, snapped: on ? [...selection.snapped, id] : selection.snapped.filter((s) => s !== id) });

  const model = "model" in built ? built.model : null;

  return (
    <section className="panel" aria-labelledby="setup-heading">
      <div className="panel-head">
        <h2 id="setup-heading">Setup</h2>
        <button type="button" onClick={onReset}>
          Reset to guide defaults
        </button>
      </div>
      <div className="grid">
        <label>
          Class
          <select aria-label="Class" value={selection.classId} onChange={(e) => onClassChange(e.target.value)}>
            {CLASSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Pet
          <select aria-label="Pet" value={selection.petId} onChange={(e) => onChange({ ...selection, petId: e.target.value })}>
            <optgroup label={`Used in ${cls.name} guides`}>
              {paired.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (tier {p.tier})
                </option>
              ))}
            </optgroup>
            <optgroup label="Other pets">
              {others.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (tier {p.tier})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
        {cls.stances.length > 0 && (
          <label>
            Stance
            <select aria-label="Stance" value={selection.stance ?? ""} onChange={(e) => onChange({ ...selection, stance: e.target.value || undefined })}>
              <option value="">None (the game uses Meditation)</option>
              {cls.stances.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={selection.idle} onChange={(e) => onChange({ ...selection, idle: e.target.checked })} />
          Burst in Idle mode
        </label>
      </div>

      <h3>Spell bar</h3>
      <ol className="spells">
        {slots.map((id, slot) => {
          const snap = id !== null && behaviourOf(id).snap;
          return (
            <li key={slot}>
              <select aria-label={`Spell slot ${slot + 1}`} value={id ?? ""} onChange={(e) => setSpell(slot, e.target.value ? Number(e.target.value) : null)}>
                <option value="">(empty)</option>
                {spells.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id !== id && selection.spells.includes(s.id)}>
                    {s.name} ({s.school}
                    {s.behavior ? `, ${s.behavior}` : ""})
                  </option>
                ))}
              </select>
              {snap && (
                <label className="check small" title="Cast with another item set before swapping to the burst set; its snapped values become inputs.">
                  <input type="checkbox" checked={selection.snapped.includes(id!)} onChange={(e) => toggleSnap(id!, e.target.checked)} />
                  snapped
                </label>
              )}
            </li>
          );
        })}
      </ol>
      {cls.augments.length > 0 && (
        <p className="muted">
          Always applied (Augment, lasts until Exile): {cls.augments.map((id) => spellById(id).name).join(", ")}. Persistent spells' passive parts are applied
          automatically.
        </p>
      )}

      <h3>Score</h3>
      {model ? (
        <>
          <select aria-label="Score" value={model.score.def.id} onChange={(e) => onChange({ ...selection, scoreId: e.target.value })}>
            {model.scores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
                {s.id === cls.defaultScore ? " (class default)" : ""}
              </option>
            ))}
          </select>
          <p className="muted">{model.score.def.description}</p>
          {"warning" in built && built.warning && <p className="warning">{built.warning}</p>}
        </>
      ) : (
        <p className="error">{"error" in built ? built.error : ""}</p>
      )}
      <p className="muted">
        Elixirs aren't a setup choice in the model: cauldron ingredient counts appear as inputs when an item uses them.
      </p>
    </section>
  );
}
