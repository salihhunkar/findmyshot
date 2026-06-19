"use client";

import Link from "next/link";

export default function LoginLandingPage() {
  return (
    <main className="login-shell">
      <header className="login-topbar">
        <a className="login-brand" href="/">
          <span>F</span>
          <strong>FindMyShot</strong>
        </a>
        <div className="login-topbar-actions">
          <button className="button-secondary" type="button">
            Turkce
          </button>
          <Link className="button" href="/onboarding">
            Kaydol
          </Link>
        </div>
      </header>

      <section className="login-frame-wrap">
        <div className="login-frame login-choice-frame">
          <span className="login-kicker">GIRIS SECIMI</span>
          <h1>Hesabınla devam et</h1>
          <p className="login-intro">
            Üye / etkinlik sahibi ve davetli fotoğrafçı girişleri ayrı tutulur.
          </p>
          <p className="login-helper">
            Admin etkinliklerini ve görevli fotoğrafçılarını yönetir. Fotoğrafçı
            ise kendine ait davet linkiyle yalnızca kendi paneline girer.
          </p>

          <div className="login-choice-grid">
            <article className="login-choice-card">
              <span className="login-choice-badge">ÜYE / ADMIN</span>
              <h2>Etkinlik sahibi girişi</h2>
              <p>
                Etkinlik oluştur, fotoğrafçılarını ata, materyalleri yönet ve
                misafir akışını kontrol et.
              </p>
              <a className="button" href="/admin/login">
                Admin Girişi
              </a>
            </article>

            <article className="login-choice-card">
              <span className="login-choice-badge">FOTOĞRAFÇI</span>
              <h2>Davetli fotoğrafçı girişi</h2>
              <p>
                Adminin gönderdiği e-posta ve şifre ile yalnızca sana atanmış
                etkinliğe eriş.
              </p>
              <a className="button-secondary" href="/photographer/login">
                Fotoğrafçı Girişi
              </a>
            </article>
          </div>

          <p className="login-muted">
            Hesap bilgilerin hazırsa üstteki girişlerden devam et.
          </p>
        </div>
      </section>
    </main>
  );
}
