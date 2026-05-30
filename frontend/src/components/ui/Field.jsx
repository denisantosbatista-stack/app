// Centralized form-field wrapper used across LindArt.
//
// Two modes:
//  1. Input/textarea mode (default) — pass `value` + `onChange`. Renders a
//     styled <input> or <textarea> with an eyebrow label above.
//  2. Children mode — pass JSX as `children`. Renders the children inside a
//     wrapper with a small eyebrow label, leaving the inner control entirely
//     to the caller (used for chip rows, custom inputs, etc.).
//
// Props:
//  - label: string                — eyebrow label above the control
//  - children?: ReactNode         — when provided, switches to children mode
//  - value?: string               — input/textarea value
//  - onChange?: (string) => void  — receives the raw value, not the event
//  - placeholder?: string
//  - type?: string                — HTML input type, or "textarea"
//  - hint?: string                — small helper text below the field
//  - multiline?: boolean          — legacy alias for type="textarea"
//  - testId?: string              — data-testid forwarded to the control
//  - rows?: number                — textarea rows (default 3)

export function Field({
  label,
  children,
  value,
  onChange,
  placeholder,
  type = "text",
  hint,
  multiline = false,
  testId,
  rows = 3,
}) {
  // Children mode: caller renders its own control inside the wrapper.
  if (children !== undefined) {
    return (
      <div>
        <div className="label-eyebrow text-zinc-500 mb-1.5">{label}</div>
        {children}
      </div>
    );
  }

  // Input mode: standard <input> / <textarea>.
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
