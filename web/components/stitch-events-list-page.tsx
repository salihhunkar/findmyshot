"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getApiBaseUrl } from "../lib/runtime-urls";

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

type EventsResponse = {
  items?: EventItem[];
  detail?: string;
};

const adminTokenStorageKey = "findmyshot_admin_token";

function formatDate(value: string | null) {
  if (!value) return "Tarih yok";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function formatStatus(value: string) {
  switch (value) {
    case "published":
      return { label: "Active", tone: "good" as const };
    case "completed":
      return { label: "Past", tone: "neutral" as const };
    default:
      return { label: "Draft", tone: "warn" as const };
  }
}

export default function StitchEventsListPage() {
  const [token, setToken] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "draft" | "published" | "completed">("all");
  const [sort, setSort] = useState<"recent" | "date">("recent");

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
    async function loadEvents() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/events`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const payload = (await response.json()) as EventsResponse;
        if (!response.ok) {
          throw new Error(payload.detail ?? "Etkinlikler yüklenemedi.");
        }
        if (!active) return;
        setEvents(payload.items ?? []);
        setMessage(null);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Etkinlikler yüklenemedi.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadEvents();
    return () => {
      active = false;
    };
  }, [token]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return [...events]
      .filter((event) => {
        const matchesQuery =
          !normalizedQuery ||
          [event.title, event.slug, event.location, event.event_date]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        const matchesStatus = status === "all" || event.status === status;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (sort === "date") {
          return String(a.event_date ?? "").localeCompare(String(b.event_date ?? ""));
        }
        return String(b.event_date ?? "").localeCompare(String(a.event_date ?? ""));
      });
  }, [events, query, sort, status]);

  const summary = useMemo(() => {
    const totalEvents = events.length;
    const totalPhotos = events.reduce((sum, event) => sum + (event.photo_count ?? 0), 0);
    const activeEvents = events.filter((event) => event.status === "published").length;
    const upcomingEvents = events.filter((event) => {
      if (!event.event_date) return false;
      return event.event_date >= new Date().toISOString().slice(0, 10);
    }).length;

    return { totalEvents, totalPhotos, activeEvents, upcomingEvents };
  }, [events]);

  return (
    <main className="stitch-shell stitch-events-shell">
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
            Upload Photos
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
            <strong>FindMyShot Admin</strong>
            <span>Photographer & Event Ops</span>
          </div>
          <a className="stitch-ghost-link" href="/login">
            Cikis Yap
          </a>
        </div>
      </aside>

      <section className="stitch-main">
        <header className="stitch-topbar">
          <div>
            <p className="stitch-kicker">Main Console</p>
            <h1>Events</h1>
            <p>Manage and track your photography sessions across all locations.</p>
          </div>
          <div className="stitch-topbar-actions">
            <Link className="button-secondary" href="/admin">
              Dashboard
            </Link>
            <Link className="button" href="/admin">
              + Create Event
            </Link>
          </div>
        </header>

        <section className="stitch-summary-grid">
          <article className="stitch-summary-card">
            <span>Total Events</span>
            <strong>{summary.totalEvents}</strong>
            <small>Active setleri izleyin</small>
          </article>
          <article className="stitch-summary-card">
            <span>Total Photos</span>
            <strong>{summary.totalPhotos.toLocaleString("en-US")}</strong>
            <small>Etkinliklere dagilan kareler</small>
          </article>
          <article className="stitch-summary-card">
            <span>Active Events</span>
            <strong>{summary.activeEvents}</strong>
            <small>Yayinda olan etkinlikler</small>
          </article>
          <article className="stitch-summary-card">
            <span>Upcoming</span>
            <strong>{summary.upcomingEvents.toString().padStart(2, "0")}</strong>
            <small>Onumuzdeki 7 gun</small>
          </article>
        </section>

        <section className="stitch-toolbar panel">
          <div className="stitch-search-wrap">
            <label className="stitch-input">
              <span>Search Events</span>
              <input
                placeholder="By name, city..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="stitch-input">
              <span>Status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value as any)}>
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Active</option>
                <option value="completed">Past</option>
              </select>
            </label>
            <label className="stitch-input">
              <span>Sort</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as any)}>
                <option value="recent">Most Recent</option>
                <option value="date">Event Date</option>
              </select>
            </label>
          </div>
          <div className="stitch-toolbar-actions">
            <button className="button-secondary" type="button">
              Filter
            </button>
            <button className="button-secondary" type="button">
              Export
            </button>
          </div>
        </section>

        <section className="stitch-content-grid">
          <article className="panel stitch-table-card">
            <div className="stitch-table-head">
              <div>
                <h2>Events</h2>
                <p>Manage your photography projects and photographer assignments.</p>
              </div>
              <span className="stitch-badge">{filteredEvents.length} events</span>
            </div>

            {message ? <div className="status">{message}</div> : null}

            <div className="stitch-table-wrap">
              <table className="stitch-table">
                <thead>
                  <tr>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Photo Count</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="stitch-empty">Loading events...</div>
                      </td>
                    </tr>
                  ) : filteredEvents.length > 0 ? (
                    filteredEvents.map((event) => {
                      const statusInfo = formatStatus(event.status);
                      return (
                        <tr key={event.id}>
                          <td>
                            <div className="stitch-table-event">
                              <div className="stitch-table-thumb" />
                              <div>
                                <strong>{event.title}</strong>
                                <span>ID: {event.slug}</span>
                              </div>
                            </div>
                          </td>
                          <td>{formatDate(event.event_date)}</td>
                          <td>{event.location ?? "—"}</td>
                          <td>
                            <span className={`stitch-status stitch-status-${statusInfo.tone}`}>
                              {statusInfo.label}
                            </span>
                          </td>
                          <td>{(event.photo_count ?? 0).toLocaleString("en-US")}</td>
                          <td>
                            <div className="stitch-row-actions">
                              <a className="button-secondary" href={`/events/detail?slug=${event.slug}`}>
                                Manage
                              </a>
                              <a className="stitch-link" href={`/e/${event.slug}`}>
                                View
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6}>
                        <div className="stitch-empty">No matching events found.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="stitch-pagination">
              <span>Showing 1-{Math.min(filteredEvents.length, 24)} of {filteredEvents.length} events</span>
              <div className="stitch-pagination-actions">
                <button className="button-secondary" type="button">
                  &lt;
                </button>
                <button className="button-secondary" type="button">
                  1
                </button>
                <button className="button-secondary" type="button">
                  2
                </button>
                <button className="button-secondary" type="button">
                  &gt;
                </button>
              </div>
            </div>
          </article>

          <aside className="stitch-side-column">
            <article className="panel stitch-side-card">
              <h3>Quick Actions</h3>
              <button className="button-secondary" type="button">
                New Event
              </button>
              <button className="button-secondary" type="button">
                Bulk Upload
              </button>
              <button className="button-secondary" type="button">
                Generate Reports
              </button>
              <button className="button-secondary" type="button">
                Email Campaign
              </button>
            </article>

            <article className="panel stitch-side-card stitch-side-storage">
              <h3>Storage Usage</h3>
              <div className="stitch-meter">
                <span style={{ width: "82%" }} />
              </div>
              <strong>82%</strong>
              <small>410.5 GB of 500 GB used</small>
            </article>
          </aside>
        </section>
      </section>
    </main>
  );
}
