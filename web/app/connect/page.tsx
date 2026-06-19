import Link from "next/link";
import { getShareBaseUrl } from "../../lib/runtime-urls";

function buildQrCodeUrl(targetUrl: string) {
  const query = new URLSearchParams({
    size: "320x320",
    data: targetUrl,
    margin: "0"
  });
  return `https://api.qrserver.com/v1/create-qr-code/?${query.toString()}`;
}

export default function ConnectPage() {
  const shareUrl = getShareBaseUrl();
  const qrUrl = buildQrCodeUrl(shareUrl);

  return (
    <main className="login-shell">
      <header className="login-topbar">
        <a className="login-brand" href="/">
          <span>F</span>
          <strong>FindMyShot</strong>
        </a>
        <div className="login-topbar-actions">
          <Link className="button-secondary" href="/login">
            Giriş
          </Link>
          <Link className="button" href="/">
            Ana Sayfa
          </Link>
        </div>
      </header>

      <section className="login-frame-wrap">
        <div className="login-frame login-choice-frame">
          <span className="login-kicker">LAN BAGLANTI</span>
          <h1>Telefonundan açmak için tara</h1>
          <p className="login-intro">
            Bu QR kod aynı yerel ağdaki telefonda FindMyShot'un kopyasını açar.
          </p>
          <p className="login-helper">
            Eğer telefonunda açılmıyorsa, aynı Wi-Fi ağına bağlı olduğunu ve
            tarayıcının yerel ağ erişimine izin verdiğini kontrol et.
          </p>

          <div style={{ display: "grid", placeItems: "center", margin: "24px 0" }}>
            <img
              alt="FindMyShot local network QR code"
              src={qrUrl}
              style={{
                width: "min(100%, 320px)",
                height: "auto",
                borderRadius: 24,
                boxShadow: "0 20px 48px rgba(31, 42, 68, 0.18)",
                background: "white",
                padding: 12
              }}
            />
          </div>

          <div className="login-choice-grid" style={{ width: "min(640px, 100%)" }}>
            <article className="login-choice-card">
              <span className="login-choice-badge">DOĞRUDAN LİNK</span>
              <h2>Tarayıcıda aç</h2>
              <p>{shareUrl}</p>
              <a className="button" href={shareUrl}>
                Bu Linki Aç
              </a>
            </article>

            <article className="login-choice-card">
              <span className="login-choice-badge">HIZLI ERİŞİM</span>
              <h2>Önemli sayfalar</h2>
              <p>Login, admin ve misafir akışlarını aynı yerel ağ üzerinden kullanabilirsin.</p>
              <Link className="button-secondary" href="/admin">
                Admin
              </Link>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}
