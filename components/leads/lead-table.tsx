"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Pencil, Trash2 } from "lucide-react";
import type { Lead, Profile, Role } from "@/types/database";
import { LeadStageBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/page-header";
import { RowActionsMenu, type RowActionItem } from "@/components/shared/row-actions-menu";
import { LeadFormDialog } from "@/components/leads/lead-form";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getIntlLocale } from "@/lib/i18n/locale-utils";
import { deleteLead } from "@/lib/actions/leads";
import { canDeleteLead } from "@/lib/permissions";
import { Users } from "lucide-react";
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

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(getIntlLocale(locale as import("@/lib/i18n/types").Locale), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function LeadRowActions({
  lead,
  role,
  onEdit,
}: {
  lead: Lead;
  role: Role;
  onEdit: () => void;
}) {
  const dict = useDict();
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const actions: RowActionItem[] = [
    {
      label: dict.common.viewDetails,
      icon: <Eye className="size-4" />,
      onClick: () => router.push(`/leads/${lead.id}`),
    },
    {
      label: dict.common.edit,
      icon: <Pencil className="size-4" />,
      onClick: onEdit,
    },
    ...(canDeleteLead(role)
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
            <AlertDialogTitle>{dict.leads.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.leads.deleteDescription.replace("{title}", lead.title)}
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
                  const result = await deleteLead(lead.id);
                  if (!result.success) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(dict.leads.deletedLead);
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

export function LeadTable({
  leads,
  profiles,
  role,
}: {
  leads: Lead[];
  profiles: Profile[];
  role: Role;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const [editLead, setEditLead] = useState<Lead | null>(null);

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title={dict.leads.noLeadsFound}
        description={dict.leads.noLeadsHint}
      />
    );
  }

  return (
    <>
      <div className="fl-card fl-tbl-wrap">
        <div className="hidden md:block">
          <table className="fl-tbl">
            <thead>
              <tr>
                <th>{dict.common.title}</th>
                <th>{dict.common.contact}</th>
                <th>{dict.common.stage}</th>
                <th>{dict.common.assignee}</th>
                <th>{dict.common.value}</th>
                <th aria-label={dict.common.moreActions} />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link href={`/leads/${lead.id}`} className="font-medium hover:underline">
                      {lead.title}
                    </Link>
                    {lead.company && (
                      <p className="fl-faint text-[11.5px]">{lead.company}</p>
                    )}
                  </td>
                  <td>
                    <div className="text-sm">{lead.contact_name ?? "—"}</div>
                    {lead.email && (
                      <div className="fl-faint text-xs">{lead.email}</div>
                    )}
                  </td>
                  <td>
                    <LeadStageBadge stage={lead.stage} />
                  </td>
                  <td>
                    {lead.assigned_profile ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="fl-ava sm"
                          style={{ background: "var(--grad-fusion)" }}
                        >
                          {(lead.assigned_profile.full_name ?? "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <span className="text-sm">{lead.assigned_profile.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm fl-faint">—</span>
                    )}
                  </td>
                  <td className="fl-mono">
                    {formatCurrency(Number(lead.value), locale)}
                  </td>
                  <td className="w-10">
                    <LeadRowActions
                      lead={lead}
                      role={role}
                      onEdit={() => setEditLead(lead)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="divide-y divide-[var(--border)] md:hidden">
          {leads.map((lead) => (
            <li key={lead.id} className="flex items-start gap-2 p-4">
              <Link href={`/leads/${lead.id}`} className="block min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{lead.title}</p>
                    {lead.company && (
                      <p className="fl-faint text-xs">{lead.company}</p>
                    )}
                  </div>
                  <LeadStageBadge stage={lead.stage} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="fl-muted">
                    {lead.contact_name ?? dict.leads.noContact}
                  </span>
                  <span className="fl-mono font-medium">
                    {formatCurrency(Number(lead.value), locale)}
                  </span>
                </div>
              </Link>
              <LeadRowActions
                lead={lead}
                role={role}
                onEdit={() => setEditLead(lead)}
              />
            </li>
          ))}
        </ul>
      </div>

      <LeadFormDialog
        open={!!editLead}
        onOpenChange={(open) => {
          if (!open) setEditLead(null);
        }}
        lead={editLead ?? undefined}
        profiles={profiles}
      />
    </>
  );
}
