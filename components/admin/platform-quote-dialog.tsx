"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Building2,
  CalendarDays,
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
  PLATFORM_QUOTE_STATUSES,
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
import type { Organization, PlatformQuote, PlatformQuoteStatus } from "@/types/database";
import { cn } from "@/lib/utils";

export function PlatformQuoteDialog({
  open,
  onOpenChange,
  companies,
  quote,
  defaultOrganizationId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companies: Organization[];
  quote: PlatformQuote | null;
  defaultOrganizationId?: string | null;
  onSaved: () => void;
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
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    if (quote) {
      setOrganizationId(quote.organization_id);
      setPlan(quote.plan);
      setAmount(String(quote.amount));
      setValidityDays(String(quote.validity_days));
      setStatus(quote.status);
      setNotes(quote.notes ?? "");
    } else {
      setOrganizationId(defaultOrganizationId ?? companies[0]?.id ?? "");
      setPlan("business");
      setAmount(String(planAmount("business")));
      setValidityDays("30");
      setStatus("draft");
      setNotes("");
    }
  }, [open, quote, companies, defaultOrganizationId]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === organizationId) ?? null,
    [companies, organizationId]
  );

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
        validityDays: Number(validityDays) || 30,
        status,
        notes,
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
      <DialogContent className="fl-dialog-content fl-dialog-content--lg sm:max-w-xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-3">
            <span
              className="grid size-10 place-items-center rounded-xl text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <FileText className="size-5" strokeWidth={2} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span>{quote ? b.editQuote : b.newQuote}</span>
              <span className="text-xs font-normal fl-faint">{b.quoteFormSub}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="fl-dialog-body space-y-5">
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
                <Select
                  value={plan}
                  onValueChange={(v) => handlePlanChange(v as PlanKey)}
                >
                  <SelectTrigger className="fl-select-trigger fl-input w-full">
                    <SelectValue>
                      <span className="fl-select-plan">
                        <span>{s.plans[plan]}</span>
                        <span className="fl-select-plan__price">
                          €{PLAN_PRICES_EUR[plan]}
                          {plan === "free" ? "" : `/${s.perMonthShort}`}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel">
                    {PLAN_KEYS.map((key) => (
                      <SelectItem key={key} value={key} label={s.plans[key]}>
                        <span className="fl-select-plan">
                          <span>{s.plans[key]}</span>
                          <span className="fl-select-plan__price">
                            €{PLAN_PRICES_EUR[key]}
                            {key === "free" ? "" : `/${s.perMonthShort}`}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as PlatformQuoteStatus)}
                >
                  <SelectTrigger className="fl-select-trigger fl-input w-full">
                    <SelectValue>
                      <span
                        className={cn(
                          "fl-badge text-[11px]",
                          status === "draft" && "b-amber",
                          status === "sent" && "b-blue",
                          status === "accepted" && "b-green",
                          status === "expired" && "b-rose",
                          status === "refused" && "b-gray"
                        )}
                      >
                        {b.quoteStatuses[status]}
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel">
                    {PLATFORM_QUOTE_STATUSES.map((key) => (
                      <SelectItem
                        key={key}
                        value={key}
                        label={b.quoteStatuses[key]}
                      >
                        {b.quoteStatuses[key]}
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
                  className="fl-input min-h-[88px]"
                  placeholder={b.quoteNotesPlaceholder}
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
            {pending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            {quote ? dict.common.save : b.newQuote}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
