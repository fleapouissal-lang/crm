"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { updateTeamMemberPassword } from "@/lib/actions/organizations";
import { useDict } from "@/components/shared/i18n-provider";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function TeamMemberPasswordDialog({
  open,
  onOpenChange,
  memberId,
  memberName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string | null;
  memberName: string;
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirm("");
    }
  }, [open]);

  function handleSave() {
    if (!memberId) return;
    if (password.length < 6) {
      toast.error(dict.auth.errors.passwordMin);
      return;
    }
    if (password !== confirm) {
      toast.error(s.passwordMismatch);
      return;
    }

    startTransition(async () => {
      const result = await updateTeamMemberPassword({
        memberId,
        password,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(s.memberPasswordUpdated);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" strokeWidth={2} />
            {s.resetMemberPasswordTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm fl-muted">
            {s.resetMemberPasswordHint.replace("{name}", memberName)}
          </p>
          <div className="fl-field">
            <label className="fl-field-label" htmlFor="team-new-password">
              {s.newPassword}
            </label>
            <PasswordInput
              id="team-new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputClassName="fl-input"
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          <div className="fl-field">
            <label className="fl-field-label" htmlFor="team-confirm-password">
              {s.confirmPassword}
            </label>
            <PasswordInput
              id="team-confirm-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              inputClassName="fl-input"
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </div>
        <DialogFooter className="fl-dialog-footer">
          <button
            type="button"
            className="fl-btn sm ghost"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn sm primary"
            disabled={pending || !memberId}
            onClick={handleSave}
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <KeyRound className="size-3.5" strokeWidth={2} />
            )}
            {pending ? dict.common.working : s.savePassword}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
