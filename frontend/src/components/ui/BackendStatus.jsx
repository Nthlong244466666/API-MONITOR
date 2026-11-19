
import { useEffect, useState } from "react";
import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import clsx from "clsx";
import { getBackendHealth } from "../../services/healthService";

const states = {
  checking: {
    label: "Checking backend...",
    icon: LoaderCircle,
    color: "text-muted",
  },
  connected: {
    label: "Backend Connected",
    icon: CircleCheck,
    color: "text-up",
  },
  disconnected: {
    label: "Backend Disconnected",
    icon: CircleX,
    color: "text-down",
  },
};

export default function BackendStatus() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    const controller = new AbortController();
    let running = false;

    async function check() {
      if (running || controller.signal.aborted) return;

      running = true;

      try {
        await getBackendHealth(controller.signal);

        if (!controller.signal.aborted) {
          setStatus("connected");
        }
      } catch {
        if (!controller.signal.aborted) {
          setStatus("disconnected");
        }
      } finally {
        running = false;
      }
    }

    check();

    const intervalId = setInterval(check, 15000);

    return () => {
      clearInterval(intervalId);
      controller.abort();
    };
  }, []);

  const current = states[status];
  const Icon = current.icon;

  return (
    <div role="status" className="flex items-center gap-2 text-sm">
      <Icon
        size={18}
        className={clsx(
          current.color,
          status === "checking" &&
            "animate-spin motion-reduce:animate-none"
        )}
        aria-hidden="true"
      />
      <span className={current.color}>{current.label}</span>
    </div>
  );
}
