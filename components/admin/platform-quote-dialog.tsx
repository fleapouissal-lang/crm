"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Building2,
  CalendarDays,
  Eye,
  FileText,
  Loader2,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  createPlatformQuote,
  updatePlatformQuote,
} from "@/lib/actions/platform-billing";
import { PLAN_KEYS, PLAN_PRICES_EUR, type PlanKey } from "@/lib/billing/plans";
import {
  PLATFORM_DEFAULT_CURRENCY,
  resolvePlatformCurrency,
} from "@/lib/billing/currency";
import {
  PLATFORM_QUOTE_STATUSES,
  formatPlatformMoney,
  planAmount,
} from "@/lib/billing/platform-docs";
import { loadPreferences } from "@/lib/settings/storage";
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
import type { Organization, PlatformQuote, PlatformQuoteStatus } from "@/types/database";
import { cn } from "@/lib/utils";

function validUntilIso(validityDays: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + Math.max(1, validityDays));
  return d.toISOString().slice(0, 10);
}

export function PlatformQuoteDialog({
  open,
  onOpenChange,
  companies,
  quote,
  defaultOrganizationId,
  onSaved,
  onPreviewPdf,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Organization[];
  quote: PlatformQuote | null;
  defaultOrganizationId?: string | null;
  onSaved: () => void;
  onPreviewPdf?: (quote: PlatformQuote) => void;
}) {
  const dict = useDict();
  const b = dict.fusion.platformBilling;
  const s = dict.fusion.settings;
  const [organizationId, setOrganizationId] = useState("");
  const [plan, setPlan] = useState<PlanKey>("business");
  const [amount, setAmount] = useState(String(planAmount("business")));
  const [validityDays, setValidityDays] = useState("30");
  const [status, setStatus] = useState<PlatformQuoteStatus>("draft");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState(PLATFORM_DEFAULT_CURRENCY);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const preferred = loadPreferences().currency;
    if (quote) {
      setOrganizationId(quote.organization_id);
      setPlan(quote.plan);
      setAmount(String(quote.amount));
      setValidityDays(String(quote.validity_days));
      setStatus(quote.status);
      setNotes(quote.notes ?? "");
      setCurrency(resolvePlatformCurrency(quote.currency, preferred));
    } else {
      setOrganizationId(defaultOrganizationId ?? companies[0]?.id ?? "");
      setPlan("business");
      setAmount(String(planAmount("business")));
      setValidityDays("30");
      setStatus("draft");
      setNotes("");
      setCurrency(preferred);
    }
  }, [open, quote, companies, defaultOrganizationId]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === organizationId) ?? null,
    [companies, organizationId]
  );

  const validityNum = Math.max(1, Number(validityDays) || 30);
  const amountNum = Number(amount) || 0;
  const untilDate = useMemo(() => {
    const from = quote ? new Date(quote.created_at) : new Date();
    return validUntilIso(validityNum, from);
  }, [quote, validityNum]);

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
        amount: amountNum,
        validityDays: validityNum,
        status,
        notes,
        currency,
      };
      const result = quote
        ? await updatePlatformQuote({ id: quote.id, ...payload })
        : await createPlatformQuote(payload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(quote ? b.quoteUpdated : b.quoteCreated);
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content fl-dialog-content--lg max-h-[92vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#111114] text-white">
              <FileText className="size-5" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span>{quote ? b.editQuote : b.newQuote}</span>
              <span className="truncate text-xs font-normal fl-faint">
                {quote ? (
                  <span className="fl-mono">{quote.number}</span>
                ) : (
                  b.quoteFormSub
                )}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="fl-dialog-body max-h-[min(70vh,640px)] space-y-5 overflow-y-auto">
          <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-3 sm:grid-cols-3">
            <div>
              <div className="k-label">{b.company}</div>
              <div className="mt-1 truncate text-sm font-semibold">
                {selectedCompany?.name ?? "—"}
              </div>
            </div>
            <div>
              <div className="k-label">{s.plan}</div>
              <div className="mt-1 text-sm font-semibold">{s.plans[plan]}</div>
            </div>
            <div>
              <div className="k-label">{b.amount}</div>
              <div className="mt-1 fl-mono text-sm font-semibold">
                {formatPlatformMoney(amountNum, currency)}
              </div>
              <div className="mt-0.5 text-[11px] fl-faint">
                {b.validUntil}: {untilDate}
              </div>
            </div>
          </div>

          <section className="fl-form-section">
            <div className="fl-form-section__head">
              <Building2 className="size-3.5" />
              <h4>{b.quoteRecipient}</h4>
            </div>
            <div className="fl-field">
              <label className="fl-field-label">{b.company}</label>
              <Select
                value={organizationId || undefined}
                onValueChange={(v) => setOrganizationId(v ?? "")}
                disabled={Boolean(quote)}
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
                          {selectedCompany.email_domain ? (
                            <span className="fl-select-company__domain">
                              @{selectedCompany.email_domain}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    ) : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel">
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id} label={c.name}>
                      <span className="fl-select-company">
                        {c.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.logo_url}
                            alt=""
                            className="fl-select-company__logo"
                          />
                        ) : (
                          <span className="fl-select-company__fallback">
                            <Building2 className="size-3.5" />
                          </span>
                        )}
                        <span className="fl-select-company__text">
                          <span className="fl-select-company__name">{c.name}</span>
                          {c.email_domain ? (
                            <span className="fl-select-company__domain">
                              @{c.email_domain}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCompany ? (
                <small className="fl-field-hint">
                  {b.quoteForCompany.replace("{{name}}", selectedCompany.name)}
                </small>
              ) : null}
            </div>
          </section>

          <section className="fl-form-section">
            <div className="fl-form-section__head">
              <Wallet className="size-3.5" />
              <h4>{b.quoteOffer}</h4>
            </div>
            <div className="fl-form gap-4">
              <div className="fl-field">
                <label className="fl-field-label">{s.plan}</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PLAN_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        "rounded-xl border px-2.5 py-2.5 text-left transition-colors",
                        plan === key
                          ? "border-[var(--iris-2)] bg-[color-mix(in_oklch,var(--iris),transparent_90%)]"
                          : "border-[var(--border)] bg-[var(--glass-solid)] hover:border-[var(--border-hi)]"
                      )}
                      onClick={() => handlePlanChange(key)}
                    >
                      <div className="text-[12px] font-semibold">{s.plans[key]}</div>
                      <div className="mt-0.5 fl-mono text-[11px] fl-faint">
                        {PLAN_PRICES_EUR[key]} {currency}
                        {key === "free" ? "" : `/${s.perMonthShort}`}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="fl-form-row">
                <div className="fl-field">
                  <label className="fl-field-label">{b.amount}</label>
                  <div className="fl-input-affix">
                    <Wallet className="fl-input-affix__icon" strokeWidth={1.75} />
                    <Input
                      type="number"
                      min={0}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="fl-input fl-input--with-icon"
                    />
                  </div>
                </div>
                <div className="fl-field">
                  <label className="fl-field-label">{b.validityDays}</label>
                  <div className="fl-input-affix">
                    <CalendarDays className="fl-input-affix__icon" strokeWidth={1.75} />
                    <Input
                      type="number"
                      min={1}
                      value={validityDays}
                      onChange={(e) => setValidityDays(e.target.value)}
                      className="fl-input fl-input--with-icon"
                    />
                  </div>
                  <small className="fl-field-hint">
                    {b.validUntil}: {untilDate}
                  </small>
                </div>
              </div>
            </div>
          </section>

          <section className="fl-form-section">
            <div className="fl-form-section__head">
              <FileText className="size-3.5" />
              <h4>{b.quoteDetails}</h4>
            </div>
            <div className="fl-form gap-4">
              <div className="fl-field">
                <label className="fl-field-label">{b.status}</label>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORM_QUOTE_STATUSES.map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        "fl-badge cursor-pointer border px-2.5 py-1 text-[11px] transition-opacity",
                        status === key
                          ? cn(
                              "opacity-100 ring-1 ring-[var(--iris-2)]",
                              key === "draft" && "b-amber",
                              key === "sent" && "b-blue",
                              key === "accepted" && "b-green",
                              key === "expired" && "b-rose",
                              key === "refused" && "b-gray"
                            )
                          : "b-gray opacity-55 hover:opacity-85"
                      )}
                      onClick={() => setStatus(key)}
                    >
                      {b.quoteStatuses[key]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="fl-field">
                <label className="fl-field-label">{b.notes}</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="fl-input min-h-[96px]"
                  placeholder={b.quoteNotesPlaceholder}
                />
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="fl-dialog-footer flex-wrap gap-2">
          <button
            type="button"
            className="fl-btn ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {dict.common.cancel}
          </button>
          {quote && onPreviewPdf ? (
            <button
              type="button"
              className="fl-btn ghost"
              disabled={pending}
              onClick={() =>
                onPreviewPdf({
                  ...quote,
                  organization_id: organizationId,
                  plan,
                  amount: amountNum,
                  validity_days: validityNum,
                  status,
                  notes,
                  currency,
                  organization: selectedCompany
                    ? {
                        id: selectedCompany.id,
                        name: selectedCompany.name,
                        email_domain: selectedCompany.email_domain,
                      }
                    : quote.organization,
                })
              }
            >
              <Eye className="size-4" />
              {b.viewQuotePdf}
            </button>
          ) : null}
          <button
            type="button"
            className="fl-btn primary"
            onClick={handleSubmit}
            disabled={pending || !organizationId}
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileText className="size-4" />
            )}
            {quote ? dict.common.save : b.newQuote}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
