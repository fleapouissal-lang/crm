"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  Eye,
  Flag,
  Pencil,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateTaskStatus, deleteTask } from "@/lib/actions/tasks";
import type { Lead, Profile, Task, TaskPriority, TaskStatus } from "@/types/database";
import {
  TASK_STATUS_ORDER,
  TASK_STATUS_COLOR,
  TASK_STATUS_PILL,
  isTaskDoneStatus,
  TASK_DONE_STATUS,
  normalizeTaskStatusOrder,
} from "@/lib/tasks/status";
import type { ProjectRecord } from "@/lib/projects/types";
import { taskMatchesProjectFilter } from "@/lib/tasks/project-links";
import { taskMatchesDueFilter, todayKey } from "@/lib/tasks/due-filter";
import {
  getTaskAssigneeIds,
  taskMatchesAssigneeFilter,
} from "@/lib/tasks/assignee-filter";
import { buildTeamOptions } from "@/lib/team/members";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getIntlLocale } from "@/lib/i18n/locale-utils";
import { TaskStatusBadge } from "@/components/shared/status-badge";
import { RowActionsMenu, type RowActionItem } from "@/components/shared/row-actions-menu";
import { TaskFormDialog } from "@/components/tasks/task-form";
import { AvatarStack } from "@/components/fusion/primitives";
import { canDeleteTaskForProfile, canModifyTask } from "@/lib/permissions";
import { cn } from "@/lib/utils";
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

const STATUS_ORDER_SESSION_KEY = "fusion-task-status-group-order-v1";

const PRIORITY_FLAG: Record<TaskPriority, string> = {
  urgent: "var(--rose)",
  high: "var(--amber)",
  medium: "var(--iris-2)",
  low: "var(--text-dim)",
};

function TaskStatusSelect({
  task,
  disabled,
  onChange,
}: {
  task: Task;
  disabled?: boolean;
  onChange: (status: TaskStatus) => void;
}) {
  const dict = useDict();
  const pill = TASK_STATUS_PILL[task.status];

  if (disabled) {
    return <TaskStatusBadge status={task.status} />;
  }

  return (
    <Select
      value={task.status}
      onValueChange={(v) => {
        if (!v || v === task.status) return;
        onChange(v as TaskStatus);
      }}
    >
      <SelectTrigger
        className="fl-status-select fl-badge fl-task-status-pill"
        style={{
          background: pill.bg,
          color: pill.color,
          border: pill.border ?? "1px solid transparent",
        }}
        aria-label={dict.common.status}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue>{dict.taskStatus[task.status]}</SelectValue>
      </SelectTrigger>
      <SelectContent
        className="fl-select-panel fl-status-select-panel"
        align="start"
        alignItemWithTrigger={false}
      >
        {TASK_STATUS_ORDER.map((status) => {
          const optionPill = TASK_STATUS_PILL[status];
          return (
            <SelectItem key={status} value={status}>
              <span
                className="fl-badge fl-task-status-pill"
                style={{
                  background: optionPill.bg,
                  color: optionPill.color,
                  border: optionPill.border ?? "1px solid transparent",
                }}
              >
                {dict.taskStatus[status]}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function TaskRowActions({
  task,
  profile,
  onEdit,
  onToggleDone,
  onDeleted,
}: {
  task: Task;
  profile: Profile;
  onEdit: () => void;
  onToggleDone: () => void;
  onDeleted: () => void;
}) {
  const dict = useDict();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const actions: RowActionItem[] = [
    {
      label: dict.common.edit,
      icon: <Pencil className="size-4" />,
      onClick: onEdit,
      disabled: !canModifyTask(profile, task),
    },
    ...(canDeleteTaskForProfile(profile, task)
      ? ([
          {
            label: dict.common.delete,
            icon: <Trash2 className="size-4" />,
            destructive: true,
            onClick: () => setDeleteOpen(true),
          },
        ] satisfies RowActionItem[])
      : []),
    {
      label: dict.common.viewDetails,
      icon: <Eye className="size-4" />,
      onClick: () => router.push(`/tasks/${task.id}`),
    },
    {
      label: isTaskDoneStatus(task.status)
        ? dict.tasks.markTodo
        : dict.tasks.markDone,
      icon: <Check className="size-4" />,
      onClick: onToggleDone,
      disabled: !canModifyTask(profile, task),
    },
  ];

  return (
    <>
      <RowActionsMenu
        actions={actions}
        maxIcons={canDeleteTaskForProfile(profile, task) ? 2 : 1}
      />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.tasks.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.tasks.deleteDescription.replace("{title}", task.title)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{dict.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  const result = await deleteTask(task.id);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  onDeleted();
                  toast.success(dict.tasks.deletedTask);
                  setDeleteOpen(false);
                  router.refresh();
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

export function TaskList({
  initialTasks,
  organizationId,
  profiles,
  leads: _leads,
  profile,
  projects = [],
  projectFilter = "all",
  memberFilter = "all",
  searchQuery = "",
  dueFilter = "all",
}: {
  initialTasks: Task[];
  organizationId: string;
  profiles: Profile[];
  leads: Lead[];
  profile: Profile;
  projects?: ProjectRecord[];
  projectFilter?: string;
  memberFilter?: string;
  searchQuery?: string;
  dueFilter?: string;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const dateLocale = getIntlLocale(locale);
  const [tasks, setTasks] = useState(initialTasks);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [statusOrder, setStatusOrder] = useState<TaskStatus[]>(TASK_STATUS_ORDER);
  const [, startTransition] = useTransition();
  const teamById = useMemo(() => {
    const map = new Map(
      buildTeamOptions(profiles).map((m) => [m.id, m] as const)
    );
    return map;
  }, [profiles]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STATUS_ORDER_SESSION_KEY);
      if (!raw) return;
      setStatusOrder(normalizeTaskStatusOrder(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, []);

  function moveStatusGroup(status: TaskStatus, direction: -1 | 1) {
    setStatusOrder((prev) => {
      const index = prev.indexOf(status);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const current = next[index]!;
      next[index] = next[target]!;
      next[target] = current;
      try {
        sessionStorage.setItem(STATUS_ORDER_SESSION_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => {
              if (prev.some((t) => t.id === (payload.new as Task).id)) return prev;
              return [...prev, payload.new as Task];
            });
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((t) =>
                t.id === (payload.new as Task).id
                  ? { ...t, ...(payload.new as Task) }
                  : t
              )
            );
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) =>
              prev.filter((t) => t.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const today = todayKey();

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  function changeStatus(task: Task, nextStatus: TaskStatus) {
    if (task.status === nextStatus) return;
    const prevStatus = task.status;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, nextStatus);
      if (!result.success) {
        toast.error(result.error);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: prevStatus } : t
          )
        );
        return;
      }
      toast.success(dict.tasks.updatedTask);
    });
  }

  function toggleDone(task: Task) {
    changeStatus(
      task,
      isTaskDoneStatus(task.status) ? "todo" : TASK_DONE_STATUS
    );
  }

  const filteredTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (!taskMatchesProjectFilter(t, projectFilter)) return false;
        if (!taskMatchesAssigneeFilter(t, memberFilter)) return false;
        if (!taskMatchesDueFilter(t, dueFilter, today)) return false;
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        const creator =
          t.created_profile ??
          profiles.find((p) => p.id === t.created_by);
        const assigneeIds = getTaskAssigneeIds(t);
        const assigneeNames = assigneeIds
          .map((id) => teamById.get(id)?.name ?? "")
          .join(" ");
        return (
          t.title.toLowerCase().includes(query) ||
          (t.description ?? "").toLowerCase().includes(query) ||
          (creator?.full_name ?? "").toLowerCase().includes(query) ||
          assigneeNames.toLowerCase().includes(query)
        );
      }),
    [
      tasks,
      projectFilter,
      memberFilter,
      searchQuery,
      dueFilter,
      profiles,
      today,
      teamById,
    ]
  );

  const groups = useMemo(() => {
    const byStatus = new Map<TaskStatus, Task[]>();
    for (const status of statusOrder) byStatus.set(status, []);
    for (const task of filteredTasks) {
      const list = byStatus.get(task.status) ?? byStatus.get("todo")!;
      list.push(task);
    }
    for (const list of byStatus.values()) {
      list.sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority];
        const pb = PRIORITY_RANK[b.priority];
        if (pa !== pb) return pa - pb;
        return (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
      });
    }
    return statusOrder.map((status) => ({
      status,
      items: byStatus.get(status) ?? [],
    }));
  }, [filteredTasks, statusOrder]);

  return (
    <>
      <div className="fl-task-list">
        <div className="fl-task-list__head" aria-hidden>
          <div className="fl-task-list__col fl-task-list__col--name">
            {dict.common.title}
          </div>
          <div className="fl-task-list__col fl-task-list__col--project">
            {dict.fusion.labels.project}
          </div>
          <div className="fl-task-list__col fl-task-list__col--assignee">
            {dict.common.assignee}
          </div>
          <div className="fl-task-list__col fl-task-list__col--due">
            {dict.common.dueDate}
          </div>
          <div className="fl-task-list__col fl-task-list__col--priority">
            {dict.common.priority}
          </div>
          <div className="fl-task-list__col fl-task-list__col--status">
            {dict.common.status}
          </div>
          <div className="fl-task-list__col fl-task-list__col--actions" />
        </div>

        {groups.map(({ status, items }, groupIndex) => {
          const isCollapsed = !!collapsed[status];
          const color = TASK_STATUS_COLOR[status];
          return (
            <section key={status} className="fl-task-group">
              <div
                className="fl-task-group__header"
                style={{ ["--task-status-color" as string]: color }}
              >
                <button
                  type="button"
                  className="fl-task-group__toggle"
                  onClick={() =>
                    setCollapsed((prev) => ({
                      ...prev,
                      [status]: !prev[status],
                    }))
                  }
                >
                  <ChevronDown
                    className={cn(
                      "fl-task-group__chevron",
                      isCollapsed && "is-collapsed"
                    )}
                    strokeWidth={2}
                  />
                  <span className="fl-task-group__dot" aria-hidden />
                  <span className="fl-task-group__title">
                    {dict.taskStatus[status]}
                  </span>
                  <span className="fl-task-group__count">{items.length}</span>
                </button>

                <div className="fl-task-group__reorder">
                  <button
                    type="button"
                    className="fl-task-group__move"
                    disabled={groupIndex === 0}
                    title={dict.tasks.moveStatusUp}
                    aria-label={dict.tasks.moveStatusUp}
                    onClick={() => moveStatusGroup(status, -1)}
                  >
                    <ArrowUp className="size-3.5" strokeWidth={2.25} />
                  </button>
                  <button
                    type="button"
                    className="fl-task-group__move"
                    disabled={groupIndex === groups.length - 1}
                    title={dict.tasks.moveStatusDown}
                    aria-label={dict.tasks.moveStatusDown}
                    onClick={() => moveStatusGroup(status, 1)}
                  >
                    <ArrowDown className="size-3.5" strokeWidth={2.25} />
                  </button>
                </div>
              </div>

              {!isCollapsed ? (
                <div className="fl-task-group__body">
                  {items.map((task) => {
                    const assigneeIds = getTaskAssigneeIds(task);
                    const avatars = assigneeIds
                      .map((id) => teamById.get(id))
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((m) => ({
                        initials: m!.initials,
                        bg: m!.color,
                      }));
                    const overdue =
                      !!task.due_date &&
                      task.due_date < today &&
                      !isTaskDoneStatus(task.status);
                    const project = task.project_id
                      ? projectsById.get(task.project_id)
                      : undefined;

                    return (
                      <div key={task.id} className="fl-task-row">
                        <div className="fl-task-list__col fl-task-list__col--name">
                          <span
                            className="fl-task-row__dot"
                            style={{ background: color }}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <Link
                              href={`/tasks/${task.id}`}
                              title={task.title}
                              className={cn(
                                "fl-task-row__title",
                                isTaskDoneStatus(task.status) && "is-done"
                              )}
                            >
                              {task.title}
                            </Link>
                            <p
                              className="fl-task-row__project-mobile"
                              title={project?.title ?? dict.fusion.kanban.noProject}
                            >
                              {project?.title ?? dict.fusion.kanban.noProject}
                            </p>
                          </div>
                        </div>

                        <div className="fl-task-list__col fl-task-list__col--project">
                          {project ? (
                            <span
                              className="fl-task-row__project"
                              title={project.title}
                            >
                              {project.title}
                            </span>
                          ) : (
                            <span className="fl-task-row__empty">
                              {dict.fusion.kanban.noProject}
                            </span>
                          )}
                        </div>

                        <div className="fl-task-list__col fl-task-list__col--assignee">
                          {avatars.length > 0 ? (
                            <AvatarStack items={avatars} />
                          ) : (
                            <span className="fl-task-row__empty">—</span>
                          )}
                        </div>

                        <div className="fl-task-list__col fl-task-list__col--due">
                          {task.due_date ? (
                            <span
                              className={cn(
                                "fl-task-row__due",
                                overdue && "is-overdue"
                              )}
                            >
                              <Calendar className="size-3.5 shrink-0" strokeWidth={1.75} />
                              {new Date(
                                task.due_date + "T00:00:00"
                              ).toLocaleDateString(dateLocale, {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          ) : (
                            <span className="fl-task-row__empty" title={dict.common.dueDate}>
                              <Calendar className="size-3.5" strokeWidth={1.75} />
                            </span>
                          )}
                        </div>

                        <div className="fl-task-list__col fl-task-list__col--priority">
                          <span
                            className="fl-task-row__priority"
                            style={{ color: PRIORITY_FLAG[task.priority] }}
                          >
                            <Flag
                              className="size-3.5 shrink-0"
                              strokeWidth={2}
                              fill="currentColor"
                            />
                            <span className="hidden xl:inline">
                              {dict.taskPriority[task.priority]}
                            </span>
                          </span>
                        </div>

                        <div className="fl-task-list__col fl-task-list__col--status">
                          <TaskStatusSelect
                            task={task}
                            disabled={!canModifyTask(profile, task)}
                            onChange={(status) => changeStatus(task, status)}
                          />
                        </div>

                        <div className="fl-task-list__col fl-task-list__col--actions">
                          <TaskRowActions
                            task={task}
                            profile={profile}
                            onEdit={() => setEditTask(task)}
                            onToggleDone={() => toggleDone(task)}
                            onDeleted={() =>
                              setTasks((prev) =>
                                prev.filter((t) => t.id !== task.id)
                              )
                            }
                          />
                        </div>
                      </div>
                    );
                  })}

                  <Link
                    href={`/tasks/new?status=${status}`}
                    className="fl-task-group__add"
                  >
                    <Plus className="size-3.5" strokeWidth={2} />
                    {dict.tasks.addTask}
                  </Link>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <TaskFormDialog
        open={!!editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
        task={editTask ?? undefined}
        profiles={profiles}
        projects={projects}
      />
    </>
  );
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};
