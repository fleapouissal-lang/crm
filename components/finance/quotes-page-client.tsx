"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { StatLine } from "@/components/fusion/primitives";
import { EmptyState } from "@/components/shared/page-header";
import { DataPagination } from "@/components/shared/data-pagination";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";
import { FinanceRowActions } from "@/components/finance/finance-row-actions";
import { QuoteFormDialog } from "@/components/finance/quote-form-dialog";
import { QuoteDetailDialog } from "@/components/finance/quote-detail-dialog";
import { FinancePdfDialog } from "@/components/finance/finance-pdf-dialog";
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
  type DocumentTemplate,
  type InvoiceRecord,
  type QuoteRecord,
  type QuoteStatus,
} from "@/lib/finance/types";
import {
  deleteQuote,
  upsertInvoice,
  upsertQuote,
} from "@/lib/actions/finance-docs";

const STATUS_FILTERS: Array<QuoteStatus | "all"> = [
  "all",
  "draft",
  "sent",
  "accepted",
  "expired",
  "refused",
];

export function QuotesPageClient({
  initialQuotes = [],
  initialTemplates = [],
  initialInvoices = [],
}: {
  initialQuotes?: QuoteRecord[];
  initialTemplates?: DocumentTemplate[];
  initialInvoices?: InvoiceRecord[];
}) {
  const dict = useDict();
  const router = useRouter();
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const q = dict.fusion.quotes;
  const f = dict.fusion.financeDocs;
  const [quotes, setQuotes] = useState<QuoteRecord[]>(initialQuotes);
  const [templates, setTemplates] = useState(initialTemplates);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [active, setActive] = useState<QuoteRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");

  useEffect(() => {
    setTemplates(initialTemplates);
    setInvoices(initialInvoices);
  }, [initialTemplates, initialInvoices]);

  useEffect(() => {
    const now = new Date().toISOString();
    const expired: QuoteRecord[] = [];
    const withExpiry = initialQuotes.map((row) => {
      if (
        (row.status === "draft" || row.status === "sent") &&
        isQuotePastExpiry(row)
      ) {
        const next = { ...row, status: "expired" as const, updatedAt: now };
        expired.push(next);
        return next;
      }
      return row;
    });
    setQuotes(withExpiry);
    if (expired.length > 0) {
      void (async () => {
        await Promise.all(expired.map((row) => upsertQuote(row)));
        router.refresh();
      })();
    }
  }, [initialQuotes, router]);

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

  const pagination = useAdaptivePagination(filtered, {
    rowHeight: 64,
    resetKey: `${statusFilter}:${search}`,
  });

  const hasFilters = search.trim() !== "" || statusFilter !== "all";
  const templatesById = useMemo(
    () => new Map(templates.map((t) => [t.id, t])),
    [templates]
  );

  async function handleSave(record: QuoteRecord) {
    const exists = quotes.some((x) => x.id === record.id);
    const result = await upsertQuote(record);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setQuotes((prev) => {
      const idx = prev.findIndex(
        (x) => x.id === result.data.id || x.id === record.id
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = result.data;
        return next;
      }
      return [result.data, ...prev];
    });
    setActive(result.data);
    toast.success(exists ? f.quoteUpdated : f.quoteCreated);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteQuote(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setQuotes((prev) => prev.filter((x) => x.id !== id));
    if (active?.id === id) {
      setActive(null);
      setDetailOpen(false);
    }
    toast.success(f.quoteDeleted);
    router.refresh();
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
    setActive(row);
    setDetailOpen(false);
    setPdfOpen(true);
  }

  async function convertToInvoice(row: QuoteRecord) {
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

    const invoice: InvoiceRecord = {
      id: `inv-${crypto.randomUUID().slice(0, 8)}`,
      number: nextInvoiceNumber(invoices),
      clientName: row.clientName,
      clientType: row.clientType,
      amount: row.amount,
      currency: row.currency,
      dueDate: due.toISOString().slice(0, 10),
      status: "pending",
      templateId: row.templateId,
      quoteId: row.id,
      notes: row.notes
        ? `${row.notes}\n\n← ${row.number}`
        : `← ${row.number}`,
      items,
      createdAt: now,
      updatedAt: now,
    };

    const invResult = await upsertInvoice(invoice);
    if (!invResult.success) {
      toast.error(invResult.error);
      return;
    }
    setInvoices((prev) => [invResult.data, ...prev]);

    if (row.status !== "accepted") {
      const accepted = { ...row, status: "accepted" as const, updatedAt: now };
      const quoteResult = await upsertQuote(accepted);
      if (!quoteResult.success) {
        toast.error(quoteResult.error);
        return;
      }
      setQuotes((prev) =>
        prev.map((x) => (x.id === row.id ? quoteResult.data : x))
      );
      setActive(quoteResult.data);
    }

    toast.success(q.convertedToInvoice);
    router.refresh();
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
          <div className="fl-clients-toolbar__head">
            <h2 className="fl-clients-toolbar__title">{q.recentQuotes}</h2>
            <Link
              href="/finance/quotes/new"
              className="fl-btn primary sm fl-toolbar-create"
            >
              <Plus strokeWidth={2} />
              <span className="fl-toolbar-create__label hidden sm:inline">
                {q.newQuote}
              </span>
            </Link>
          </div>
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
                {pagination.pageItems.map((row) => {
                  const expiring = isQuoteExpiringSoon(row);
                  const expiry = quoteExpiryIso(row);
                  return (
                    <tr key={row.id}>
                      <td className="fl-mono">
                        <button
                          type="button"
                          className="text-left underline-offset-2 hover:underline"
                          onClick={() => openDetail(row)}
                        >
                          {row.number}
                        </button>
                      </td>
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
                          onView={() => viewQuotePdf(row)}
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
        <DataPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
        />
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

      <FinancePdfDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        kind="quote"
        quote={active}
        template={
          active?.templateId
            ? templatesById.get(active.templateId)
            : undefined
        }
      />
    </div>
  );
}
