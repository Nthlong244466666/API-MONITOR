
import { Activity } from "lucide-react";

export default function AuthShell({
  title,
  subtitle,
  children,
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand/15 text-brand">
            <Activity aria-hidden="true" size={28} />
          </div>

          <div className="mb-3 text-sm font-semibold tracking-wide text-brand">
            API MONITOR
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-ink">
            {title}
          </h1>

          <p className="mt-2 text-sm text-muted">
            {subtitle}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-6 shadow-card sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Test, monitor and understand your APIs
        </p>
      </div>
    </main>
  );
}
