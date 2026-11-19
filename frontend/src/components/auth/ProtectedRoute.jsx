
import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router";

import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div
        role="status"
        className="flex min-h-dvh items-center justify-center bg-surface text-muted"
      >
        Restoring your session...
      </div>
    );
  }

  if (status === "anonymous") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet />;
}
