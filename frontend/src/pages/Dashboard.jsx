
import PageHeader from "../components/layout/PageHeader";
import Card from "../components/ui/Card";
import StatCard from "../components/ui/StatCard";
import BackendStatus from "../components/ui/BackendStatus";

const stats = [
  { label: "Total Monitors", value: "0", color: "text-ink" },
  { label: "APIs Up", value: "0", color: "text-up" },
  { label: "APIs Down", value: "0", color: "text-down" },
  { label: "Active Incidents", value: "0", color: "text-warning" },
];

export default function Dashboard() {
  return (
    <>
      <PageHeader title="Dashboard" />

      <div className="space-y-6">
        <Card>
          <h2 className="mb-3 text-sm font-semibold">
            Development Environment
          </h2>
          <BackendStatus />
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <Card>
          <h2 className="text-lg font-semibold">API Performance</h2>
          <div className="mt-5 flex h-52 items-center justify-center rounded-lg border border-dashed border-line text-sm text-muted">
            No monitoring data yet
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold">Recent Incidents</h2>
          <p className="mt-3 text-sm text-muted">
            No incidents recorded.
          </p>
        </Card>
      </div>
    </>
  );
}
