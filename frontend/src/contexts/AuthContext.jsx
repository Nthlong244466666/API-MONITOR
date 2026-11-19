
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

import { authService } from "../services/authService";
import {
  refreshSession,
  logoutSession,
} from "../services/session";
import { createApiClient } from "../services/apiClient";

const AuthContext = createContext(null);

const anonymousState = {
  status: "anonymous",
  user: null,
  accessToken: null,
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    status: "loading",
    user: null,
    accessToken: null,
  });

  const tokenRef = useRef(null);
  const epochRef = useRef(0);

  const applyAuth = useCallback((data) => {
    tokenRef.current = data.accessToken;

    setAuth({
      status: "authenticated",
      user: data.user,
      accessToken: data.accessToken,
    });
  }, []);

  const clearAuth = useCallback(() => {
    epochRef.current += 1;
    tokenRef.current = null;
    setAuth(anonymousState);
  }, []);

  useEffect(() => {
    let active = true;
    const epoch = epochRef.current;

    refreshSession()
      .then((data) => {
        if (active && epochRef.current === epoch) {
          applyAuth(data);
        }
      })
      .catch(() => {
        if (active && epochRef.current === epoch) {
          clearAuth();
        }
      });

    return () => {
      active = false;
    };
  }, [applyAuth, clearAuth]);

  const login = useCallback(
    async (credentials) => {
      const currentEpoch = epochRef.current;
      const data = await authService.login(credentials);

      if (epochRef.current === currentEpoch) {
        applyAuth(data);
      }

      return data;
    },
    [applyAuth]
  );

  const refreshAccessToken = useCallback(async () => {
    const epoch = epochRef.current;

    const data = await refreshSession();

    if (epochRef.current !== epoch) {
      return null;
    }

    applyAuth(data);
    return data.accessToken;
  }, [applyAuth]);

  const logout = useCallback(() => {
    clearAuth();

    // Thu hồi server-side best effort.
    void logoutSession().catch((error) => {
      console.error("Server logout failed:", error);
    });
  }, [clearAuth]);

  const apiFetch = useMemo(
    () =>
      createApiClient({
        getAccessToken: () => tokenRef.current,
        refreshAccessToken,
        onUnauthorized: clearAuth,
      }),
    [refreshAccessToken, clearAuth]
  );

  const value = useMemo(
    () => ({
      ...auth,
      isAuthenticated: auth.status === "authenticated",
      login,
      logout,
      refreshAccessToken,
      apiFetch,
    }),
    [auth, login, logout, refreshAccessToken, apiFetch]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}
