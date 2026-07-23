"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Search, X, Eye, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { DataPagination } from "@/components/shared/data-pagination";
import type { Profile } from "@/types/database";
import { AvatarStack, FlProgress } from "@/components/fusion/primitives";
import { RowActionsMenu, type RowActionItem } from "@/components/shared/row-actions-menu";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ProjectDetailDialog } from "@/components/projects/project-detail-dialog";
import {
  PROJECT_FORM_STATUSES,
  PROJECT_STATUS_FILTERS,
  badgeClassForStatus,
  matchesProjectTab,
  projectMatchesMember,
  type ProjectRecord,
  type ProjectStatusKey,
  type ProjectTab,
} from "@/lib/projects/types";
import { deleteProject, upsertProject } from "@/lib/actions/projects";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";
import {
  buildTeamOptions,
  getTeamMembers,
} from "@/lib/team/members";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
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
  return `${base} Â· ${count}`;
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
        <AlertDialogContent className="fl-dialog-content ring-0">
          <AlertDialogHeader>
            <AlertDialogTitle>{p.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {p.deleteDescription.replace("{title}", project.title)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="fl-btn sm" disabled={pending}>
              {dict.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              className="fl-btn sm destructive"
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

export function ProjectsPageClient({
  profiles,
  initialProjects = [],
}: {
  profiles: Profile[];
  initialProjects?: ProjectRecord[];
}) {
  const dict = useDict();
  const router = useRouter();
  const f = dict.fusion;
  const p = f.projects;
  const l = f.labels;
  const b = f.badges;

  const teamOptions = useMemo(() => buildTeamOptions(profiles), [profiles]);

  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [phaseTab, setPhaseTab] = useState<ProjectTab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatusKey | "all">("all");
  const [memberFilter, setMemberFilter] = useState<string>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<ProjectRecord | null>(null);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

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

  const phaseLabels = {
    inProgress: p.tabInProgress,
    review: p.tabReview,
    delivered: p.tabDelivered,
  };

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

  const pagination = useAdaptivePagination(filtered, {
    rowHeight: 66,
    resetKey: `${phaseTab}:${statusFilter}:${memberFilter}:${search}`,
  });

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || memberFilter !== "all";

  function openCreate() {
    setActiveProject(null);
    setDetailOpen(false);
    setFormOpen(true);
  }

  function openEdit(project: ProjectRecord) {
    setActiveProject(project);
    setDetailOpen(false);
    setFormOpen(true);
  }

  function openView(project: ProjectRecord) {
    setActiveProject(project);
    setFormOpen(false);
    setDetailOpen(true);
  }

  async function handleSave(record: ProjectRecord) {
    const exists = projects.some((x) => x.id === record.id);
    const result = await upsertProject(record);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setProjects((prev) => {
      const idx = prev.findIndex((x) => x.id === result.data.id || x.id === record.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = result.data;
        return next;
      }
      return [result.data, ...prev];
    });
    setActiveProject(result.data);
    toast.success(exists ? p.updatedProject : p.createdProject);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteProject(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setProjects((prev) => prev.filter((x) => x.id !== id));
    if (activeProject?.id === id) {
      setActiveProject(null);
      setDetailOpen(false);
      setFormOpen(false);
    }
    toast.success(p.deletedProject);
    router.refresh();
  }

  async function handleStatusChange(
    project: ProjectRecord,
    statusKey: ProjectStatusKey
  ) {
    if (project.statusKey === statusKey) return;
    const updated: ProjectRecord = {
      ...project,
      statusKey,
      badgeClass: badgeClassForStatus(statusKey),
    };
    const result = await upsertProject(updated);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setProjects((prev) =>
      prev.map((row) => (row.id === project.id ? result.data : row))
    );
    if (activeProject?.id === project.id) {
      setActiveProject(result.data);
    }
    toast.success(p.updatedProject);
    router.refresh();
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setMemberFilter("all");
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
          <div className="fl-clients-toolbar__head">
            <h2 className="fl-clients-toolbar__title">{dict.nav.projects}</h2>
            <button
              type="button"
              className="fl-btn primary sm fl-toolbar-create"
              onClick={openCreate}
            >
              <Plus strokeWidth={2} />
              <span className="fl-toolbar-create__label hidden sm:inline">
                {p.addProject}
              </span>
            </button>
          </div>
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
                  <SelectValue>
                    {memberFilter === "all"
                      ? p.allMembers
                      : teamOptions.find((m) => m.id === memberFilter)?.name ??
                        p.filterByMember}
                  </SelectValue>
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
                  <SelectValue>
                    {statusFilter === "all" ? p.allStatuses : b[statusFilter]}
                  </SelectValue>
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
          </div>
        </div>

        <div className="fl-tbl-wrap">
          <table className="fl-tbl">
            <thead>
              <tr>
                <th>{dict.common.title}</th>
                <th>{p.phase}</th>
                <th>{dict.common.status}</th>
                <th>{l.progress}</th>
                <th>{l.team}</th>
                <th>{p.milestone}</th>
                <th className="w-12" aria-label={dict.common.moreActions} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm fl-faint">
                    {p.noProjectsFound}
                  </td>
                </tr>
              ) : (
                pagination.pageItems.map((proj) => {
                  const members = getTeamMembers(proj.teamMemberIds, teamOptions);
                  const lead = members[0];
                  return (
                    <tr key={proj.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span
                            className="grid size-9 shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-white"
                            style={{ background: proj.gradient }}
                          >
                            {proj.initials}
                          </span>
                          <div className="min-w-0">
                            <b className="block truncate">{proj.title}</b>
                            {proj.subtitle ? (
                              <span className="fl-muted fl-tny line-clamp-1">
                                {proj.subtitle}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="fl-muted">{phaseLabels[proj.phase]}</td>
                      <td>
                        <Select
                          value={proj.statusKey}
                          onValueChange={(v) => {
                            if (!v) return;
                            handleStatusChange(proj, v as ProjectStatusKey);
                          }}
                        >
                          <SelectTrigger
                            className={cn(
                              "fl-status-select",
                              `fl-badge ${proj.badgeClass}`
                            )}
                            aria-label={dict.common.status}
                          >
                            <SelectValue>{b[proj.statusKey]}</SelectValue>
                          </SelectTrigger>
                          <SelectContent className="fl-select-panel" align="start">
                            {PROJECT_FORM_STATUSES.map((key) => (
                              <SelectItem key={key} value={key}>
                                {b[key]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td>
                        <div className="min-w-[7rem] max-w-[9rem]">
                          <div className="mb-1 flex justify-between text-[11px]">
                            <span className="fl-mono fl-faint">
                              {proj.progress}%
                            </span>
                          </div>
                          <FlProgress value={proj.progress} />
                        </div>
                      </td>
                      <td>
                        {members.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <AvatarStack
                              items={members.map((m) => ({
                                initials: m.initials,
                                bg: m.color,
                              }))}
                            />
                            <span className="fl-muted fl-tny hidden lg:inline">
                              {lead?.name}
                              {members.length > 1 ? ` +${members.length - 1}` : ""}
                            </span>
                          </div>
                        ) : (
                          <span className="fl-faint">—</span>
                        )}
                      </td>
                      <td className="fl-muted">
                        <span
                          className={
                            proj.chipRose ? "text-[var(--rose)]" : undefined
                          }
                        >
                          {b[proj.chipKey]}
                        </span>
                      </td>
                      <td>
                        <ProjectRowActions
                          project={proj}
                          onView={() => openView(proj)}
                          onEdit={() => openEdit(proj)}
                          onDelete={() => handleDelete(proj.id)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <DataPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
        />
      </div>

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        project={activeProject && formOpen ? activeProject : null}
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
