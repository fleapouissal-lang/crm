"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { taskSchema, type TaskFormValues } from "@/lib/validations/task";
import { createTask, updateTask } from "@/lib/actions/tasks";
import type { Lead, Profile, Task } from "@/types/database";
import type { ProjectRecord } from "@/lib/projects/types";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  profiles: Profile[];
  leads: Lead[];
  projects?: ProjectRecord[];
  defaultLeadId?: string;
  defaultDueDate?: string;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  profiles,
  leads,
  projects = [],
  defaultLeadId,
  defaultDueDate,
}: TaskFormDialogProps) {
  const dict = useDict();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [projectId, setProjectId] = useState("");
  const isEdit = !!task;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      due_date: "",
      assigned_to: "",
      lead_id: "",
      project_id: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: task?.title ?? "",
        description: task?.description ?? "",
        status: task?.status ?? "todo",
        priority: task?.priority ?? "medium",
        due_date: task?.due_date ?? defaultDueDate ?? "",
        assigned_to: task?.assigned_to ?? "",
        lead_id: task?.lead_id ?? defaultLeadId ?? "",
        project_id: task?.project_id ?? "",
      });
      setProjectId(task?.project_id ?? "");
    }
  }, [open, task, defaultLeadId, defaultDueDate, reset]);

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
      const payload = {
        ...values,
        project_id: projectId || null,
      };
      const result = isEdit
        ? await updateTask(task!.id, payload)
        : await createTask(payload);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? dict.tasks.updatedTask : dict.tasks.createdTask);
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-[34rem]">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>
            {isEdit ? dict.tasks.editTask : dict.tasks.newTask}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="fl-dialog-body">
            <div className="fl-form">
              <FormField
                label={`${dict.common.title} *`}
                htmlFor="task-title"
                error={errors.title?.message}
              >
                <Input
                  id="task-title"
                  className="fl-control"
                  {...register("title")}
                />
              </FormField>

              <FormField
                label={dict.common.description}
                htmlFor="task-description"
              >
                <Textarea
                  id="task-description"
                  rows={3}
                  className="fl-control min-h-[88px] resize-y"
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
                    <SelectTrigger className="fl-select-trigger w-full">
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
                    <SelectTrigger className="fl-select-trigger w-full">
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
                <FormField label={dict.common.dueDate} htmlFor="task-due">
                  <Input
                    id="task-due"
                    type="date"
                    className="fl-control"
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
                    <SelectTrigger className="fl-select-trigger w-full">
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
                    <SelectTrigger className="fl-select-trigger w-full">
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
                      setValue("lead_id", v === "none" ? "" : v)
                    }
                  >
                    <SelectTrigger className="fl-select-trigger w-full">
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

          <DialogFooter className="fl-dialog-footer">
            <button
              type="button"
              className="fl-btn sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {dict.common.cancel}
            </button>
            <button
              type="submit"
              className="fl-btn primary sm"
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              ) : null}
              {isEdit ? dict.common.save : dict.tasks.createTask}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
