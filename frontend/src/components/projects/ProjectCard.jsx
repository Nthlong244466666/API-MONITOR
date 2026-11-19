import { Link } from "react-router";
import { ArrowUpRight, FolderKanban, Pencil, Trash2 } from "lucide-react";

const actionClass = "inline-flex items-center justify-center gap-1 rounded-lg border border-line px-3 py-2 text-xs text-ink transition hover:bg-panel-hover disabled:cursor-not-allowed disabled:opacity-50";

export default function ProjectCard({ project, workspaceId, busy, onEdit, onDelete }) {
  const href = `/workspaces/${encodeURIComponent(workspaceId)}/projects/${encodeURIComponent(project.id)}`;
  return (
    <article className="flex min-w-0 flex-col rounded-xl border border-line bg-surface p-4 transition hover:border-brand/60">
      <div className="mb-3 flex items-center justify-between">
        <FolderKanban size={22} className="text-brand" aria-hidden="true" />
        <Link to={href} aria-label={`Open ${project.name}`} className="rounded-lg p-1 text-muted hover:text-brand"><ArrowUpRight size={18} /></Link>
      </div>
      <Link to={href} className="min-w-0 text-base font-semibold text-ink hover:text-brand">{project.name}</Link>
      <p className="mt-2 min-h-10 wrap-break-word text-sm text-muted">{project.description || "No description"}</p>
      {project.createdAt && <p className="mt-3 text-xs text-muted">Created {new Date(project.createdAt).toLocaleDateString()}</p>}
      <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-3">
        <button type="button" onClick={() => onEdit(project)} disabled={busy} className={actionClass} aria-label={`Edit ${project.name}`}><Pencil size={14} /> Edit</button>
        <button type="button" onClick={() => onDelete(project)} disabled={busy} className={actionClass} aria-label={`Delete ${project.name}`}><Trash2 size={14} className="text-down" /> Delete</button>
      </div>
    </article>
  );
}
