"use client";

import { useState } from "react";
import { Plus, LayoutGrid, List } from "lucide-react";
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
    router.push(`/crm?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <CrmKpiRow />

      <div className="fl-sec-title !mt-0">
        <h2>{dict.fusion.crm.dealPipeline}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="fl-seg">
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
          <button type="button" className="fl-btn primary sm" onClick={() => setFormOpen(true)}>
            <Plus strokeWidth={2} />
            {dict.fusion.crm.newDeal}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={dict.leads.searchPlaceholder}
          className="fl-inp h-auto max-w-xs"
          defaultValue={q}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              updateFilter("q", (e.target as HTMLInputElement).value);
            }
          }}
        />
        <Select
          value={stage}
          onValueChange={(v) => v && updateFilter("stage", v)}
        >
          <SelectTrigger className="fl-inp h-auto w-[160px]">
            <SelectValue placeholder={dict.common.allStages} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{dict.common.allStages}</SelectItem>
            {LEAD_STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {dict.stages[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
