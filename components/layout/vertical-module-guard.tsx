"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { canAccessModule } from "@/lib/navigation/vertical-presets";

/** Redirects tenant users away from modules hidden by their org activity domain. */
export function VerticalModuleGuard({
  activityDomain,
  enabled,
}: {
  activityDomain?: string | null;
  enabled: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    if (!canAccessModule(activityDomain, pathname)) {
      router.replace("/dashboard");
    }
  }, [activityDomain, enabled, pathname, router]);

  return null;
}
