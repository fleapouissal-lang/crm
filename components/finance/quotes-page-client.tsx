"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine, FlDelta } from "@/components/fusion/primitives";
import { FinanceRowActions } from "@/components/finance/finance-row-actions";
import { QuoteFormDialog } from "@/components/finance/quote-form-dialog";
import { QuoteDetailDialog } from "@/components/finance/quote-detail-dialog";
import {
  QUOTE_STATUS_BADGE,
  formatMoney,
  type QuoteRecord,
} from "@/lib/finance/types";
import {
  loadQuotes,
  loadTemplates,
  saveQuotes,
} from "@/lib/finance/storage";

export function QuotesPageClient() {
  const dict = useDict();
  const q = dict.fusion.quotes;
  const f = dict.fusion.financeDocs;
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [templates, setTemplates] = useState(loadTemplates());
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [active, setActive] = useState<QuoteRecord | null>(null);

  useEffect(() => {
    setQuotes(loadQuotes());
    setTemplates(loadTemplates());
  }, []);

  const persist = useCallback((next: QuoteRecord[]) => {
    setQuotes(next);
    saveQuotes(next);
  }, []);

  const openQuotes = quotes.filter((x) => x.status === "draft" || x.status === "sent").length;
  const pendingValue = quotes
    .filter((x) => x.status !== "accepted" && x.status !== "refused")
    .reduce((s, x) => s + x.amount, 0);
  const acceptedMonth = quotes.filter((x) => x.status === "accepted").length;

  const sorted = useMemo(
    () => [...quotes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [quotes]
  );

  function handleSave(record: QuoteRecord) {
    const exists = quotes.some((x) => x.id === record.id);
    const next = exists
      ? quotes.map((x) => (x.id === record.id ? record : x))
      : [record, ...quotes];
    persist(next);
    toast.success(exists ? f.quoteUpdated : f.quoteCreated);
  }

  function handleDelete(id: string) {
    persist(quotes.filter((x) => x.id !== id));
    toast.success(f.quoteDeleted);
  }

  const activeTemplate = active?.templateId
    ? templates.find((t) => t.id === active.templateId)
    : undefined;

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{q.openQuotes}</div>
          <StatLine value={String(openQuotes)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{q.pendingValue}</div>
          <StatLine value={Math.round(pendingValue / 1000) + "K"} unit="MAD" />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{q.acceptedMonth}</div>
          <StatLine value={String(acceptedMonth)} />
          <div className="k-foot mt-2"><FlDelta up>1</FlDelta></div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{q.expiringSoon}</div>
          <StatLine value={String(quotes.filter((x) => x.validityDays <= 15 && x.status === "sent").length)} />
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{q.recentQuotes}</h3>
            <div className="ch-sub">{q.recentQuotesSub}</div>
          </div>
          <button type="button" className="fl-btn primary sm" onClick={() => { setActive(null); setFormOpen(true); }}>
            <Plus strokeWidth={2} />
            {q.newQuote}
          </button>
        </div>
        <div className="fl-tbl-wrap">
          <table className="fl-tbl">
            <thead>
              <tr>
                <th>{q.reference}</th>
                <th>{q.client}</th>
                <th>{q.service}</th>
                <th>{q.amount}</th>
                <th>{q.validity}</th>
                <th>{q.status}</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id}>
                  <td className="fl-mono">{row.number}</td>
                  <td><b>{row.clientName}</b></td>
                  <td className="fl-muted">{row.service}</td>
                  <td className="fl-mono">{formatMoney(row.amount, row.currency)}</td>
                  <td className="fl-muted">{row.validityDays} j</td>
                  <td>
                    <span className={`fl-badge ${QUOTE_STATUS_BADGE[row.status]}`}>
                      {q[row.status]}
                    </span>
                  </td>
                  <td>
                    <FinanceRowActions
                      label={row.number}
                      onView={() => { setActive(row); setDetailOpen(true); }}
                      onEdit={() => { setActive(row); setFormOpen(true); }}
                      onDelete={() => handleDelete(row.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <QuoteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        quote={active}
        templates={templates}
        existingQuotes={quotes}
        onSave={handleSave}
      />
      <QuoteDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        quote={active}
        template={activeTemplate}
        onEdit={() => { setDetailOpen(false); setFormOpen(true); }}
      />
    </div>
  );
}
