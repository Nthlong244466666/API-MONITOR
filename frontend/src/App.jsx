import { Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Workspaces from "./pages/Workspaces";
import WorkspaceProjects from "./pages/WorkspaceProjects";
import ProjectDetail from "./pages/ProjectDetail";
import Requests from "./pages/Requests";
import ProjectRequests from "./pages/ProjectRequests";
import RequestStudio from "./pages/RequestStudio";
import Monitors from "./pages/Monitors";
import MonitorDetail from "./pages/MonitorDetail";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import Notifications from "./pages/Notifications";
import Login from "./pages/Login";
import Register from "./pages/Register";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="workspaces" element={<Workspaces />} />
            <Route path="workspaces/:workspaceId/projects" element={<WorkspaceProjects />} />
            <Route path="workspaces/:workspaceId/projects/:projectId" element={<ProjectDetail />} />
            <Route path="workspaces/:workspaceId/projects/:projectId/requests" element={<ProjectRequests />} />
            <Route path="workspaces/:workspaceId/projects/:projectId/requests/:requestId" element={<RequestStudio />} />
            <Route path="requests" element={<Requests />} />
            <Route path="monitors" element={<Monitors />} />
            <Route path="monitors/:monitorId" element={<MonitorDetail />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="incidents/:incidentId" element={<IncidentDetail />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
