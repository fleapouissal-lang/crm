"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, X } from "lucide-react";
import type { Lead, Profile, Task } from "@/types/database";
import type { ProjectRecord } from "@/lib/projects/types";
import { isIsoDateKey } from "@/lib/tasks/due-filter";
import { canViewAllTasks } from "@/lib/permissions/capabilities";
import { buildTeamOptions } from "@/lib/team/members";
import { useDict } from "@/components/shared/i18n-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskList } from "@/components/tasks/task-list";

export function TasksPageClient({
  tasks,
  profiles,
  leads,
  projects = [],
  organizationId,
  profile,
}: {
  tasks: Task[];
  profiles: Profile[];
  leads: Lead[];
  projects?: ProjectRecord[];
  organizationId: string;
  profile: Profile;
}) {
  const dict = useDict();
  const searchParams = useSearchParams();
  const projectFilter = searchParams.get("project_id") ?? "all";
  const dueParam = searchParams.get("due");
  const dueFilter =
    dueParam && isIsoDateKey(dueParam) ? dueParam : "all";
  const showMemberFilter = canViewAllTasks(profile);
  const memberFilter = showMemberFilter
    ? (searchParams.get("assigned_to") ?? "all")
    : "all";
  const teamOptions = useMemo(() => buildTeamOptions(profiles), [profiles]);
  const router = useRouter();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "due") {
      if (!value || value === "all") params.delete("due");
      else params.set("due", value);
    } else if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("status");
    params.delete("q");
    params.delete("view");
    router.push(`/tasks?${params.toString()}`);
  }

  const projectFilterLabel =
    projectFilter === "all"
      ? dict.fusion.kanban.allProjects
      : projectFilter === "none"
        ? dict.fusion.kanban.noProject
        : (projects.find((p) => p.id === projectFilter)?.title ??
          dict.fusion.kanban.filterByProject);

  const memberFilterLabel =
    memberFilter === "all"
      ? dict.fusion.projects.allMembers
      : memberFilter === "unassigned"
        ? dict.common.unassigned
        : (teamOptions.find((m) => m.id === memberFilter)?.name ??
          dict.fusion.projects.filterByMember);

  return (
    <div className="space-y-4">
      <div className="fl-card overflow-hidden">
        <div className="fl-filter-bar fl-filter-bar--card">
          <div className="fl-filter-bar__head">
            <div className="fl-clients-toolbar__actions w-full justify-end">
              <div className="fl-filter-field flex items-center gap-1.5">
                <Input
                  type="date"
                  className="fl-input"
                  value={dueFilter === "all" ? "" : dueFilter}
                  aria-label={dict.tasks.pickDueDate}
                  title={dict.tasks.allDates}
                  onChange={(e) => {
                    updateFilter("due", e.target.value || "all");
                  }}
                />
                {dueFilter !== "all" ? (
                  <button
                    type="button"
                    className="fl-btn sm ghost shrink-0"
                    title={dict.tasks.allDates}
                    onClick={() => updateFilter("due", "all")}
                  >
                    <X className="size-3.5" strokeWidth={2} />
                    <span className="hidden sm:inline">{dict.tasks.allDates}</span>
                  </button>
                ) : null}
              </div>

              <div className="fl-filter-field fl-filter-field--lg">
                <Select
                  value={projectFilter}
                  onValueChange={(v) => v && updateFilter("project_id", v)}
                >
                  <SelectTrigger className="fl-select-trigger">
                    <SelectValue>{projectFilterLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel" align="end">
                    <SelectItem value="all">
                      {dict.fusion.kanban.allProjects}
                    </SelectItem>
                    <SelectItem value="none">
                      {dict.fusion.kanban.noProject}
                    </SelectItem>
                    {projects.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {showMemberFilter ? (
                <div className="fl-filter-field fl-filter-field--lg">
                  <Select
                    value={memberFilter}
                    onValueChange={(v) => v && updateFilter("assigned_to", v)}
                  >
                    <SelectTrigger
                      className="fl-select-trigger"
                      aria-label={dict.fusion.projects.filterByMember}
                    >
                      <SelectValue>{memberFilterLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel" align="end">
                      <SelectItem value="all">
                        {dict.fusion.projects.allMembers}
                      </SelectItem>
                      <SelectItem value="unassigned">
                        {dict.common.unassigned}
                      </SelectItem>
                      {teamOptions.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <Link
                href="/tasks/new"
                className="fl-btn primary sm fl-toolbar-create shrink-0"
              >
                <Plus strokeWidth={2} />
                <span className="fl-toolbar-create__label hidden sm:inline">
                  {dict.tasks.newTask}
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className="fl-pad">
          <TaskList
            initialTasks={tasks}
            organizationId={organizationId}
            profiles={profiles}
            leads={leads}
            profile={profile}
            projects={projects}
            projectFilter={projectFilter}
            memberFilter={memberFilter}
            dueFilter={dueFilter}
          />
        </div>
      </div>
    </div>
  );
}
