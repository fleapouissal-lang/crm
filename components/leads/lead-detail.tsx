"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import type { Lead, Profile, Role, Task } from "@/types/database";
import { canDeleteLead } from "@/lib/permissions";
import { deleteLead } from "@/lib/actions/leads";
import { LeadFormDialog } from "@/components/leads/lead-form";
import { LeadStageBadge, TaskStatusBadge, TaskPriorityBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useDict } from "@/components/shared/i18n-provider";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function LeadDetailClient({
  lead,
  tasks,
  profiles,
  role,
}: {
  lead: Lead;
  tasks: Task[];
  profiles: Profile[];
  role: Role;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const dict = useDict();
  const c = dict.common;
  const ld = dict.leads;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/leads"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
          >
            <ArrowLeft className="mr-1 size-4" />
            {ld.backToLeads}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{lead.title}</h1>
            <LeadStageBadge stage={lead.stage} />
          </div>
          {lead.company && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="size-4" />
              {lead.company}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 size-4" />
            {c.edit}
          </Button>
          {canDeleteLead(role) && (
            <ConfirmDialog
              trigger={
                <Button variant="destructive" disabled={pending}>
                  <Trash2 className="mr-2 size-4" />
                  {c.delete}
                </Button>
              }
              title={ld.deleteTitle}
              description={ld.deleteDescription.replace("{title}", lead.title)}
              confirmLabel={c.delete}
              onConfirm={async () => {
                startTransition(async () => {
                  const result = await deleteLead(lead.id);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(ld.deletedLead);
                  router.push("/leads");
                });
              }}
            />
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{c.details}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{c.contact}</p>
                <p className="mt-1 text-sm">{lead.contact_name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">{c.value}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {formatCurrency(Number(lead.value))}
                </p>
              </div>
              {lead.email && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{c.email}</p>
                  <a
                    href={`mailto:${lead.email}`}
                    className="mt-1 flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <Mail className="size-3.5" />
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.phone && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{c.phone}</p>
                  <a
                    href={`tel:${lead.phone}`}
                    className="mt-1 flex items-center gap-1.5 text-sm hover:underline"
                  >
                    <Phone className="size-3.5" />
                    {lead.phone}
                  </a>
                </div>
              )}
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground">{c.notes}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">
                {lead.notes || ld.noNotes}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{c.meta}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{c.assignee}</p>
              {lead.assigned_profile ? (
                <div className="mt-2 flex items-center gap-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="text-xs">
                      {(lead.assigned_profile.full_name ?? "?")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{lead.assigned_profile.full_name}</span>
                </div>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">{c.unassigned}</p>
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{c.created}</p>
              <p className="mt-1 text-sm">
                {format(new Date(lead.created_at), "MMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{c.updated}</p>
              <p className="mt-1 text-sm">
                {format(new Date(lead.updated_at), "MMM d, yyyy")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{ld.linkedTasks}</CardTitle>
          <Link
            href={`/tasks?lead_id=${lead.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Plus className="mr-1 size-3.5" />
            {ld.addTask}
          </Link>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {ld.noLinkedTasks}
            </p>
          ) : (
            <ul className="divide-y">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {task.title}
                    </Link>
                    {task.due_date && (
                      <p className="text-xs text-muted-foreground">
                        {c.due} {format(new Date(task.due_date + "T00:00:00"), "MMM d")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <TaskPriorityBadge priority={task.priority} />
                    <TaskStatusBadge status={task.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <LeadFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        lead={lead}
        profiles={profiles}
      />
    </div>
  );
}
