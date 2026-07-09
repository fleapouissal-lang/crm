"use client";

import { useState, useTransition } from "react";
import { Building2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createOrganizationWithDirector } from "@/lib/actions/organizations";
import { useDict } from "@/components/shared/i18n-provider";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreateCompanyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const [organizationName, setOrganizationName] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [directorPassword, setDirectorPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function reset() {
    setOrganizationName("");
    setEmailDomain("");
    setDirectorName("");
    setDirectorEmail("");
    setDirectorPassword("");
  }

  function handleSubmit() {
    startTransition(async () => {
      const result = await createOrganizationWithDirector({
        organizationName,
        emailDomain,
        directorName,
        directorEmail,
        directorPassword,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(s.companyCreated);
      reset();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-4" />
            {s.createCompany}
          </DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          <div className="fl-field">
            <label className="fl-field-label">{s.companyName}</label>
            <Input
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="fl-input"
              placeholder="Fusion Leap"
            />
          </div>
          <div className="fl-field">
            <label className="fl-field-label">{s.emailDomain}</label>
            <Input
              value={emailDomain}
              onChange={(e) => setEmailDomain(e.target.value.replace(/^@+/, ""))}
              className="fl-input"
              placeholder="fusionleap.com"
            />
            <small className="mt-1 block text-xs fl-faint">{s.emailDomainHint}</small>
          </div>
          <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-4">
            <p className="text-sm font-medium">{s.directorAccount}</p>
            <div className="fl-field">
              <label className="fl-field-label">{s.fullName}</label>
              <Input
                value={directorName}
                onChange={(e) => setDirectorName(e.target.value)}
                className="fl-input"
              />
            </div>
            <div className="fl-field">
              <label className="fl-field-label">{dict.common.email}</label>
              <Input
                type="email"
                value={directorEmail}
                onChange={(e) => setDirectorEmail(e.target.value)}
                className="fl-input"
                placeholder="directeur@fusionleap.com"
              />
            </div>
            <div className="fl-field">
              <label className="fl-field-label">{dict.common.password}</label>
              <Input
                type="password"
                value={directorPassword}
                onChange={(e) => setDirectorPassword(e.target.value)}
                className="fl-input"
                minLength={6}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="fl-dialog-footer">
          <button type="button" className="fl-btn sm ghost" onClick={() => onOpenChange(false)}>
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn sm primary"
            disabled={
              pending ||
              !organizationName.trim() ||
              !emailDomain.trim() ||
              !directorName.trim() ||
              !directorEmail.trim() ||
              !directorPassword
            }
            onClick={handleSubmit}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            {s.createCompany}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
