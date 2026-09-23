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
  Bot,
  ExternalLink,
  Pencil,
  Trash2,
  Plus,
  Search,
  Loader2,
} from "lucide-react";
import type { Lead, Profile, Role, Task } from "@/types/database";
import { canDeleteLead } from "@/lib/permissions";
import { deleteLead } from "@/lib/actions/leads";
import { researchLeadNow } from "@/lib/actions/sales-agent";
import { LeadFormDialog } from "@/components/leads/lead-form";
import { LeadConversationPanel } from "@/components/leads/lead-conversation-panel";
import { SalesStatusBadge, TaskStatusBadge, TaskPriorityBadge } from "@/components/shared/status-badge";
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
    currency: "MAD",
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
            <span className="fl-badge b-blue">{lead.sales_project}</span>
            {lead.ai_score != null ? (
              <span className="fl-badge b-iris">Score {lead.ai_score}/100</span>
            ) : null}
            <SalesStatusBadge status={lead.sales_status} fallbackStage={lead.stage} />
          </div>
          {lead.company && (
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="size-4" />
              {lead.company}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await researchLeadNow(lead.id);
                if (!result.success) {
                  toast.error(result.error);
                  return;
                }
                toast.success(
                  result.data.notes ? "Recherche mise à jour" : "Aucune info trouvée"
                );
                router.refresh();
              })
            }
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Search className="mr-2 size-4" />
            )}
            Recherche IA
          </Button>
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

      <LeadConversationPanel
        leadId={lead.id}
        canControl={role === "admin" || role === "manager"}
      />

      {(lead.ai_summary ||
        (lead.memory_facts && Object.keys(lead.memory_facts).length > 0) ||
        lead.client) && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-primary" />
              Mémoire IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.client ? (
              <div className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <p className="text-xs font-medium text-muted-foreground">Client CRM lié</p>
                <p className="mt-1 font-medium">
                  {lead.client.name}
                  {lead.client.status_key ? ` · ${lead.client.status_key}` : ""}
                </p>
                {(lead.client.location || lead.client.engagement) && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[lead.client.location, lead.client.engagement].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            ) : null}
            {lead.ai_summary ? (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Mémo</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{lead.ai_summary}</p>
              </div>
            ) : null}
            {lead.memory_facts && Object.keys(lead.memory_facts).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(lead.memory_facts).map(([key, value]) => (
                  <span
                    key={key}
                    className="rounded-full border bg-background px-2.5 py-1 text-xs"
                  >
                    <span className="text-muted-foreground">{key}:</span> {value}
                  </span>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {lead.research_notes ? (
        <Card className="border-primary/20 bg-primary/[0.025] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4 text-primary" />
              Recherche IA sur le prospect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="whitespace-pre-wrap text-sm leading-6">{lead.research_notes}</p>
            {Array.isArray(lead.research_sources) && lead.research_sources.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {lead.research_sources.map((source, index) => (
                  <a
                    key={`${source}-${index}`}
                    href={source}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Source {index + 1}
                    <ExternalLink className="size-3" />
                  </a>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

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
              {lead.stage === "contacted" && lead.last_contact_method ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{ld.contactMethod}</p>
                  <p className="mt-1 text-sm font-medium">
                    {lead.last_contact_method === "phone"
                      ? ld.contactByPhone
                      : lead.last_contact_method === "email"
                        ? ld.contactByEmail
                        : ld.contactByVisit}
                  </p>
                </div>
              ) : null}
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
            href={`/tasks/new`}
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
