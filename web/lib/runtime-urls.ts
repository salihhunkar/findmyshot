const LOCAL_API_FALLBACK = "http://127.0.0.1:8001";
const LOCAL_WEB_FALLBACK = "http://127.0.0.1:3000";
const DEFAULT_LAN_HOST = "192.168.1.16";

function getLanFallbackUrl(port: number) {
  const lanHost = process.env.NEXT_PUBLIC_LAN_HOST?.trim() || DEFAULT_LAN_HOST;
  return ensureUrlProtocol(`${lanHost}:${port}`);
}

function ensureUrlProtocol(value: string) {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) {
    return trimmed;
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

function isLocalhost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function getApiBaseUrl() {
  const envApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (envApiBaseUrl) {
    return ensureUrlProtocol(envApiBaseUrl).replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;
    if (isLocalhost(hostname)) {
      return getLanFallbackUrl(8001);
    }
    return ensureUrlProtocol(`${protocol}//${hostname}:8001`);
  }

  return LOCAL_API_FALLBACK;
}

export function getShareBaseUrl() {
  const envShareBaseUrl = process.env.NEXT_PUBLIC_SHARE_BASE_URL?.trim();
  if (envShareBaseUrl) {
    const normalized = ensureUrlProtocol(envShareBaseUrl);
    try {
      const parsed = new URL(normalized);
      if (isLocalhost(parsed.hostname)) {
        return getLanFallbackUrl(3000);
      }
    } catch {
      // Keep normalized value as fallback below.
    }
    return normalized;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    if (isLocalhost(hostname)) {
      return getLanFallbackUrl(3000);
    }
    return ensureUrlProtocol(`${protocol}//${hostname}${port ? `:${port}` : ""}`);
  }

  return LOCAL_WEB_FALLBACK;
}
