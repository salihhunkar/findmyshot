import MobileGuestEventPageClient from "../../../components/mobile-guest-event-page-client";
import { getServerApiBaseUrl } from "../../../lib/api-base";

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
    const response = await fetch(`${getServerApiBaseUrl()}/api/events/public/${slug}`, {
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

export default async function MobileGuestEventPage({
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
    <MobileGuestEventPageClient
      initialEvent={initialEvent}
      previewRequested={query.preview === "1"}
      slug={slug}
    />
  );
}
