"use client";

import dynamic from "next/dynamic";
import { usePreferences } from "@/providers/preferences-provider";

const OfflineRegistrar = dynamic(() => import("@/components/pwa/offline-registrar"), { ssr: false });

export function OfflineGate() {
  const { effective } = usePreferences();
  return effective.offlineMode ? <OfflineRegistrar /> : null;
}
