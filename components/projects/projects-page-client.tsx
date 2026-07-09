"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Search, X, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";
import type { Profile } from "@/types/database";
import { AvatarStack, FlChip, FlProgress } from "@/components/fusion/primitives";
import { RowActionsMenu, type RowActionItem } from "@/components/shared/row-actions-menu";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectDetailDialog } from "@/components/projects/project-detail-dialog";
import {
  PROJECT_STATUS_FILTERS,
  matchesProjectTab,
  projectMatchesMember,
  type ProjectRecord,
  type ProjectStatusKey,
  type ProjectTab,
} from "@/lib/projects/types";
import { loadProjects, saveProjects } from "@/lib/projects/storage";
import {
  buildTeamOptions,
  getTeamMembers,
  type TeamMemberOption,
} from "@/lib/team/members";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function tabLabel(base: string, count: number) {
  return `${base} · ${count}`;
}

function ProjectRowActions({
  project,
  onView,
  onEdit,
  onDelete,
}: {
  project: ProjectRecord;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dict = useDict();
  const p = dict.fusion.projects;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const actions: RowActionItem[] = [
    {
      label: dict.common.viewDetails,
      icon: <Eye className="size-4" />,
      onClick: onView,
    },
    {
      label: dict.common.edit,
      icon: <Pencil className="size-4" />,
      onClick: onEdit,
    },
    { separator: true },
    {
      label: dict.common.delete,
      icon: <Trash2 className="size-4" />,
      destructive: true,
      onClick: () => setDeleteOpen(true),
    },
  ];

  return (
    <>
      <RowActionsMenu actions={actions} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{p.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {p.deleteDescription.replace("{title}", project.title)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {dict.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                startTransition(() => {
                  onDelete();
                  setDeleteOpen(false);
                });
              }}
            >
              {pending ? dict.common.working : dict.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ProjectsPageClient({ profiles }: { profiles: Profile[] }) {
  const dict = useDict();
  const f = dict.fusion;
  const p = f.projects;
  const l = f.labels;
  const b = f.badges;

  const teamOptions = useMemo(() => buildTeamOptions(profiles), [profiles]);

  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [phaseTab, setPhaseTab] = useState<ProjectTab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatusKey | "all">("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);

  useEffect(() => {
    setProjects(loadProjects(teamOptions));
    setHydrated(true);
  }, [teamOptions]);

  const persist = useCallback((next: ProjectRecord[]) => {
    setProjects(next);
    saveProjects(next);
  }, []);

  const counts = useMemo(
    () => ({
      all: projects.length,
      inProgress: projects.filter((x) => x.phase === "inProgress").length,
      review: projects.filter((x) => x.phase === "review").length,
      delivered: projects.filter((x) => x.phase === "delivered").length,
    }),
    [projects]
  );

  const phaseTabs = useMemo(
    () =>
      [
        { key: "all" as const, label: tabLabel(p.tabAll, counts.all) },
        {
          key: "inProgress" as const,
          label: tabLabel(p.tabInProgress, counts.inProgress),
        },
        { key: "review" as const, label: tabLabel(p.tabReview, counts.review) },
        {
          key: "delivered" as const,
          label: tabLabel(p.tabDelivered, counts.delivered),
        },
      ] as const,
    [p, counts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (!matchesProjectTab(project, phaseTab)) return false;
      if (statusFilter !== "all" && project.statusKey !== statusFilter) return false;
      if (memberFilter !== "all" && !projectMatchesMember(project, memberFilter)) {
        return false;
      }
      if (!q) return true;

      const members = getTeamMembers(project.teamMemberIds, teamOptions);
      return (
        project.title.toLowerCase().includes(q) ||
        project.subtitle.toLowerCase().includes(q) ||
        members.some((m) => m.name.toLowerCase().includes(q)) ||
        members.some((m) => m.initials.toLowerCase().includes(q))
      );
    });
  }, [projects, phaseTab, search, statusFilter, memberFilter, teamOptions]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || memberFilter !== "all";

  function openCreate() {
    setActiveProject(null);
    setFormOpen(true);
  }

  function openEdit(project: ProjectRecord) {
    setActiveProject(project);
    setFormOpen(true);
  }

  function openView(project: ProjectRecord) {
    setActiveProject(project);
    setDetailOpen(true);
  }

  function handleSave(record: ProjectRecord) {
    const exists = projects.some((x) => x.id === record.id);
    const next = exists
      ? projects.map((x) => (x.id === record.id ? record : x))
      : [record, ...projects];
    persist(next);
    toast.success(exists ? p.updatedProject : p.createdProject);
  }

  function handleDelete(id: string) {
    persist(projects.filter((x) => x.id !== id));
    toast.success(p.deletedProject);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setMemberFilter("all");
  }

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-xl bg-[var(--glass-hi)]" />;
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        {[
          { label: p.tabAll, value: String(counts.all), accent: "var(--iris)" },
          {
            label: p.tabInProgress,
            value: String(counts.inProgress),
            accent: "var(--emerald)",
          },
          { label: p.tabReview, value: String(counts.review), accent: "var(--gold)" },
          {
            label: p.tabDelivered,
            value: String(counts.delivered),
            accent: "var(--sky)",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="fl-project-kpi fl-card fl-pad">
            <div
              className="fl-project-kpi__dot"
              style={{ background: kpi.accent }}
            />
            <div className="k-label">{kpi.label}</div>
            <div className="fl-mono mt-1 text-[26px] font-semibold tracking-tight">
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <div className="fl-card fl-clients-card">
        <div className="fl-clients-toolbar">
          <h2 className="fl-clients-toolbar__title">{dict.nav.projects}</h2>
          <div className="fl-clients-toolbar__row">
            <div className="fl-seg shrink-0">
              {phaseTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={cn(phaseTab === tab.key && "on")}
                  onClick={() => setPhaseTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="fl-clients-search-wrap">
              <Search strokeWidth={2} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={p.searchPlaceholder}
                className="fl-clients-search"
              />
            </div>

            <div className="fl-clients-status">
              <Select
                value={memberFilter}
                onValueChange={(v) => setMemberFilter(v ?? "all")}
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue placeholder={p.filterByMember} />
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  <SelectItem value="all">{p.allMembers}</SelectItem>
                  {teamOptions.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="fl-clients-status">
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter((v as ProjectStatusKey | "all") ?? "all")
                }
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue placeholder={p.filterStatus} />
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  <SelectItem value="all">{p.allStatuses}</SelectItem>
                  {PROJECT_STATUS_FILTERS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {b[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters ? (
              <button
                type="button"
                className="fl-btn sm ghost shrink-0"
                onClick={clearFilters}
                title={p.clearFilters}
              >
                <X className="size-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">{p.clearFilters}</span>
              </button>
            ) : null}

            <button
              type="button"
              className="fl-btn primary sm shrink-0"
              onClick={openCreate}
            >
              <Plus strokeWidth={2} />
              <span className="hidden sm:inline">{p.addProject}</span>
            </button>
          </div>
        </div>

        <div className="fl-pad">
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm fl-faint">{p.noProjectsFound}</p>
          ) : (
            <div className="fl-project-list flex flex-col gap-3">
              {filtered.map((proj) => (
                <ProjectListCard
                  key={proj.id}
                  project={proj}
                  teamOptions={teamOptions}
                  badges={b}
                  progressLabel={l.progress}
                  teamLabel={l.team}
                  leadLabel={p.leadMember}
                  onView={() => openView(proj)}
                  onEdit={() => openEdit(proj)}
                  onDelete={() => handleDelete(proj.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={activeProject}
        teamOptions={teamOptions}
        onSave={handleSave}
      />

      <ProjectDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        project={activeProject}
        teamOptions={teamOptions}
        onEdit={() => activeProject && openEdit(activeProject)}
      />
    </div>
  );
}

function ProjectListCard({
  project: proj,
  teamOptions,
  badges,
  progressLabel,
  teamLabel,
  leadLabel,
  onView,
  onEdit,
  onDelete,
}: {
  project: ProjectRecord;
  teamOptions: TeamMemberOption[];
  badges: FusionDictionary["badges"];
  progressLabel: string;
  teamLabel: string;
  leadLabel: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const members = getTeamMembers(proj.teamMemberIds, teamOptions);
  const lead = members[0];
  const namesLabel = members.map((m) => m.name).join(" · ");

  return (
    <article className="fl-project-card group">
      <div
        className="fl-project-card__stripe"
        style={{ background: proj.gradient }}
        aria-hidden
      />

      <div className="fl-project-card__main">
        <div className="fl-project-card__head">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold leading-snug">{proj.title}</h3>
              <span className={`fl-badge shrink-0 ${proj.badgeClass}`}>
                {badges[proj.statusKey]}
              </span>
            </div>
            <p className="mt-1 fl-faint fl-tny line-clamp-1">{proj.subtitle}</p>
          </div>
          <div className="shrink-0 opacity-80 transition-opacity group-hover:opacity-100">
            <ProjectRowActions
              project={proj}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>

        <div className="fl-project-card__meta">
          <div className="fl-project-card__progress-block">
            <div className="mb-1.5 flex justify-between text-[11px]">
              <span className="fl-muted">{progressLabel}</span>
              <span className="fl-mono fl-faint">{proj.progress}%</span>
            </div>
            <FlProgress value={proj.progress} />
          </div>

          <div className="fl-project-card__ring">
            <svg viewBox="0 0 36 36" className="size-11 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="var(--border)"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="var(--iris-2)"
                strokeWidth="3"
                strokeDasharray={`${(proj.progress / 100) * 97.4} 97.4`}
                strokeLinecap="round"
              />
            </svg>
            <span className="fl-project-card__ring-val">{proj.progress}</span>
          </div>
        </div>

        <div className="fl-project-card__foot">
          <div className="min-w-0 flex items-center gap-2">
            <span className="fl-tny fl-faint shrink-0">{teamLabel}</span>
            {members.length > 0 ? (
              <>
                <AvatarStack
                  items={members.map((m) => ({
                    initials: m.initials,
                    bg: m.color,
                  }))}
                />
                <span className="fl-project-card__team-names" title={namesLabel}>
                  {lead ? (
                    <>
                      <span className="fl-muted">{leadLabel}:</span> {lead.name}
                      {members.length > 1 ? ` +${members.length - 1}` : ""}
                    </>
                  ) : null}
                </span>
              </>
            ) : (
              <span className="fl-tny fl-faint">—</span>
            )}
          </div>
          <FlChip>
            <span className={proj.chipRose ? "text-[var(--rose)]" : ""}>
              {badges[proj.chipKey]}
            </span>
          </FlChip>
        </div>
      </div>
    </article>
  );
}
