import { Suspense } from "react";

import PhotographerDashboard from "../../components/photographer-dashboard";

export default function PhotographerPage() {
  return (
    <Suspense fallback={null}>
      <PhotographerDashboard />
    </Suspense>
  );
}
