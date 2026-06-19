"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getApiBaseUrl } from "../lib/runtime-urls";

type AuthLoginPageProps = {
  expectedRole: "admin" | "photographer";
  defaultEmail: string;
  defaultPassword: string;
  storageKey: string;
  title: string;
  subtitle: string;
  helpText: string;
  homeHref: string;
  signupHref?: string;
  signupLabel?: string;
  successRoute: (args: {
    token: string;
    role?: string;
    searchParams: URLSearchParams;
  }) => Promise<string> | string;
  roleMismatchMessage: string;
};

export default function AuthLoginPage({
  expectedRole,
  defaultEmail,
  defaultPassword,
  storageKey,
  title,
  subtitle,
  helpText,
  homeHref,
  signupHref,
  signupLabel = "Kaydol",
  successRoute,
  roleMismatchMessage
}: AuthLoginPageProps) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(defaultPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [nextRoute, setNextRoute] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    const next = params.get("next");
    const emailParam = params.get("email");

    if (emailParam) {
      setEmail(emailParam);
    }

    if (next && next.startsWith("/")) {
      setNextRoute(next);
    }

    if (reason === "session_expired") {
      setMessage("Oturumun suresi doldu. Devam etmek icin tekrar giris yap.");
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const payload = (await response.json()) as {
        access_token?: string;
        detail?: string;
        user?: { role?: string };
      };

      if (!response.ok || !payload.access_token) {
        throw new Error(payload.detail ?? "Giris basarisiz.");
      }

      if (payload.user?.role !== expectedRole) {
        throw new Error(roleMismatchMessage);
      }

      window.localStorage.setItem(storageKey, payload.access_token);
      const searchParams = new URLSearchParams(window.location.search);
      const routeAfterLogin =
        nextRoute && nextRoute.startsWith("/")
          ? nextRoute
          : await successRoute({
              token: payload.access_token,
              role: payload.user?.role,
              searchParams
            });
      setMessage("Giris basarili. Yonlendiriliyorsun...");
      window.location.assign(routeAfterLogin);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Giris basarisiz.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <header className="login-topbar">
        <a className="login-brand" href={homeHref}>
          <span>F</span>
          <strong>FindMyShot</strong>
        </a>
        <div className="login-topbar-actions">
          <button className="button-secondary" type="button">
            Turkce
          </button>
          {signupHref ? (
            <a className="button" href={signupHref}>
              {signupLabel}
            </a>
          ) : null}
        </div>
      </header>

      <section className="login-frame-wrap">
        <div className="login-frame">
          <span className="login-kicker">
            {expectedRole === "admin" ? "ÜYE / ADMIN" : "FOTOĞRAFÇI"}
          </span>
          <h1>{title}</h1>
          <p className="login-intro">{subtitle}</p>
          <p className="login-helper">{helpText}</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              E-posta
              <input
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                type="email"
                value={email}
              />
            </label>

            <label>
              Sifre
              <div className="login-password-row">
                <input
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Sifre"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <button
                  className="login-eye-btn"
                  onClick={() => setShowPassword((current) => !current)}
                  type="button"
                >
                  {showPassword ? "Gizle" : "Göster"}
                </button>
              </div>
            </label>

            <a className="login-link" href="#">
              Sifremi Unuttum
            </a>

            <button className="button login-submit" disabled={loading} type="submit">
              {loading ? "Giris Yapiliyor..." : "Giris Yap"}
            </button>

            {signupHref ? (
              <p className="login-muted">
                Bir hesabin yoksa <a href={signupHref}>{signupLabel}</a>
              </p>
            ) : (
              <p className="login-muted">
                Davet linkin varsa bu sayfadan giriş yap.
              </p>
            )}

            {message ? <div className="status">{message}</div> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
