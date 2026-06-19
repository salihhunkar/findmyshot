"use client";

import Link from "next/link";
import QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";

function resolveTarget(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const slug = url.pathname.split("/").filter(Boolean).pop();
    if (slug && url.pathname.startsWith("/e/")) {
      return `/e/${slug}`;
    }
  } catch {
    if (trimmed.startsWith("/e/")) return trimmed;
    if (!trimmed.includes("://") && !trimmed.includes("/")) return `/e/${trimmed}`;
  }

  return null;
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [status, setStatus] = useState("Kamera başlatılıyor...");
  const [error, setError] = useState<string | null>(null);
  const [secureContext, setSecureContext] = useState(true);

  useEffect(() => {
    let cancelled = false;
    QrScanner.WORKER_PATH = "/qr-scanner-worker.min.js";
    setSecureContext(window.isSecureContext);

    async function startCamera() {
      try {
        if (!window.isSecureContext) {
          setError("Kamera için bu sayfa HTTPS üzerinden açılmalı. Lütfen https adresini kullan.");
          setStatus("Güvenli bağlantı gerekli.");
          return;
        }

        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Bu tarayıcı kamera erişimini desteklemiyor.");
          setStatus("Kamera erişimi kullanılamıyor.");
          return;
        }

        if (!videoRef.current) {
          return;
        }

        const scanner = new QrScanner(
          videoRef.current,
          (result) => {
            const target = resolveTarget(result.data);
            if (target) {
              window.location.href = target;
            }
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            onDecodeError: (decodeError) => {
              if (decodeError !== QrScanner.NO_QR_CODE_FOUND) {
                setError(typeof decodeError === "string" ? decodeError : "QR kod okunamadı.");
              }
            }
          }
        );

        if (cancelled) {
          scanner.destroy();
          return;
        }

        scannerRef.current = scanner;
        await scanner.start();
        setStatus("QR kodu çerçeveye hizala.");
        setError(null);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Kamera açılamadı. Tarayıcı izinlerini kontrol et."
        );
        setStatus("Kamera erişimi gerekli.");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  return (
    <main className="scan-shell">
      <header className="scan-topbar">
        <Link className="scan-brand" href="/">
          <span>F</span>
          <strong>FindMyShot</strong>
        </Link>
        <Link className="button-secondary" href="/">
          Ana Sayfa
        </Link>
      </header>

      <section className="scan-card">
        <div className="scan-video-wrap">
          <video ref={videoRef} className="scan-video" playsInline muted />
          <div className="scan-frame">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="scan-copy">
          <span className="stitch-home-kicker">QR KOD TARA</span>
          <h1>Kamerayı aç ve etkinlik QR’ını okut</h1>
          <p>
            QR kod tarandığında otomatik olarak etkinliğin misafir sayfasına yönlendirileceksin.
            Oradan selfie ile kendi fotoğraflarını bulma akışına devam edebilirsin.
          </p>
          <div className="scan-status">{error ?? status}</div>
          {!secureContext ? (
            <p className="scan-note">
              Kamera erişimi için bu sayfayı `https://` üzerinden açman gerekiyor.
            </p>
          ) : null}
          <div className="scan-actions">
            <Link className="stitch-home-organizer-primary" href="/e/gusto-furniture-event">
              Örnek Etkinlik Aç
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
