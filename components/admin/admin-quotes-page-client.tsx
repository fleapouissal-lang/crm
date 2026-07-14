"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Eye, FilePenLine, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PlatformQuoteDialog } from "@/components/admin/platform-quote-dialog";
import { PlatformQuotePdfDialog } from "@/components/admin/platform-quote-pdf-dialog";
import {
  convertQuoteToInvoice,
  deletePlatformQuote,
  listPlatformQuotes,
} from "@/lib/actions/platform-billing";
import { resolvePlatformCurrency } from "@/lib/billing/currency";
import {
  QUOTE_STATUS_BADGE,
  formatPlatformMoney,
} from "@/lib/billing/platform-docs";
import { loadPreferences } from "@/lib/settings/storage";
import type { CurrencyCode } from "@/lib/settings/types";
import type { Organization, PlatformQuote } from "@/types/database";
import { cn } from "@/lib/utils";

export function AdminQuotesPageClient({
  initialQuotes,
  companies,
}: {
  initialQuotes: PlatformQuote[];
  companies: Organization[];
}) {
  const dict = useDict();
  const b = dict.fusion.platformBilling;
  const s = dict.fusion.settings;
  const [quotes, setQuotes] = useState(initialQuotes);
  const [formOpen, setFormOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [active, setActive] = useState<PlatformQuote | null>(null);
  const [pending, startTransition] = useTransition();
  const [currency, setCurrency] = useState<CurrencyCode>("MAD");

  useEffect(() => {
    setCurrency(loadPreferences().currency);
  }, []);

  const stats = useMemo(() => {
    const open = quotes.filter((q) => q.status === "draft" || q.status === "sent");
    const accepted = quotes.filter((q) => q.status === "accepted");
    const value = open.reduce((n, q) => n + Number(q.amount), 0);
    return { open: open.length, accepted: accepted.length, value };
  }, [quotes]);

  function refresh() {
    startTransition(async () => {
      setQuotes(await listPlatformQuotes());
    });
  }

  function openEdit(row: PlatformQuote) {
    setActive(row);
    setFormOpen(true);
  }

  function openPdf(row: PlatformQuote) {
    setActive(row);
    setPdfOpen(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePlatformQuote(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(b.quoteDeleted);
      refresh();
    });
  }

  function handleConvert(id: string) {
    startTransition(async () => {
      const result = await convertQuoteToInvoice(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(b.convertedToInvoice);
      refresh();
    });
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{b.openQuotes}</div>
          <StatLine value={String(stats.open)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{b.quotesValue}</div>
          <StatLine value={formatPlatformMoney(stats.value, currency)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{b.acceptedQuotes}</div>
          <StatLine value={String(stats.accepted)} />
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{b.quotesTitle}</h3>
            <div className="ch-sub">{b.quotesSub}</div>
          </div>
          <button
            type="button"
            className="fl-btn primary sm"
            onClick={() => {
              setActive(null);
              setFormOpen(true);
            }}
          >
            <Plus strokeWidth={2} />
            {b.newQuote}
          </button>
        </div>
        <div className="fl-tbl-wrap">
          <table className="fl-tbl">
            <thead>
              <tr>
                <th>{b.reference}</th>
                <th>{b.company}</th>
                <th>{s.plan}</th>
                <th>{b.amount}</th>
                <th>{b.validityDays}</th>
                <th>{b.status}</th>
                <th className="w-[9rem]">{s.actions}</th>
              </tr>
            </thead>
            <tbody>
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm fl-faint">
                    {b.noQuotes}
                  </td>
                </tr>
              ) : (
                quotes.map((row) => (
                  <tr key={row.id}>
                    <td className="fl-mono">{row.number}</td>
                    <td>
                      <b>{row.organization?.name ?? "—"}</b>
                    </td>
                    <td className="fl-muted">{s.plans[row.plan]}</td>
                    <td className="fl-mono">
                      {formatPlatformMoney(
                        Number(row.amount),
                        resolvePlatformCurrency(row.currency, currency)
                      )}
                    </td>
                    <td className="fl-faint">
                      {row.validity_days} {b.days}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "fl-badge text-[11px]",
                          QUOTE_STATUS_BADGE[row.status]
                        )}
                      >
                        {b.quoteStatuses[row.status]}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="fl-btn sm ghost"
                          disabled={pending}
                          title={b.viewQuotePdf}
                          aria-label={b.viewQuotePdf}
                          onClick={() => openPdf(row)}
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="fl-btn sm ghost"
                          disabled={pending}
                          title={b.editQuote}
                          aria-label={b.editQuote}
                          onClick={() => openEdit(row)}
                        >
                          <FilePenLine className="size-3.5" />
                        </button>
                        {row.status !== "accepted" && row.status !== "refused" ? (
                          <button
                            type="button"
                            className="fl-btn sm ghost"
                            disabled={pending}
                            title={b.convertToInvoice}
                            aria-label={b.convertToInvoice}
                            onClick={() => handleConvert(row.id)}
                          >
                            <Receipt className="size-3.5" />
                          </button>
                        ) : null}
                        <ConfirmDialog
                          trigger={
                            <button
                              type="button"
                              className="fl-btn sm ghost text-[var(--rose)]"
                              disabled={pending}
                              title={dict.common.delete}
                              aria-label={dict.common.delete}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          }
                          title={b.deleteQuoteTitle}
                          description={b.deleteQuoteConfirm.replace(
                            "{{number}}",
                            row.number
                          )}
                          confirmLabel={dict.common.delete}
                          onConfirm={() => handleDelete(row.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PlatformQuoteDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        companies={companies}
        quote={active}
        onSaved={refresh}
        onPreviewPdf={(q) => {
          setActive(q);
          setFormOpen(false);
          setPdfOpen(true);
        }}
      />

      <PlatformQuotePdfDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        quote={active}
      />
    </div>
  );
}
