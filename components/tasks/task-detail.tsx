"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import type { Lead, Profile, Task } from "@/types/database";
import { canDeleteTaskForProfile, canModifyTask } from "@/lib/permissions";
import { deleteTask } from "@/lib/actions/tasks";
import { TaskFormDialog } from "@/components/tasks/task-form";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDict } from "@/components/shared/i18n-provider";

export function TaskDetailClient({
  task,
  profiles,
  leads,
  profile,
}: {
  task: Task;
  profiles: Profile[];
  leads: Lead[];
  profile: Profile;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dict = useDict();
  const c = dict.common;
  const td = dict.tasks;
  const today = new Date().toISOString().slice(0, 10);
  const overdue =
    !!task.due_date &&
    task.due_date < today &&
    task.status !== "done" &&
    task.status !== "cancelled";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/tasks"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
          >
            <ArrowLeft className="mr-1 size-4" />
            {td.backToTasks}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canModifyTask(profile, task) && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 size-4" />
              {c.edit}
            </Button>
          )}
          {canDeleteTaskForProfile(profile, task) && (
            <ConfirmDialog
              trigger={
                <Button variant="destructive" disabled={pending}>
                  <Trash2 className="mr-2 size-4" />
                  {c.delete}
                </Button>
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
          )}
        </div>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{c.details}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{c.description}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">
              {task.description || td.noDescription}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{c.dueDate}</p>
              <p
                className={
                  overdue
                    ? "mt-1 text-sm font-medium text-destructive"
                    : "mt-1 text-sm"
                }
              >
                {task.due_date
                  ? format(new Date(task.due_date + "T00:00:00"), "PPP")
                  : c.noDueDate}
                {overdue && ` (${c.overdue})`}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{c.assignee}</p>
              {task.assigned_profile ? (
                <div className="mt-2 flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">
                      {(task.assigned_profile.full_name ?? "?")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{task.assigned_profile.full_name}</span>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{c.unassigned}</p>
              )}
            </div>
            {task.lead && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">{c.linkedLead}</p>
                <Link
                  href={`/leads/${task.lead.id}`}
                  className="mt-1 block text-sm text-primary hover:underline"
                >
                  {task.lead.title}
                </Link>
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-muted-foreground">{c.created}</p>
              <p className="mt-1 text-sm">
                {format(new Date(task.created_at), "MMM d, yyyy")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <TaskFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
        profiles={profiles}
        leads={leads}
      />
    </div>
  );
}
