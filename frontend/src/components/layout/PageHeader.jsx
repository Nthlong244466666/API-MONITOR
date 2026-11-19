import { useEffect } from "react";

export default function PageHeader({ title }) {
  useEffect(() => {
    document.title = `${title} · API Monitor`;
  }, [title]);

  return (
    <header className="mb-8">
      <p className="text-xs text-muted">
        Workspace / My Project
      </p>

      <h1 className="mt-2 text-3xl font-bold tracking-tight">
        {title}
      </h1>
    </header>
  );
}