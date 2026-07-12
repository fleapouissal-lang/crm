"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Building2, CreditCard, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { recordPlatformPayment } from "@/lib/actions/platform-payments";
import {
  CARD_BRANDS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  type CardBrand,
  type PaymentMethod,
  type PaymentStatus,
} from "@/lib/billing/payments";
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
import type { Organization, PlatformInvoice } from "@/types/database";

export function RecordPaymentDialog({
  open,
  onOpenChange,
  companies,
  invoices,
  defaultOrganizationId,
  defaultInvoiceId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Organization[];
  invoices: PlatformInvoice[];
  defaultOrganizationId?: string | null;
  defaultInvoiceId?: string | null;
  onSaved: () => void;
}) {
  const dict = useDict();
  const p = dict.fusion.platformPayments;
  const b = dict.fusion.platformBilling;
  const [organizationId, setOrganizationId] = useState("");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("succeeded");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [cardBrand, setCardBrand] = useState<CardBrand>("visa");
  const [cardLast4, setCardLast4] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const orgInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) =>
          inv.organization_id === organizationId &&
          (inv.status === "pending" || inv.status === "overdue" || inv.status === "draft")
      ),
    [invoices, organizationId]
  );

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === organizationId) ?? null,
    [companies, organizationId]
  );

  useEffect(() => {
    if (!open) return;
    const orgId = defaultOrganizationId ?? companies[0]?.id ?? "";
    setOrganizationId(orgId);
    setInvoiceId(defaultInvoiceId ?? "");
    setStatus("succeeded");
    setMethod("card");
    setCardBrand("visa");
    setCardLast4("");
    setCardHolder("");
    setReference("");
    setNotes("");
    const inv =
      invoices.find((i) => i.id === defaultInvoiceId) ??
      invoices.find(
        (i) =>
          i.organization_id === orgId &&
          (i.status === "pending" || i.status === "overdue")
      );
    setAmount(inv ? String(inv.amount) : "");
    if (inv) setInvoiceId(inv.id);
  }, [open, companies, invoices, defaultOrganizationId, defaultInvoiceId]);

  function handleOrgChange(id: string) {
    setOrganizationId(id);
    const inv = invoices.find(
      (i) =>
        i.organization_id === id &&
        (i.status === "pending" || i.status === "overdue")
    );
    setInvoiceId(inv?.id ?? "");
    setAmount(inv ? String(inv.amount) : "");
  }

  function handleInvoiceChange(id: string) {
    setInvoiceId(id);
    const inv = invoices.find((i) => i.id === id);
    if (inv) setAmount(String(inv.amount));
  }

  function handleSubmit() {
    if (!organizationId) {
      toast.error(b.selectCompany);
      return;
    }
    startTransition(async () => {
      const result = await recordPlatformPayment({
        organizationId,
        invoiceId: invoiceId || null,
        amount: Number(amount) || 0,
        status,
        method,
        cardBrand: method === "card" ? cardBrand : null,
        cardLast4: method === "card" ? cardLast4 : null,
        cardHolder: method === "card" ? cardHolder : null,
        reference,
        notes,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(p.paymentRecorded);
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content fl-dialog-content--lg sm:max-w-xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <Wallet className="size-5" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span>{p.recordPayment}</span>
              <span className="text-xs font-normal fl-faint">{p.recordPaymentSub}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="fl-dialog-body space-y-5">
          <section className="fl-form-section">
            <div className="fl-form-section__head">
              <Building2 className="size-3.5" />
              <h4>{p.paymentTarget}</h4>
            </div>
            <div className="fl-form gap-4">
              <div className="fl-field">
                <label className="fl-field-label">{b.company}</label>
                <Select
                  value={organizationId || undefined}
                  onValueChange={(v) => handleOrgChange(v ?? "")}
                >
                  <SelectTrigger className="fl-select-trigger fl-input w-full">
                    <SelectValue placeholder={b.selectCompany}>
                      {selectedCompany ? (
                        <span className="fl-select-company">
                          {selectedCompany.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedCompany.logo_url}
                              alt=""
                              className="fl-select-company__logo"
                            />
                          ) : (
                            <span className="fl-select-company__fallback">
                              <Building2 className="size-3.5" />
                            </span>
                          )}
                          <span className="fl-select-company__text">
                            <span className="fl-select-company__name">
                              {selectedCompany.name}
                            </span>
                          </span>
                        </span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel">
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id} label={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="fl-field">
                <label className="fl-field-label">{p.linkedInvoice}</label>
                <Select
                  value={invoiceId || "none"}
                  onValueChange={(v) =>
                    handleInvoiceChange(v === "none" || !v ? "" : v)
                  }
                >
                  <SelectTrigger className="fl-select-trigger fl-input w-full">
                    <SelectValue>
                      {invoiceId
                        ? orgInvoices.find((i) => i.id === invoiceId)?.number ??
                          invoices.find((i) => i.id === invoiceId)?.number
                        : p.noInvoice}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel">
                    <SelectItem value="none" label={p.noInvoice}>
                      {p.noInvoice}
                    </SelectItem>
                    {orgInvoices.map((inv) => (
                      <SelectItem key={inv.id} value={inv.id} label={inv.number}>
                        {inv.number} · €{Number(inv.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            </div>
          </section>

          <section className="fl-form-section">
            <div className="fl-form-section__head">
              <CreditCard className="size-3.5" />
              <h4>{p.paymentMethod}</h4>
            </div>
            <div className="fl-form gap-4">
              <div className="fl-form-row">
                <div className="fl-field">
                  <label className="fl-field-label">{p.method}</label>
                  <Select
                    value={method}
                    onValueChange={(v) => setMethod((v as PaymentMethod) ?? "card")}
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
                      <SelectValue>{p.methods[method]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel">
                      {PAYMENT_METHODS.map((key) => (
                        <SelectItem key={key} value={key} label={p.methods[key]}>
                          {p.methods[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="fl-field">
                  <label className="fl-field-label">{b.status}</label>
                  <Select
                    value={status}
                    onValueChange={(v) =>
                      setStatus((v as PaymentStatus) ?? "succeeded")
                    }
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
                      <SelectValue>{p.statuses[status]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel">
                      {PAYMENT_STATUSES.map((key) => (
                        <SelectItem key={key} value={key} label={p.statuses[key]}>
                          {p.statuses[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {method === "card" ? (
                <>
                  <div className="fl-field">
                    <label className="fl-field-label">{p.cardBrand}</label>
                    <Select
                      value={cardBrand}
                      onValueChange={(v) =>
                        setCardBrand((v as CardBrand) ?? "visa")
                      }
                    >
                      <SelectTrigger className="fl-select-trigger fl-input w-full">
                        <SelectValue>{p.cardBrands[cardBrand]}</SelectValue>
                      </SelectTrigger>
                      <SelectContent className="fl-select-panel">
                        {CARD_BRANDS.map((key) => (
                          <SelectItem
                            key={key}
                            value={key}
                            label={p.cardBrands[key]}
                          >
                            {p.cardBrands[key]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="fl-form-row">
                    <div className="fl-field">
                      <label className="fl-field-label">{p.cardLast4}</label>
                      <Input
                        value={cardLast4}
                        onChange={(e) =>
                          setCardLast4(e.target.value.replace(/\D/g, "").slice(0, 4))
                        }
                        className="fl-input"
                        placeholder="4242"
                        maxLength={4}
                        inputMode="numeric"
                      />
                    </div>
                    <div className="fl-field">
                      <label className="fl-field-label">{p.cardHolder}</label>
                      <Input
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        className="fl-input"
                        placeholder="Youssef Kaab"
                      />
                    </div>
                  </div>
                  <small className="fl-field-hint">{p.cardSecurityHint}</small>
                </>
              ) : null}

              <div className="fl-field">
                <label className="fl-field-label">{p.reference}</label>
                <Input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="fl-input"
                  placeholder="AUTH-88291"
                />
              </div>
              <div className="fl-field">
                <label className="fl-field-label">{b.notes}</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="fl-input min-h-[72px]"
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="fl-dialog-footer">
          <button
            type="button"
            className="fl-btn ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn primary"
            onClick={handleSubmit}
            disabled={pending || !organizationId}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Wallet className="size-4" />}
            {p.recordPayment}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
