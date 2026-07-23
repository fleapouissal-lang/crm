"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_TABLES = [
  "profiles",
  "leads",
  "tasks",
  "clients",
  "projects",
  "quotes",
  "invoices",
  "expenses",
  "document_templates",
  "activities",
  "hr_employee_profiles",
  "hr_entries",
] as const;

/**
 * Re-runs the current RSC tree when org-scoped rows change in Postgres.
 * Debounced so bursts of writes (imports, multi-row updates) don't spam refresh.
 */
export function useOrgRealtimeRefresh(
  organizationId: string | null | undefined,
  tables: readonly string[] = DEFAULT_TABLES,
  debounceMs = 400
) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tablesKey = tables.join(",");

  useEffect(() => {
    if (!organizationId) return;

    const watched = tablesKey.split(",").filter(Boolean);
    if (watched.length === 0) return;

    const supabase = createClient();
    const scheduleRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, debounceMs);
    };

    const channel = supabase.channel(`org-auto-refresh:${organizationId}`);
    for (const table of watched) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `organization_id=eq.${organizationId}`,
        },
        scheduleRefresh
      );
    }

    channel.subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [organizationId, router, tablesKey, debounceMs]);
}
