"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Plus,
  LayoutGrid,
  List,
  Search,
  Bot,
  Clock3,
  UserRound,
  FileUp,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { Lead, OutreachMessage, Profile, Role } from "@/types/database";
import { SALES_STATUSES } from "@/types/database";
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
import { CrmKpiRow } from "@/components/crm/crm-extras";
import { DiscoverDashboard } from "@/components/leads/discover-dashboard";
import { cn } from "@/lib/utils";
import { OutreachCommandCenter } from "@/components/leads/outreach-command-center";
import { RelanceTable } from "@/components/leads/relance-table";
import { HandoffInbox } from "@/components/leads/handoff-inbox";
import { LeadImportDialog } from "@/components/leads/lead-import-dialog";
import {
  listHandoffConversations,
  runProspectDiscoveryNow,
  deleteJunkDiscoveredLeads,
} from "@/lib/actions/sales-agent";

type WorkspaceTab = "pipeline" | "queue" | "relances" | "handoff";

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
  const [importOpen, setImportOpen] = useState(false);
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [workspace, setWorkspace] = useState<WorkspaceTab>("pipeline");
  const [handoffCount, setHandoffCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [pendingDiscover, startDiscover] = useTransition();
  const [pendingJunk, startJunk] = useTransition();
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const stage = searchParams.get("stage") ?? "all";
  const project = searchParams.get("project") ?? "Fusion Leap";
  const [searchDraft, setSearchDraft] = useState(q);

  useEffect(() => {
    setSearchDraft(q);
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    async function loadHandoff() {
      const rows = await listHandoffConversations();
      if (cancelled) return;
      const filtered =
        project === "all"
          ? rows
          : rows.filter(
              (r) =>
                (r.lead?.sales_project || r.sales_project) === project
            );
      setHandoffCount(filtered.length);
      setUrgentCount(filtered.filter((r) => r.urgent).length);
    }
    void loadHandoff();
    const timer = window.setInterval(() => {
      void loadHandoff();
    }, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [project]);

  useEffect(() => {
    const remembered = window.localStorage.getItem("fusionleap:last-sales-project");
    if (
      !searchParams.get("project") &&
      (remembered === "Autolog" ||
        remembered === "Fusion Leap" ||
        remembered === "Evana")
    ) {
      router.replace(`/leads?project=${encodeURIComponent(remembered)}`);
      return;
    }
    if (
      searchParams.get("project") === "Autolog" ||
      searchParams.get("project") === "Fusion Leap" ||
      searchParams.get("project") === "Evana"
    ) {
      window.localStorage.setItem(
        "fusionleap:last-sales-project",
        searchParams.get("project")!
      );
    }
  }, [router, searchParams]);

  const projects = useMemo(
    () =>
      Array.from(
        new Set([
          "Fusion Leap",
          "Autolog",
          "Evana",
          ...leads.map((lead) => lead.sales_project).filter(Boolean),
        ])
      ),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((lead) => {
      if (project !== "all" && lead.sales_project !== project) return false;
      if (stage !== "all" && (lead.sales_status || lead.stage) !== stage) return false;
      if (!needle) return true;
      return [lead.title, lead.company, lead.contact_name, lead.phone, lead.email]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
    });
  }, [leads, project, q, stage]);

  const draftCount = outreachMessages.filter(
    (m) =>
      m.status === "draft" &&
      (project === "all" || m.lead?.sales_project === project)
  ).length;
  const relanceCount = relances.filter((row) => {
    const lead = (row as { lead?: { sales_project?: string } }).lead;
    return project === "all" || lead?.sales_project === project;
  }).length;

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || (value === "all" && key !== "project")) params.delete(key);
    else params.set(key, value);
    router.push(`/leads?${params.toString()}`);
  }

  const workspaceTabs: Array<{
    key: WorkspaceTab;
    label: string;
    icon: React.ReactNode;
    count?: number;
  }> = [
    {
      key: "pipeline",
      label: "Pipeline",
      icon: <LayoutGrid className="size-3.5" />,
      count: filteredLeads.length,
    },
    {
      key: "queue",
      label: "File IA",
      icon: <Bot className="size-3.5" />,
      count: draftCount,
    },
    {
      key: "relances",
      label: "Relances",
      icon: <Clock3 className="size-3.5" />,
      count: relanceCount,
    },
    {
      key: "handoff",
      label: urgentCount > 0 ? `Handoff (${urgentCount} urgent)` : "Handoff",
      icon: <UserRound className="size-3.5" />,
      count: handoffCount,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="fl-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold fl-faint">
                {dict.leads.salesProject}
              </span>
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
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="fl-btn sm ghost"
                disabled={pendingDiscover}
                onClick={() =>
                  startDiscover(async () => {
                    const result = await runProspectDiscoveryNow(project);
                    if (!result.success) toast.error(result.error);
                    else {
                      toast.success(
                        `${result.data.created} nouveaux · ${result.data.enriched} enrichis`
                      );
                      router.refresh();
                    }
                  })
                }
              >
                {pendingDiscover ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Search strokeWidth={2} className="size-3.5" />
                )}
                <span className="hidden sm:inline">Découvrir</span>
              </button>
              <button
                type="button"
                className="fl-btn sm ghost"
                disabled={pendingJunk}
                title="Supprime les leads auto_discover faibles / annuaires (non contactés)"
                onClick={() => {
                  if (
                    !window.confirm(
                      "Supprimer les prospects découverts junk (score bas / annuaires), non contactés ?"
                    )
                  ) {
                    return;
                  }
                  startJunk(async () => {
                    const result = await deleteJunkDiscoveredLeads(project);
                    if (!result.success) toast.error(result.error);
                    else {
                      toast.success(
                        `${result.data.deleted} junk supprimés · ${result.data.rescored} re-scorés`
                      );
                      router.refresh();
                    }
                  });
                }}
              >
                {pendingJunk ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 strokeWidth={2} className="size-3.5" />
                )}
                <span className="hidden sm:inline">Nettoyer junk</span>
              </button>
              <button
                type="button"
                className="fl-btn sm ghost"
                onClick={() => setImportOpen(true)}
              >
                <FileUp strokeWidth={2} className="size-3.5" />
                <span className="hidden sm:inline">Import CSV</span>
              </button>
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

          <div className="fl-seg w-fit max-w-full overflow-x-auto">
            {workspaceTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={cn(workspace === tab.key && "on")}
                onClick={() => setWorkspace(tab.key)}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.icon}
                  {tab.label}
                  {typeof tab.count === "number" ? (
                    <span className="rounded-full bg-[var(--glass-hi)] px-1.5 text-[10px]">
                      {tab.count}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>

        {workspace === "pipeline" ? (
          <>
            <div className="space-y-4 border-b border-[var(--border)] px-4 py-3">
              <CrmKpiRow leads={filteredLeads} />
              <DiscoverDashboard
                leads={filteredLeads}
                showByProject={project === "all"}
              />
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
                      value={searchDraft}
                      onChange={(e) => setSearchDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateFilter("q", searchDraft);
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
                            : (dict.stages as Record<string, string>)[stage] ||
                              stage}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="fl-select-panel" align="end">
                        <SelectItem value="all">
                          {dict.common.allStages}
                        </SelectItem>
                        {SALES_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {(dict.stages as Record<string, string>)[s] || s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {view === "kanban" ? (
              <div className="fl-kanban-body fl-kanban-body--sales">
                <KanbanBoard
                  initialLeads={filteredLeads}
                  organizationId={organizationId}
                  salesProject={project}
                />
              </div>
            ) : (
              <LeadTable leads={filteredLeads} profiles={profiles} role={role} />
            )}
          </>
        ) : null}

        {workspace === "queue" ? (
          <div className="p-0">
            <OutreachCommandCenter
              initialMessages={outreachMessages}
              role={role}
              project={project}
              embedded
            />
          </div>
        ) : null}

        {workspace === "relances" ? (
          <div className="p-0">
            <RelanceTable
              rows={
                (project === "all"
                  ? relances
                  : relances.filter((row) => {
                      const lead = (
                        row as { lead?: { sales_project?: string } }
                      ).lead;
                      return lead?.sales_project === project;
                    })) as never
              }
              embedded
            />
          </div>
        ) : null}

        {workspace === "handoff" ? (
          <div className="p-4">
            <HandoffInbox embedded />
          </div>
        ) : null}
      </div>

      <LeadFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        profiles={profiles}
        defaultSalesProject={project === "all" ? "Fusion Leap" : project}
      />
      <LeadImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        defaultSalesProject={project === "all" ? "Fusion Leap" : project}
      />
    </div>
  );
}
