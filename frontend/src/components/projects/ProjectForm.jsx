import { Plus, X } from "lucide-react";

const inputClass = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-brand disabled:opacity-50";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-ink transition hover:bg-panel-hover disabled:cursor-not-allowed disabled:opacity-50";
const primaryClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50";

export default function ProjectForm({ name, description, onNameChange, onDescriptionChange, onSubmit, onCancel, editing, busy, atLimit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-line bg-surface p-4">
      <h2 className="text-base font-semibold text-ink">{editing ? "Edit Project" : "New Project"}</h2>
      <div>
        <label htmlFor="project-name" className="mb-2 block text-sm text-muted">Project Name</label>
        <input id="project-name" autoFocus required minLength={2} maxLength={150} value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Project name" disabled={busy} className={inputClass} />
      </div>
      <div>
        <label htmlFor="project-description" className="mb-2 block text-sm text-muted">Description (optional)</label>
        <textarea id="project-description" rows={3} maxLength={1000} value={description} onChange={(event) => onDescriptionChange(event.target.value)} placeholder="What is this project for?" disabled={busy} className={inputClass} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy || name.trim().length < 2 || (!editing && atLimit)} className={primaryClass}>{!editing && <Plus size={16} />}{editing ? "Save Project" : "Create Project"}</button>
        <button type="button" onClick={onCancel} disabled={busy} className={buttonClass}><X size={16} /> Cancel</button>
      </div>
    </form>
  );
}
