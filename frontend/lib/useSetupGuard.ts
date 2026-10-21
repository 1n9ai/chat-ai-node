"use client";

import { useEffect } from "react";
import { getPublicStatus } from "@/lib/api";

/** public pages: until the license and the AI model are connected, go to the first-run setup page */
export function useSetupGuard() {
  useEffect(() => {
    getPublicStatus()
      .then((s) => !s.configured && window.location.replace("/setup/"))
      .catch(() => undefined);
  }, []);
}
