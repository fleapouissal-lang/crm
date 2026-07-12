"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import type { Lead, Profile, Task } from "@/types/database";
import { TASK_STATUSES } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskList } from "@/components/tasks/task-list";
import { TaskKanbanBoard } from "@/components/tasks/task-kanban-board";
import { loadProjects } from "@/lib/projects/storage";
import { buildTeamOptions } from "@/lib/team/members";
import { cn } from "@/lib/utils";

export function TasksPageClient({
  tasks,
  profiles,
  leads,
  organizationId,
  profile,
}: {
  tasks: Task[];
  profiles: Profile[];
  leads: Lead[];
  organizationId: string;
  profile: Profile;
}) {
  const dict = useDict();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const projectFilter = searchParams.get("project_id") ?? "all";
  const viewParam = searchParams.get("view");
  const view: "board" | "list" = viewParam === "list" ? "list" : "board";
  const [projects, setProjects] = useState<ReturnType<typeof loadProjects>>([]);
  const router = useRouter();

  const teamOptions = useMemo(() => buildTeamOptions(profiles), [profiles]);

  useEffect(() => {
    setProjects(loadProjects(teamOptions));
  }, [teamOptions]);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") params.delete(key);
    else params.set(key, value);
    router.push(`/tasks?${params.toString()}`);
  }

  function setView(next: "board" | "list") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.push(`/tasks?${params.toString()}`);
  }

  const projectFilterLabel =
    projectFilter === "all"
      ? dict.fusion.kanban.allProjects
      : projectFilter === "none"
        ? dict.fusion.kanban.noProject
        : (projects.find((p) => p.id === projectFilter)?.title ??
          dict.fusion.kanban.filterByProject);
  const statusFilterLabel =
    status === "all"
      ? dict.common.allStatuses
      : (dict.taskStatus[status as (typeof TASK_STATUSES)[number]] ??
        dict.common.allStatuses);

  return (
    <div className="space-y-4">
      {view === "list" && (
        <div className="fl-filter-bar">
          <div className="fl-seg shrink-0">
            <button type="button" onClick={() => setView("board")}>
              {dict.fusion.kanban.board}
            </button>
            <button type="button" className={cn("on")}>
              {dict.tasks.list}
            </button>
          </div>
          <div className="fl-filter-bar__actions">
            <div className="fl-filter-field fl-filter-field--lg">
              <Select
                value={projectFilter}
                onValueChange={(v) => v && updateFilter("project_id", v)}
              >
                <SelectTrigger className="fl-select-trigger">
                  <SelectValue>{projectFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  <SelectItem value="all">{dict.fusion.kanban.allProjects}</SelectItem>
                  <SelectItem value="none">{dict.fusion.kanban.noProject}</SelectItem>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="fl-filter-field">
              <Select
                value={status}
                onValueChange={(v) => v && updateFilter("status", v)}
              >
                <SelectTrigger className="fl-select-trigger">
                  <SelectValue>{statusFilterLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  <SelectItem value="all">{dict.common.allStatuses}</SelectItem>
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {dict.taskStatus[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Link href="/tasks/new" className="fl-btn primary sm shrink-0">
              <Plus strokeWidth={2} />
              <span className="hidden sm:inline">{dict.tasks.newTask}</span>
            </Link>
          </div>
        </div>
      )}

      {view === "board" ? (
        <TaskKanbanBoard
          initialTasks={tasks}
          organizationId={organizationId}
          profiles={profiles}
          projects={projects}
          projectFilter={projectFilter}
          onProjectFilterChange={(v) => updateFilter("project_id", v)}
          onAddTaskHref="/tasks/new"
          onShowList={() => setView("list")}
        />
      ) : (
        <TaskList
          initialTasks={tasks}
          organizationId={organizationId}
          profiles={profiles}
          leads={leads}
          profile={profile}
          projects={projects}
          projectFilter={projectFilter}
        />
      )}
    </div>
  );
}
