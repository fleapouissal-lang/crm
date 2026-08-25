"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, LayoutGrid, List, Search } from "lucide-react";
import type { Lead, OutreachMessage, Profile, Role } from "@/types/database";
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
import { OutreachCommandCenter } from "@/components/leads/outreach-command-center";
import { RelanceTable } from "@/components/leads/relance-table";

export function LeadsPageClient({
  leads,
  profiles,
  organizationId,
  role,
  outreachMessages,
  relances,
}: {
  leads: Lead[];
  profiles: Profile[];
  organizationId: string;
  role: Role;
  outreachMessages: OutreachMessage[];
  relances: Array<Record<string, unknown>>;
}) {
  const dict = useDict();
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const stage = searchParams.get("stage") ?? "all";
  const project = searchParams.get("project") ?? "Fusion Leap";
  useEffect(() => {
    const remembered = window.localStorage.getItem("fusionleap:last-sales-project");
    if (!searchParams.get("project") && (remembered === "Autolog" || remembered === "Fusion Leap")) {
      router.replace(`/leads?project=${encodeURIComponent(remembered)}`);
      return;
    }
    if (searchParams.get("project") === "Autolog" || searchParams.get("project") === "Fusion Leap") {
      window.localStorage.setItem("fusionleap:last-sales-project", searchParams.get("project")!);
    }
  }, [router, searchParams]);
  const projects = useMemo(
    () =>
      Array.from(
        new Set(["Fusion Leap", "Autolog", ...leads.map((lead) => lead.sales_project).filter(Boolean)])
      ),
    [leads]
  );
  const filteredLeads = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((lead) => {
      if (project !== "all" && lead.sales_project !== project) return false;
      if (stage !== "all" && lead.stage !== stage) return false;
      if (!needle) return true;
      return [lead.title, lead.company, lead.contact_name, lead.phone, lead.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [leads, project, q, stage]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || (value === "all" && key !== "project")) params.delete(key);
    else params.set(key, value);
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <OutreachCommandCenter initialMessages={outreachMessages} role={role} project={project} />
      <RelanceTable rows={relances as never} />
      <CrmKpiRow leads={filteredLeads} />

      <div className="fl-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-3">
          <span className="mr-1 text-xs font-semibold fl-faint">{dict.leads.salesProject}</span>
          {[...projects, "all"].map((name) => (
            <button
              key={name}
              type="button"
              className={cn("fl-btn sm", project === name && "primary")}
              onClick={() => updateFilter("project", name)}
            >
              {name === "all" ? dict.leads.allProjects : name}
            </button>
          ))}
        </div>
        <div className="fl-filter-bar fl-filter-bar--card">
          <div className="fl-filter-bar__head">
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
            <div className="fl-clients-toolbar__actions">
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
                    <SelectValue placeholder={dict.common.allStages}>
                      {stage === "all"
                        ? dict.common.allStages
                        : dict.stages[stage as keyof typeof dict.stages]}
                    </SelectValue>
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
                className="fl-btn primary sm fl-toolbar-create shrink-0"
                onClick={() => setFormOpen(true)}
              >
                <Plus strokeWidth={2} />
                <span className="fl-toolbar-create__label hidden sm:inline">
                  {dict.leads.newLead}
                </span>
              </button>
            </div>
          </div>
        </div>

        {view === "kanban" ? (
          <div className="fl-kanban-body">
            <KanbanBoard
              initialLeads={filteredLeads}
              organizationId={organizationId}
              salesProject={project}
            />
          </div>
        ) : (
          <LeadTable leads={filteredLeads} profiles={profiles} role={role} />
        )}
      </div>

      <CrmPipelineExtras leads={filteredLeads} />

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        profiles={profiles}
        defaultSalesProject={project === "all" ? "Fusion Leap" : project}
      />
    </div>
  );
}
