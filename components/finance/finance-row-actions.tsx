"use client";

import { useState, useTransition } from "react";
import { Eye, Pencil, Receipt, Trash2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { RowActionsMenu, type RowActionItem } from "@/components/shared/row-actions-menu";
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

export function FinanceRowActions({
  label,
  onView,
  onEdit,
  onDelete,
  onConvert,
  convertLabel,
  viewLoading,
}: {
  label: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onConvert?: () => void;
  convertLabel?: string;
  viewLoading?: boolean;
}) {
  const dict = useDict();
  const f = dict.fusion.financeDocs;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const actions: RowActionItem[] = [
    {
      label: dict.common.viewDetails,
      icon: <Eye className="size-4" />,
      onClick: onView,
      disabled: viewLoading,
    },
    {
      label: dict.common.edit,
      icon: <Pencil className="size-4" />,
      onClick: onEdit,
    },
    ...(onConvert
      ? [
          {
            label: convertLabel ?? dict.fusion.quotes.convertToInvoice,
            icon: <Receipt className="size-4" />,
            onClick: onConvert,
          } satisfies RowActionItem,
        ]
      : []),
    { separator: true },
    {
      label: dict.common.delete,
      icon: <Trash2 className="size-4" />,
      destructive: true,
      onClick: () => setDeleteOpen(true),
    },
  ];

  return (
    <>
      <RowActionsMenu actions={actions} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="fl-dialog-content ring-0">
          <AlertDialogHeader>
            <AlertDialogTitle>{f.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {f.deleteConfirm.replace("{{name}}", label)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="fl-btn sm">{dict.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="fl-btn sm destructive"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  onDelete();
                  setDeleteOpen(false);
                })
              }
            >
              {dict.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
