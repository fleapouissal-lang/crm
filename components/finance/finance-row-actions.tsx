"use client";

import { useState } from "react";
import { Eye, Pencil, Receipt, Trash2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { RowActionsMenu, type RowActionItem } from "@/components/shared/row-actions-menu";

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
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={f.deleteTitle}
        description={
          <>
            {f.deleteConfirm.split("{{name}}")[0]}
            <strong className="fl-delete-dialog__name">{label}</strong>
            {f.deleteConfirm.split("{{name}}")[1] ?? ""}
          </>
        }
        onConfirm={onDelete}
      />
    </>
  );
}
