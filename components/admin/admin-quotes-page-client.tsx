"use client";

import { useMemo, useState, useTransition } from "react";
import { FileText, Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PlatformQuoteDialog } from "@/components/admin/platform-quote-dialog";
import {
  convertQuoteToInvoice,
  deletePlatformQuote,
  listPlatformQuotes,
} from "@/lib/actions/platform-billing";
import {
  QUOTE_STATUS_BADGE,
  formatPlatformMoney,
} from "@/lib/billing/platform-docs";
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
  const [active, setActive] = useState<PlatformQuote | null>(null);
  const [pending, startTransition] = useTransition();

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
          <StatLine value={formatPlatformMoney(stats.value)} />
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
                <th className="w-[8rem]">{s.actions}</th>
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
                      {formatPlatformMoney(Number(row.amount), row.currency)}
                    </td>
                    <td className="fl-faint">{row.validity_days} {b.days}</td>
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
                          title={b.editQuote}
                          onClick={() => {
                            setActive(row);
                            setFormOpen(true);
                          }}
                        >
                          <FileText className="size-3.5" />
                        </button>
                        {row.status !== "accepted" && row.status !== "refused" ? (
                          <button
                            type="button"
                            className="fl-btn sm ghost"
                            disabled={pending}
                            title={b.convertToInvoice}
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
                            >
                              {dict.common.delete}
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
      />
    </div>
  );
}
