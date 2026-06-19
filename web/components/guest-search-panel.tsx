"use client";

import { type CSSProperties, type ReactNode, type SyntheticEvent, useEffect, useId, useState } from "react";
import { getClientApiBaseUrl } from "../lib/api-base";

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
  distribution_mode?: "free" | "paid";
};

type Match = {
  vector_id: string;
  score: number;
  photo_id: string | null;
  event_id: string | null;
  photo_url: string | null;
  preview_url: string | null;
  thumbnail_url: string | null;
};

type SearchResult = {
  event_id: string;
  selfie_url: string;
  matches: Match[];
};

type CheckoutResponse = {
  order_id: string;
  status: string;
  package_type: string;
  amount_cents: number;
  currency: string;
  unlocked_photos: Array<{
    photo_id: string;
    download_url: string;
  }>;
};

type StoredOrder = {
  order_id: string;
  guest_email: string | null;
};

type FrameOrientation = "horizontal" | "vertical";

const PACKAGE_DETAILS = {
  five: {
    limit: 5,
    title: "5 fotoğraf",
    priceLabel: "$10",
    description: "Öne çıkan anlar için hızlı paket."
  },
  ten: {
    limit: 10,
    title: "10 fotoğraf",
    priceLabel: "$15",
    description: "Düğün ve kalabalık aileler için ideal."
  },
  all: {
    limit: Number.POSITIVE_INFINITY,
    title: "Tüm eşleşmeler",
    priceLabel: "$25",
    description: "Bu aramadaki tüm sonuçları aç."
  }
} as const;

const LOCK_WATERMARK_LABELS = Array.from({ length: 12 }, (_, index) => `FindMyShot ${index + 1}`);

function isCheckoutResponse(
  payload: CheckoutResponse | { detail?: string }
): payload is CheckoutResponse {
  return "unlocked_photos" in payload;
}

function getOrderStorageKey(eventId: string) {
  return `findmyshot:last-order:${eventId}`;
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

function getFrameStyle(materials: EventMaterials | null | undefined): CSSProperties | undefined {
  // Çerçeveyi logo varsa veya frame_color ayarlanmışsa göster
  if (!materials?.logo_asset && !materials?.frame_color) {
    return undefined;
  }

  const rawThickness = Number.isFinite(materials?.frame_thickness)
    ? Number(materials?.frame_thickness)
    : 32;
  const rawLogoSize = Number.isFinite(materials?.logo_placement?.size)
    ? Number(materials?.logo_placement?.size)
    : 100;

  const edge = Math.max(4, Math.min(10, Math.round(rawThickness * 0.16)));
  const logoBand = Math.max(28, Math.min(44, Math.round(rawLogoSize * 0.22 + edge * 2)));
  const logoHeight = Math.max(16, Math.min(30, logoBand - 10));

  return {
    "--frame-color": materials?.frame_color ?? "#ffffff",
    "--frame-edge": `${edge}px`,
    "--frame-logo-band": `${logoBand}px`,
    "--frame-logo-height": `${logoHeight}px`
  } as CSSProperties;
}

async function readApiPayload(response: Response): Promise<Record<string, unknown>> {
  const rawText = await response.text();
  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return { detail: rawText };
  }
}

function PhotoStage({
  imageUrl,
  alt,
  onOpen,
  badge,
  locked = false,
  materials,
  overlayContent
}: {
  imageUrl: string | null;
  alt: string;
  onOpen?: () => void;
  badge?: string;
  locked?: boolean;
  materials?: EventMaterials | null;
  overlayContent?: ReactNode;
}) {
  const [orientation, setOrientation] = useState<FrameOrientation>("horizontal");
  const frameStyle = getFrameStyle(materials);
  const hasLogo = !!materials?.logo_asset;

  useEffect(() => {
    setOrientation("horizontal");
  }, [imageUrl]);

  function handleMediaLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { naturalHeight, naturalWidth } = event.currentTarget;
    setOrientation(naturalHeight > naturalWidth ? "vertical" : "horizontal");
  }

  return (
    <div
      className={`photo-frame${locked ? " photo-frame-locked" : ""}${frameStyle ? " photo-frame-styled" : ""}`}
      style={frameStyle}
    >
      {imageUrl ? (
        onOpen ? (
          <button className="photo-open-button" onClick={onOpen} type="button">
            <img
              alt={alt}
              className={`photo-media${orientation === "vertical" ? " photo-media-portrait" : ""}`}
              onLoad={handleMediaLoad}
              src={imageUrl}
            />
          </button>
        ) : (
          <img
            alt={alt}
            className={`photo-media${orientation === "vertical" ? " photo-media-portrait" : ""}`}
            onLoad={handleMediaLoad}
            src={imageUrl}
          />
        )
      ) : (
        <div className="empty">Önizleme yok</div>
      )}

      {hasLogo ? (
        <div className={`photo-logo-overlay${frameStyle ? " photo-logo-overlay-framed" : ""}`}>
          <img alt="" aria-hidden="true" src={materials?.logo_asset ?? ""} />
        </div>
      ) : null}

      {badge ? <div className="photo-badge">{badge}</div> : null}
      {overlayContent}
    </div>
  );
}

function ModalPreviewStage({
  imageUrl,
  alt,
  materials
}: {
  imageUrl: string;
  alt: string;
  materials?: EventMaterials | null;
}) {
  const [orientation, setOrientation] = useState<FrameOrientation>("horizontal");
  const frameStyle = getFrameStyle(materials);

  useEffect(() => {
    setOrientation("horizontal");
  }, [imageUrl]);

  function handleMediaLoad(event: SyntheticEvent<HTMLImageElement>) {
    const { naturalHeight, naturalWidth } = event.currentTarget;
    setOrientation(naturalHeight > naturalWidth ? "vertical" : "horizontal");
  }

  return (
    <div
      className={`modal-image-shell${frameStyle ? " modal-image-shell-framed" : ""}`}
      style={frameStyle}
    >
      <img
        alt={alt}
        className="modal-image"
        onLoad={handleMediaLoad}
        src={imageUrl}
      />
      {materials?.logo_asset ? (
        <div className={`modal-logo-overlay${frameStyle ? " modal-logo-overlay-framed" : ""}`}>
          <img alt="" aria-hidden="true" src={materials.logo_asset} />
        </div>
      ) : null}
    </div>
  );
}

export default function GuestSearchPanel({
  eventId,
  eventTitle,
  materials,
  onFlowStateChange,
  allowGalleryUpload = true,
  mobileMode = false,
  onCheckoutSuccess
}: {
  eventId: string;
  eventTitle: string;
  materials?: EventMaterials | null;
  onFlowStateChange?: (state: {
    hasSelfie: boolean;
    hasMatches: boolean;
    hasUnlockedPhotos: boolean;
  }) => void;
  allowGalleryUpload?: boolean;
  mobileMode?: boolean;
  onCheckoutSuccess?: (payload: {
    orderId: string;
    unlockedPhotos: Array<{ photo_id: string; download_url: string }>;
  }) => void;
}) {
  const apiBaseUrl = getClientApiBaseUrl();
  const fileInputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<"five" | "ten" | "all">("all");
  const [guestEmail, setGuestEmail] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [unlockedPhotoUrls, setUnlockedPhotoUrls] = useState<Record<string, string>>({});
  const [restoringOrder, setRestoringOrder] = useState(false);
  const [restoreTried, setRestoreTried] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    setRestoreTried(false);
  }, [eventId]);

  useEffect(() => {
    onFlowStateChange?.({
      hasSelfie: !!file,
      hasMatches: !!result && result.matches.length > 0,
      hasUnlockedPhotos: Object.keys(unlockedPhotoUrls).length > 0
    });
  }, [file, onFlowStateChange, result, unlockedPhotoUrls]);

  useEffect(() => {
    if (!result || restoringOrder || restoreTried) {
      return;
    }

    const storedRaw = window.localStorage.getItem(getOrderStorageKey(eventId));
    if (!storedRaw) {
      setRestoreTried(true);
      return;
    }

    let storedOrder: StoredOrder | null = null;
    try {
      storedOrder = JSON.parse(storedRaw) as StoredOrder;
    } catch {
      window.localStorage.removeItem(getOrderStorageKey(eventId));
      setRestoreTried(true);
      return;
    }

    if (!storedOrder?.order_id) {
      window.localStorage.removeItem(getOrderStorageKey(eventId));
      setRestoreTried(true);
      return;
    }

    const restoreOrder = async () => {
      setRestoringOrder(true);
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/commerce/orders/${storedOrder.order_id}/downloads`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              event_id: eventId,
              guest_email: storedOrder.guest_email
            })
          }
        );
        const payload = (await readApiPayload(response)) as CheckoutResponse | { detail?: string };
        if (!response.ok || !isCheckoutResponse(payload)) {
          window.localStorage.removeItem(getOrderStorageKey(eventId));
          return;
        }

        const unlockedMap = Object.fromEntries(
          payload.unlocked_photos.map((photo) => [photo.photo_id, photo.download_url])
        );
        if (Object.keys(unlockedMap).length > 0) {
          setUnlockedPhotoUrls((existing) => ({ ...existing, ...unlockedMap }));
          setCheckoutMessage(
            `Önceki satın alma geri yüklendi. ${payload.unlocked_photos.length} fotoğraf açıldı.`
          );
        }
      } finally {
        setRestoreTried(true);
        setRestoringOrder(false);
      }
    };

    void restoreOrder();
  }, [eventId, restoreTried, restoringOrder, result]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Aramadan önce bir selfie seç.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("event_id", eventId);
    formData.append("selfie", file);

    try {
      const response = await fetch(`${apiBaseUrl}/api/search/selfie`, {
        method: "POST",
        body: formData
      });

      const payload = await readApiPayload(response);
      if (!response.ok) {
        throw new Error(
          typeof payload.detail === "string" ? payload.detail : "Arama başarısız."
        );
      }

      setResult(payload as SearchResult);
      setSelectedMatch(null);
      setUnlockOpen(false);
      setSelectedPackage("all");
      setUnlockedPhotoUrls({});
      setCheckoutMessage(null);
      setError(null);
    } catch (requestError) {
      setResult(null);
      setSelectedMatch(null);
      setUnlockOpen(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Arama beklenmedik şekilde başarısız oldu."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckout() {
    if (isFreeDistribution) {
      return;
    }

    if (!result || lockedMatches.length === 0) {
      return;
    }

    setCheckoutLoading(true);
    setCheckoutMessage(null);
    try {
      const activePackage = selectedPackageOption?.key ?? "all";
      const photoIds = (() => {
        if (activePackage === "five") {
          return lockedMatches.slice(0, 5).map((match) => match.photo_id).filter(Boolean);
        }
        if (activePackage === "ten") {
          return lockedMatches.slice(0, 10).map((match) => match.photo_id).filter(Boolean);
        }
        return lockedMatches.map((match) => match.photo_id).filter(Boolean);
      })() as string[];

      const response = await fetch(`${apiBaseUrl}/api/commerce/checkout/mock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          event_id: eventId,
          package_type: activePackage,
          guest_email: guestEmail || null,
          photo_ids: photoIds
        })
      });

      const payload = (await readApiPayload(response)) as CheckoutResponse | { detail?: string };
      if (!response.ok) {
        throw new Error(("detail" in payload && payload.detail) || "Checkout başarısız.");
      }
      if (!isCheckoutResponse(payload)) {
        throw new Error("Checkout yanıtı eksik.");
      }

      const unlockedMap = Object.fromEntries(
        payload.unlocked_photos.map((photo) => [photo.photo_id, photo.download_url])
      );
      setUnlockedPhotoUrls(unlockedMap);
      setCheckoutMessage(
        `Sipariş oluşturuldu. ${payload.unlocked_photos.length} fotoğraf açıldı.`
      );
      window.localStorage.setItem(
        getOrderStorageKey(eventId),
        JSON.stringify({
          order_id: payload.order_id,
          guest_email: guestEmail || null
        } satisfies StoredOrder)
      );
      setUnlockOpen(false);
      onCheckoutSuccess?.({
        orderId: payload.order_id,
        unlockedPhotos: payload.unlocked_photos
      });
    } catch (checkoutError) {
      setCheckoutMessage(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Checkout beklenmedik şekilde başarısız oldu."
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  const isFreeDistribution = materials?.distribution_mode === "free";
  const freeDistributionMatches = isFreeDistribution ? (result?.matches ?? []) : [];
  const freeMatch = isFreeDistribution ? null : result?.matches[0] ?? null;
  const lockedMatches = isFreeDistribution ? [] : result?.matches.slice(1) ?? [];
  const displayedLockedMatches = lockedMatches.filter(
    (match) => !match.photo_id || !unlockedPhotoUrls[match.photo_id]
  );
  const purchasedMatches = lockedMatches.filter(
    (match) => !!match.photo_id && !!unlockedPhotoUrls[match.photo_id]
  );
  const packageOptions = (Object.entries(PACKAGE_DETAILS) as Array<
    [keyof typeof PACKAGE_DETAILS, (typeof PACKAGE_DETAILS)[keyof typeof PACKAGE_DETAILS]]
  >)
    .map(([key, option]) => ({
      key,
      ...option,
      photoCount:
        option.limit === Number.POSITIVE_INFINITY
          ? displayedLockedMatches.length
          : Math.min(option.limit, displayedLockedMatches.length)
    }))
    .filter((option) =>
      option.key === "all" ? option.photoCount > 0 : option.limit <= displayedLockedMatches.length
    );
  const selectedPackageOption =
    packageOptions.find((option) => option.key === selectedPackage) ?? packageOptions[0] ?? null;
  const checkoutPhotoCount = selectedPackageOption?.photoCount ?? 0;
  const resultSummary =
    result && isFreeDistribution
      ? `Arama tamamlandı. ${result.matches.length} güçlü fotoğraf bulundu ve tamamı ücretsiz indirilebilir.`
      : result && displayedLockedMatches.length === 0
      ? "Arama tamamlandı. Güçlü eşleşmelerin zaten açık veya satın alınmış."
      : result
        ? `Arama tamamlandı. ${result.matches.length} güçlü fotoğraf bulundu. En iyi eşleşmen ücretsiz açık, diğerlerini ödeme sonrası açabilirsin.`
        : null;

  return (
    <>
      <section className={`panel-grid${mobileMode ? " guest-search-mobile-layout" : ""}`}>
        <div className={`panel panel-search${mobileMode ? " guest-search-mobile-panel" : ""}`}>
          <div className="eyebrow">Adım 1</div>
          <h2 className={`section-title${mobileMode ? " guest-search-mobile-title" : ""}`}>
            {mobileMode ? "Etkinlik fotograflarini bul" : `Galerini Bul: ${eventTitle}`}
          </h2>
          <p className={`muted${mobileMode ? " guest-search-mobile-copy" : ""}`}>
            {allowGalleryUpload
              ? "Net bir selfie yukle. Arama sadece bu etkinlik icinde yapilir ve en guclu eslesmeler gosterilir."
              : "Kamera ile simdi bir selfie cek. Misafir erisimi guvenlik nedeniyle yalnizca canli selfie ile devam eder."}
          </p>

          <form className={`uploader${mobileMode ? " uploader-mobile" : ""}`} onSubmit={handleSubmit}>
            <input
              accept="image/*"
              capture={allowGalleryUpload ? undefined : "user"}
              className={mobileMode ? "uploader-file-input-hidden" : undefined}
              id={mobileMode ? fileInputId : undefined}
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            {mobileMode ? (
              <label className="mobile-capture-card" htmlFor={fileInputId}>
                <div className="mobile-capture-card-visual">
                  {previewUrl ? (
                    <img alt="Secilen selfie" src={previewUrl} />
                  ) : (
                    <div className="mobile-capture-card-placeholder">
                      <div className="mobile-capture-card-face" />
                    </div>
                  )}
                </div>
                <div className="mobile-capture-card-copy">
                  <strong>{file ? "Selfie hazir" : "Kamerayi ac"}</strong>
                  <span>
                    {file
                      ? `${file.name} secildi. Aramayi baslatabilirsin.`
                      : allowGalleryUpload
                        ? "Selfie sec veya galeriden yukle."
                        : "On kamerayla canli selfie cekerek devam et."}
                  </span>
                </div>
              </label>
            ) : null}
            <button className={`button${mobileMode ? " mobile-search-primary-button" : ""}`} disabled={submitting} type="submit">
              {submitting ? "Araniyor..." : allowGalleryUpload ? "Fotograflarimi Bul" : "Selfie Cek ve Fotograflarimi Bul"}
            </button>
          </form>

          {previewUrl ? (
            <div className={`selfie-preview${mobileMode ? " selfie-preview-mobile" : ""}`}>
              <img alt="Selected selfie preview" src={previewUrl} />
              <div>
                <strong>{file?.name}</strong>
                <div className="muted">Bu etkinlik içinde aramaya hazır.</div>
              </div>
            </div>
          ) : null}

          {mobileMode && submitting ? (
            <div className="mobile-analysis-card">
              <div className="mobile-analysis-visual">
                <div className="mobile-analysis-face" />
              </div>
              <strong>Selfien analiz ediliyor...</strong>
              <p>Etkinlik galerisi icinden sana en yakin eslesmeleri buluyoruz.</p>
              <div className="mobile-analysis-steps">
                <span className="mobile-analysis-step mobile-analysis-step-active">Selfie dogrulaniyor</span>
                <span className="mobile-analysis-step mobile-analysis-step-active">Yuz eslestirmesi yapiliyor</span>
                <span className="mobile-analysis-step">Sonuclar hazirlaniyor</span>
              </div>
            </div>
          ) : null}

          {error ? <div className="status">{error}</div> : null}
          {resultSummary ? <div className="status">{resultSummary}</div> : null}

          <div className={`tip-card${mobileMode ? " tip-card-mobile" : ""}`}>
            <strong>{allowGalleryUpload ? "Daha iyi sonuc icin" : "Guvenli arama modu"}</strong>
            <div className="muted">
              {allowGalleryUpload
                ? "Onden, aydinlik bir selfie kullan. Yan aci ve yogun filtreler eslesme kalitesini dusurur."
                : "Baska birinin galerideki fotografini yuklemek yerine canli selfie kullanilir. Bu sayede misafirler yalnizca kendilerine ait sonuclara ulasir."}
            </div>
          </div>
        </div>

        <div className={`panel panel-results${mobileMode ? " guest-search-mobile-results" : ""}`}>
          <div className="eyebrow">Adım 2</div>
          <h2 className={`section-title${mobileMode ? " guest-search-mobile-title" : ""}`}>Eslesmelerin</h2>
          {!result ? (
            <div className="empty">
              Henüz arama yok. Selfie yüklediğinde eşleşmeler burada görünecek.
            </div>
          ) : result.matches.length === 0 ? (
            <div className="empty">
              Güçlü eşleşme bulunamadı. Daha net veya yüzün daha görünür bir
              selfie ile tekrar dene.
            </div>
          ) : (
            <div className="results-stack">
              <div className="result-metrics">
                <div className="metric-card">
                  <span>Güçlü eşleşme</span>
                  <strong>{result.matches.length}</strong>
                </div>
                <div className="metric-card">
                  <span>Ücretsiz</span>
                  <strong>{isFreeDistribution ? `${result.matches.length} fotoğraf` : "1 fotoğraf"}</strong>
                </div>
                <div className="metric-card">
                  <span>{isFreeDistribution ? "Dağıtım" : "Kilitli"}</span>
                  <strong>{isFreeDistribution ? "Tamamen Ücretsiz" : `${displayedLockedMatches.length} fotoğraf`}</strong>
                </div>
              </div>

              {freeMatch ? (
                <article className="photo-card photo-card-featured">
                  <PhotoStage
                    alt="Best matched event photo"
                    badge="1 ücretsiz indirme"
                    imageUrl={freeMatch.preview_url ?? freeMatch.photo_url}
                    materials={materials}
                    onOpen={() => setSelectedMatch(freeMatch)}
                  />
                  <div className="photo-meta photo-meta-featured">
                    <div>
                      <span className="score-pill">
                        Eşleşme skoru {freeMatch.score.toFixed(2)}
                      </span>
                      <div className="score-bar">
                        <span style={{ width: `${Math.min(freeMatch.score * 100, 100)}%` }} />
                      </div>
                      <h3>En iyi eşleşme açık</h3>
                      <p className="muted">
                        Bu fotoğraf hemen açılır. Diğer sonuçlar ödeme tamamlanana
                        kadar kilitli kalır.
                      </p>
                    </div>
                    <div className="featured-actions">
                      <button
                        className="button-secondary"
                        onClick={() => setSelectedMatch(freeMatch)}
                        type="button"
                      >
                        Uygulama içinde önizle
                      </button>
                      {freeMatch.photo_url ? (
                        <a
                          className="button"
                          href={freeMatch.photo_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Ücretsiz fotoğrafı aç
                        </a>
                      ) : null}
                      {freeMatch.photo_url ? (
                        mobileMode ? (
                          <button
                            className="button-secondary"
                            onClick={() => {
                              const downloadUrl = freeMatch.photo_url;
                              if (!downloadUrl) {
                                return;
                              }
                              void saveImageToDevice(
                                downloadUrl,
                                "findmyshot-ucretsiz-fotograf.jpg"
                              );
                            }}
                            type="button"
                          >
                            Fotoğraflara kaydet
                          </button>
                        ) : (
                          <a
                            className="button-secondary"
                            href={buildDownloadUrl(
                              freeMatch.photo_url,
                              "findmyshot-ucretsiz-fotograf.jpg"
                            )}
                          >
                            Fotoğrafı indir
                          </a>
                        )
                      ) : null}
                    </div>
                  </div>
                </article>
              ) : null}

              {isFreeDistribution ? (
                <div className="gallery">
                  {freeDistributionMatches.map((match) => (
                    <article className="photo-card" key={match.vector_id}>
                      <PhotoStage
                        alt="Matched event photo"
                        imageUrl={match.preview_url ?? match.photo_url}
                        materials={materials}
                        onOpen={() => setSelectedMatch(match)}
                      />
                      <div className="photo-meta">
                        <span className="score-pill">
                          Eşleşme skoru {match.score.toFixed(2)}
                        </span>
                        <div className="score-bar">
                          <span style={{ width: `${Math.min(match.score * 100, 100)}%` }} />
                        </div>
                        {match.photo_url ? (
                          mobileMode ? (
                            <button
                              className="button"
                              onClick={() => {
                                const downloadUrl = match.photo_url;
                                if (!downloadUrl) {
                                  return;
                                }
                                void saveImageToDevice(downloadUrl, "findmyshot-ucretsiz-fotograf.jpg");
                              }}
                              type="button"
                            >
                              Fotoğraflara kaydet
                            </button>
                          ) : (
                            <a
                              className="button"
                              href={buildDownloadUrl(match.photo_url, "findmyshot-ucretsiz-fotograf.jpg")}
                            >
                              Fotoğrafı indir
                            </a>
                          )
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {!isFreeDistribution && displayedLockedMatches.length > 0 ? (
                <div className="locked-header">
                  <div>
                    <div className="eyebrow">Adım 3</div>
                    <h3>Daha fazla fotoğraf seni bekliyor</h3>
                  </div>
                  <div className="purchase-card">
                    <strong>
                      {displayedLockedMatches.length} kilitli fotoğraf
                    </strong>
                    <div className="muted">
                      Tek ödeme ile tüm galeri erişimini aç.
                    </div>
                  </div>
                </div>
              ) : null}

              {!isFreeDistribution && purchasedMatches.length > 0 ? (
                <div className="locked-header">
                  <div>
                    <div className="eyebrow">Açık</div>
                    <h3>Satın alınan fotoğraflar</h3>
                  </div>
                  <div className="purchase-card">
                    <strong>
                      {purchasedMatches.length} açık fotoğraf
                    </strong>
                    <div className="muted">Ödeme sonrası hemen kullanılabilir.</div>
                  </div>
                </div>
              ) : null}

              <div className="gallery">
                {purchasedMatches.map((match) => (
                  <article className="photo-card" key={match.vector_id}>
                    <PhotoStage
                      alt="Unlocked matched event photo"
                      imageUrl={
                        match.preview_url ?? unlockedPhotoUrls[match.photo_id ?? ""] ?? null
                      }
                      materials={materials}
                      onOpen={() =>
                        setSelectedMatch({
                          ...match,
                          photo_url: unlockedPhotoUrls[match.photo_id ?? ""] ?? match.photo_url
                        })
                      }
                    />
                    <div className="photo-meta">
                      <span className="score-pill">
                        Eşleşme skoru {match.score.toFixed(2)}
                      </span>
                      <div className="score-bar">
                        <span style={{ width: `${Math.min(match.score * 100, 100)}%` }} />
                      </div>
                      {match.photo_id && unlockedPhotoUrls[match.photo_id] ? (
                        mobileMode ? (
                          <button
                            className="button"
                            onClick={() => {
                              const photoId = match.photo_id;
                              const downloadUrl = photoId ? unlockedPhotoUrls[photoId] : null;
                              if (!photoId || !downloadUrl) {
                                return;
                              }
                              void saveImageToDevice(downloadUrl, `${photoId}.jpg`);
                            }}
                            type="button"
                          >
                            Fotoğraflara kaydet
                          </button>
                        ) : (
                          <a
                            className="button"
                            href={buildDownloadUrl(
                              unlockedPhotoUrls[match.photo_id],
                              `${match.photo_id}.jpg`
                            )}
                          >
                            Fotoğrafı indir
                          </a>
                        )
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>

              {!isFreeDistribution ? (
                <div className="gallery gallery-locked">
                {displayedLockedMatches.map((match) => (
                  <article className="photo-card" key={match.vector_id}>
                    <PhotoStage
                      alt="Locked matched event photo"
                      imageUrl={match.preview_url ?? match.photo_url}
                      locked
                      materials={materials}
                      overlayContent={
                        <div className="lock-overlay">
                          <div aria-hidden="true" className="lock-watermark-grid">
                            {LOCK_WATERMARK_LABELS.map((label) => (
                              <span key={label}>{label}</span>
                            ))}
                          </div>
                          <div className="lock-overlay-copy">
                            <strong>Kilitli onizleme</strong>
                            <span>Odeme sonrasi filigransiz acilir</span>
                          </div>
                        </div>
                      }
                    />
                    <div className="photo-meta">
                      <span className="score-pill">
                        Eşleşme skoru {match.score.toFixed(2)}
                      </span>
                      <div className="score-bar">
                        <span style={{ width: `${Math.min(match.score * 100, 100)}%` }} />
                      </div>
                      <button
                        className="button-secondary"
                        onClick={() => setUnlockOpen(true)}
                        type="button"
                      >
                        Paketi Aç
                      </button>
                    </div>
                  </article>
                ))}
                </div>
              ) : null}
              {!isFreeDistribution && result.matches.length > 0 && displayedLockedMatches.length === 0 ? (
                <div className="status">
                  Bu arama için ek kilitli fotoğraf kalmadı. Ücretsiz ve satın
                  alınan fotoğrafları yukarıdan tekrar açabilirsin.
                </div>
              ) : null}
              {checkoutMessage ? <div className="status">{checkoutMessage}</div> : null}
            </div>
          )}
        </div>
      </section>

      {selectedMatch ? (
        <div className={`modal-backdrop${mobileMode ? " modal-backdrop-mobile" : ""}`} onClick={() => setSelectedMatch(null)}>
          <div
            className={`modal-shell${mobileMode ? " modal-shell-mobile" : ""}`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close preview"
              className="modal-close"
              onClick={() => setSelectedMatch(null)}
              type="button"
            >
              ×
            </button>
            {selectedMatch.photo_url ? (
              <ModalPreviewStage
                alt="Selected matched photo"
                imageUrl={selectedMatch.photo_url}
                materials={materials}
              />
            ) : null}
            <div className="modal-meta">
              <span className="score-pill">
                Eşleşme skoru {selectedMatch.score.toFixed(2)}
              </span>
              <h3>{isFreeDistribution ? "Fotoğraf önizlemesi" : "Ücretsiz fotoğraf önizlemesi"}</h3>
              <p className="muted">
                {isFreeDistribution
                  ? "Bu etkinlikte tüm fotoğraflar ücretsiz. Dilediğini hemen indirebilirsin."
                  : "Önizleme uygulama içinde açılır. İndirme ve paket açma aynı akışta devam eder."}
              </p>
              {selectedMatch.photo_url ? (
                <div className="modal-actions">
                  {mobileMode ? (
                    <button
                      className="button"
                      onClick={() => {
                        const downloadUrl = selectedMatch.photo_url;
                        if (!downloadUrl) {
                          return;
                        }
                        void saveImageToDevice(downloadUrl, "findmyshot-onizleme.jpg");
                      }}
                      type="button"
                    >
                      Fotoğraflara kaydet
                    </button>
                  ) : (
                    <a
                      className="button"
                      href={buildDownloadUrl(
                        selectedMatch.photo_url,
                        "findmyshot-onizleme.jpg"
                      )}
                    >
                      Fotoğrafı indir
                    </a>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {unlockOpen && !isFreeDistribution ? (
        <div className={`drawer-backdrop${mobileMode ? " drawer-backdrop-mobile" : ""}`} onClick={() => setUnlockOpen(false)}>
          <aside
            className={`unlock-drawer${mobileMode ? " unlock-drawer-mobile" : ""}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="eyebrow">Galeri Paketleri</div>
            <h3>Paket Seç</h3>
            <p className="muted">
              Demo checkout seçimi anında aktif eder ve siparişini saklar.
            </p>

            <div className="pricing-grid">
              {packageOptions.map((option) => (
                <button
                  className={`price-card${selectedPackageOption?.key === option.key ? " price-card-featured" : ""}`}
                  key={option.key}
                  onClick={() => setSelectedPackage(option.key)}
                  type="button"
                >
                  <strong>{option.title}</strong>
                  <span>{option.priceLabel}</span>
                  <p className="muted">{option.description}</p>
                  <div className="package-footnote">
                    Bu aramada {option.photoCount} fotoğrafı açar.
                  </div>
                </button>
              ))}
            </div>

            {selectedPackageOption ? (
              <div className="checkout-summary">
                <strong>
                  {selectedPackageOption.title} seçildi
                </strong>
                <div className="muted">
                  {checkoutPhotoCount} fotoğraf {selectedPackageOption.priceLabel} ile açılacak.
                </div>
              </div>
            ) : null}

            <label className="field">
              <span>Makbuz e-postası</span>
              <input
                onChange={(event) => setGuestEmail(event.target.value)}
                placeholder="guest@email.com"
                type="email"
                value={guestEmail}
              />
            </label>

            <div className="cta-row">
              <button
                className="button"
                disabled={checkoutLoading || checkoutPhotoCount === 0}
                onClick={handleCheckout}
                type="button"
              >
                {checkoutLoading ? "İşleniyor..." : "Ödemeye Devam Et"}
              </button>
              <button
                className="button-secondary"
                onClick={() => setUnlockOpen(false)}
                type="button"
              >
                Daha Sonra
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
