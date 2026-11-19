
export default function AuthField({
  id,
  label,
  icon: Icon,
  error,
  ...inputProps
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-ink"
      >
        {label}
      </label>

      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
        )}

        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-lg border bg-surface px-3 py-3 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:ring-2 focus:ring-brand/20 ${
            Icon ? "pl-10" : ""
          } ${
            error
              ? "border-down focus:border-down"
              : "border-line focus:border-brand"
          }`}
          {...inputProps}
        />
      </div>

      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-xs text-down"
        >
          {error}
        </p>
      )}
    </div>
  );
}
