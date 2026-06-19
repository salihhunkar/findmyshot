import { getApiBaseUrl } from "./runtime-urls";

export function getServerApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ?? "http://127.0.0.1:8001";
}

function isLocalhostHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getClientApiBaseUrl() {
  const envApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const browserBaseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.hostname}`
      : null;
  const browserIsLocalhost =
    typeof window !== "undefined" ? isLocalhostHost(window.location.hostname) : false;

  // Production/public browser: always use current origin for API requests.
  if (browserBaseUrl && !browserIsLocalhost) {
    return browserBaseUrl;
  }

  if (envApiBaseUrl) {
    const normalized = envApiBaseUrl.replace(/\/$/, "");
    if (typeof window !== "undefined") {
      try {
        const parsed = new URL(normalized);
        if (
          isLocalhostHost(parsed.hostname) ||
          parsed.port === "8001" ||
          parsed.hostname === "0.0.0.0"
        ) {
          return browserBaseUrl ?? normalized;
        }
      } catch {
        // Keep normalized value as fallback below.
      }
    }
    return normalized;
  }

  return getApiBaseUrl();
}
