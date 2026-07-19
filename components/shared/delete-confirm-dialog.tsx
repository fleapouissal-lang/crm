"use client";

import { useTransition, type ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
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

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const dict = useDict();
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="fl-delete-dialog ring-0">
        <AlertDialogHeader className="fl-delete-dialog__header">
          <div className="fl-delete-dialog__icon" aria-hidden>
            <Trash2 className="size-5" strokeWidth={2} />
          </div>
          <div className="fl-delete-dialog__copy">
            <AlertDialogTitle className="fl-delete-dialog__title">
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription className="fl-delete-dialog__desc">
              {description}
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="fl-delete-dialog__footer">
          <AlertDialogCancel
            className="fl-btn sm ghost"
            disabled={pending}
          >
            {dict.common.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            className="fl-btn sm destructive"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                await onConfirm();
                onOpenChange(false);
              });
            }}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" strokeWidth={2} />
            )}
            {confirmLabel ?? dict.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
