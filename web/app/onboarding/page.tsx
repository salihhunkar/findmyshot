"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../../lib/runtime-urls";

type Step = 1 | 2 | 3 | 4;

type OnboardingPayload = {
  step: number;
  email_verified: boolean;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  country?: string | null;
  city?: string | null;
  address?: string | null;
  birth_date?: string | null;
  phone?: string | null;
};

type OnboardingResponse = {
  onboarding?: OnboardingPayload;
  detail?: string;
};

const apiBaseUrl = getApiBaseUrl();
const tokenStorageKey = "findmyshot_admin_token";
const LOCAL_EMAIL_VERIFICATION_CODE = "123456";

const COUNTRY_OPTIONS = ["Türkiye", "Birleşik Arap Emirlikleri", "Almanya", "Birleşik Krallık", "Diğer"];
const CITY_OPTIONS = [
  "İstanbul",
  "Ankara",
  "İzmir",
  "Dubai",
  "Abu Dhabi",
  "Berlin",
  "Londra",
  "Diğer"
];

const STEP_COPY: Record<
  Step,
  { title: string; subtitle: string; hint: string }
> = {
  1: {
    title: "Kaydol",
    subtitle: "Dağıtıma açılan kapı",
    hint: "Hesabını oluşturarak etkinlik akışına başla."
  },
  2: {
    title: "E-postayı doğrula",
    subtitle: "6 haneli kod",
    hint: "E-postana gelen 6 haneli kodu gir ve devam et."
  },
  3: {
    title: "Profili güncelle",
    subtitle: "Bilgilerini tamamla",
    hint: "İletişim ve profil bilgilerini eksiksiz gir."
  },
  4: {
    title: "Tamamlandı",
    subtitle: "Panele geçiş",
    hint: "Kurulum tamamlandı, panelini keşfet."
  }
};

function clampStep(step: number | undefined): Step {
  if (!step || step <= 1) return 1;
  if (step === 2) return 2;
  if (step === 3) return 3;
  return 4;
}

export default function OnboardingPage() {
  const router = useRouter();
  const steps: Step[] = [1, 2, 3, 4];
  const [step, setStep] = useState<Step>(1);
  const [booting, setBooting] = useState(true);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [registerForm, setRegisterForm] = useState({
    fullName: "",
    email: "",
    password: "",
    accountType: "free_distribution"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [verificationCode, setVerificationCode] = useState(LOCAL_EMAIL_VERIFICATION_CODE);
  const [profile, setProfile] = useState({
    ad: "",
    soyad: "",
    ulke: "",
    sehir: "",
    adres: "",
    dogumTarihi: "",
    telefon: ""
  });

  const current = STEP_COPY[step];
  const progress = useMemo(() => (step / 4) * 100, [step]);
  const progressStyle = { "--onb-progress": `${progress}%` } as CSSProperties;

  useEffect(() => {
    const stored = window.localStorage.getItem(tokenStorageKey);
    if (!stored) {
      setBooting(false);
      return;
    }

    setToken(stored);
    void loadOnboarding(stored);
  }, []);

  function hydrateFromOnboarding(payload: OnboardingPayload) {
    setStep(clampStep(payload.step));
    const hydratedFullName = payload.full_name ?? "";
    const nameParts = hydratedFullName.split(" ").filter(Boolean);
    const hydratedFirstName = payload.first_name ?? nameParts[0] ?? "";
    const hydratedLastName =
      payload.last_name ?? nameParts.slice(1).join(" ") ?? "";
    setRegisterForm((currentRegister) => ({
      ...currentRegister,
      fullName: payload.full_name ?? currentRegister.fullName,
      email: payload.email ?? currentRegister.email
    }));
    setProfile({
      ad: hydratedFirstName,
      soyad: hydratedLastName,
      ulke: payload.country ?? "",
      sehir: payload.city ?? "",
      adres: payload.address ?? "",
      dogumTarihi: payload.birth_date ?? "",
      telefon: payload.phone ?? ""
    });
  }

  async function loadOnboarding(activeToken: string) {
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/onboarding`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const payload = (await response.json()) as OnboardingResponse;
      if (!response.ok || !payload.onboarding) {
        throw new Error(payload.detail ?? "Onboarding bilgisi alinamadi.");
      }
      hydrateFromOnboarding(payload.onboarding);
    } catch {
      window.localStorage.removeItem(tokenStorageKey);
      setToken("");
      setStep(1);
      setMessage("Oturum bulunamadi. Kayit asamasindan devam et.");
    } finally {
      setBooting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registerForm.email,
          password: registerForm.password,
          full_name: registerForm.fullName || null,
          account_type: registerForm.accountType
        })
      });
      const payload = (await response.json()) as {
        access_token?: string;
        onboarding?: OnboardingPayload;
        detail?: string;
      };

      if (!response.ok || !payload.access_token) {
        throw new Error(payload.detail ?? "Kayit tamamlanamadi.");
      }

      window.localStorage.setItem(tokenStorageKey, payload.access_token);
      setToken(payload.access_token);
      if (payload.onboarding) {
        hydrateFromOnboarding(payload.onboarding);
      } else {
        setStep(2);
      }
      setMessage("Kayit tamamlandi. Simdi e-postani dogrulayabilirsin.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayit basarisiz.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setMessage("Bu adim icin once kaydolmalisin.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/onboarding/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: verificationCode
        })
      });
      const payload = (await response.json()) as OnboardingResponse;
      if (!response.ok || !payload.onboarding) {
        throw new Error(payload.detail ?? "Dogrulama tamamlanamadi.");
      }
      hydrateFromOnboarding(payload.onboarding);
      setMessage("E-posta dogrulama adimi tamamlandi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Dogrulama basarisiz.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setMessage("Bu adim icin once kaydolmalisin.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/onboarding/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: registerForm.fullName,
          email: registerForm.email,
          first_name: profile.ad,
          last_name: profile.soyad,
          country: profile.ulke,
          city: profile.sehir,
          address: profile.adres,
          birth_date: profile.dogumTarihi,
          phone: profile.telefon
        })
      });
      const payload = (await response.json()) as OnboardingResponse;
      if (!response.ok || !payload.onboarding) {
        throw new Error(payload.detail ?? "Profil kaydedilemedi.");
      }
      hydrateFromOnboarding(payload.onboarding);
      setMessage("Profilin kaydedildi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Profil kaydi basarisiz.");
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    if (!token) {
      router.push("/admin/login");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/onboarding/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = (await response.json()) as OnboardingResponse;
      if (!response.ok || !payload.onboarding) {
        throw new Error(payload.detail ?? "Kurulum tamamlanamadi.");
      }
      hydrateFromOnboarding(payload.onboarding);
      const meResponse = await fetch(`${apiBaseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const mePayload = (await meResponse.json()) as { role?: string };
      router.push(mePayload.role === "admin" ? "/admin?empty=true" : "/photographer");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kurulum basarisiz.");
    } finally {
      setLoading(false);
    }
  }

  function prevStep() {
    setStep((currentStep) => (currentStep > 1 ? ((currentStep - 1) as Step) : currentStep));
  }

  return (
    <main className="onboarding-layout">
      <aside className="onboarding-rail">
        <div className="onboarding-logo">F</div>
        <div className="onboarding-rail-icons">
          <span className="onboarding-rail-icon onboarding-rail-icon-active">DB</span>
          <span className="onboarding-rail-icon">EV</span>
          <span className="onboarding-rail-icon">NT</span>
          <span className="onboarding-rail-icon">PR</span>
        </div>
      </aside>

      <aside className="onboarding-side">
        <ol className="onboarding-step-list">
          {steps.map((numeric) => {
            const isActive = numeric === step;
            const isDone = numeric < step;
            return (
              <li className="onboarding-step-item" key={numeric}>
                <span
                  className={[
                    "onboarding-step-index",
                    isActive ? "onboarding-step-index-active" : "",
                    isDone ? "onboarding-step-index-done" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {numeric}
                </span>
                <div>
                  <strong>{STEP_COPY[numeric].title}</strong>
                  <small>{STEP_COPY[numeric].subtitle}</small>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="onboarding-progress-card">
          <strong>100 puan kazanacaksınız!</strong>
          <div className="onboarding-progress-gauge" style={progressStyle}>
            <div>
              <b>100</b>
              <span>Puan</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="onboarding-main">
        <header className="onboarding-topbar">
          <div>
            <h1>Başlangıç</h1>
            <p>Home / Başlangıç</p>
          </div>
          <div className="onboarding-topbar-actions">
            <Link className="button-secondary" href="/admin/login">
              Giriş
            </Link>
            <button className="button-secondary" type="button">
              Canlı Sohbet
            </button>
          </div>
        </header>

        <section className="onboarding-content panel">
          {booting ? (
            <article className="onboarding-center-card">
              <div className="onboarding-figure">...</div>
              <div>
                <h2>Yukleniyor</h2>
                <p className="muted">Onboarding adimlari hazirlaniyor.</p>
              </div>
            </article>
          ) : null}

          {!booting && step === 1 ? (
            <article className="onboarding-profile-card">
              <h2>Kaydol</h2>
              <p className="muted">{current.hint}</p>
              <form className="onboarding-register-form" onSubmit={handleRegister}>
                <div className="onboarding-plan-grid" role="radiogroup" aria-label="Üyelik tipi">
                  <button
                    className={[
                      "onboarding-plan-option",
                      registerForm.accountType === "free_distribution"
                        ? "onboarding-plan-option-active"
                        : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setRegisterForm((state) => ({
                        ...state,
                        accountType: "free_distribution"
                      }))
                    }
                    role="radio"
                    aria-checked={registerForm.accountType === "free_distribution"}
                    type="button"
                  >
                    <strong>Ücretsiz fotoğraf dağıtımı</strong>
                    <span>Etkinlik fotoğraflarını QR ile misafirlerine ulaştır.</span>
                  </button>
                  <button
                    className={[
                      "onboarding-plan-option",
                      registerForm.accountType === "paid_sales"
                        ? "onboarding-plan-option-active"
                        : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() =>
                      setRegisterForm((state) => ({
                        ...state,
                        accountType: "paid_sales"
                      }))
                    }
                    role="radio"
                    aria-checked={registerForm.accountType === "paid_sales"}
                    type="button"
                  >
                    <strong>Ücretli fotoğraf satışı</strong>
                    <span>Tekil fotoğraf veya paket satış akışını kullan.</span>
                  </button>
                </div>
                <label className="field">
                  <span>Ad Soyad (Opsiyonel)</span>
                  <input
                    onChange={(event) =>
                      setRegisterForm((state) => ({
                        ...state,
                        fullName: event.target.value
                      }))
                    }
                    placeholder="Ad Soyad"
                    value={registerForm.fullName}
                  />
                </label>
                <label className="field">
                  <span>E-posta</span>
                  <input
                    onChange={(event) =>
                      setRegisterForm((state) => ({
                        ...state,
                        email: event.target.value
                      }))
                    }
                    placeholder="name@example.com"
                    type="email"
                    value={registerForm.email}
                  />
                </label>
                <label className="field">
                  <span>Şifre</span>
                  <div className="login-password-row onboarding-password-row">
                    <input
                      minLength={6}
                      onChange={(event) =>
                        setRegisterForm((state) => ({
                          ...state,
                          password: event.target.value
                        }))
                      }
                      placeholder="En az 6 karakter"
                      type={showPassword ? "text" : "password"}
                      value={registerForm.password}
                    />
                    <button
                      aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                      className="login-eye-btn onboarding-eye-btn"
                      onClick={() => setShowPassword((current) => !current)}
                      type="button"
                    >
                      {showPassword ? "🙈" : "👁"}
                    </button>
                  </div>
                </label>
                <div className="cta-row">
                  <button className="button" disabled={loading} type="submit">
                    {loading ? "Kaydediliyor..." : "Kaydol ve Devam Et"}
                  </button>
                </div>
              </form>
            </article>
          ) : null}

          {!booting && step === 2 ? (
            <article className="onboarding-center-card onboarding-verify-card">
              <div className="onboarding-figure">MAIL</div>
              <div>
                <h2>E-postayı doğrula</h2>
                <p className="muted">
                  Local ortamda test kodu <strong>123456</strong>. E-postana gelen 6 haneli kodu
                  gir ve devam et.
                </p>
              </div>
              <form className="onboarding-verify-form" onSubmit={handleVerifyEmail}>
                <label className="field onboarding-code-field">
                  <span>6 Haneli Kod</span>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder={LOCAL_EMAIL_VERIFICATION_CODE}
                    value={verificationCode}
                  />
                </label>
                <div className="cta-row">
                  <button
                    className="button-secondary"
                    onClick={() => setMessage("Dogrulama e-postasi tekrar gonderildi.")}
                    type="button"
                  >
                    Tekrar Gonder
                  </button>
                  <button className="button" disabled={loading} type="submit">
                    {loading ? "Kontrol ediliyor..." : "Kodu Doğrula"}
                  </button>
                </div>
              </form>
            </article>
          ) : null}

          {!booting && step === 3 ? (
            <article className="onboarding-profile-card">
              <h2>Profil</h2>
              <p className="muted">{current.hint}</p>

              <form className="onboarding-register-form" onSubmit={handleSaveProfile}>
                <div className="onboarding-profile-grid onboarding-account-grid">
                  <label className="field">
                    <span>Ad Soyad</span>
                    <input
                      onChange={(event) =>
                        setRegisterForm((state) => ({
                          ...state,
                          fullName: event.target.value
                        }))
                      }
                      value={registerForm.fullName}
                    />
                  </label>
                  <label className="field">
                    <span>E-posta</span>
                    <input
                      onChange={(event) =>
                        setRegisterForm((state) => ({
                          ...state,
                          email: event.target.value
                        }))
                      }
                      type="email"
                      value={registerForm.email}
                    />
                  </label>
                </div>

                <div className="onboarding-profile-grid">
                  <label className="field">
                    <span>Ad</span>
                    <input
                      onChange={(event) =>
                        setProfile((state) => ({ ...state, ad: event.target.value }))
                      }
                      value={profile.ad}
                    />
                  </label>
                  <label className="field">
                    <span>Soyad</span>
                    <input
                      onChange={(event) =>
                        setProfile((state) => ({ ...state, soyad: event.target.value }))
                      }
                      value={profile.soyad}
                    />
                  </label>
                  <label className="field">
                    <span>Ülke</span>
                    <select
                      onChange={(event) =>
                        setProfile((state) => ({ ...state, ulke: event.target.value }))
                      }
                      value={profile.ulke}
                    >
                      <option value="">Ülke seç</option>
                      {COUNTRY_OPTIONS.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Şehir</span>
                    <input
                      type="text"
                      placeholder="Şehrinizi girin"
                      onChange={(event) =>
                        setProfile((state) => ({ ...state, sehir: event.target.value }))
                      }
                      value={profile.sehir}
                    />
                  </label>
                  <label className="field onboarding-field-full">
                    <span>Adres</span>
                    <input
                      onChange={(event) =>
                        setProfile((state) => ({ ...state, adres: event.target.value }))
                      }
                      value={profile.adres}
                    />
                  </label>
                  <label className="field">
                    <span>Doğum Tarihi</span>
                    <input
                      max={new Date().toISOString().split("T")[0]}
                      min="1900-01-01"
                      onChange={(event) =>
                        setProfile((state) => ({ ...state, dogumTarihi: event.target.value }))
                      }
                      type="date"
                      value={profile.dogumTarihi}
                    />
                  </label>
                  <label className="field">
                    <span>İrtibat Telefonu</span>
                    <input
                      onChange={(event) =>
                        setProfile((state) => ({ ...state, telefon: event.target.value }))
                      }
                      value={profile.telefon}
                    />
                  </label>
                </div>

                <div className="cta-row">
                  <button className="button-secondary" onClick={prevStep} type="button">
                    Geri
                  </button>
                  <button className="button" disabled={loading} type="submit">
                    {loading ? "Kaydediliyor..." : "Kaydet ve Devam Et"}
                  </button>
                </div>
              </form>
            </article>
          ) : null}

          {!booting && step === 4 ? (
            <article className="onboarding-center-card">
              <div className="onboarding-figure">DONE</div>
              <div>
                <h2>Tebrikler!</h2>
                <p className="muted">
                  Kurulum başarıyla tamamlandı. Şimdi fotoğraflarını yükleyebilir
                  ve paneli aktif olarak kullanabilirsin.
                </p>
              </div>
              <button className="button" disabled={loading} onClick={handleComplete} type="button">
                {loading ? "Tamamlanıyor..." : "Paneli Keşfet"}
              </button>
            </article>
          ) : null}

          {message ? <div className="status">{message}</div> : null}
        </section>
      </section>
    </main>
  );
}
