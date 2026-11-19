import clsx from "clsx";

export default function Card({ children, className = "" }) {
  return (
    <div
      className={clsx(
        "rounded-card border border-line bg-panel p-6 shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}