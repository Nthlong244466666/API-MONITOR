
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router";
import clsx from "clsx";
import { LogOut, UserRound, X } from "lucide-react";

import { menuItems } from "../../config/navigation";
import { useAuth } from "../../contexts/AuthContext";

export default function MobileNav() {
  const { user, logout } = useAuth();

  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    if (!accountOpen) return;

    function handlePointerDown(event) {
      if (
        accountRef.current &&
        !accountRef.current.contains(event.target)
      ) {
        setAccountOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [accountOpen]);

  function handleLogout() {
    setAccountOpen(false);
    logout();
  }

  return (
    <div ref={accountRef} className="md:hidden">
      {accountOpen && (
        <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 rounded-xl border border-line bg-panel p-4 shadow-xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {user?.name ?? "User"}
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {user?.email}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAccountOpen(false)}
              aria-label="Close account menu"
              className="rounded-lg p-1.5 text-muted hover:bg-panel-hover hover:text-ink"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="border-t border-line pt-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm text-muted transition hover:bg-panel-hover hover:text-ink"
            >
              <LogOut size={18} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-flow-col auto-cols-fr border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]"
      >
        {menuItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === "/"}
            onClick={() => setAccountOpen(false)}
            className={({ isActive }) =>
              clsx(
                "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[11px]",
                "focus-visible:outline-2 focus-visible:outline-brand",
                isActive
                  ? "text-brand"
                  : "text-muted hover:text-ink"
              )
            }
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={() => setAccountOpen((prev) => !prev)}
          aria-expanded={accountOpen}
          aria-label="Account menu"
          className={clsx(
            "flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-center text-[11px]",
            "focus-visible:outline-2 focus-visible:outline-brand",
            accountOpen ? "text-brand" : "text-muted"
          )}
        >
          <UserRound size={19} aria-hidden="true" />
          <span>Account</span>
        </button>
      </nav>
    </div>
  );
}
