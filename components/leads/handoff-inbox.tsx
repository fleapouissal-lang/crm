"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listHandoffConversations } from "@/lib/actions/sales-agent";
import type { AiConversation } from "@/types/database";
import { cn } from "@/lib/utils";

export function HandoffInbox({ embedded = false }: { embedded?: boolean }) {
  const [rows, setRows] = useState<AiConversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const data = await listHandoffConversations();
      if (!cancelled) {
        setRows(data);
        setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const body = loading ? (
    <p className="text-sm fl-faint">Chargement…</p>
  ) : rows.length === 0 ? (
    <p className="py-8 text-center text-sm fl-faint">
      Aucune conversation en attente d’un commercial.
    </p>
  ) : (
    <div className="space-y-2">
      {rows.map((row) => {
        const leadName =
          row.lead?.contact_name ||
          row.lead?.company ||
          row.lead?.title ||
          "Lead";
        return (
          <Link
            key={row.id}
            href={`/leads/${row.lead_id}`}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm hover:bg-[var(--surface-2)]",
              row.urgent
                ? "border-red-500/50 bg-red-500/5"
                : "border-[var(--border)]"
            )}
          >
            <div className="min-w-0">
              <div className="truncate font-medium">{leadName}</div>
              <div className="truncate text-xs fl-faint">
                {row.lead?.sales_project || row.sales_project}
                {row.handoff_reason ? ` · ${row.handoff_reason}` : ""}
              </div>
            </div>
            <span
              className={cn(
                "fl-badge shrink-0",
                row.urgent ? "b-rose" : "b-amber"
              )}
            >
              {row.urgent ? "URGENT" : "handoff"}
            </span>
          </Link>
        );
      })}
    </div>
  );

  if (embedded) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Inbox handoff</h3>
          <p className="text-xs fl-faint">
            Urgent = l’IA n’a pas compris — répondre manuellement depuis le lead.
          </p>
        </div>
        {body}
      </div>
    );
  }

  if (!rows.length && !loading) return null;

  return <div className="fl-card fl-pad space-y-3">{body}</div>;
}
