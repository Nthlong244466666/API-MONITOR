import PageHeader from "../components/layout/PageHeader";
import Card from "../components/ui/Card";

export default function PlaceholderPage({ title }) {
  return (
    <>
      <PageHeader title={title} />

      <Card>
        <p className="text-sm text-muted">
          This module will be implemented in the next sprint.
        </p>
      </Card>
    </>
  );
}