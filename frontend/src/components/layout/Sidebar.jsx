
import { NavLink } from "react-router";
import clsx from "clsx";
import { LogOut, UserRound } from "lucide-react";

import { menuItems } from "../../config/navigation";
import { useAuth } from "../../contexts/AuthContext";

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-panel md:flex">
      {/* Brand */}
      <div className="shrink-0 px-5 pt-5">
        <p className="text-xl font-bold text-brand">
          API Monitor
        </p>

        <p className="mt-1 text-xs text-muted">
          Developer Platform
        </p>
      </div>

      {/* Navigation */}
      <nav
        className="mt-10 min-h-0 flex-1 space-y-1 overflow-y-auto px-5"
        aria-label="Main navigation"
      >
        {menuItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                isActive
                  ? "bg-brand/15 font-semibold text-brand"
                  : "text-muted hover:bg-panel-hover hover:text-ink"
              )
            }
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Account */}
      <div className="shrink-0 border-t border-line p-4">
        <div className="mb-3 flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <UserRound size={18} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {user?.name ?? "User"}
            </p>

            <p className="truncate text-xs text-muted">
              {user?.email ?? ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-panel-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <LogOut size={16} aria-hidden="true" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
