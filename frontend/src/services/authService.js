
const AUTH_BASE = "/api/v1/auth";

export class ApiError extends Error {
  constructor(code, message, details, status) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export async function parseApiResponse(response) {
  if (response.status === 204) return null;

  let body;

  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      "BAD_RESPONSE",
      "Server returned an invalid response.",
      undefined,
      response.status
    );
  }

  if (!response.ok || !body?.success) {
    throw new ApiError(
      body?.error?.code ?? "REQUEST_FAILED",
      body?.error?.message ?? "Request failed.",
      body?.error?.details,
      response.status
    );
  }

  return body.data;
}

export async function authRequest(
  path,
  { method = "POST", body, headers = {}, signal } = {}
) {
  let response;

  try {
    response = await fetch(`${AUTH_BASE}${path}`, {
      method,
      credentials: "same-origin",
      signal,
      headers: {
        "X-API-Monitor-Client": "web",
        ...(body !== undefined && {
          "Content-Type": "application/json",
        }),
        ...headers,
      },
      ...(body !== undefined && {
        body: JSON.stringify(body),
      }),
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;

    throw new ApiError(
      "NETWORK_ERROR",
      "Cannot connect to the server."
    );
  }

  return parseApiResponse(response);
}

export const authService = {
  register(data) {
    return authRequest("/register", { body: data });
  },

  login(data) {
    return authRequest("/login", { body: data });
  },

  logout() {
    return authRequest("/logout");
  },
};
