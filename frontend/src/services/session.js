
import { authRequest } from "./authService";

let inflightRefresh = null;

const LOCK_NAME = "api-monitor-auth-session";

export async function withSessionLock(callback) {
  if (navigator.locks?.request) {
    return navigator.locks.request(
      LOCK_NAME,
      { mode: "exclusive" },
      callback
    );
  }

  // Fallback: vẫn hoạt động, nhưng không có
  // khóa phối hợp giữa các tab.
  return callback();
}

export function refreshSession() {
  if (inflightRefresh) {
    return inflightRefresh;
  }

  const promise = withSessionLock(async () => {
    try {
      return await authRequest("/refresh");
    } catch (error) {
      // Nếu một tab khác vừa rotation trước,
      // đợi cookie mới được áp dụng rồi thử lại.
      if (error.code === "SESSION_ROTATED") {
        return authRequest("/refresh");
      }

      throw error;
    }
  });

  inflightRefresh = promise;

  void promise.finally(() => {
    if (inflightRefresh === promise) {
      inflightRefresh = null;
    }
  }).catch(() => {});

  return promise;
}

export function logoutSession() {
  return withSessionLock(async () => {
    return authRequest("/logout");
  });
}
