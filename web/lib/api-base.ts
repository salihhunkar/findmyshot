export function getServerApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "http://127.0.0.1:8001";
}

function isLocalhostHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getClientApiBaseUrl() {
  const envApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (envApiBaseUrl) {
    const normalized = envApiBaseUrl.replace(/\/$/, "");
    if (typeof window !== "undefined") {
      try {
        const parsed = new URL(normalized);
        if (isLocalhostHost(parsed.hostname) && !isLocalhostHost(window.location.hostname)) {
          parsed.hostname = window.location.hostname;
          return parsed.toString().replace(/\/$/, "");
        }
      } catch {
        // Keep normalized value as fallback below.
      }
    }
    return normalized;
  }

  // Use direct backend URL on client too. Next.js rewrite responses for multipart
  // errors can strip JSON payloads and surface plain text "Internal Server Error".
  return getServerApiBaseUrl();
}
