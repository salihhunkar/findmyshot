"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const heroImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBTVbhO77K140Em3XRlggJPE5l7poVryVBgB_xS4JkN2ZBBsz9NsTS7Nb2_-GhnHKWGBoy4Wm0KKhmcvbMv15zx3WukX1Tnd6_aEw6OOjmpyaKIfObfcxEC6CaaE33JLtpw80ljeJYAvl7RVeIwNOo46obFGQHTzb4941LYnxbUGzfHx1_0MQr2pzIapGqGCKqz20zjMjLRJPVR-FK13YoqoB_b5aegkhQqSLzn6Li77WNcbNmvYA2VuGlK88IaOQOM-sSLFek9pfnm";

const stepCards = [
  {
    step: "1",
    title: "Çekimi Yap",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDCLt2SFc8wezjndEJvxevkfJcO2uvGy8mt_Sy3xp78oANUVd7CrhhRJCAZctVipMWC--xVy0mjEGC_4zuGwF01BFlLAWDRtu6cfY5jIJL_5FUI7fJYr1xVvcG_XtROiky8iO5bG7dZSDG2IxkrTtzQL2BUbfaDojrKqRhhivjmuhkxEZEyiW0sv0dACX259g4B7ZFrOqW6aQeQ4-AMRPaWOTjR6whybFnVNPVoTylF82xzS4q5hfwkxjeHAKqcF8W2MaUVIQLqTQ2d",
    text: "Fotoğrafçı etkinliği çeker ve fotoğrafları sisteme anında veya çekim sonrası yükler."
  },
  {
    step: "2",
    title: "AI İşleme",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCKB5vjV9H-ymZE-dTSIxfZwuFg2nT2ad8wQWQ2kzBti7XNF7-t064cOVfGV80jV_FnCPqqdh59J23vtONLyXl8iGho4ibDVMclHbKdjxYgLIa_lbm6_jNwOJTnh2GyC55axgBohYJQvsUq-he0ACzQwXQ255M58fCHiWa1nwWZ-M7qcCvaTxKnBruo6JUekceLZfEB6P4IssqDes7mG7fFQeo3SKWeYcXW5EppX-gHVvpkOqY9qyzLVe7u_w-IAtHt5Uwosv6q9nj4",
    text: "Yapay zekamız tüm fotoğrafları tarayarak yüzleri ve etkinlik detaylarını saniyeler içinde indeksler."
  },
  {
    step: "3",
    title: "Anında Erişim",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA-GhaBXcgtTKbIz52iJWRKtrs7SMTfWIanajHe6_yWNIXqPZO1LUbISG6dQVtNk6eFcSVz7V10s_z09w_4qVUwok9IQj0G5UQIe7V6wjXjIrij05g5xfBRDMj_WX4JCeJClWlEnvJ3ki0lMiq33_qumacD28toh0zZRsPm0j-iRwtBhYelBAre3ceWuuXS5bDRyFSTKv_VbDLBLdv5xWau-9UoXmCy_80kd7hj5cmNSErPYXSpg7_I-YhVMt7ia-1FkrEyqlSKb7LH",
    text: "Misafirler QR kodu taratarak veya bir selfie ile sadece kendilerinin olduğu fotoğraflara anında ulaşır."
  }
] as const;

const securityStats = [
  { value: "0.4sn", label: "Tanıma Hızı" },
  { value: "%99.8", label: "Eşleşme Oranı" },
  { value: "1M+", label: "Mutlu Kullanıcı" },
  { value: "500+", label: "Partner Etkinlik" }
] as const;

const footerColumns = [
  {
    title: "Ürün",
    links: ["Özellikler", "Fiyatlandırma", "Partnerlik", "API"]
  },
  {
    title: "Destek",
    links: ["Help Center", "Blog", "Kullanım Kılavuzu", "İletişim"]
  },
  {
    title: "Yasal",
    links: ["Privacy Policy", "Terms of Service", "Cookie Settings", "KVKK Aydınlatma Metni"]
  }
] as const;

type CurrentViewer = {
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};

export default function HomePage() {
  const [viewer, setViewer] = useState<CurrentViewer | null>(null);

  useEffect(() => {
    const candidateTokens = [
      window.localStorage.getItem("findmyshot_admin_token"),
      window.localStorage.getItem("findmyshot_photographer_token")
    ].filter((token): token is string => Boolean(token));

    if (candidateTokens.length === 0) {
      return;
    }

    let cancelled = false;

    async function loadViewer() {
      for (const token of candidateTokens) {
        try {
          const response = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!response.ok) {
            continue;
          }

          const payload = (await response.json()) as CurrentViewer;
          if (!cancelled) {
            setViewer(payload);
          }
          return;
        } catch {
          // Try the next stored token.
        }
      }
    }

    void loadViewer();

    return () => {
      cancelled = true;
    };
  }, []);

  const viewerLabel = viewer?.full_name?.trim() || viewer?.email?.trim() || "Profilim";
  const viewerHref = viewer?.role === "admin" ? "/admin" : "/photographer";

  return (
    <main className="stitch-home">
      <header className="stitch-home-topbar">
        <div className="stitch-home-brand">
          <div className="stitch-home-brand-mark">F</div>
          <div>
            <strong>FindMyShot</strong>
            <span>Fotoğraflarını saniyeler içinde bul</span>
          </div>
        </div>

        <nav className="stitch-home-nav" aria-label="Ana gezinme">
          <a href="#how-it-works">Nasıl Çalışır?</a>
          <a href="#organizer">Organizasyonlar</a>
          <a href="#security">Güvenlik</a>
        </nav>

        <div className="stitch-home-actions">
          {viewer ? (
            <Link className="button" href={viewerHref}>
              {viewerLabel}
            </Link>
          ) : (
            <>
              <Link className="button-secondary" href="/login">
                Giriş
              </Link>
              <Link className="button" href="/onboarding">
                Kayıt Ol
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="stitch-home-hero" id="hero">
        <article className="stitch-home-hero-primary">
          <div className="stitch-home-hero-copy">
            <span className="stitch-home-kicker">ETKİNLİK FOTOĞRAFÇILIĞI 2.0</span>
            <h1>
              Fotoğraflarını <span>Saniyeler</span> İçinde
              <br />
              Bul
            </h1>
            <p>
              FindMyShot’ın yapay zeka destekli yüz tanıma teknolojisi ile binlerce fotoğraf
              arasından kendinizi anında bulun. QR kodunuzu tarayın veya bir selfie yükleyin,
              gerisini biz halledelim.
            </p>
            <div className="stitch-home-cta-row">
              <Link className="stitch-home-primary-cta" href="/scan">
                QR Kod Tara
              </Link>
            </div>
            <div className="stitch-home-trust-row">
              <div>
                <span>⚡</span>
                <strong>Sıfır Bekleme</strong>
              </div>
              <div>
                <span>✓</span>
                <strong>%99.8 Doğruluk</strong>
              </div>
            </div>
          </div>

          <div className="stitch-home-hero-visual">
            <div className="stitch-home-hero-photo-frame">
              <img alt="Event Photography" src={heroImage} />
              <div className="stitch-home-hero-overlay">
                <div className="stitch-home-avatar-stack">
                  <img
                    alt="User"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbYsdCyg1gq_otuxIcM8XbPwdFYYyu59ziCPcjQotyYVhhyWx_x3RtlrTSqo32adRCmTQZQITuB8s4T1qLUWrhOhZ2RosVZ3rk0oozFA0G5t345WiJ1tI6NB4DZyuM1dNUDwAn1zD_BxpeRy0HtIy4CPUZzLmBZlxxWV_epZ4iZ9RSVVE_7E3ThpP7ljjOrnO4CSHhHJU2YY-k9bPgaWxupgkm9y2V8SYOv4jQwZIpgixrw4nvYHLKi8WqGhZKAR2hZMtdyp5VaBGC"
                  />
                </div>
                <div className="stitch-home-overlay-text">
                  <strong>Kendi Fotoğrafını Bul</strong>
                  <div className="stitch-home-overlay-sub">Yapay zeka ile anında eşleş</div>
                </div>
              </div>
              <div className="stitch-home-result-chip">
                <strong>12 Fotoğraf Bulundu</strong>
                <span>Galeriye Eklendi</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="stitch-home-organizer" id="organizer">
        <article className="stitch-home-organizer-card">
          <div className="stitch-home-organizer-copy">
            <h2>Etkinlik Sahipleri ve Fotoğrafçılar İçin</h2>
            <p>
              Etkinliğinizdeki fotoğrafları misafirlerinize ulaştırmanın en modern yolu. Karmaşık
              klasör yapıları veya Wetransfer linkleri ile uğraşmayın. Organizatör panelinden
              galerilerinizi yönetin, AI gücünü kullanın.
            </p>
            <div className="stitch-home-organizer-actions">
              <Link className="stitch-home-organizer-primary" href="/onboarding">
                Hemen Kayıt Ol
              </Link>
              <Link className="stitch-home-organizer-secondary" href="/login">
                Organizatör Girişi
              </Link>
            </div>
          </div>
          <div className="stitch-home-organizer-visual">
            <div className="stitch-home-organizer-grid"></div>
            <div className="stitch-home-organizer-dashboard">
              <div className="stitch-home-organizer-dashboard-head">
                <span>Dashboard</span>
                <span>◫</span>
              </div>
              <div className="stitch-home-organizer-lines">
                <span></span>
                <span></span>
                <div>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <div className="stitch-home-organizer-quote">
                <p>
                  “FindMyShot ile teslimat süremiz %90 kısaldı. Müşteri memnuniyetimiz tavan
                  yaptı.”
                </p>
                <strong>— Professional Photo Lab</strong>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="stitch-home-section" id="how-it-works">
        <div className="stitch-home-section-head">
          <h2>Nasıl Çalışır?</h2>
          <p>
            Karmaşık süreçleri basit adımlara indirdik. Hem fotoğrafçılar hem de misafirler için
            kusursuz bir deneyim.
          </p>
        </div>

        <div className="stitch-home-step-grid">
          {stepCards.map((card) => (
            <article className="stitch-home-step-card" key={card.step}>
              <div className="stitch-home-step-image-wrap">
                <img alt={card.title} src={card.image} />
                <div className="stitch-home-step-number">{card.step}</div>
              </div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="stitch-home-security" id="security">
        <div className="stitch-home-security-copy">
          <h2>Güvenliğiniz Önceliğimiz</h2>
          <p>
            Verileriniz uçtan uca şifrelenir ve biyometrik verileriniz sadece eşleşme amacıyla
            kullanılır. Güvenli arşivimizle fotoğraflarınız dilediğiniz süre boyunca koruma
            altındadır.
          </p>
          <ul>
            <li>GDPR &amp; KVKK Uyumlu</li>
            <li>Bulut Yedekleme</li>
          </ul>
        </div>

        <div className="stitch-home-stats-grid">
          {securityStats.map((stat) => (
            <div className="stitch-home-stat-card" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="stitch-home-cta">
        <div className="stitch-home-cta-card">
          <h2>Kendi etkinliğini başlatmaya hazır mısın?</h2>
          <div className="stitch-home-cta-row">
            <Link className="stitch-home-cta-white" href="/events/create">
              Ücretsiz Dene
            </Link>
            <Link className="stitch-home-cta-dark" href="/login">
              Bize Ulaşın
            </Link>
          </div>
        </div>
      </section>

      <footer className="stitch-home-footer">
        <div className="stitch-home-footer-grid">
          <div className="stitch-home-footer-brand">
            <strong>FindMyShot</strong>
            <p>Anılarınızı yapay zeka ile canlandırıyoruz. Etkinliklerin en hızlı fotoğraf dağıtım platformu.</p>
          </div>
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h4>{column.title}</h4>
              <ul>
                {column.links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </footer>
    </main>
  );
}
