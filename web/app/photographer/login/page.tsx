"use client";

import AuthLoginPage from "../../../components/auth-login-page";

export default function PhotographerLoginPage() {
  return (
    <AuthLoginPage
      defaultEmail=""
      defaultPassword=""
      expectedRole="photographer"
      helpText="Bu giriş sadece davet edilen fotoğrafçılar içindir. Admin hesabın varsa /admin/login kullan."
      homeHref="/"
      roleMismatchMessage="Bu giriş fotoğrafçı içindir. Admin hesabınla /admin/login sayfasını kullan."
      storageKey="findmyshot_photographer_token"
      successRoute={async ({ role, searchParams }) => {
        const next = searchParams.get("next");
        if (next && next.startsWith("/")) {
          return next;
        }
        const eventSlug = searchParams.get("event");
        if (role === "photographer" && eventSlug) {
          return `/photographer?event=${encodeURIComponent(eventSlug)}`;
        }
        return "/photographer";
      }}
      subtitle="Davet linkinle gelen etkinliğe giriş yap."
      title="Fotoğrafçı Girişi"
    />
  );
}
