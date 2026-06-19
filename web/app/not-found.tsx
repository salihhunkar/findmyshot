import Link from "next/link";

export default function NotFound() {
  return (
    <main className="event-layout shell">
      <section className="panel">
        <div className="eyebrow">Event not found</div>
        <h1 style={{ marginTop: 16 }}>This gallery link is not active.</h1>
        <p className="muted">
          Check the QR code again or ask the photographer for the correct event
          link.
        </p>
        <div className="cta-row">
          <Link className="button" href="/">
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
