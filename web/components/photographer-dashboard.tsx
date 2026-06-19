"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiBaseUrl } from "../lib/runtime-urls";
const photographerTokenStorageKey = "findmyshot_photographer_token";

type AssignedPhotographer = {
  id: string;
  name: string;
  email: string;
};

type EventItem = {
  id: string;
  title: string;
  slug: string;
  event_date: string | null;
  location: string | null;
  status: string;
  photo_count?: number;
  assigned_photographers?: AssignedPhotographer[];
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
  thumbnail_url: string;
  preview_url: string;
  original_url: string;
  processing_status: string;
  faces_detected: number;
};

type MeResponse = {
  role: string;
  full_name: string | null;
  email: string;
};

function formatDate(value: string | null) {
  if (!value) return "Tarih yok";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

export default function PhotographerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const selectedEvent = events.find((item) => item.id === selectedEventId) ?? null;
  const selectedEventSlugFromQuery = searchParams.get("event");

  useEffect(() => {
    const stored = window.localStorage.getItem(photographerTokenStorageKey);
    if (!stored) {
      const nextQuery = new URLSearchParams();
      if (selectedEventSlugFromQuery) {
        nextQuery.set("event", selectedEventSlugFromQuery);
      }
      const loginPath = nextQuery.toString()
        ? `/photographer/login?${nextQuery.toString()}`
        : "/photographer/login";
      router.push(loginPath);
      return;
    }
    setToken(stored);
  }, [router, selectedEventSlugFromQuery]);

  useEffect(() => {
    if (!token) return;

    let active = true;
    async function loadDashboard() {
      try {
        const [meResponse, eventsResponse] = await Promise.all([
          fetch(`${getApiBaseUrl()}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${getApiBaseUrl()}/api/events`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const mePayload = (await meResponse.json()) as MeResponse & { detail?: string };
        if (!meResponse.ok) {
          throw new Error(mePayload.detail ?? "Oturum yuklenemedi.");
        }

        const eventsPayload = (await eventsResponse.json()) as {
          items?: EventItem[];
          detail?: string;
        };
        if (!eventsResponse.ok) {
          throw new Error(eventsPayload.detail ?? "Etkinlikler yuklenemedi.");
        }

        if (!active) return;
        const nextEvents = eventsPayload.items ?? [];
        setMe(mePayload);
        setEvents(nextEvents);
        setSelectedEventId((current) => {
          if (current && nextEvents.some((item) => item.id === current)) {
            return current;
          }
          if (selectedEventSlugFromQuery) {
            const nextSelected = nextEvents.find(
              (item) => item.slug === selectedEventSlugFromQuery
            );
            if (nextSelected) {
              return nextSelected.id;
            }
          }
          return nextEvents[0]?.id || "";
        });
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Pano yuklenemedi.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [token, router, selectedEventSlugFromQuery]);

  useEffect(() => {
    if (!token || !selectedEventId) {
      setPhotos([]);
      return;
    }

    let active = true;
    async function loadPhotos() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/photos/event/${selectedEventId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = (await response.json()) as {
          items?: PhotoItem[];
          detail?: string;
        };
        if (!response.ok) {
          throw new Error(payload.detail ?? "Fotoğraflar yüklenemedi.");
        }
        if (!active) return;
        setPhotos(payload.items ?? []);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Fotoğraflar yüklenemedi.");
      }
    }

    void loadPhotos();
    return () => {
      active = false;
    };
  }, [selectedEventId, token]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedEventId || !uploadFiles?.length) {
      setMessage("Bir etkinlik ve en az bir fotoğraf seç.");
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      for (const file of Array.from(uploadFiles)) {
        const formData = new FormData();
        formData.append("event_id", selectedEventId);
        formData.append("file", file);

        const response = await fetch(`${getApiBaseUrl()}/api/photos/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
        const payload = (await response.json()) as { detail?: string };
        if (!response.ok) {
          throw new Error(payload.detail ?? `${file.name} yüklenemedi.`);
        }
      }

      setUploadFiles(null);
      const refreshResponse = await fetch(`${getApiBaseUrl()}/api/photos/event/${selectedEventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const refreshPayload = (await refreshResponse.json()) as {
        items?: PhotoItem[];
      };
      setPhotos(refreshPayload.items ?? []);
      setMessage("Fotoğraflar yüklendi.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Yükleme başarısız.");
    } finally {
      setUploading(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(photographerTokenStorageKey);
    router.push("/photographer/login");
  }

  return (
    <main className="photographer-shell">
      <aside className="photographer-sidebar">
        <div className="photographer-brand">F</div>
        <div className="photographer-card">
          <span>Fotografci</span>
          <strong>{me?.full_name ?? me?.email ?? "Fotografci"}</strong>
          <p>Yalnizca fotoğraf yükleyebilirsin. Silme ve yönetim yok.</p>
          <button className="button-secondary" onClick={logout} type="button">
            Cikis Yap
          </button>
        </div>

        <div className="photographer-event-list">
          <strong>Etkinlikler</strong>
          {events.map((item) => (
            <button
              className={`photographer-event-item${
                selectedEventId === item.id ? " photographer-event-item-active" : ""
              }`}
              key={item.id}
              onClick={() => setSelectedEventId(item.id)}
              type="button"
            >
              <span>{item.title}</span>
              <small>{formatDate(item.event_date)}</small>
            </button>
          ))}
        </div>
      </aside>

      <section className="photographer-main">
        <header className="photographer-topbar">
          <div>
            <h1>Fotografci Panosu</h1>
            <p>Seçili etkinliğe sadece fotoğraf yükle.</p>
          </div>
          <div className="photographer-topbar-actions">
            {selectedEvent ? <span className="topbar-pill">{selectedEvent.title}</span> : null}
            {selectedEvent ? <span className="topbar-pill">{selectedEvent.slug}</span> : null}
          </div>
        </header>

        <div className="photographer-body">
          <section className="panel photographer-upload-panel">
            <h2>Fotoğraf Yükle</h2>
            <p className="muted">
              Görevli olarak sadece yükleme yapabilirsin. Yüklenen fotoğraflar otomatik olarak
              işlenir.
            </p>

            <form className="admin-form" onSubmit={handleUpload}>
              <label className="field">
                <span>Fotoğraflar</span>
                <input
                  multiple
                  onChange={(e) => setUploadFiles(e.target.files)}
                  type="file"
                />
              </label>
              <button className="button" disabled={uploading || !selectedEventId} type="submit">
                {uploading ? "Yükleniyor..." : "Fotoğrafları Yükle"}
              </button>
            </form>

            {message ? <div className="status">{message}</div> : null}
          </section>

          <section className="panel photographer-gallery-panel">
            <div className="photographer-gallery-head">
              <h2>Son Yüklenenler</h2>
              <span>{photos.length} fotoğraf</span>
            </div>
            <div className="photo-admin-grid">
              {photos.map((photo) => (
                <article className="photo-card" key={photo.id}>
                  <div className="photo-frame">
                    <img
                      alt={photo.file_name}
                      className="photo-media"
                      src={photo.thumbnail_url || photo.preview_url || photo.original_url}
                    />
                  </div>
                  <div className="photo-meta">
                    <strong>{photo.file_name}</strong>
                    <span className="score-pill">{photo.faces_detected} yüz</span>
                    <span className="muted">Durum: {photo.processing_status}</span>
                    <span className="muted">
                      Yükleyen: {photo.uploaded_by?.full_name ?? photo.uploaded_by?.email ?? "Bilinmiyor"}
                    </span>
                  </div>
                </article>
              ))}
              {selectedEvent ? null : <div className="empty">Bir etkinlik seç.</div>}
              {selectedEvent && photos.length === 0 ? (
                <div className="empty">Henüz fotoğraf yüklenmedi.</div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
