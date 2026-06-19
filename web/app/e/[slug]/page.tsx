import PublicEventPageClient from "../../../components/public-event-page-client";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

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

async function getPublicEvent(slug: string) {
  try {
    const response = await fetch(`${apiBaseUrl}/api/events/public/${slug}`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { event?: EventData };
    return payload.event ?? null;
  } catch {
    return null;
  }
}

export default async function EventPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const initialEvent = await getPublicEvent(slug);

  return (
    <PublicEventPageClient
      initialEvent={initialEvent}
      previewRequested={query.preview === "1"}
      slug={slug}
    />
  );
}
