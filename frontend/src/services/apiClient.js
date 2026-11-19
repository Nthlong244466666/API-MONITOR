
import {
  ApiError,
  parseApiResponse,
} from "./authService";

export function createApiClient({
  getAccessToken,
  refreshAccessToken,
  onUnauthorized,
}) {
  return async function apiFetch(path, options = {}) {
    const {
      headers: customHeaders = {},
      body,
      ...rest
    } = options;

    async function send(token) {
      const headers = {
        ...customHeaders,
        ...(token && {
          Authorization: `Bearer ${token}`,
        }),
      };

      let requestBody = body;

      if (
        body !== undefined &&
        body !== null &&
        !(body instanceof FormData) &&
        typeof body !== "string"
      ) {
        requestBody = JSON.stringify(body);
        headers["Content-Type"] ??= "application/json";
      }

      try {
        return await fetch(`/api/v1${path}`, {
          ...rest,
          headers,
          body: requestBody,
          credentials: "same-origin",
        });
      } catch {
        throw new ApiError(
          "NETWORK_ERROR",
          "Cannot connect to the server."
        );
      }
    }

    let response = await send(getAccessToken());

    if (response.status === 401) {
      try {
        const nextToken = await refreshAccessToken();

        if (!nextToken) {
          throw new Error("Session unavailable");
        }

        response = await send(nextToken);
      } catch {
        onUnauthorized();

        throw new ApiError(
          "SESSION_EXPIRED",
          "Your session has expired.",
          undefined,
          401
        );
      }
    }

    if (response.status === 401) {
      onUnauthorized();

      throw new ApiError(
        "SESSION_EXPIRED",
        "Your session has expired.",
        undefined,
        401
      );
    }

    return parseApiResponse(response);
  };
}
