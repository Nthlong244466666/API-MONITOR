import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="flex min-h-dvh bg-surface text-ink">
      <Sidebar />

      <main className="min-w-0 flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-6">
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}