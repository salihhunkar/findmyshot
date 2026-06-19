"use client";

import { useEffect, useMemo, useState } from "react";
import GuestSearchPanel from "./guest-search-panel";
import { getClientApiBaseUrl } from "../lib/api-base";

const adminTokenStorageKey = "findmyshot_admin_token";

type LogoPlacement = {
  x: number;
  y: number;
  size: number;
};

type EventMaterials = {
  covers: string[];
  selected_cover: string | null;
  frame_horizontal: string | null;
  frame_vertical: string | null;
  frame_color?: string | null;
  frame_thickness?: number;
  logo_asset: string | null;
  qr_logo: string | null;
  logo_placement: LogoPlacement;
};

type EventData = {
  id: string;
  title: string;
  slug: string;
  event_date: string | null;
  location: string | null;
  status: string;
  materials: EventMaterials | null;
};

type MobileEntryScreen = "qr-start" | "scanner" | "welcome" | "search";
type CheckoutSuccessPayload = {
  orderId: string;
  unlockedPhotos: Array<{ photo_id: string; download_url: string }>;
};

function formatDateLabel(value: string | null) {
  if (!value) return "Tarih yakinda duyurulacak";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function getFilenameFromUrl(fileUrl: string, fallbackName: string) {
  try {
    const url = new URL(fileUrl);
    const segments = url.pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      return decodeURIComponent(lastSegment.split("?")[0] ?? fallbackName);
    }
  } catch {
    // Fallback below.
  }
  return fallbackName;
}

function buildDownloadUrl(fileUrl: string, fallbackName: string) {
  const query = new URLSearchParams({
    source_url: fileUrl,
    filename: getFilenameFromUrl(fileUrl, fallbackName)
  });
  return `${getClientApiBaseUrl()}/api/files/download?${query.toString()}`;
}

async function saveImageToDevice(fileUrl: string, fallbackName: string) {
  const downloadUrl = buildDownloadUrl(fileUrl, fallbackName);
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error("Fotoğraf indirilemedi.");
  }

  const blob = await response.blob();
  const file = new File([blob], getFilenameFromUrl(fileUrl, fallbackName), {
    type: blob.type || "image/jpeg"
  });

  if (navigator.canShare?.({ files: [file] }) && navigator.share) {
    await navigator.share({
      files: [file],
      title: "FindMyShot fotoğrafı"
    });
    return;
  }

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = file.name;
  link.rel = "noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function MobileGuestEventPageClient({
  initialEvent,
  previewRequested,
  slug
}: {
  initialEvent: EventData | null;
  previewRequested: boolean;
  slug: string;
}) {
  const [event, setEvent] = useState<EventData | null>(initialEvent);
  const [loading, setLoading] = useState(!initialEvent && previewRequested);
  const [message, setMessage] = useState<string | null>(
    initialEvent
      ? null
      : previewRequested
        ? null
        : "Bu etkinlik su anda misafir erisimine acik degil."
  );
  const [flowState, setFlowState] = useState({
    hasSelfie: false,
    hasMatches: false,
    hasUnlockedPhotos: false
  });
  const [entryScreen, setEntryScreen] = useState<MobileEntryScreen>("qr-start");
  const [checkoutSuccess, setCheckoutSuccess] = useState<CheckoutSuccessPayload | null>(null);

  useEffect(() => {
    if (initialEvent || !previewRequested) {
      return;
    }

    const token = window.localStorage.getItem(adminTokenStorageKey);
    if (!token) {
      setMessage("Taslak etkinlik onizlemesi icin once admin girisi yapmalisin.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function loadPreviewEvent() {
      try {
        const response = await fetch(`${getClientApiBaseUrl()}/api/events/slug/${slug}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = (await response.json()) as { event?: EventData; detail?: string };
        if (!response.ok || !payload.event) {
          throw new Error(payload.detail ?? "Onizleme verisi alinamadi.");
        }
        if (!isMounted) {
          return;
        }
        setEvent(payload.event);
        setMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setMessage(error instanceof Error ? error.message : "Onizleme acilamadi.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadPreviewEvent();

    return () => {
      isMounted = false;
    };
  }, [initialEvent, previewRequested, slug]);

  const coverImage = event?.materials?.selected_cover ?? event?.materials?.covers?.[0] ?? null;
  const locationLabel = event?.location ?? "Dubai";
  const dateLabel = formatDateLabel(event?.event_date ?? null);
  const previewMode = !!event && previewRequested && event.status === "draft";
  const activeNav = useMemo(() => {
    if (flowState.hasUnlockedPhotos) {
      return "profile";
    }
    if (flowState.hasMatches) {
      return "matches";
    }
    if (flowState.hasSelfie || entryScreen === "search") {
      return "upload";
    }
    return "explore";
  }, [entryScreen, flowState]);

  if (!event) {
    return (
      <main className="mobile-guest-shell">
        <section className="mobile-guest-empty">
          <div className="mobile-guest-empty-badge">FindMyShot Guest</div>
          <h1>Misafir sayfasi hazir degil</h1>
          <p>{loading ? "Onizleme yukleniyor..." : message}</p>
        </section>
      </main>
    );
  }

  if (checkoutSuccess) {
    return (
      <main className="mobile-guest-shell mobile-screen-shell">
        <header className="mobile-app-topbar">
          <button className="mobile-app-icon-button" onClick={() => setCheckoutSuccess(null)} type="button">
            <span />
            <span />
            <span />
          </button>
          <strong>FindMyShot</strong>
          <button className="mobile-app-avatar" type="button" aria-label="Profile">
            F
          </button>
        </header>

        <section className="mobile-success-screen">
          <div className="mobile-success-glow" />
          <div className="mobile-success-icon">
            <span>✓</span>
          </div>
          <div className="mobile-success-copy">
            <h1>Harika! Fotograflarin hazir.</h1>
            <p>Indirme baglantin kisa bir sure boyunca aktif kalacak. Anilarini hemen guvene al.</p>
          </div>
          <div className="mobile-success-preview-grid">
            <div className="mobile-success-preview-large" />
            <div className="mobile-success-preview-stack">
              <div className="mobile-success-preview-small" />
              <div className="mobile-success-preview-small mobile-success-preview-count">
                +{Math.max(checkoutSuccess.unlockedPhotos.length - 1, 1)}
              </div>
            </div>
          </div>
          <div className="mobile-success-actions">
            <button
              className="mobile-primary-pill-button"
              onClick={() => {
                const downloadUrl = checkoutSuccess.unlockedPhotos[0]?.download_url;
                if (!downloadUrl) {
                  return;
                }
                void saveImageToDevice(downloadUrl, "findmyshot-telefon-indirme.jpg");
              }}
              type="button"
            >
              Fotoğraflara kaydet
            </button>
            <button className="mobile-secondary-pill-button" onClick={() => setCheckoutSuccess(null)} type="button">
              Tumunu Gor
            </button>
            <button className="mobile-link-button" onClick={() => setEntryScreen("search")} type="button">
              Yeni arama yap
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (entryScreen === "qr-start") {
    return (
      <main className="mobile-guest-shell mobile-screen-shell">
        <header className="mobile-app-topbar">
          <button className="mobile-app-icon-button" type="button" aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
          <strong>The Guest App</strong>
          <button className="mobile-app-avatar" type="button" aria-label="Profile">
            F
          </button>
        </header>

        <section className="mobile-qr-start-screen">
          <div className="mobile-qr-start-illustration">
            <div className="mobile-qr-start-layer mobile-qr-start-layer-left" />
            <div className="mobile-qr-start-layer mobile-qr-start-layer-right" />
            <div className="mobile-qr-start-main-card">
              <div className="mobile-qr-placeholder">
                <span>QR</span>
              </div>
              <div className="mobile-qr-phone">
                <div className="mobile-qr-phone-camera" />
                <div className="mobile-qr-phone-screen">
                  <div className="mobile-qr-phone-frame">
                    <div className="mobile-qr-scan-line" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mobile-screen-copy">
            <h1>Etkinlik Fotograflarini Bul</h1>
            <p>Etkinlikteki fotograflarini aninda bulmak icin masadaki QR kodu tara ve kamera odakli akisla devam et.</p>
          </div>

          <div className="mobile-screen-bottom-action">
            <button className="mobile-primary-pill-button" onClick={() => setEntryScreen("scanner")} type="button">
              Kamerayi Ac ve Tara
            </button>
            <p>Desteklenen tum etkinliklerde gecerlidir</p>
          </div>
        </section>
      </main>
    );
  }

  if (entryScreen === "scanner") {
    return (
      <main className="mobile-scanner-screen">
        <div className="mobile-scanner-backdrop" style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined} />
        <div className="mobile-scanner-overlay">
          <div className="mobile-scanner-header">
            <button className="mobile-glass-circle-button" onClick={() => setEntryScreen("qr-start")} type="button">
              ×
            </button>
            <div className="mobile-scanner-pill">The Guest App</div>
            <button className="mobile-glass-circle-button" type="button">?</button>
          </div>

          <div className="mobile-scanner-center">
            <div className="mobile-screen-copy mobile-screen-copy-light">
              <h1>QR Kodu Cercevenin Icine Hizala</h1>
              <p>Etkinlik fotograflarina erismek icin kodu taratin.</p>
            </div>

            <div className="mobile-scanner-frame">
              <div className="mobile-scanner-corner mobile-scanner-corner-tl" />
              <div className="mobile-scanner-corner mobile-scanner-corner-tr" />
              <div className="mobile-scanner-corner mobile-scanner-corner-bl" />
              <div className="mobile-scanner-corner mobile-scanner-corner-br" />
              <div className="mobile-scanner-live-line" />
            </div>
          </div>

          <div className="mobile-scanner-bottom">
            <div className="mobile-scanner-action-grid">
              <button className="mobile-scanner-action-card" type="button">
                <strong>Isik Ac</strong>
              </button>
              <button className="mobile-scanner-action-card" onClick={() => setEntryScreen("welcome")} type="button">
                <strong>Iptal</strong>
              </button>
            </div>
            <button className="mobile-scanner-gallery-card" onClick={() => setEntryScreen("welcome")} type="button">
              <div>
                <strong>Galleriden Sec</strong>
                <span>QR kodu veya etkinlige devam et</span>
              </div>
              <small>→</small>
            </button>
            <button className="mobile-link-button mobile-link-button-light" onClick={() => setEntryScreen("welcome")} type="button">
              QR okuttum, devam et
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (entryScreen === "welcome") {
    return (
      <main className="mobile-guest-shell mobile-screen-shell">
        <header className="mobile-app-topbar">
          <button className="mobile-app-icon-button" type="button" aria-label="Menu">
            <span />
            <span />
            <span />
          </button>
          <strong>FindMyShot</strong>
          <button className="mobile-app-avatar" type="button" aria-label="Profile">
            F
          </button>
        </header>

        <section className="mobile-welcome-screen">
          <div
            className={`mobile-welcome-hero${coverImage ? " mobile-welcome-hero-has-cover" : ""}`}
            style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
          >
            <div className="mobile-welcome-hero-scrim" />
            <div className="mobile-welcome-hero-copy">
              <div className="mobile-guest-badge-row">
                <span className="mobile-guest-badge">FindMyShot Guest</span>
                <span className="mobile-guest-badge">{previewMode ? "Onizleme" : "Canli"}</span>
              </div>
              <h1>{event.title}</h1>
              <div className="mobile-guest-meta-row">
                <span>{dateLabel}</span>
                <span>{locationLabel}</span>
              </div>
            </div>
          </div>

          <div className="mobile-screen-copy mobile-screen-copy-left">
            <p>QR kodu okuttun, harika. Simdi kamera ile bir selfie cek; uygulama bu etkinlikteki karelerini senin icin bulsun.</p>
          </div>

          <div className="mobile-welcome-steps">
            <article className="mobile-welcome-step-card mobile-welcome-step-card-emphasis">
              <span>Adim 1</span>
              <strong>Selfie cek</strong>
              <p>On kamerayla cekilen net bir selfie en iyi sonucu verir.</p>
            </article>
            <article className="mobile-welcome-step-card">
              <span>Adim 2</span>
              <strong>Eslesmeleri incele</strong>
              <p>Ucretsiz acilan kareleri hemen gor, digerlerini istersen satin al.</p>
            </article>
            <article className="mobile-welcome-step-card">
              <span>Adim 3</span>
              <strong>Indir veya satin al</strong>
              <p>Kendi fotograflarini telefonuna indir ya da paket acarak tum galeriyi al.</p>
            </article>
          </div>

          <div className="mobile-screen-bottom-action mobile-screen-bottom-action-inline">
            <button className="mobile-primary-pill-button" onClick={() => setEntryScreen("search")} type="button">
              Hadi Baslayalim
            </button>
            <p>Hizmet sartlarini ve gizlilik politikasini kabul ediyorum.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mobile-guest-shell mobile-screen-shell">
      <header className="mobile-app-topbar">
        <button className="mobile-app-icon-button" type="button" aria-label="Menu">
          <span />
          <span />
          <span />
        </button>
        <strong>FindMyShot</strong>
        <button className="mobile-app-avatar" type="button" aria-label="Profile">
          F
        </button>
      </header>

      <section className="mobile-guest-stage mobile-guest-stage-search">
        <div className="mobile-screen-copy mobile-screen-copy-left mobile-search-intro-copy">
          <div className="mobile-search-kicker">Misafir modu</div>
          <h1>Telefon odakli akis</h1>
          <p>Tek elde kullan, selfie cek, eslesmelerini gor ve istediklerini aninda indir.</p>
        </div>

        <div className="mobile-guest-quick-stats">
          <div className="mobile-guest-quick-stat">
            <span>Analiz</span>
            <strong>{flowState.hasMatches ? "Hazir" : "Bekliyor"}</strong>
          </div>
          <div className="mobile-guest-quick-stat">
            <span>Erisim</span>
            <strong>{previewMode ? "Onizleme" : "Misafir"}</strong>
          </div>
          <div className="mobile-guest-quick-stat">
            <span>Akis</span>
            <strong>QR + Selfie</strong>
          </div>
        </div>

        <div className="mobile-guest-panel">
          <GuestSearchPanel
            eventId={event.id}
            eventTitle={event.title}
            materials={event.materials}
            onFlowStateChange={setFlowState}
            allowGalleryUpload={previewMode}
            mobileMode
            onCheckoutSuccess={setCheckoutSuccess}
          />
        </div>
      </section>

      <nav className="mobile-bottom-nav" aria-label="Guest navigation">
        <div className={`mobile-bottom-nav-item${activeNav === "explore" ? " mobile-bottom-nav-item-active-secondary" : ""}`}>
          <span className="mobile-bottom-nav-dot" />
          <small>Explore</small>
        </div>
        <div className={`mobile-bottom-nav-item${activeNav === "upload" ? " mobile-bottom-nav-item-active-secondary" : ""}`}>
          <span className="mobile-bottom-nav-dot" />
          <small>Upload</small>
        </div>
        <div className={`mobile-bottom-nav-item${activeNav === "matches" ? " mobile-bottom-nav-item-active" : ""}`}>
          <span className="mobile-bottom-nav-plus">+</span>
          <small>Matches</small>
        </div>
        <div className={`mobile-bottom-nav-item${activeNav === "profile" ? " mobile-bottom-nav-item-active-secondary" : ""}`}>
          <span className="mobile-bottom-nav-dot" />
          <small>Profile</small>
        </div>
      </nav>
    </main>
  );
}
