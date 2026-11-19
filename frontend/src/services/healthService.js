
export async function getBackendHealth(signal) {
  const signals = [AbortSignal.timeout(5000)];

  if (signal) {
    signals.push(signal);
  }

  const response = await fetch("/api/v1/health", {
    signal: AbortSignal.any(signals),
  });

  if (!response.ok) {
    throw new Error(`Backend returned HTTP ${response.status}`);
  }

  const result = await response.json();

  if (!result.success || result.data?.status !== "OK") {
    throw new Error("Backend health check failed");
  }

  return result.data;
}
