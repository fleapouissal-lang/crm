"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  createPlatformInvoice,
  updatePlatformInvoice,
} from "@/lib/actions/platform-billing";
import { PLAN_KEYS, type PlanKey } from "@/lib/billing/plans";
import {
  PLATFORM_INVOICE_STATUSES,
  planAmount,
} from "@/lib/billing/platform-docs";
import { useDict } from "@/components/shared/i18n-provider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import type {
  Organization,
  PlatformInvoice,
  PlatformInvoiceStatus,
} from "@/types/database";

export function PlatformInvoiceDialog({
  open,
  onOpenChange,
  companies,
  invoice,
  defaultOrganizationId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Organization[];
  invoice: PlatformInvoice | null;
  defaultOrganizationId?: string | null;
  onSaved: () => void;
}) {
  const dict = useDict();
  const b = dict.fusion.platformBilling;
  const s = dict.fusion.settings;
  const [organizationId, setOrganizationId] = useState("");
  const [plan, setPlan] = useState<PlanKey>("business");
  const [amount, setAmount] = useState(String(planAmount("business")));
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<PlatformInvoiceStatus>("pending");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (invoice) {
      setOrganizationId(invoice.organization_id);
      setPlan(invoice.plan);
      setAmount(String(invoice.amount));
      setDueDate(invoice.due_date?.slice(0, 10) ?? "");
      setStatus(invoice.status);
      setNotes(invoice.notes ?? "");
    } else {
      const due = new Date();
      due.setDate(due.getDate() + 15);
      setOrganizationId(defaultOrganizationId ?? companies[0]?.id ?? "");
      setPlan("business");
      setAmount(String(planAmount("business")));
      setDueDate(due.toISOString().slice(0, 10));
      setStatus("pending");
      setNotes("");
    }
  }, [open, invoice, companies, defaultOrganizationId]);

  function handlePlanChange(next: PlanKey) {
    setPlan(next);
    setAmount(String(planAmount(next)));
  }

  function handleSubmit() {
    if (!organizationId) {
      toast.error(b.selectCompany);
      return;
    }
    startTransition(async () => {
      const payload = {
        organizationId,
        plan,
        amount: Number(amount) || 0,
        dueDate: dueDate || null,
        status,
        notes,
      };
      const result = invoice
        ? await updatePlatformInvoice({ id: invoice.id, ...payload })
        : await createPlatformInvoice({ ...payload, billingReason: "manual" });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(invoice ? b.invoiceUpdated : b.invoiceCreated);
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content sm:max-w-md">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-4" />
            {invoice ? b.editInvoice : b.newInvoice}
          </DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          <div className="fl-field">
            <label className="fl-field-label">{b.company}</label>
            <Select
              value={organizationId}
              onValueChange={(v) => setOrganizationId(v ?? "")}
            >
              <SelectTrigger className="fl-input w-full">
                <SelectValue placeholder={b.selectCompany} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="fl-field">
            <label className="fl-field-label">{s.plan}</label>
            <Select value={plan} onValueChange={(v) => handlePlanChange(v as PlanKey)}>
              <SelectTrigger className="fl-input w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLAN_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {s.plans[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="fl-field">
              <label className="fl-field-label">{b.amount}</label>
              <Input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="fl-input"
              />
            </div>
            <div className="fl-field">
              <label className="fl-field-label">{b.dueDate}</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="fl-input"
              />
            </div>
          </div>
          <div className="fl-field">
            <label className="fl-field-label">{b.status}</label>
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as PlatformInvoiceStatus)}
            >
              <SelectTrigger className="fl-input w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_INVOICE_STATUSES.map((key) => (
                  <SelectItem key={key} value={key}>
                    {b.invoiceStatuses[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="fl-field">
            <label className="fl-field-label">{b.notes}</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="fl-input min-h-[80px]"
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
