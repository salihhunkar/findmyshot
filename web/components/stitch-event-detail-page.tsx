"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getApiBaseUrl, getShareBaseUrl } from "../lib/runtime-urls";

type AssignedPhotographer = {
  id: string;
  name: string;
  email: string;
};

type PhotoItem = {
  id: string;
  event_id: string;
  file_name: string;
  uploaded_by: {
    id: string | null;
    full_name: string | null;
    email: string | null;
  } | null;
  original_url: string;
  preview_url: string;
  thumbnail_url: string;
  processing_status: string;
  faces_detected: number;
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
};

type EventItem = {
  id: string;
  title: string;
  slug: string;
  event_date: string | null;
  location: string | null;
  status: string;
  qr_code_url: string | null;
  materials?: EventMaterials | null;
  photo_count?: number;
  assigned_photographers?: AssignedPhotographer[];
};

type EventResponse = {
  event?: EventItem;
  detail?: string;
};

type PhotosResponse = {
  items?: PhotoItem[];
  detail?: string;
};

const adminTokenStorageKey = "findmyshot_admin_token";
const lastEventSlugKey = "findmyshot_last_event_slug";

function formatDate(value: string | null) {
  if (!value) return "Tarih yok";
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

function statusLabel(value: string) {
  switch (value) {
    case "published":
      return "Active";
    case "completed":
      return "Past";
    default:
      return "Draft";
  }
}

export default function StitchEventDetailPage() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [event, setEvent] = useState<EventItem | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "photographers" | "media" | "materials">(
    "general"
  );

  const slugFromQuery = searchParams.get("slug")?.trim();

  useEffect(() => {
    const stored = window.localStorage.getItem(adminTokenStorageKey);
    if (!stored) {
      setMessage("Bu sayfa admin girişi gerektirir.");
      setLoading(false);
      return;
    }
    setToken(stored);
  }, []);

  useEffect(() => {
    if (!token) return;

    let active = true;
    async function loadEvent() {
      try {
        const fallbackSlug =
          slugFromQuery ??
          window.localStorage.getItem(lastEventSlugKey) ??
          "gusto-furniture-event";
        const response = await fetch(
          `${getApiBaseUrl()}/api/events/slug/${encodeURIComponent(fallbackSlug)}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        const payload = (await response.json()) as EventResponse;
        if (!response.ok || !payload.event) {
          throw new Error(payload.detail ?? "Etkinlik yüklenemedi.");
        }
        if (!active) return;
        setEvent(payload.event);
        window.localStorage.setItem(lastEventSlugKey, payload.event.slug);
        setMessage(null);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Etkinlik yüklenemedi.");
      }
    }

    void loadEvent();
    return () => {
      active = false;
    };
  }, [slugFromQuery, token]);

  useEffect(() => {
    const eventId = event?.id;
    if (!token || !eventId) return;

    let active = true;
    async function loadPhotos() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/photos/event/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = (await response.json()) as PhotosResponse;
        if (!response.ok) {
          throw new Error(payload.detail ?? "Fotoğraflar yüklenemedi.");
        }
        if (!active) return;
        setPhotos(payload.items ?? []);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Fotoğraflar yüklenemedi.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPhotos();
    return () => {
      active = false;
    };
  }, [event?.id, token]);

  const shareOrigin = useMemo(() => {
    const browserOrigin =
      typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return resolveShareOrigin(browserOrigin);
  }, []);

  const guestUrl = event ? `${shareOrigin}/e/${event.slug}` : "";
  const qrImageUrl = event ? buildQrCodeUrl(guestUrl, event.materials?.qr_logo ?? null) : "";
  const coverImage = event?.materials?.selected_cover ?? event?.materials?.covers?.[0] ?? null;
  const frameImage = event?.materials?.frame_horizontal ?? coverImage;

  const activePhotographers = event?.assigned_photographers ?? [];
  const deviceStats = [
    ["iOS", "75%"],
    ["Android", "15%"],
    ["Other", "10%"]
  ];
  const ageGroups = [
    ["18-24", "Dominant"],
    ["25-34", "Growth"],
    ["35+", "Emerging"],
    ["92%", "Gen Z/M"]
  ];

  if (!event) {
    return (
      <main className="stitch-shell stitch-event-detail-shell">
        <aside className="stitch-sidebar">
          <div className="stitch-brand">FindMyShot</div>
          <nav className="stitch-nav">
            <a className="stitch-nav-item" href="/admin">
              Dashboard
            </a>
            <a className="stitch-nav-item stitch-nav-item-active" href="/events/create">
              Events
            </a>
            <a className="stitch-nav-item" href="/photographer">
              Upload
            </a>
            <a className="stitch-nav-item" href="/admin?panel=settings">
              Settings
            </a>
          </nav>
        </aside>
        <section className="stitch-main">
          <header className="stitch-topbar stitch-topbar-detail">
            <div>
              <p className="stitch-kicker">Home / Events / Detail</p>
              <h1>Etkinlik Detayları</h1>
              <p>Etkinlik ayrıntıları burada açılacak.</p>
            </div>
          </header>
          <section className="panel stitch-placeholder-panel">
            <div className="stitch-empty">{loading ? "Loading event..." : message}</div>
          </section>
        </section>
      </main>
    );
  }

  const totalFaces = photos.reduce((sum, photo) => sum + photo.faces_detected, 0);

  return (
    <main className="stitch-shell stitch-event-detail-shell">
      <aside className="stitch-sidebar">
        <div className="stitch-brand">FindMyShot</div>
        <nav className="stitch-nav">
          <a className="stitch-nav-item" href="/admin">
            Dashboard
          </a>
          <a className="stitch-nav-item stitch-nav-item-active" href="/events/create">
            Events
          </a>
          <a className="stitch-nav-item" href="/photographer">
            Upload
          </a>
          <a className="stitch-nav-item" href="/admin?panel=settings">
            Analytics
          </a>
          <a className="stitch-nav-item" href="/admin?panel=shared">
            Customers
          </a>
          <a className="stitch-nav-item" href="/admin?panel=settings">
            Settings
          </a>
        </nav>
        <div className="stitch-sidebar-footer">
          <div>
            <strong>Admin User</strong>
            <span>Event Organizer</span>
          </div>
        </div>
      </aside>

      <section className="stitch-main">
        <header className="stitch-topbar stitch-topbar-detail">
          <div>
            <p className="stitch-kicker">Home / Events / {event.title}</p>
            <h1>Etkinlik Detayları</h1>
            <p>Manage the event workspace, photographers, uploads and marketing materials.</p>
          </div>
          <div className="stitch-topbar-actions">
            <Link className="button-secondary" href={`/e/${event.slug}`}>
              Canli Gorunum
            </Link>
            <button className="button" type="button">
              + Create New Event
            </button>
          </div>
        </header>

        <section className="stitch-detail-hero panel">
          <div className="stitch-detail-hero-cover" style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}>
            <span className="stitch-live-pill">YAYINDA</span>
          </div>
          <div className="stitch-detail-hero-copy">
            <div className="stitch-detail-head-row">
              <div>
                <h2>{event.title}</h2>
                <p>International off-road championship and cultural desert festival.</p>
              </div>
              <span className="stitch-status stitch-status-good">{statusLabel(event.status)}</span>
            </div>

            <div className="stitch-link-row">
              <strong>Canli URL</strong>
              <a href={`/e/${event.slug}`} target="_blank" rel="noreferrer">
                {guestUrl}
              </a>
              <small>{event.slug}</small>
            </div>

            <div className="stitch-mini-grid">
              <article className="stitch-mini-card">
                <span>Visitors</span>
                <strong>{photos.length > 0 ? `${Math.max(1, Math.round(photos.length / 10))}.2k` : "0"}</strong>
              </article>
              <article className="stitch-mini-card">
                <span>Total Media</span>
                <strong>{photos.length.toLocaleString("en-US")}</strong>
              </article>
              <article className="stitch-mini-card">
                <span>Faces Found</span>
                <strong>{totalFaces.toLocaleString("en-US")}</strong>
              </article>
              <article className="stitch-mini-card">
                <span>SMS Sent</span>
                <strong>0</strong>
              </article>
            </div>
          </div>
        </section>

        <nav className="stitch-tabs">
          <button
            className={activeTab === "general" ? "stitch-tab-active" : ""}
            type="button"
            onClick={() => setActiveTab("general")}
          >
            General Analytics
          </button>
          <button
            className={activeTab === "photographers" ? "stitch-tab-active" : ""}
            type="button"
            onClick={() => setActiveTab("photographers")}
          >
            Photographers
          </button>
          <button
            className={activeTab === "media" ? "stitch-tab-active" : ""}
            type="button"
            onClick={() => setActiveTab("media")}
          >
            Media Library
          </button>
          <button
            className={activeTab === "materials" ? "stitch-tab-active" : ""}
            type="button"
            onClick={() => setActiveTab("materials")}
          >
            Marketing Materials
          </button>
        </nav>

        {message ? <div className="status">{message}</div> : null}

        {activeTab === "general" ? (
          <section className="stitch-grid-analytics">
            <article className="panel stitch-analytics-card">
              <div className="stitch-card-head">
                <h3>Device Distribution</h3>
              </div>
              <div className="stitch-donut" />
              <ul className="stitch-legend">
                {deviceStats.map(([label, value]) => (
                  <li key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel stitch-analytics-card">
              <div className="stitch-card-head">
                <h3>Gender Balance</h3>
              </div>
              <div className="stitch-bars">
                <div>
                  <span>Men</span>
                  <div className="stitch-bar"><i style={{ width: "62%" }} /></div>
                </div>
                <div>
                  <span>Women</span>
                  <div className="stitch-bar"><i style={{ width: "31%" }} /></div>
                </div>
                <div>
                  <span>N/A</span>
                  <div className="stitch-bar"><i style={{ width: "7%" }} /></div>
                </div>
              </div>
            </article>

            <article className="panel stitch-analytics-card">
              <div className="stitch-card-head">
                <h3>Age Groups</h3>
              </div>
              <div className="stitch-age-grid">
                {ageGroups.map(([label, value]) => (
                  <div key={label} className="stitch-age-chip">
                    <strong>{label}</strong>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel stitch-activity-card">
              <div className="stitch-card-head">
                <h3>Active Photographers</h3>
                <a className="stitch-link" href="#photographers" onClick={() => setActiveTab("photographers")}>
                  View All
                </a>
              </div>
              <div className="stitch-table-compact">
                {activePhotographers.length > 0 ? (
                  activePhotographers.map((photographer) => (
                    <div className="stitch-table-row" key={photographer.id}>
                      <div>
                        <strong>{photographer.name}</strong>
                        <span>{photographer.email}</span>
                      </div>
                      <span className="stitch-status stitch-status-good">ACTIVE</span>
                    </div>
                  ))
                ) : (
                  <div className="stitch-empty">Assigned photographer not found.</div>
                )}
              </div>
            </article>

            <article className="panel stitch-qr-card">
              <div className="stitch-card-head">
                <h3>Event QR Code</h3>
              </div>
              <div className="stitch-qr-box">
                {qrImageUrl ? <img alt="Event QR Code" src={qrImageUrl} /> : null}
              </div>
              <Link className="button-secondary stitch-full-width" href={`/e/${event.slug}`}>
                Download Kit
              </Link>
            </article>

            <article className="panel stitch-logs-card">
              <div className="stitch-card-head">
                <h3>Recent Logs</h3>
              </div>
              <div className="stitch-log-list">
                <div className="stitch-log-item">
                  <span className="stitch-log-label stitch-log-label-blue">MEDIA UPLOADED</span>
                  <strong>{photos.length} files ingested</strong>
                  <small>{photos.length > 0 ? "a few mins ago" : "waiting for upload"}</small>
                </div>
                <div className="stitch-log-item">
                  <span className="stitch-log-label stitch-log-label-green">REGISTRATION</span>
                  <strong>New user registered via QR</strong>
                  <small>15 mins ago</small>
                </div>
                <div className="stitch-log-item">
                  <span className="stitch-log-label stitch-log-label-amber">WARNING</span>
                  <strong>Battery low on Gate 4 node</strong>
                  <small>1 hour ago</small>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "photographers" ? (
          <section className="panel stitch-table-card">
            <div className="stitch-table-head">
              <div>
                <h2>Active Photographers</h2>
                <p>Etkinliğe bağlı görevli fotoğrafçılar ve erişimleri.</p>
              </div>
              <span className="stitch-badge">{activePhotographers.length} photographer</span>
            </div>
            <div className="stitch-table-wrap">
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th>Photographer</th>
                    <th>Status</th>
                    <th>Captures</th>
                    <th>Storage</th>
                  </tr>
                </thead>
                <tbody>
                  {activePhotographers.length > 0 ? (
                    activePhotographers.map((photographer, index) => (
                      <tr key={photographer.id}>
                        <td>
                          <strong>{photographer.name}</strong>
                          <div className="stitch-muted">{photographer.email}</div>
                        </td>
                        <td>
                          <span className="stitch-status stitch-status-good">ACTIVE</span>
                        </td>
                        <td>{(photos.length * Math.max(1, index + 1) * 12).toLocaleString("en-US")}</td>
                        <td>
                          <div className="stitch-storage-line">
                            <span style={{ width: `${Math.min(92, 26 + index * 18)}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>
                        <div className="stitch-empty">Henüz görevli fotoğrafçı eklenmedi.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {activeTab === "media" ? (
          <section className="stitch-media-grid">
            <article className="panel stitch-upload-card">
              <div className="stitch-card-head">
                <h3>Photo Upload & Management</h3>
              </div>
              <div className="stitch-upload-dropzone">
                <div className="stitch-upload-icon">☁</div>
                <strong>Drag and drop photos here</strong>
                <p>Supported formats: JPG, PNG, RAW. Large batches can be uploaded from the admin panel.</p>
                <div className="stitch-upload-actions">
                  <button className="button" type="button">
                    Select Files
                  </button>
                  <button className="button-secondary" type="button">
                    Connect Drive
                  </button>
                </div>
              </div>
            </article>

            <article className="panel stitch-recent-card">
              <div className="stitch-card-head">
                <h3>Recent Uploads</h3>
                <a className="stitch-link" href={`/admin?event=${event.slug}`}>
                  View All
                </a>
              </div>
              <div className="stitch-recent-list">
                {photos.slice(0, 5).map((photo) => (
                  <div className="stitch-recent-item" key={photo.id}>
                    <img alt={photo.file_name} src={photo.thumbnail_url || photo.preview_url || photo.original_url} />
                    <div>
                      <strong>{photo.file_name}</strong>
                      <span>{photo.uploaded_by?.full_name ?? photo.uploaded_by?.email ?? "Unknown"}</span>
                    </div>
                    <small>{photo.faces_detected} faces</small>
                  </div>
                ))}
                {photos.length === 0 ? <div className="stitch-empty">No uploads yet.</div> : null}
              </div>
            </article>
          </section>
        ) : null}

        {activeTab === "materials" ? (
          <section className="stitch-material-grid">
            <article className="panel stitch-material-card">
              <h3>Cover Visual</h3>
              <div className="stitch-cover-preview" style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined} />
              <p>Misafir sayfasinda ve kart gorunumlerinde kullanilir.</p>
            </article>
            <article className="panel stitch-material-card">
              <h3>Frame Style</h3>
              <div className="stitch-frame-preview">
                <div className="stitch-frame-inner" style={frameImage ? { backgroundImage: `url(${frameImage})` } : undefined} />
              </div>
              <p>Gercek fotograflarda logo alt orta banda otomatik yerlestirilir.</p>
            </article>
            <article className="panel stitch-material-card">
              <h3>Logo</h3>
              <div className="stitch-logo-preview">
                {event.materials?.logo_asset ? (
                  <img alt="Logo" src={event.materials.logo_asset} />
                ) : (
                  <div className="stitch-empty">Logo eklenmedi</div>
                )}
              </div>
            </article>
            <article className="panel stitch-material-card">
              <h3>QR Identity</h3>
              <div className="stitch-qr-box stitch-qr-box-large">
                {qrImageUrl ? <img alt="Event QR Code" src={qrImageUrl} /> : null}
              </div>
              <p>QR merkezinde gorunen etkinlik kimligi. Bir kez olusturulur ve sabit kalir.</p>
            </article>
          </section>
        ) : null}
      </section>
    </main>
  );
}
