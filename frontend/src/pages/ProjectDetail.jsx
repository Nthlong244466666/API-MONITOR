import { Link, useParams } from "react-router";
import { ArrowLeft, FolderKanban, List } from "lucide-react";
import PageHeader from "../components/layout/PageHeader";
import Card from "../components/ui/Card";

export default function ProjectDetail() {
  const { workspaceId, projectId } = useParams();
  const base = `/workspaces/${encodeURIComponent(workspaceId)}/projects`;

  return (
    <>
      <PageHeader title="Project Detail" />
      <div className="space-y-5">
        <Link to={base} className="inline-flex items-center gap-2 text-sm text-muted hover:text-brand">
          <ArrowLeft size={16} aria-hidden="true" /> Back to Projects
        </Link>
        <Card>
          <div className="flex items-center gap-3">
            <FolderKanban size={24} className="text-brand" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-ink">Project Detail</h2>
          </div>
          <p className="mt-3 text-sm text-muted">
            Manage saved requests now. Monitors and project statistics will be available in later phases.
          </p>
          <Link
            to={`${base}/${encodeURIComponent(projectId)}/requests`}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-hover"
          >
            <List size={16} aria-hidden="true" /> Manage API Requests
          </Link>
        </Card>
      </div>
    </>
  );
}
