import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { createNotificationApi } from "../../services/notificationApi";

export default function UnreadBadge({ className = "" }) {
  const { apiFetch, isAuthenticated } = useAuth();
  const api = useMemo(() => createNotificationApi(apiFetch), [apiFetch]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) { return; }
    let active = true;
    async function load() {
      try {
        const response = await api.unreadCount();
        if (active) setCount(Number(response?.count) || 0);
      } catch { /* Connectivity failures must not block navigation. */ }
    }
    void load();
    const timer = setInterval(() => { if (!document.hidden) void load(); }, 30_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    window.addEventListener("api-monitor:notifications-changed", onFocus);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", onFocus); window.removeEventListener("api-monitor:notifications-changed", onFocus); };
  }, [api, isAuthenticated]);

  if (!isAuthenticated || count < 1) return null;
  return <span aria-label={`${count} thông báo chưa đọc`} className={`inline-flex min-w-5 items-center justify-center rounded-full bg-down px-1.5 py-0.5 text-[10px] font-bold text-white ${className}`}>
    {count > 99 ? "99+" : count}
  </span>;
}
