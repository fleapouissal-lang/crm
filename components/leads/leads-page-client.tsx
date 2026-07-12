"use client";

import { useState } from "react";
import { Plus, LayoutGrid, List, Search } from "lucide-react";
import type { Lead, Profile, Role } from "@/types/database";
import { LEAD_STAGES } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KanbanBoard } from "@/components/leads/kanban-board";
import { LeadTable } from "@/components/leads/lead-table";
import { LeadFormDialog } from "@/components/leads/lead-form";
import { useRouter, useSearchParams } from "next/navigation";
import { CrmKpiRow, CrmPipelineExtras } from "@/components/crm/crm-extras";
import { cn } from "@/lib/utils";

export function LeadsPageClient({
  leads,
  profiles,
  organizationId,
  role,
}: {
  leads: Lead[];
  profiles: Profile[];
  organizationId: string;
  role: Role;
}) {
  const dict = useDict();
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const stage = searchParams.get("stage") ?? "all";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <CrmKpiRow />

      <div className="fl-filter-bar">
        <div className="fl-seg shrink-0">
          <button
            type="button"
            className={cn(view === "kanban" && "on")}
            onClick={() => setView("kanban")}
          >
            <span className="inline-flex items-center gap-1.5">
              <LayoutGrid className="size-3.5" />
              {dict.leads.kanban}
            </span>
          </button>
          <button
            type="button"
            className={cn(view === "table" && "on")}
            onClick={() => setView("table")}
          >
            <span className="inline-flex items-center gap-1.5">
              <List className="size-3.5" />
              {dict.leads.table}
            </span>
          </button>
        </div>

        <div className="fl-filter-bar__actions">
          <div className="fl-clients-search-wrap">
            <Search strokeWidth={2} />
            <Input
              placeholder={dict.leads.searchPlaceholder}
              className="fl-clients-search"
              defaultValue={q}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateFilter("q", (e.target as HTMLInputElement).value);
                }
              }}
            />
          </div>
          <div className="fl-filter-field">
            <Select
              value={stage}
              onValueChange={(v) => v && updateFilter("stage", v)}
            >
              <SelectTrigger className="fl-select-trigger">
                <SelectValue placeholder={dict.common.allStages} />
              </SelectTrigger>
              <SelectContent className="fl-select-panel" align="end">
                <SelectItem value="all">{dict.common.allStages}</SelectItem>
                {LEAD_STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {dict.stages[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button
            type="button"
            className="fl-btn primary sm shrink-0"
            onClick={() => setFormOpen(true)}
          >
            <Plus strokeWidth={2} />
            <span className="hidden sm:inline">{dict.leads.newLead}</span>
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <KanbanBoard initialLeads={leads} organizationId={organizationId} />
      ) : (
        <LeadTable leads={leads} profiles={profiles} role={role} />
      )}

      <CrmPipelineExtras />

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        profiles={profiles}
      />
    </div>
  );
}
