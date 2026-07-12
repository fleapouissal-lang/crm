"use client";

import { useEffect, useState, useTransition } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateOrganizationSubscription } from "@/lib/actions/organizations";
import {
  PLAN_KEYS,
  PLAN_PRICES_EUR,
  SUBSCRIPTION_STATUSES,
  defaultTrialEndsAt,
  type PlanKey,
  type SubscriptionStatus,
} from "@/lib/billing/plans";
import { useDict } from "@/components/shared/i18n-provider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Organization } from "@/types/database";

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

function fromDateInput(value: string): string | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00.000Z`).toISOString();
}

export function EditSubscriptionDialog({
  company,
  open,
  onOpenChange,
  onSaved,
}: {
  company: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const [plan, setPlan] = useState<PlanKey>("free");
  const [status, setStatus] = useState<SubscriptionStatus>("active");
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (company && open) {
      setPlan(company.plan ?? "free");
      setStatus(company.subscription_status ?? "active");
      setTrialEndsAt(toDateInput(company.trial_ends_at));
      setPeriodEnd(toDateInput(company.current_period_end));
    }
  }, [company, open]);

  function handlePlanChange(next: PlanKey) {
    setPlan(next);
    if (next !== "free" && status === "active" && !trialEndsAt) {
      setStatus("trialing");
      setTrialEndsAt(toDateInput(defaultTrialEndsAt()));
    }
    if (next === "free") {
      setStatus("active");
      setTrialEndsAt("");
    }
  }

  function handleSubmit() {
    if (!company) return;
    startTransition(async () => {
      const result = await updateOrganizationSubscription({
        organizationId: company.id,
        plan,
        subscriptionStatus: status,
        trialEndsAt: fromDateInput(trialEndsAt),
        currentPeriodEnd: fromDateInput(periodEnd),
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        plan !== "free" && plan !== (company.plan ?? "free")
          ? `${s.subscriptionUpdated} · ${dict.fusion.platformBilling.invoiceCreated}`
          : s.subscriptionUpdated
      );
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content sm:max-w-md">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="size-4" />
            {s.editSubscription}
          </DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          {company ? (
            <p className="text-sm fl-muted">
              <span className="font-medium text-[var(--text)]">{company.name}</span>
              {company.email_domain ? ` · @${company.email_domain}` : null}
            </p>
          ) : null}

          <div className="fl-field">
            <label className="fl-field-label">{s.plan}</label>
            <Select value={plan} onValueChange={(v) => handlePlanChange(v as PlanKey)}>
              <SelectTrigger className="fl-input w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {s.plans[key]} · €{PLAN_PRICES_EUR[key]}
                    {key === "free" ? ` ${s.perMonthFree}` : `/${s.perMonthShort}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="fl-field">
            <label className="fl-field-label">{s.subscriptionStatus}</label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as SubscriptionStatus)}
            >
              <SelectTrigger className="fl-input w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBSCRIPTION_STATUSES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {s.subscriptionStatuses[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="fl-field">
            <label className="fl-field-label">{s.trialEndsAt}</label>
            <Input
              type="date"
              value={trialEndsAt}
              onChange={(e) => setTrialEndsAt(e.target.value)}
              className="fl-input"
            />
          </div>

          <div className="fl-field">
            <label className="fl-field-label">{s.currentPeriodEnd}</label>
            <Input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="fl-input"
            />
          </div>
        </div>
        <DialogFooter className="fl-dialog-footer">
          <button
            type="button"
            className="fl-btn sm ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn primary sm"
            onClick={handleSubmit}
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {dict.common.save}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
