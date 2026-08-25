"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckSquare,
  Save,
  Loader2,
  Trash2,
} from "lucide-react";
import type { Profile, Task, TaskPriority, TaskStatus, TaskWorkspaceData } from "@/types/database";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/database";
import { isTaskDoneStatus } from "@/lib/tasks/status";
import {
  canDeleteTaskForProfile,
  canModifyTask,
} from "@/lib/permissions";
import { deleteTask, updateTask } from "@/lib/actions/tasks";
import type { TaskFormValues } from "@/lib/validations/task";
import { getTaskAssigneeIds } from "@/lib/tasks/assignee-filter";
import { buildTeamOptions } from "@/lib/team/members";
import type { ProjectRecord } from "@/lib/projects/types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TeamMemberPicker } from "@/components/projects/team-member-picker";
import { useDict } from "@/components/shared/i18n-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TaskWorkspace } from "@/components/tasks/task-workspace";

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("fl-field", className)}>
      <label className="fl-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function TaskDetailClient({
  task: initialTask,
  profiles,
  projects = [],
  profile,
  workspace,
}: {
  task: Task;
  profiles: Profile[];
  projects?: ProjectRecord[];
  profile: Profile;
  workspace: TaskWorkspaceData;
}) {
  const dict = useDict();
  const c = dict.common;
  const td = dict.tasks;
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initialTask.title);
  const [description, setDescription] = useState(initialTask.description ?? "");
  const [dueDate, setDueDate] = useState(initialTask.due_date ?? "");
  const [status, setStatus] = useState<TaskStatus>(initialTask.status);
  const [priority, setPriority] = useState<TaskPriority>(initialTask.priority);
  const [assigneeIds, setAssigneeIds] = useState(() =>
    getTaskAssigneeIds(initialTask)
  );
  const [projectId, setProjectId] = useState(initialTask.project_id ?? "");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(initialTask.acceptance_criteria ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(initialTask.estimated_minutes ?? null);
  const [trackedMinutes, setTrackedMinutes] = useState(initialTask.tracked_minutes ?? 0);
  const [nextStep, setNextStep] = useState(initialTask.next_step ?? "");

  const canEdit = canModifyTask(profile, task);
  const teamOptions = useMemo(() => buildTeamOptions(profiles), [profiles]);

  useEffect(() => {
    setTask(initialTask);
    setTitle(initialTask.title);
    setDescription(initialTask.description ?? "");
    setDueDate(initialTask.due_date ?? "");
    setStatus(initialTask.status);
    setPriority(initialTask.priority);
    setAssigneeIds(getTaskAssigneeIds(initialTask));
    setProjectId(initialTask.project_id ?? "");
    setAcceptanceCriteria(initialTask.acceptance_criteria ?? "");
    setEstimatedMinutes(initialTask.estimated_minutes ?? null);
    setTrackedMinutes(initialTask.tracked_minutes ?? 0);
    setNextStep(initialTask.next_step ?? "");
  }, [initialTask]);

  const isDirty =
    title !== task.title ||
    description !== (task.description ?? "") ||
    dueDate !== (task.due_date ?? "") ||
    status !== task.status ||
    priority !== task.priority ||
    projectId !== (task.project_id ?? "") ||
    JSON.stringify(assigneeIds) !== JSON.stringify(getTaskAssigneeIds(task)) ||
    acceptanceCriteria !== (task.acceptance_criteria ?? "") ||
    estimatedMinutes !== (task.estimated_minutes ?? null) ||
    trackedMinutes !== (task.tracked_minutes ?? 0) ||
    nextStep !== (task.next_step ?? "");

  const today = new Date().toISOString().slice(0, 10);
  const overdue =
    !!dueDate && dueDate < today && !isTaskDoneStatus(status);

  const creatorLabel =
    task.created_profile?.full_name?.trim() ||
    task.created_profile?.email ||
    profiles.find((p) => p.id === task.created_by)?.full_name?.trim() ||
    profiles.find((p) => p.id === task.created_by)?.email ||
    "—";

  const lastEditor = task.last_modified_by
    ? profiles.find((p) => p.id === task.last_modified_by)
    : null;
  const lastEditorLabel =
    lastEditor?.full_name?.trim() || lastEditor?.email || creatorLabel;

  const projectLabel =
    projects.find((p) => p.id === projectId)?.title ??
    dict.fusion.kanban.noProject;

  function buildPayload(patch: Partial<TaskFormValues> = {}): TaskFormValues {
    return {
      title: title.trim() || task.title,
      description,
      status,
      priority,
      due_date: dueDate,
      assigned_to: assigneeIds[0] ?? "",
      assignee_ids: assigneeIds,
      lead_id: "",
      project_id: projectId || null,
      acceptance_criteria: acceptanceCriteria,
      estimated_minutes: estimatedMinutes,
      tracked_minutes: trackedMinutes,
      next_step: nextStep,
      ...patch,
    };
  }

  function save(patch: Partial<TaskFormValues> = {}, nextProjectId?: string) {
    if (!canEdit) return;
    const pid = nextProjectId !== undefined ? nextProjectId : projectId;
    const values = buildPayload({
      ...patch,
      project_id: pid || null,
    });
    startTransition(async () => {
      const result = await updateTask(task.id, values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.data) {
        setTask({
          ...task,
          ...result.data,
          assigned_profile:
            values.assignee_ids?.[0]
              ? profiles.find((p) => p.id === values.assignee_ids![0]) ??
                task.assigned_profile
              : null,
        });
        setAssigneeIds(getTaskAssigneeIds(result.data));
        setProjectId(result.data.project_id ?? "");
        setAcceptanceCriteria(result.data.acceptance_criteria ?? "");
        setEstimatedMinutes(result.data.estimated_minutes ?? null);
        setTrackedMinutes(result.data.tracked_minutes ?? 0);
        setNextStep(result.data.next_step ?? "");
      }
      toast.success(td.updatedTask);
      router.refresh();
    });
  }

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 place-items-center rounded-xl text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <CheckSquare className="size-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight">
                {task.title}
              </h2>
              <p className="mt-1 text-sm fl-faint">{td.taskDetailsSub}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={cn("fl-btn sm", isDirty ? "primary" : "ghost")}
              disabled={!canEdit || pending || !isDirty}
              onClick={() => save()}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isDirty ? "Sauvegarder les modifications" : "Modifications enregistrées"}
            </button>
            <Link href="/tasks?view=list" className="fl-btn sm ghost">
              <ArrowLeft className="size-4" />
              {td.backToTasks}
            </Link>
            {canDeleteTaskForProfile(profile, task) ? (
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    className="fl-btn sm destructive"
                    disabled={pending}
                  >
                    <Trash2 className="size-4" />
                    {c.delete}
                  </button>
                }
                title={td.deleteTitle}
                description={td.deleteDescription.replace("{title}", task.title)}
                confirmLabel={c.delete}
                onConfirm={async () => {
                  startTransition(async () => {
                    const result = await deleteTask(task.id);
                    if (!result.success) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success(td.deletedTask);
                    router.push("/tasks");
                  });
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[1.4fr_1fr]">
        <section className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{c.details}</h3>
              <div className="ch-sub">{td.taskDetailsSub}</div>
            </div>
            {pending ? (
              <Loader2 className="size-4 animate-spin fl-faint" />
            ) : null}
          </div>
          <div className="fl-pad space-y-4">
            <Field label={`${c.title} *`} htmlFor="task-detail-title">
              <Input
                id="task-detail-title"
                className="fl-inp"
                value={title}
                disabled={!canEdit || pending}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => {
                  if (title.trim() && title.trim() !== task.title) {
                    save({ title: title.trim() });
                  }
                }}
              />
            </Field>

            <Field label={c.description} htmlFor="task-detail-desc">
              <Textarea
                id="task-detail-desc"
                rows={5}
                className="fl-inp min-h-[120px] resize-y"
                value={description}
                disabled={!canEdit || pending}
                placeholder={td.noDescription}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => {
                  if ((description || "") !== (task.description || "")) {
                    save({ description });
                  }
                }}
              />
            </Field>

            <Field label="Critères d’acceptation" htmlFor="task-detail-acceptance">
              <Textarea
                id="task-detail-acceptance"
                rows={5}
                className="fl-inp min-h-[120px] resize-y"
                value={acceptanceCriteria}
                disabled={!canEdit || pending}
                placeholder="Quand considérons-nous cette tâche terminée ?"
                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                onBlur={() => {
                  if (acceptanceCriteria !== (task.acceptance_criteria ?? "")) {
                    save({ acceptance_criteria: acceptanceCriteria });
                  }
                }}
              />
            </Field>

            <Field label="Étape suivante" htmlFor="task-detail-next-step">
              <Input
                id="task-detail-next-step"
                className="fl-inp"
                value={nextStep}
                disabled={!canEdit || pending}
                placeholder="Ex. Tester le checkout sur Casablanca"
                onChange={(e) => setNextStep(e.target.value)}
                onBlur={() => {
                  if (nextStep !== (task.next_step ?? "")) save({ next_step: nextStep });
                }}
              />
            </Field>
          </div>
        </section>

        <section className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{c.status}</h3>
              <div className="ch-sub">{c.priority} · {c.assignedTo}</div>
            </div>
          </div>
          <div className="fl-pad space-y-4">
            <Field label={c.status}>
              <Select
                value={status}
                disabled={!canEdit || pending}
                onValueChange={(v) => {
                  if (!v) return;
                  const next = v as TaskStatus;
                  setStatus(next);
                  save({ status: next });
                }}
              >
                <SelectTrigger className="fl-select-trigger fl-inp w-full">
                  <SelectValue>{dict.taskStatus[status]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="start">
                  {TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {dict.taskStatus[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={c.priority}>
              <Select
                value={priority}
                disabled={!canEdit || pending}
                onValueChange={(v) => {
                  if (!v) return;
                  const next = v as TaskPriority;
                  setPriority(next);
                  save({ priority: next });
                }}
              >
                <SelectTrigger className="fl-select-trigger fl-inp w-full">
                  <SelectValue>{dict.taskPriority[priority]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="start">
                  {TASK_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {dict.taskPriority[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={c.assignedTo}>
              {canEdit ? (
                <TeamMemberPicker
                  options={teamOptions}
                  value={assigneeIds}
                  onChange={(ids) => {
                    if (pending) return;
                    setAssigneeIds(ids);
                    save({
                      assignee_ids: ids,
                      assigned_to: ids[0] ?? "",
                    });
                  }}
                />
              ) : (
                <p className="text-sm text-[var(--text-dim)]">
                  {assigneeIds.length === 0
                    ? c.unassigned
                    : assigneeIds
                        .map(
                          (id) =>
                            profiles.find((p) => p.id === id)?.full_name ??
                            profiles.find((p) => p.id === id)?.email ??
                            id
                        )
                        .join(", ")}
                </p>
              )}
            </Field>

            <Field label={c.dueDate} htmlFor="task-detail-due">
              <Input
                id="task-detail-due"
                type="date"
                className={cn("fl-inp", overdue && "border-[var(--rose)]")}
                value={dueDate}
                disabled={!canEdit || pending}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={() => {
                  if (dueDate !== (task.due_date ?? "")) {
                    save({ due_date: dueDate });
                  }
                }}
              />
              {overdue ? (
                <p className="mt-1 text-xs text-[var(--rose)]">{c.overdue}</p>
              ) : null}
            </Field>

            <Field label={dict.fusion.labels.project}>
              <Select
                value={projectId || "none"}
                disabled={!canEdit || pending}
                onValueChange={(v) => {
                  const next = !v || v === "none" ? "" : v;
                  setProjectId(next);
                  save({}, next);
                }}
              >
                <SelectTrigger className="fl-select-trigger fl-inp w-full">
                  <SelectValue>{projectLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="start">
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
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Temps estimé (min)" htmlFor="task-detail-estimate">
                <Input
                  id="task-detail-estimate"
                  type="number"
                  min={0}
                  className="fl-inp"
                  value={estimatedMinutes ?? ""}
                  disabled={!canEdit || pending}
                  onChange={(e) => setEstimatedMinutes(e.target.value === "" ? null : Number(e.target.value))}
                  onBlur={() => {
                    if (estimatedMinutes !== (task.estimated_minutes ?? null)) {
                      save({ estimated_minutes: estimatedMinutes });
                    }
                  }}
                />
              </Field>
              <Field label="Temps consommé (min)" htmlFor="task-detail-tracked">
                <Input
                  id="task-detail-tracked"
                  type="number"
                  min={0}
                  className="fl-inp"
                  value={trackedMinutes}
                  disabled={!canEdit || pending}
                  onChange={(e) => setTrackedMinutes(Math.max(0, Number(e.target.value) || 0))}
                  onBlur={() => {
                    if (trackedMinutes !== (task.tracked_minutes ?? 0)) {
                      save({ tracked_minutes: trackedMinutes });
                    }
                  }}
                />
              </Field>
            </div>

            <p className="text-[11px] fl-faint">
              {c.createdBy}:{" "}
              <span className="font-medium text-[var(--text-dim)]">
                {creatorLabel}
              </span>
              {" · "}
              {c.created}:{" "}
              {format(new Date(task.created_at), "d MMM yyyy · HH:mm")}
            </p>
            <p className="text-[11px] fl-faint">
              Dernière modification : <span className="font-medium text-[var(--text-dim)]">{lastEditorLabel}</span>
              {" · "}
              {format(new Date(task.updated_at), "d MMM yyyy · HH:mm")}
            </p>
          </div>
        </section>
      </div>

      <TaskWorkspace
        taskId={task.id}
        workspace={workspace}
        profiles={profiles}
        canEdit={canEdit}
        status={status}
        onMoveToStatus={(next) => {
          setStatus(next);
          save({ status: next });
        }}
      />
    </div>
  );
}
