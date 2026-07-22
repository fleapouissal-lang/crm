"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckSquare, Circle, Eye, Pencil, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateTaskStatus, deleteTask } from "@/lib/actions/tasks";
import type { Lead, Profile, Task, TaskStatus } from "@/types/database";
import type { ProjectRecord } from "@/lib/projects/types";
import { taskMatchesProjectFilter } from "@/lib/tasks/project-links";
import { useDict } from "@/components/shared/i18n-provider";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/page-header";
import { DataPagination } from "@/components/shared/data-pagination";
import { RowActionsMenu, type RowActionItem } from "@/components/shared/row-actions-menu";
import { TaskFormDialog } from "@/components/tasks/task-form";
import { canDeleteTaskForProfile } from "@/lib/permissions";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
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

function TaskRowActions({
  task,
  profile,
  onEdit,
  onToggleDone,
}: {
  task: Task;
  profile: Profile;
  onEdit: () => void;
  onToggleDone: () => void;
}) {
  const dict = useDict();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const actions: RowActionItem[] = [
    {
      label: dict.common.viewDetails,
      icon: <Eye className="size-4" />,
      onClick: () => router.push(`/tasks/${task.id}`),
    },
    {
      label: dict.common.edit,
      icon: <Pencil className="size-4" />,
      onClick: onEdit,
    },
    {
      label: task.status === "done" ? dict.tasks.markTodo : dict.tasks.markDone,
      icon: <Check className="size-4" />,
      onClick: onToggleDone,
    },
    ...(canDeleteTaskForProfile(profile, task)
      ? ([
          { separator: true },
          {
            label: dict.common.delete,
            icon: <Trash2 className="size-4" />,
            destructive: true,
            onClick: () => setDeleteOpen(true),
          },
        ] satisfies RowActionItem[])
      : []),
  ];

  return (
    <>
      <RowActionsMenu actions={actions} />
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
  leads,
  profile,
  projects = [],
  projectFilter = "all",
}: {
  initialTasks: Task[];
  organizationId: string;
  profiles: Profile[];
  leads: Lead[];
  profile: Profile;
  projects?: ProjectRecord[];
  projectFilter?: string;
}) {
  const dict = useDict();
  const [tasks, setTasks] = useState(initialTasks);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

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

  const today = new Date().toISOString().slice(0, 10);

  function toggleDone(task: Task) {
    const nextStatus: TaskStatus =
      task.status === "done" ? "todo" : "done";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );
    startTransition(async () => {
      const result = await updateTaskStatus(task.id, nextStatus);
      if (!result.success) {
        toast.error(result.error);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: task.status } : t
          )
        );
      }
    });
  }

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const filteredTasks = useMemo(
    () => tasks.filter((t) => taskMatchesProjectFilter(t, projectFilter)),
    [tasks, projectFilter]
  );
  const orderedTasks = useMemo(() => {
    const sectionRank = (task: Task) => {
      if (task.status === "done" || task.status === "cancelled") return 3;
      if (task.due_date && task.due_date < today) return 0;
      if (task.due_date === today) return 1;
      return 2;
    };
    return [...filteredTasks].sort((a, b) => sectionRank(a) - sectionRank(b));
  }, [filteredTasks, today]);
  const pagination = useAdaptivePagination(orderedTasks, {
    rowHeight: 61,
    resetKey: projectFilter,
  });

  if (filteredTasks.length === 0) {
    return (
      <EmptyState
        icon={CheckSquare}
        title={dict.tasks.noTasksFound}
        description={dict.tasks.noTasksHint}
      />
    );
  }

  const grouped = {
    overdue: pagination.pageItems.filter(
      (t) =>
        t.due_date &&
        t.due_date < today &&
        t.status !== "done" &&
        t.status !== "cancelled"
    ),
    today: pagination.pageItems.filter(
      (t) =>
        t.due_date === today &&
        t.status !== "done" &&
        t.status !== "cancelled"
    ),
    upcoming: pagination.pageItems.filter(
      (t) =>
        (!t.due_date || t.due_date > today) &&
        t.status !== "done" &&
        t.status !== "cancelled"
    ),
    done: pagination.pageItems.filter(
      (t) => t.status === "done" || t.status === "cancelled"
    ),
  };

  const sections: { key: keyof typeof grouped; title: string }[] = [
    { key: "overdue", title: dict.tasks.sections.overdue },
    { key: "today", title: dict.tasks.sections.today },
    { key: "upcoming", title: dict.tasks.sections.upcoming },
    { key: "done", title: dict.tasks.sections.done },
  ];

  return (
    <>
      <div className="space-y-6">
        {sections.map(({ key, title }) => {
          const items = grouped[key];
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <h3
                className={cn(
                  "mb-2 text-sm font-semibold",
                  key === "overdue" && "text-destructive"
                )}
              >
                {title}{" "}
                <span className="font-normal text-muted-foreground">
                  ({items.length})
                </span>
              </h3>
              <ul className="divide-y overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
                {items.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => toggleDone(task)}
                      aria-label={
                        task.status === "done"
                          ? dict.tasks.markTodo
                          : dict.tasks.markDone
                      }
                    >
                      {task.status === "done" ? (
                        <CheckSquare className="size-4 text-emerald-600" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/tasks/${task.id}`}
                        className={cn(
                          "text-sm font-medium hover:underline",
                          task.status === "done" &&
                            "text-muted-foreground line-through"
                        )}
                      >
                        {task.title}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {task.due_date && (
                          <span
                            className={
                              key === "overdue" ? "text-destructive" : undefined
                            }
                          >
                            {new Date(
                              task.due_date + "T00:00:00"
                            ).toLocaleDateString()}
                          </span>
                        )}
                        {task.lead && (
                          <Link
                            href={`/leads/${task.lead.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {task.lead.title}
                          </Link>
                        )}
                        {task.project_id &&
                          projectsById.get(task.project_id) && (
                          <span className="text-[var(--iris)]">
                            {projectsById.get(task.project_id)!.title}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <TaskPriorityBadge priority={task.priority} />
                      <TaskStatusBadge status={task.status} />
                    </div>
                    <TaskRowActions
                      task={task}
                      profile={profile}
                      onEdit={() => setEditTask(task)}
                      onToggleDone={() => toggleDone(task)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        <DataPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
          className="rounded-xl border border-[var(--border)]"
        />
      </div>

      <TaskFormDialog
        open={!!editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
        task={editTask ?? undefined}
        profiles={profiles}
        leads={leads}
        projects={projects}
      />
    </>
  );
}
