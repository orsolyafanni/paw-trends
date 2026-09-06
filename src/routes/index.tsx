import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { PawTrendsApp } from "@/features/app/paw-trends-app";
import { createPawTrendsProbeStore } from "@/persistence/paw-trends-probe-store";

function PawTrendsHome() {
  const store = useMemo(() => createPawTrendsProbeStore(), []);

  return <PawTrendsApp store={store} />;
}

export const Route = createFileRoute("/")({ component: PawTrendsHome });
