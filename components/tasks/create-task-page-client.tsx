"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, CheckSquare, Loader2, Plus } from "lucide-react";
import { taskSchema, type TaskFormValues } from "@/lib/validations/task";
import { createTask } from "@/lib/actions/tasks";
import type { Profile } from "@/types/database";
import type { ProjectRecord } from "@/lib/projects/types";
import { buildTeamOptions } from "@/lib/team/members";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/database";
import type { TaskStatus } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { TeamMemberPicker } from "@/components/projects/team-member-picker";
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
import { todayKey } from "@/lib/tasks/due-filter";

function FormField({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("fl-field", className)}>
      <label className="fl-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function resolveDefaultStatus(value?: string): TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus)
    ? (value as TaskStatus)
    : "todo";
}

export function CreateTaskPageClient({
  profiles,
  projects = [],
  currentUserId,
  defaultDueDate,
  defaultStatus,
  defaultProjectId,
  defaultTaskPhase,
}: {
  profiles: Profile[];
  projects?: ProjectRecord[];
  currentUserId: string;
  defaultDueDate?: string;
  defaultStatus?: string;
  defaultProjectId?: string;
  defaultTaskPhase?: string;
}) {
  const dict = useDict();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const teamOptions = useMemo(() => buildTeamOptions(profiles), [profiles]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: resolveDefaultStatus(defaultStatus),
      priority: "medium",
      due_date: defaultDueDate || todayKey(),
      assigned_to: currentUserId,
      assignee_ids: [currentUserId],
      lead_id: "",
      project_id: defaultProjectId ?? "",
      task_phase: /^P\d+$/.test(defaultTaskPhase ?? "") ? defaultTaskPhase : "",
    },
  });

  const status = watch("status");
  const priority = watch("priority");
  const taskPhase = watch("task_phase") || "none";
  const selectedProject = projects.find((project) => project.id === projectId);
  const phaseOptions = selectedProject?.deliveryPhases ?? [];
  const selectedPhaseLabel = phaseOptions.find((phase) => phase.code === taskPhase)?.label;

  const projectLabel = projectId
    ? (projects.find((p) => p.id === projectId)?.title ??
        dict.fusion.kanban.noProject)
    : dict.fusion.kanban.noProject;

  function onSubmit(values: TaskFormValues) {
    startTransition(async () => {
      const result = await createTask({
        ...values,
        project_id: projectId || null,
        lead_id: null,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(dict.tasks.createdTask);
      router.push("/tasks");
      router.refresh();
    });
  }

  return (
    <div className="fl-create-task space-y-[18px]">
      <div className="fl-card fl-pad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 place-items-center rounded-xl text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <CheckSquare className="size-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{dict.tasks.newTask}</h2>
              <p className="mt-1 text-sm fl-faint">{dict.tasks.newTaskSub}</p>
            </div>
          </div>
          <Link href="/tasks" className="fl-btn sm ghost">
            <ArrowLeft className="size-4" />
            {dict.tasks.backToTasks}
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-[18px]">
        <section className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{dict.tasks.taskDetails}</h3>
              <div className="ch-sub">{dict.tasks.taskDetailsSub}</div>
            </div>
          </div>
          <div className="fl-pad">
            <div className="fl-form gap-4">
              <FormField
                label={`${dict.common.title} *`}
                htmlFor="create-task-title"
                error={errors.title?.message}
              >
                <Input
                  id="create-task-title"
                  className="fl-input"
                  {...register("title")}
                />
              </FormField>

              <FormField
                label={dict.common.description}
                htmlFor="create-task-description"
              >
                <Textarea
                  id="create-task-description"
                  rows={4}
                  className="fl-input min-h-[100px] resize-y"
                  {...register("description")}
                />
              </FormField>

              <div className="fl-form-row">
                <FormField label={dict.common.status}>
                  <Select
                    value={status}
                    onValueChange={(v) =>
                      v && setValue("status", v as TaskFormValues["status"])
                    }
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
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
                </FormField>

                <FormField label={dict.common.priority}>
                  <Select
                    value={priority}
                    onValueChange={(v) =>
                      v && setValue("priority", v as TaskFormValues["priority"])
                    }
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
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
                </FormField>
              </div>

              <div className="fl-form-row">
                <FormField label={dict.common.dueDate} htmlFor="create-task-due">
                  <Input
                    id="create-task-due"
                    type="date"
                    className="fl-input"
                    {...register("due_date")}
                  />
                </FormField>

                <FormField label={dict.fusion.labels.project}>
                  <Select
                    value={projectId || "none"}
                    onValueChange={(v) => {
                      setProjectId(!v || v === "none" ? "" : v);
                      setValue("task_phase", "");
                    }}
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
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
                </FormField>
              </div>

              {phaseOptions.length > 0 ? <FormField label={dict.tasks.phase}>
                <Select
                  value={taskPhase}
                  onValueChange={(v) => setValue("task_phase", !v || v === "none" ? "" : v)}
                >
                  <SelectTrigger className="fl-select-trigger fl-input w-full">
                    <SelectValue>{taskPhase === "none" ? "—" : `${taskPhase} · ${selectedPhaseLabel ?? taskPhase}`}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel" align="start">
                    <SelectItem value="none">—</SelectItem>
                    {phaseOptions.map((phase) => (
                      <SelectItem key={phase.code} value={phase.code}>
                        {phase.code} · {phase.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField> : null}

              <FormField label={dict.common.assignedTo}>
                <Controller
                  name="assignee_ids"
                  control={control}
                  render={({ field }) => (
                    <TeamMemberPicker
                      options={teamOptions}
                      value={field.value ?? []}
                      lockedIds={[currentUserId]}
                      onChange={(ids) => {
                        const next = ids.includes(currentUserId)
                          ? ids
                          : [currentUserId, ...ids];
                        field.onChange(next);
                      }}
                    />
                  )}
                />
              </FormField>
            </div>
          </div>
        </section>

        <div className="fl-card fl-pad flex flex-wrap items-center justify-end gap-2">
          <Link href="/tasks" className="fl-btn ghost">
            {dict.common.cancel}
          </Link>
          <button type="submit" className="fl-btn primary" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <Plus className="size-4" strokeWidth={2} />
            )}
            {dict.tasks.createTask}
          </button>
        </div>
      </form>
    </div>
  );
}
