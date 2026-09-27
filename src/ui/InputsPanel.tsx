import { GROUP_ORDER, type InputField } from "./model.ts";
import { formatNumber, parseInputText } from "./state.ts";

interface Props {
  fields: InputField[];
  values: Record<string, string>;
  /** undefined text resets the input to its default. */
  onChange(id: string, text: string | undefined): void;
  onResetAll(): void;
  /** A newer relevance check is running for the current setup. */
  updating: boolean;
}

function defaultNote(f: InputField): string {
  const s = f.defaultSource;
  if (!s) return "generic default";
  return s.verified ? "from the class guide" : `unverified${s.note ? `: ${s.note}` : ""}`;
}

function Field({ field, text, onChange }: { field: InputField; text: string | undefined; onChange: Props["onChange"] }) {
  const { spec } = field;
  const id = `input-${field.id}`;
  const parsed = text === undefined ? null : parseInputText(text, spec);
  const error = parsed && !parsed.ok ? parsed.error : null;
  const hintParts = [spec.unit && `Unit: ${spec.unit}`, spec.logScale && "accepts 1e300-style numbers", spec.hint, field.description].filter(Boolean);

  return (
    <div className={`field${text !== undefined ? " changed" : ""}`}>
      <label htmlFor={id}>
        {field.label}
        {spec.unit && <span className="unit"> ({spec.unit})</span>}
      </label>
      <div className="field-row">
        {spec.kind === "boolean" ? (
          <input
            id={id}
            type="checkbox"
            checked={text === undefined ? spec.default === 1 : parsed?.ok ? parsed.value === true : false}
            onChange={(e) => onChange(field.id, e.target.checked ? "1" : "0")}
          />
        ) : (
          <input
            id={id}
            type="text"
            inputMode="decimal"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            value={text ?? formatNumber(spec.default)}
            onChange={(e) => onChange(field.id, e.target.value)}
          />
        )}
        {text !== undefined && (
          <button type="button" className="link" onClick={() => onChange(field.id, undefined)} title="Back to the default">
            reset
          </button>
        )}
      </div>
      {error && <div className="error">{error}</div>}
      <div className="hint">
        Default {spec.kind === "boolean" ? (spec.default ? "on" : "off") : formatNumber(spec.default)} ({defaultNote(field)})
        {hintParts.length > 0 && <> · {hintParts.join(" · ")}</>}
      </div>
      <div className="hint why" title={field.reason}>
        <code>{field.id}</code> · {field.reason}
      </div>
    </div>
  );
}

export function InputsPanel({ fields, values, onChange, onResetAll, updating }: Props) {
  const shown = fields.filter((f) => f.shown);
  const hidden = fields.filter((f) => !f.shown);
  const pending = fields.some((f) => f.pending);
  const groups = GROUP_ORDER.map((g) => [g, shown.filter((f) => f.group === g)] as const).filter(([, fs]) => fs.length > 0);

  return (
    <section className="panel" aria-labelledby="inputs-heading">
      <div className="panel-head">
        <h2 id="inputs-heading">Inputs</h2>
        <button type="button" onClick={onResetAll} disabled={Object.keys(values).length === 0}>
          Reset all inputs
        </button>
      </div>
      <p className="muted">
        Only inputs that can change which item set wins are asked for; each is checked against the best set and its closest alternatives at the global enchant
        level.
        {pending ? " Checking which inputs matter…" : updating ? " Re-checking for the changed setup…" : ""}
      </p>
      {groups.map(([group, fs]) => (
        <fieldset key={group}>
          <legend>{group}</legend>
          {fs.map((f) => (
            <Field key={f.id} field={f} text={values[f.id]} onChange={onChange} />
          ))}
        </fieldset>
      ))}
      {hidden.length > 0 && (
        <details className="hidden-inputs">
          <summary>Doesn't affect the ranking ({hidden.length})</summary>
          <p className="muted">These scale every item set's score by the same factor (or by less than 1%), so they can't change which set wins.</p>
          {hidden.map((f) => (
            <Field key={f.id} field={f} text={values[f.id]} onChange={onChange} />
          ))}
        </details>
      )}
    </section>
  );
}
