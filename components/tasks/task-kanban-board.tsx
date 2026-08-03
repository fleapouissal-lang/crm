"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Clock, Check, Trash2 } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { deleteTask, updateTaskStatus } from "@/lib/actions/tasks";
import type { Profile, Task, TaskPriority, TaskStatus } from "@/types/database";
import type { ProjectRecord } from "@/lib/projects/types";
import { taskMatchesProjectFilter } from "@/lib/tasks/project-links";
import { taskMatchesDueFilter, todayKey } from "@/lib/tasks/due-filter";
import { canDeleteTaskForProfile } from "@/lib/permissions";
import { FlAva } from "@/components/fusion/primitives";
import { useDict } from "@/components/shared/i18n-provider";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { cn } from "@/lib/utils";

const BOARD_COLUMNS: {
  id: TaskStatus;
  titleKey: "todo" | "inProgress" | "done";
  dot: string;
}[] = [
  { id: "todo", titleKey: "todo", dot: "var(--sky)" },
  { id: "in_progress", titleKey: "inProgress", dot: "var(--gold)" },
  { id: "done", titleKey: "done", dot: "var(--emerald)" },
];

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: "var(--text-faint)",
  medium: "var(--amber)",
  high: "var(--rose)",
  urgent: "var(--rose)",
};

const AVATAR_COLORS = ["#52525b", "#3ecf8e", "#f5a623", "#71717a"];

function assigneeMeta(profile?: Profile | null) {
  const name = profile?.full_name?.trim() ?? "";
  if (!name) return { initials: "?", bg: "#52525b", name: "" };
  const parts = name.split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  const bg = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? "#52525b";
  return { initials, bg, name };
}

function creatorLabel(task: Task, profiles: Profile[], fallback: string) {
  const profile =
    task.created_profile ??
    profiles.find((p) => p.id === task.created_by) ??
    null;
  const name = profile?.full_name?.trim() || profile?.email || "";
  return name || fallback;
}

function PriorityDot({ priority }: { priority: TaskPriority }) {
  const dict = useDict();
  const label = dict.taskPriority[priority];
  return (
    <span className="inline-flex items-center gap-1 text-[11px] fl-faint">
      <i
        className="pdot inline-block size-1.5 rounded-full"
        style={{ background: PRIORITY_DOT[priority] }}
      />
      {label}
    </span>
  );
}

function TaskCard({
  task,
  project,
  profiles = [],
  canDelete,
  onDelete,
  isDragging,
}: {
  task: Task;
  project?: ProjectRecord | null;
  profiles?: Profile[];
  canDelete?: boolean;
  onDelete?: (task: Task) => void;
  isDragging?: boolean;
}) {
  const dict = useDict();
  const assignee = assigneeMeta(task.assigned_profile);
  const creator = creatorLabel(task, profiles, "—");
  const isDone = task.status === "done";

  return (
    <div
      className={cn(
        "fl-kcard",
        isDone && "opacity-[0.88]",
        isDragging && "opacity-90 ring-2 ring-[var(--iris)]/40"
      )}
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {project ? (
            <span className="ktag fl-badge b-iris text-[10.5px]">
              {project.title}
            </span>
          ) : task.lead?.company ? (
            <span className="ktag fl-badge b-blue text-[10.5px]">
              {task.lead.company}
            </span>
          ) : null}
        </div>
        {canDelete && onDelete ? (
          <button
            type="button"
            className="rowbtn rowbtn--danger shrink-0"
            aria-label={dict.common.delete}
            title={dict.common.delete}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Trash2 className="size-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      <h4>
        <Link
          href={`/tasks/${task.id}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {task.title}
        </Link>
      </h4>
      <p className="mt-1 truncate text-[11px] fl-faint">
        {dict.common.createdBy}{" "}
        <span className="font-medium text-[var(--text-dim)]">{creator}</span>
      </p>
      <div className="kmeta">
        <div className="kl flex flex-wrap items-center gap-2">
          <PriorityDot priority={task.priority} />
          {task.due_date && (
            <span className="inline-flex items-center gap-1 text-[11px] fl-faint">
              <Clock className="gl size-3" strokeWidth={2} />
              {format(new Date(task.due_date + "T00:00:00"), "MMM d")}
            </span>
          )}
          {isDone && (
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--emerald)]">
              <Check className="gl size-3" strokeWidth={2.5} />
              {dict.fusion.badges.merged}
            </span>
          )}
        </div>
        <FlAva sm style={{ background: assignee.bg }}>
          {assignee.initials}
        </FlAva>
      </div>
    </div>
  );
}

function SortableTaskCard({
  task,
  project,
  profiles,
  canDelete,
  onDelete,
}: {
  task: Task;
  project?: ProjectRecord | null;
  profiles: Profile[];
  canDelete?: boolean;
  onDelete?: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard
        task={task}
        project={project}
        profiles={profiles}
        canDelete={canDelete}
        onDelete={onDelete}
      />
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  projectsById,
  profiles,
  currentProfile,
  onDelete,
}: {
  status: TaskStatus;
  tasks: Task[];
  projectsById: Map<string, ProjectRecord>;
  profiles: Profile[];
  currentProfile: Profile;
  onDelete: (task: Task) => void;
}) {
  const dict = useDict();
  const k = dict.fusion.kanban;
  const col = BOARD_COLUMNS.find((c) => c.id === status)!;
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn("fl-kcol", isOver && "ring-2 ring-[var(--iris)]/30")}
    >
      <div className="fl-kcol-head">
        <span className="kdot" style={{ background: col.dot }} />
        <b>{k[col.titleKey]}</b>
        <span className="kcount">{tasks.length}</span>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="fl-kcards max-h-none min-h-0 flex-1">
          {tasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              profiles={profiles}
              canDelete={canDeleteTaskForProfile(currentProfile, task)}
              onDelete={onDelete}
              project={
                task.project_id
                  ? projectsById.get(task.project_id) ?? null
                  : null
              }
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function TaskKanbanBoard({
  initialTasks,
  organizationId,
  profiles,
  projects,
  projectFilter,
  searchQuery = "",
  dueFilter = todayKey(),
  profile,
}: {
  initialTasks: Task[];
  organizationId: string;
  profiles: Profile[];
  projects: ProjectRecord[];
  projectFilter: string;
  searchQuery?: string;
  dueFilter?: string;
  profile: Profile;
}) {
  const dict = useDict();
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tasks-kanban-realtime")
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

  const projectsById = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  const query = searchQuery.trim().toLowerCase();
  const today = todayKey();

  const visibleTasks = useMemo(
    () =>
      tasks.filter((t) => {
        if (t.status === "cancelled") return false;
        if (!taskMatchesProjectFilter(t, projectFilter)) return false;
        if (!taskMatchesDueFilter(t, dueFilter, today)) return false;
        if (!query) return true;
        return (
          t.title.toLowerCase().includes(query) ||
          (t.description ?? "").toLowerCase().includes(query) ||
          (t.created_profile?.full_name ?? "").toLowerCase().includes(query) ||
          (t.assigned_profile?.full_name ?? "").toLowerCase().includes(query)
        );
      }),
    [tasks, projectFilter, dueFilter, query, today]
  );

  const byStatus = useMemo(() => {
    const map = Object.fromEntries(
      BOARD_COLUMNS.map((c) => [c.id, [] as Task[]])
    ) as Record<(typeof BOARD_COLUMNS)[number]["id"], Task[]>;
    for (const task of visibleTasks) {
      if (map[task.status]) map[task.status].push(task);
    }
    return map;
  }, [visibleTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    let newStatus: TaskStatus | null = null;
    if (BOARD_COLUMNS.some((c) => c.id === over.id)) {
      newStatus = over.id as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask && overTask.status !== "cancelled") {
        newStatus = overTask.status;
      }
    }

    if (!newStatus || newStatus === task.status) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus! } : t))
    );

    startTransition(async () => {
      const result = await updateTaskStatus(taskId, newStatus!);
      if (!result.success) {
        toast.error(result.error);
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
        );
      }
    });
  }

  const activeProject =
    activeTask?.project_id
      ? projectsById.get(activeTask.project_id) ?? null
      : null;

  return (
    <>
      <div className="fl-kanban-body">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="fl-kanban fl-kanban--3">
            {BOARD_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                status={col.id}
                tasks={byStatus[col.id]}
                projectsById={projectsById}
                profiles={profiles}
                currentProfile={profile}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                project={activeProject}
                profiles={profiles}
                isDragging
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={dict.tasks.deleteTitle}
        description={dict.tasks.deleteDescription.replace(
          "{title}",
          deleteTarget?.title ?? ""
        )}
        confirmLabel={dict.common.delete}
        onConfirm={async () => {
          if (!deleteTarget) return;
          const result = await deleteTask(deleteTarget.id);
          if (!result.success) {
            toast.error(result.error);
            return;
          }
          setTasks((prev) => prev.filter((t) => t.id !== deleteTarget.id));
          setDeleteTarget(null);
          toast.success(dict.tasks.deletedTask);
        }}
      />
    </>
  );
}
