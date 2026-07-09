"use client";

import { useEffect, useMemo, useState } from "react";
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
import { TaskFormDialog } from "@/components/tasks/task-form";
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
  const [formOpen, setFormOpen] = useState(false);
  const [defaultDueDate, setDefaultDueDate] = useState<string | undefined>();
  const [view, setView] = useState<"board" | "list">("board");
  const [projects, setProjects] = useState<ReturnType<typeof loadProjects>>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const projectFilter = searchParams.get("project_id") ?? "all";
  const defaultLeadId = searchParams.get("lead_id") ?? undefined;

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

  function openCreate(dueDate?: string) {
    setDefaultDueDate(dueDate);
    setFormOpen(true);
  }

  return (
    <div className="space-y-4">
      {view === "list" && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="fl-seg">
            <button type="button" onClick={() => setView("board")}>
              {dict.fusion.kanban.board}
            </button>
            <button type="button" className={cn("on")}>
              {dict.tasks.list}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={projectFilter}
              onValueChange={(v) => v && updateFilter("project_id", v)}
            >
              <SelectTrigger className="fl-inp h-auto w-[180px]">
                <SelectValue placeholder={dict.fusion.kanban.filterByProject} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{dict.fusion.kanban.allProjects}</SelectItem>
                <SelectItem value="none">{dict.fusion.kanban.noProject}</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(v) => v && updateFilter("status", v)}
            >
              <SelectTrigger className="fl-inp h-auto w-[160px]">
                <SelectValue placeholder={dict.common.allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{dict.common.allStatuses}</SelectItem>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {dict.taskStatus[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button type="button" className="fl-btn primary sm" onClick={() => openCreate()}>
              <Plus strokeWidth={2} />
              {dict.tasks.newTask}
            </button>
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
          onAddTask={() => openCreate()}
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

      <TaskFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setDefaultDueDate(undefined);
        }}
        profiles={profiles}
        leads={leads}
        projects={projects}
        defaultLeadId={defaultLeadId}
        defaultDueDate={defaultDueDate}
      />
    </div>
  );
}
