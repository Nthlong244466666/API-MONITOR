
import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  name,
  description,
  loading = false,
  error = null,
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const inputRef = useRef(null);

  const [value, setValue] = useState("");

  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setValue("");
      dialog.showModal();
      inputRef.current?.focus();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Also close the native dialog during unmount.
  useEffect(() => {
    const dialog = dialogRef.current;

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  const matches = value.trim() === name && name.length > 0;

  function handleSubmit(event) {
    event.preventDefault();

    if (!loading && matches) {
      onConfirm(value.trim());
    }
  }

  function handleCancel(event) {
    event.preventDefault();

    if (!loading) {
      onClose();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={handleCancel}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-line bg-panel p-6 text-ink shadow-2xl backdrop:bg-black/75"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle
            size={22}
            aria-hidden="true"
            className="shrink-0 text-down"
          />

          <h2
            id={titleId}
            className="text-lg font-semibold"
          >
            {title}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close dialog"
          className="rounded-lg p-1 text-muted transition hover:bg-panel-hover hover:text-ink disabled:opacity-50"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <p
        id={descriptionId}
        className="mt-4 text-sm leading-6 text-muted"
      >
        {description}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-4"
      >
        <div>
          <label
            htmlFor={inputId}
            className="mb-2 block text-sm text-ink"
          >
            Type the following name to confirm:
          </label>

          <p className="mb-3 wrap-break-word rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink">
            {name}
          </p>

          <input
            id={inputId}
            ref={inputRef}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
            }}
            disabled={loading}
            maxLength={150}
            placeholder="Enter exact name"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-brand disabled:opacity-50"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down"
          >
            {error.message || "Delete failed."}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-line px-4 py-2 text-sm text-ink transition hover:bg-panel-hover disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={!matches || loading}
            className="rounded-lg bg-down px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
