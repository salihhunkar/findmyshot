"use client";

import AuthLoginPage from "../../../components/auth-login-page";
import { getApiBaseUrl } from "../../../lib/runtime-urls";

export default function AdminLoginPage() {
  return (
    <AuthLoginPage
      defaultEmail="admin@findmyshot.app"
      defaultPassword="admin123"
      expectedRole="admin"
      helpText="Bu giriş etkinlik sahipleri, profesyonel üyeler ve ana admin içindir."
      homeHref="/"
      roleMismatchMessage="Bu hesap fotoğrafçı rolünde. Etkinlik sahibi/admin hesabı için kayıt akışını kullan veya /photographer/login sayfasından fotoğrafçı girişi yap."
      signupHref="/onboarding"
      signupLabel="Kaydol"
      storageKey="findmyshot_admin_token"
      successRoute={async ({ token, role, searchParams }) => {
        const response = await fetch(
          `${getApiBaseUrl()}/api/auth/onboarding`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        if (!response.ok) {
          return role === "admin" ? "/admin" : "/photographer/login";
        }

        const payload = (await response.json()) as {
          onboarding?: { step?: number };
        };
        const step = payload.onboarding?.step ?? 4;
        if (step < 4) {
          return "/onboarding";
        }

        const next = searchParams.get("next");
        if (next && next.startsWith("/")) {
          return next;
        }
        return role === "admin" ? "/admin" : "/photographer/login";
      }}
      subtitle="Etkinliklerini, yayınlarını ve görevli fotoğrafçılarını buradan yönet."
      title="Login"
    />
  );
}
