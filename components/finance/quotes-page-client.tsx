"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { StatLine } from "@/components/fusion/primitives";
import { EmptyState } from "@/components/shared/page-header";
import { FinanceRowActions } from "@/components/finance/finance-row-actions";
import { QuoteFormDialog } from "@/components/finance/quote-form-dialog";
import { QuoteDetailDialog } from "@/components/finance/quote-detail-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  QUOTE_STATUS_BADGE,
  formatMoney,
  isQuoteExpiringSoon,
  isQuotePastExpiry,
  nextInvoiceNumber,
  quoteExpiryIso,
  type QuoteRecord,
  type QuoteStatus,
} from "@/lib/finance/types";
import {
  loadInvoices,
  loadQuotes,
  loadTemplates,
  saveInvoices,
  saveQuotes,
} from "@/lib/finance/storage";

const STATUS_FILTERS: Array<QuoteStatus | "all"> = [
  "all",
  "draft",
  "sent",
  "accepted",
  "expired",
  "refused",
];

export function QuotesPageClient() {
  const dict = useDict();
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const q = dict.fusion.quotes;
  const f = dict.fusion.financeDocs;
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [templates, setTemplates] = useState(loadTemplates());
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [active, setActive] = useState<QuoteRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");

  useEffect(() => {
    const loaded = loadQuotes();
    const now = new Date().toISOString();
    let changed = false;
    const withExpiry = loaded.map((row) => {
      if (
        (row.status === "draft" || row.status === "sent") &&
        isQuotePastExpiry(row)
      ) {
        changed = true;
        return { ...row, status: "expired" as const, updatedAt: now };
      }
      return row;
    });
    if (changed) saveQuotes(withExpiry);
    setQuotes(withExpiry);
    setTemplates(loadTemplates());
  }, []);

  const persist = useCallback((next: QuoteRecord[]) => {
    setQuotes(next);
    saveQuotes(next);
  }, []);

  const openQuotes = quotes.filter(
    (x) => x.status === "draft" || x.status === "sent"
  ).length;
  const pendingValue = quotes
    .filter((x) => x.status === "draft" || x.status === "sent")
    .reduce((s, x) => s + x.amount, 0);
  const acceptedCount = quotes.filter((x) => x.status === "accepted").length;
  const expiringSoon = quotes.filter((x) => isQuoteExpiringSoon(x)).length;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...quotes]
      .filter((row) => {
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        if (!term) return true;
        return (
          row.number.toLowerCase().includes(term) ||
          row.clientName.toLowerCase().includes(term) ||
          row.service.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [quotes, search, statusFilter]);

  const hasFilters = search.trim() !== "" || statusFilter !== "all";
  const templatesById = useMemo(
    () => new Map(templates.map((t) => [t.id, t])),
    [templates]
  );

  function handleSave(record: QuoteRecord) {
    const exists = quotes.some((x) => x.id === record.id);
    const next = exists
      ? quotes.map((x) => (x.id === record.id ? record : x))
      : [record, ...quotes];
    persist(next);
    setActive(record);
    toast.success(exists ? f.quoteUpdated : f.quoteCreated);
  }

  function handleDelete(id: string) {
    persist(quotes.filter((x) => x.id !== id));
    if (active?.id === id) {
      setActive(null);
      setDetailOpen(false);
    }
    toast.success(f.quoteDeleted);
  }

  function openDetail(row: QuoteRecord) {
    setActive(row);
    setDetailOpen(true);
  }

  function openEdit(row: QuoteRecord) {
    setActive(row);
    setDetailOpen(false);
    setFormOpen(true);
  }

  function viewQuotePdf(row: QuoteRecord) {
    window.open(`/finance/quotes/${row.id}`, "_blank", "noopener,noreferrer");
  }

  function convertToInvoice(row: QuoteRecord) {
    const invoices = loadInvoices();
    const now = new Date().toISOString();
    const due = new Date();
    due.setDate(due.getDate() + 30);
    const items = (row.items?.length
      ? row.items
      : [
          {
            id: `li-${crypto.randomUUID().slice(0, 8)}`,
            description: row.service,
            quantity: 1,
            unitPriceTtc: row.amount,
          },
        ]
    ).map((item) => ({ ...item, id: `li-${crypto.randomUUID().slice(0, 8)}` }));

    const invoice = {
      id: `inv-${crypto.randomUUID().slice(0, 8)}`,
      number: nextInvoiceNumber(invoices),
      clientName: row.clientName,
      clientType: row.clientType,
      amount: row.amount,
      currency: row.currency,
      dueDate: due.toISOString().slice(0, 10),
      status: "pending" as const,
      templateId: row.templateId,
      quoteId: row.id,
      notes: row.notes
        ? `${row.notes}\n\n← ${row.number}`
        : `← ${row.number}`,
      items,
      createdAt: now,
      updatedAt: now,
    };
    saveInvoices([invoice, ...invoices]);
    if (row.status !== "accepted") {
      const next = quotes.map((x) =>
        x.id === row.id
          ? { ...x, status: "accepted" as const, updatedAt: now }
          : x
      );
      persist(next);
      setActive({ ...row, status: "accepted", updatedAt: now });
    }
    toast.success(q.convertedToInvoice);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{q.openQuotes}</div>
          <StatLine value={String(openQuotes)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{q.pendingValue}</div>
          <StatLine
            value={pendingValue.toLocaleString("fr-FR")}
            unit={quotes[0]?.currency ?? "MAD"}
          />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{q.acceptedMonth}</div>
          <StatLine value={String(acceptedCount)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{q.expiringSoon}</div>
          <StatLine value={String(expiringSoon)} />
        </div>
      </div>

      <div className="fl-card fl-clients-card">
        <div className="fl-clients-toolbar">
          <h2 className="fl-clients-toolbar__title">{q.recentQuotes}</h2>
          <div className="fl-clients-toolbar__row">
            <div className="fl-clients-search-wrap">
              <Search strokeWidth={2} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={q.searchPlaceholder}
                className="fl-clients-search"
              />
            </div>
            <div className="fl-clients-status">
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter((v as QuoteStatus | "all") ?? "all")
                }
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue>
                    {statusFilter === "all" ? q.allStatuses : q[statusFilter]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  {STATUS_FILTERS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key === "all" ? q.allStatuses : q[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters ? (
              <button
                type="button"
                className="fl-btn sm ghost shrink-0"
                onClick={clearFilters}
                title={q.clearFilters}
              >
                <X className="size-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">{q.clearFilters}</span>
              </button>
            ) : null}
            <Link
              href="/finance/quotes/new"
              className="fl-btn primary sm shrink-0"
            >
              <Plus strokeWidth={2} />
              <span className="hidden sm:inline">{q.newQuote}</span>
            </Link>
          </div>
        </div>

        <div className="fl-tbl-wrap">
          {filtered.length === 0 ? (
            <div className="px-4 py-10">
              <EmptyState
                icon={FileText}
                title={quotes.length === 0 ? q.noQuotes : q.noQuotesMatch}
                description={
                  quotes.length === 0 ? q.noQuotesHint : q.recentQuotesSub
                }
                  action={
                  quotes.length === 0 ? (
                    <Link href="/finance/quotes/new" className="fl-btn primary sm">
                      <Plus strokeWidth={2} />
                      {q.newQuote}
                    </Link>
                  ) : undefined
                }
                className="border-0 bg-transparent"
              />
            </div>
          ) : (
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
                {filtered.map((row) => {
                  const expiring = isQuoteExpiringSoon(row);
                  const expiry = quoteExpiryIso(row);
                  return (
                    <tr key={row.id}>
                      <td className="fl-mono">{row.number}</td>
                      <td>
                        <b>{row.clientName}</b>
                      </td>
                      <td className="fl-muted">{row.service}</td>
                      <td className="fl-mono">
                        {formatMoney(row.amount, row.currency)}
                      </td>
                      <td
                        className={cn(
                          "fl-muted",
                          expiring && "text-[var(--rose)]"
                        )}
                      >
                        <div>
                          {q.validityDaysUnit.replace(
                            "{n}",
                            String(row.validityDays)
                          )}
                        </div>
                        <div className="fl-tny fl-faint">
                          {q.expiresOn.replace(
                            "{date}",
                            format(new Date(expiry + "T00:00:00"), "dd MMM yyyy", {
                              locale: dateLocale,
                            })
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`fl-badge ${QUOTE_STATUS_BADGE[row.status]}`}
                        >
                          {q[row.status]}
                        </span>
                      </td>
                      <td>
                        <FinanceRowActions
                          label={row.number}
                          onView={() => openDetail(row)}
                          onEdit={() => openEdit(row)}
                          onDelete={() => handleDelete(row.id)}
                          onConvert={
                            row.status === "accepted" || row.status === "sent"
                              ? () => convertToInvoice(row)
                              : undefined
                          }
                          convertLabel={q.convertToInvoice}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <QuoteFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        quote={active && formOpen ? active : null}
        templates={templates}
        existingQuotes={quotes}
        onSave={handleSave}
      />

      <QuoteDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        quote={active}
        template={
          active?.templateId
            ? templatesById.get(active.templateId)
            : undefined
        }
        onEdit={() => active && openEdit(active)}
        onViewPdf={() => active && viewQuotePdf(active)}
        onConvertToInvoice={
          active ? () => convertToInvoice(active) : undefined
        }
      />
    </div>
  );
}
