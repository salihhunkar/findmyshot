import { Suspense } from "react";

import StitchEventDetailPage from "../../../components/stitch-event-detail-page";

export default function EventDetailPage() {
  return (
    <Suspense fallback={null}>
      <StitchEventDetailPage />
    </Suspense>
  );
}
