"use client";

import { type CSSProperties, useEffect, useState } from "react";
import GuestSearchPanel from "./guest-search-panel";
import { getApiBaseUrl, getShareBaseUrl } from "../lib/runtime-urls";
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

const PUBLIC_STATUS_COPY = {
  published: {
    pillClassName: "topbar-pill topbar-pill-live",
    pillLabel: "Canli",
    message: null
  },
  completed: {
    pillClassName: "topbar-pill topbar-pill-archive",
    pillLabel: "Arsiv",
    message:
      "Bu etkinlik tamamlandi. Galeri arsiv modunda acik kalir ve misafirler onceki kareleri incelemeye devam eder."
  }
} as const;

function formatDateLabel(value: string | null) {
  if (!value) return "TBA";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}


function buildQrCodeUrl(targetUrl: string, cacheKey?: string | null) {
  const query = new URLSearchParams({
    size: "260x260",
    data: targetUrl,
    margin: "0"
  });
  if (cacheKey) {
    query.set("cache", cacheKey);
  }
  return `https://api.qrserver.com/v1/create-qr-code/?${query.toString()}`;
}

function resolveShareOrigin(currentOrigin: string) {
  const shareBaseUrl = getShareBaseUrl();
  if (shareBaseUrl.trim()) {
    return shareBaseUrl.replace(/\/$/, "");
  }
  return currentOrigin;
}

function getPublicStatusCopy(status: string) {
  return (
    PUBLIC_STATUS_COPY[status as keyof typeof PUBLIC_STATUS_COPY] ??
    PUBLIC_STATUS_COPY.published
  );
}

export default function PublicEventPageClient({
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
        : "Bu etkinlik yayinda degil veya bulunamadi."
  );
  const [mobileMode, setMobileMode] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  async function handleShareGuestLink() {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `${event?.title ?? "FindMyShot"} galerisi`,
          text: "Etkinlik galerisini ac",
          url: guestUrl
        });
        setShareFeedback("Paylasim penceresi acildi.");
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(guestUrl);
        setShareFeedback("Link panoya kopyalandi.");
        return;
      }

      setShareFeedback("Paylasim bu cihazda kullanilamiyor.");
    } catch {
      setShareFeedback("Paylasim tamamlanamadi.");
    }
  }

  function handleShareWhatsApp() {
    if (typeof window === "undefined") {
      return;
    }

    const message = `${guestUrl}\n\nFindMyShot galerisi`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setShareFeedback("WhatsApp paylasimi aciliyor...");
  }

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1200px), (pointer: coarse)");
    const syncMobileMode = () => setMobileMode(mediaQuery.matches);

    syncMobileMode();
    mediaQuery.addEventListener("change", syncMobileMode);
    return () => mediaQuery.removeEventListener("change", syncMobileMode);
  }, []);

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
        const response = await fetch(`${getApiBaseUrl()}/api/events/slug/${slug}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = (await response.json()) as { event?: EventData; detail?: string };
        if (!response.ok || !payload.event) {
          throw new Error(payload.detail ?? "Onizleme verisi alinamadi.");
        }
        if (!isMounted) return;
        setEvent(payload.event);
        setMessage(null);
      } catch (error) {
        if (!isMounted) return;
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

  if (!event) {
    return (
      <main className="photier-app">
        <section className="app-main">
          <header className="app-topbar">
            <div>
              <h1>Etkinlik Kullanilamiyor</h1>
              <p>Public gorunum yalnizca yayindaki etkinlikler icin acilir.</p>
            </div>
          </header>
          <div className="app-body">
            <div className="panel">
              <div className="status">{loading ? "Onizleme yukleniyor..." : message}</div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const coverImage = event.materials?.selected_cover ?? event.materials?.covers?.[0] ?? null;
  const locationLabel = event.location ?? "Private venue";
  const dateLabel = formatDateLabel(event.event_date);
  const browserOrigin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const shareOrigin = resolveShareOrigin(browserOrigin);
  const guestUrl = `${shareOrigin}/e/${event.slug}`;
  const qrImageUrl = buildQrCodeUrl(guestUrl, event.materials?.qr_logo ?? null);
  const previewMode = previewRequested && event.status === "draft";
  const publicStatusCopy = getPublicStatusCopy(event.status);
  const hasFrameStyle = !!event.materials?.frame_color;
  const framePreviewImage =
    event.materials?.frame_horizontal ??
    event.materials?.selected_cover ??
    event.materials?.covers?.[0] ??
    null;
  const frameAssetCard = (
    <article className="guest-event-asset-card">
      <span>Cerceve Stili</span>
      <div
        className={`guest-event-frame-preview${hasFrameStyle ? " guest-event-frame-preview-styled" : ""}`}
        style={
          hasFrameStyle
            ? ({
                "--frame-color": event.materials?.frame_color
              } as CSSProperties)
            : undefined
        }
      >
        <div className="guest-event-frame-preview-photo">
          {framePreviewImage ? (
            <img alt="Cerceve onizlemesi" className="guest-event-frame-preview-image" src={framePreviewImage} />
          ) : null}
        </div>
        {event.materials?.logo_asset ? (
          <div className="guest-event-frame-preview-logo">
            <img alt="Logo onizlemesi" src={event.materials.logo_asset} />
          </div>
        ) : null}
      </div>
      <small>
        Fotograf hangi boyutta olursa olsun sabit kenar cercevesiyle gelir.
        Logo varsa alt orta banda otomatik yerlesir.
      </small>
    </article>
  );

  const qrAssetCard = (
    <article className="guest-event-asset-card">
      <span>QR Kimligi</span>
      <div className="guest-event-qr-preview">
        <img alt={`${event.title} etkinlik QR kodu`} className="guest-event-qr-image" src={qrImageUrl} />
        {event.materials?.qr_logo ? (
          <div className="guest-event-qr-core">
            <img alt="QR merkez logosu" src={event.materials.qr_logo} />
          </div>
        ) : null}
      </div>
      <small>
        QR kodunun merkezinde gorunen kimlik logosudur. Misafirler etkinlige bu
        kimlik ile yonlenir.
      </small>
      <div className="guest-event-qr-mini-actions">
        <button className="guest-event-qr-mini-share" onClick={() => void handleShareGuestLink()} type="button">
          Linki Paylas
        </button>
        <button className="guest-event-qr-mini-share guest-event-qr-mini-share-whatsapp" onClick={handleShareWhatsApp} type="button">
          WhatsApp ile Paylas
        </button>
        {shareFeedback ? <span>{shareFeedback}</span> : null}
      </div>
    </article>
  );

  return (
    <main className="photier-app">
      <section className="app-main">
        <header className="app-topbar">
          <div>
            <h1>{event.title}</h1>
            <p>Bu galeri yalnizca bu etkinlige ozeldir. Kamera ile selfie cekerek kendi fotograflarini bulabilirsin.</p>
          </div>
          <div className="app-topbar-actions">
            <div className="topbar-pill topbar-pill-event-meta">{event.slug}</div>
            <div className="topbar-pill topbar-pill-event-meta">{dateLabel}</div>
            <div className="topbar-pill topbar-pill-event-meta">{locationLabel}</div>
            {previewMode ? (
              <div className="topbar-pill topbar-pill-preview">Onizleme</div>
            ) : (
              <div className={publicStatusCopy.pillClassName}>{publicStatusCopy.pillLabel}</div>
            )}
          </div>
        </header>

        <div className="app-body">
          {previewMode ? (
            <div className="status">
              Bu sayfa taslak etkinlik onizlemesi olarak acildi. Public feed'de gorunmesi icin durumu
              "Yayinda" yapmalisin.
            </div>
          ) : null}
          {!previewMode && publicStatusCopy.message ? (
            <div className="status">{publicStatusCopy.message}</div>
          ) : null}

          <section className="guest-event-hero panel">
            <div
              className={[
                "guest-event-cover",
                coverImage ? "guest-event-cover-has-image" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}
            >
              <div className="guest-event-cover-scrim" />
              <div className="guest-event-cover-copy">
                <span className="guest-event-kicker">FindMyShot Gallery</span>
                <strong>{event.title}</strong>
                <p>
                  Kamera ile selfie cek, bu etkinlikteki eslesmelerini bul, ucretsiz onizlemeni ac
                  ve kalan kareleri tek akista tamamla.
                </p>
              </div>
            </div>

            <div className="guest-event-brand-panel">
              <div className="guest-event-pill-row">
                <div className="guest-event-pill">
                  <span>Slug</span>
                  <strong>{event.slug}</strong>
                </div>
                <div className="guest-event-pill">
                  <span>Tarih</span>
                  <strong>{dateLabel}</strong>
                </div>
                <div className="guest-event-pill">
                  <span>Konum</span>
                  <strong>{locationLabel}</strong>
                </div>
              </div>

              <div className="guest-event-mobile-assets">
                <details className="guest-event-mobile-disclosure" open>
                  <summary>
                    <span className="guest-event-mobile-summary">
                      <span className="guest-event-mobile-summary-icon guest-event-mobile-summary-icon-frame" aria-hidden="true" />
                      <span>Cerceve Stili</span>
                      <span className="guest-event-mobile-summary-badge">Stil</span>
                    </span>
                  </summary>
                  {frameAssetCard}
                </details>
                <details className="guest-event-mobile-disclosure">
                  <summary>
                    <span className="guest-event-mobile-summary">
                      <span className="guest-event-mobile-summary-icon guest-event-mobile-summary-icon-qr" aria-hidden="true" />
                      <span>QR Kimligi</span>
                      <span className="guest-event-mobile-summary-badge guest-event-mobile-summary-badge-qr">Paylas</span>
                    </span>
                  </summary>
                  {qrAssetCard}
                </details>
              </div>

              <div className="guest-event-assets guest-event-assets-desktop">
                {frameAssetCard}
                {qrAssetCard}
              </div>
            </div>
          </section>

          <GuestSearchPanel
            eventId={event.id}
            eventTitle={event.title}
            materials={event.materials}
            allowGalleryUpload={previewMode}
            mobileMode={mobileMode}
          />
        </div>
      </section>
    </main>
  );
}
