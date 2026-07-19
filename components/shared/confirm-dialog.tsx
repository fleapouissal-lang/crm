"use client";

import { useState, useTransition, cloneElement } from "react";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
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

interface ConfirmDialogProps {
  trigger: React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  variant?: "destructive" | "default";
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  variant = "destructive",
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      {cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          trigger.props.onClick?.(e);
          setOpen(true);
        },
      })}
      {variant === "destructive" ? (
        <DeleteConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          onConfirm={onConfirm}
        />
      ) : (
        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent className="fl-dialog-content ring-0">
            <AlertDialogHeader>
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription>{description}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="fl-btn sm ghost" disabled={pending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="fl-btn sm primary"
                disabled={pending}
                onClick={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    await onConfirm();
                    setOpen(false);
                  });
                }}
              >
                {pending ? "Working…" : confirmLabel}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
