"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckSquare,
  Loader2,
  Trash2,
} from "lucide-react";
import type { Lead, Profile, Task, TaskPriority, TaskStatus } from "@/types/database";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/database";
import {
  canDeleteTaskForProfile,
  canModifyTask,
  canViewAllTasks,
} from "@/lib/permissions";
import { deleteTask, updateTask } from "@/lib/actions/tasks";
import type { TaskFormValues } from "@/lib/validations/task";
import { buildTeamOptions } from "@/lib/team/members";
import type { ProjectRecord } from "@/lib/projects/types";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
  leads,
  projects = [],
  profile,
}: {
  task: Task;
  profiles: Profile[];
  leads: Lead[];
  projects?: ProjectRecord[];
  profile: Profile;
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
  const [assignedTo, setAssignedTo] = useState(initialTask.assigned_to ?? "");
  const [leadId, setLeadId] = useState(initialTask.lead_id ?? "");
  const [projectId, setProjectId] = useState(initialTask.project_id ?? "");

  const canEdit = canModifyTask(profile, task);
  const canAssignAnyone = canViewAllTasks(profile);
  const teamOptions = useMemo(() => buildTeamOptions(profiles), [profiles]);

  useEffect(() => {
    setTask(initialTask);
    setTitle(initialTask.title);
    setDescription(initialTask.description ?? "");
    setDueDate(initialTask.due_date ?? "");
    setStatus(initialTask.status);
    setPriority(initialTask.priority);
    setAssignedTo(initialTask.assigned_to ?? "");
    setLeadId(initialTask.lead_id ?? "");
    setProjectId(initialTask.project_id ?? "");
  }, [initialTask]);

  const today = new Date().toISOString().slice(0, 10);
  const overdue =
    !!dueDate &&
    dueDate < today &&
    status !== "done" &&
    status !== "cancelled";

  const assigneeLabel =
    profiles.find((p) => p.id === assignedTo)?.full_name ??
    profiles.find((p) => p.id === assignedTo)?.email ??
    c.unassigned;

  const leadLabel =
    leads.find((l) => l.id === leadId)?.title ?? c.none;

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
      assigned_to: assignedTo,
      lead_id: leadId,
      project_id: projectId || null,
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
            values.assigned_to
              ? profiles.find((p) => p.id === values.assigned_to) ??
                task.assigned_profile
              : null,
          lead: values.lead_id
            ? leads.find((l) => l.id === values.lead_id) ?? task.lead
            : null,
        });
        setProjectId(result.data.project_id ?? "");
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
              <Select
                value={assignedTo || "unassigned"}
                disabled={!canEdit || pending || !canAssignAnyone}
                onValueChange={(v) => {
                  const next = !v || v === "unassigned" ? "" : v;
                  setAssignedTo(next);
                  save({ assigned_to: next });
                }}
              >
                <SelectTrigger className="fl-select-trigger fl-inp w-full">
                  <SelectValue>{assigneeLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="start">
                  <SelectItem value="unassigned">{c.unassigned}</SelectItem>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.full_name ?? p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <Field label={c.linkedLead}>
              <Select
                value={leadId || "none"}
                disabled={!canEdit || pending}
                onValueChange={(v) => {
                  const next = !v || v === "none" ? "" : v;
                  setLeadId(next);
                  save({ lead_id: next });
                }}
              >
                <SelectTrigger className="fl-select-trigger fl-inp w-full">
                  <SelectValue>{leadLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="start">
                  <SelectItem value="none">{c.none}</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <p className="text-[11px] fl-faint">
              {c.created}:{" "}
              {format(new Date(task.created_at), "d MMM yyyy · HH:mm")}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
