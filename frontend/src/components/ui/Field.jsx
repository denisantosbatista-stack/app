// Centralized text/textarea form field used across LindArt.
// Props:
//  - label: string (eyebrow label above the input)
//  - value: string
//  - onChange: (string) => void  (receives the raw value, not the event)
//  - placeholder?: string
//  - type?: string                — HTML input type ("text", "email", "number", "url"…)
//                                  or "textarea" to render a multiline textarea.
//  - hint?: string                — small helper text below the field
//  - multiline?: boolean          — legacy alias for type="textarea"
//  - testId?: string              — data-testid forwarded to the input/textarea
//  - rows?: number                — textarea rows (default 3)

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  multiline = false,
  testId,
  rows = 3,
}) {
  const isTextarea = multiline || type === "textarea";
  const baseClass =
    "block w-full mt-1.5 bg-ink-surface border border-black/[0.08] rounded-sm px-3 py-2 text-sm text-zinc-900 focus:border-gold focus:outline-none";

  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.22em] uppercase text-zinc-500">
        {label}
      </span>
      {isTextarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={baseClass}
          data-testid={testId}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClass}
          data-testid={testId}
        />
      )}
      {hint && (
        <span
          className="block mt-1 text-[11px] text-zinc-500 leading-snug"
          data-testid={testId ? `${testId}-hint` : undefined}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

export default Field;
