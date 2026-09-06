import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { PawTrendsPersistenceProof } from "@/features/persistence-proof/paw-trends-persistence-proof";
import { createPawTrendsProbeStore } from "@/persistence/paw-trends-probe-store";

function PawTrendsHome() {
  const store = useMemo(() => createPawTrendsProbeStore(), []);

  return <PawTrendsPersistenceProof store={store} />;
}

export const Route = createFileRoute("/")({ component: PawTrendsHome });
