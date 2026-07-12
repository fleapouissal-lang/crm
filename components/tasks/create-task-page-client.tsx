"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, CheckSquare, Loader2, Plus } from "lucide-react";
import { taskSchema, type TaskFormValues } from "@/lib/validations/task";
import { createTask } from "@/lib/actions/tasks";
import type { Lead, Profile } from "@/types/database";
import type { ProjectRecord } from "@/lib/projects/types";
import { setTaskProjectId } from "@/lib/tasks/project-links";
import { loadProjects } from "@/lib/projects/storage";
import { buildTeamOptions } from "@/lib/team/members";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/types/database";
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

export function CreateTaskPageClient({
  profiles,
  leads,
  defaultLeadId,
  defaultDueDate,
}: {
  profiles: Profile[];
  leads: Lead[];
  defaultLeadId?: string;
  defaultDueDate?: string;
}) {
  const dict = useDict();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [projectId, setProjectId] = useState("");
  const teamOptions = useMemo(() => buildTeamOptions(profiles), [profiles]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);

  useEffect(() => {
    setProjects(loadProjects(teamOptions));
  }, [teamOptions]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      due_date: defaultDueDate ?? "",
      assigned_to: "",
      lead_id: defaultLeadId ?? "",
    },
  });

  const status = watch("status");
  const priority = watch("priority");
  const assignedTo = watch("assigned_to");
  const leadId = watch("lead_id");

  const assigneeLabel = assignedTo
    ? (profiles.find((p) => p.id === assignedTo)?.full_name ??
        profiles.find((p) => p.id === assignedTo)?.email ??
        dict.common.unassigned)
    : dict.common.unassigned;
  const projectLabel = projectId
    ? (projects.find((p) => p.id === projectId)?.title ??
        dict.fusion.kanban.noProject)
    : dict.fusion.kanban.noProject;
  const leadLabel = leadId
    ? (leads.find((l) => l.id === leadId)?.title ?? dict.common.none)
    : dict.common.none;

  function onSubmit(values: TaskFormValues) {
    startTransition(async () => {
      const result = await createTask(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setTaskProjectId(result.data!.id, projectId || null);
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

                <FormField label={dict.common.assignedTo}>
                  <Select
                    value={assignedTo || "unassigned"}
                    onValueChange={(v) =>
                      setValue("assigned_to", v === "unassigned" ? "" : (v ?? ""))
                    }
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
                      <SelectValue>{assigneeLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel" align="start">
                      <SelectItem value="unassigned">
                        {dict.common.unassigned}
                      </SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name ?? p.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="fl-form-row">
                <FormField label={dict.fusion.labels.project}>
                  <Select
                    value={projectId || "none"}
                    onValueChange={(v) =>
                      setProjectId(!v || v === "none" ? "" : v)
                    }
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

                <FormField label={dict.common.linkedLead}>
                  <Select
                    value={leadId || "none"}
                    onValueChange={(v) =>
                      setValue("lead_id", v === "none" ? "" : (v ?? ""))
                    }
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
                      <SelectValue>{leadLabel}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel" align="start">
                      <SelectItem value="none">{dict.common.none}</SelectItem>
                      {leads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
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
