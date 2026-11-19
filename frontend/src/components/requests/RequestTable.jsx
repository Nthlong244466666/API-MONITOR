import { Pencil, Trash2, Play } from "lucide-react";
import RequestMethodBadge from "./RequestMethodBadge";
import { Link } from "react-router";
import { requestStudioPath } from "../../services/requestApi";

export default function RequestTable({ requests, busy, onEdit, onDelete, workspaceId, projectId }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="w-full min-w-162.5 border-collapse text-left text-sm">
        <thead className="bg-panel text-xs text-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold">Method</th>
            <th scope="col" className="px-4 py-3 font-semibold">Request / URL</th>
            <th scope="col" className="px-4 py-3 font-semibold">Created</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id} className="border-t border-line hover:bg-panel-hover">
              <td className="px-4 py-3"><RequestMethodBadge method={request.method} /></td>
              <td className="max-w-100 px-4 py-3">
                <p className="font-semibold text-ink wrap-break-word">{request.name}</p>
                <p className="mt-1 truncate text-xs text-muted" title={request.url}>{request.url}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Link to={requestStudioPath(workspaceId, projectId, request.id)} aria-label={`Open ${request.name} in Studio`} title="Open Studio" className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-2 text-brand hover:bg-panel-hover">
                    <Play size={16} aria-hidden="true" /><span className="text-xs">Studio</span>
                  </Link>
                  <button type="button" onClick={() => onEdit(request)} disabled={busy}
                    aria-label={`Edit ${request.name}`} className="rounded-lg border border-line p-2 text-ink hover:bg-panel-hover disabled:opacity-50">
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={() => onDelete(request)} disabled={busy}
                    aria-label={`Delete ${request.name}`} className="rounded-lg border border-line p-2 text-down hover:bg-panel-hover disabled:opacity-50">
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
