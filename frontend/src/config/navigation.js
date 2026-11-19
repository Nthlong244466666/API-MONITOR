
import {
  LayoutDashboard,
  FolderKanban,
  Send,
  Activity,
  TriangleAlert,
} from "lucide-react";

export const menuItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/workspaces", label: "Workspaces", icon: FolderKanban },
  { path: "/requests", label: "API Requests", icon: Send },
  { path: "/monitors", label: "Monitors", icon: Activity },
  { path: "/incidents", label: "Incidents", icon: TriangleAlert },
];
  