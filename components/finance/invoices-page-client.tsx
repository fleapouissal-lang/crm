"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, Receipt, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { EmptyState } from "@/components/shared/page-header";
import { DataPagination } from "@/components/shared/data-pagination";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";
import { FinanceRowActions } from "@/components/finance/finance-row-actions";
import { InvoiceFormDialog } from "@/components/finance/invoice-form-dialog";
import { FinancePdfDialog } from "@/components/finance/finance-pdf-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INVOICE_STATUS_BADGE,
  formatMoney,
  type InvoiceRecord,
  type InvoiceStatus,
  type QuoteRecord,
} from "@/lib/finance/types";
import {
  loadInvoices,
  loadQuotes,
  loadTemplates,
  saveInvoices,
} from "@/lib/finance/storage";

const STATUS_FILTERS: Array<InvoiceStatus | "all"> = [
  "all",
  "draft",
  "pending",
  "paid",
  "overdue",
];

export function InvoicesPageClient() {
  const dict = useDict();
  const inv = dict.fusion.invoices;
  const f = dict.fusion.financeDocs;
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [templates, setTemplates] = useState(loadTemplates());
  const [formOpen, setFormOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [active, setActive] = useState<InvoiceRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">(
    "all"
  );

  useEffect(() => {
    setInvoices(loadInvoices());
    setQuotes(loadQuotes());
    setTemplates(loadTemplates());
  }, []);

  const templatesById = useMemo(
    () => new Map(templates.map((t) => [t.id, t])),
    [templates]
  );

  const quotesById = useMemo(
    () => new Map(quotes.map((q) => [q.id, q])),
    [quotes]
  );

  const persist = useCallback((next: InvoiceRecord[]) => {
    setInvoices(next);
    saveInvoices(next);
  }, []);

  const hasInvoices = invoices.length > 0;
  const issuedMonth = invoices.length;
  const issuedTotal = invoices.reduce((s, x) => s + x.amount, 0);
  const paidTotal = invoices
    .filter((x) => x.status === "paid")
    .reduce((s, x) => s + x.amount, 0);
  const overdueInvoices = invoices.filter((x) => x.status === "overdue");
  const overdueTotal = overdueInvoices.reduce((s, x) => s + x.amount, 0);
  const overdueCount = overdueInvoices.length;
  const outstanding = invoices
    .filter((x) => x.status === "pending" || x.status === "overdue")
    .reduce((s, x) => s + x.amount, 0);

  function formatKpiAmount(amount: number): string {
    if (!hasInvoices) return "—";
    if (amount <= 0) return "0";
    if (amount >= 1000) return `${Math.round(amount / 1000)}K`;
    return String(Math.round(amount));
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...invoices]
      .filter((row) => {
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        if (!q) return true;
        return (
          row.number.toLowerCase().includes(q) ||
          row.clientName.toLowerCase().includes(q) ||
          row.notes.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [invoices, search, statusFilter]);

  const pagination = useAdaptivePagination(filtered, {
    rowHeight: 60,
    resetKey: `${statusFilter}:${search}`,
  });

  const hasFilters = search.trim() !== "" || statusFilter !== "all";

  function statusLabel(row: InvoiceRecord): string {
    if (row.status === "overdue") return inv.overdueStatus;
    return inv[row.status] as string;
  }

  function statusFilterLabel(key: InvoiceStatus | "all"): string {
    if (key === "all") return inv.allStatuses;
    if (key === "overdue") return inv.overdueStatus;
    return inv[key] as string;
  }

  function handleSave(record: InvoiceRecord) {
    const exists = invoices.some((x) => x.id === record.id);
    const next = exists
      ? invoices.map((x) => (x.id === record.id ? record : x))
      : [record, ...invoices];
    persist(next);
    toast.success(exists ? f.invoiceUpdated : f.invoiceCreated);
  }

  function handleDelete(id: string) {
    persist(invoices.filter((x) => x.id !== id));
    toast.success(f.invoiceDeleted);
  }

  function viewInvoicePdf(row: InvoiceRecord) {
    setActive(row);
    setPdfOpen(true);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{inv.issuedMonth}</div>
          <StatLine value={hasInvoices ? String(issuedMonth) : "—"} />
          <div className="k-foot fl-faint mt-2">
            {hasInvoices ? formatMoney(issuedTotal, "MAD") : dict.fusion.reports.noData}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{inv.paidMonth}</div>
          <StatLine
            value={formatKpiAmount(paidTotal)}
            unit={hasInvoices && paidTotal > 0 ? "MAD" : undefined}
          />
          <div className="k-foot fl-faint mt-2">
            {hasInvoices ? formatMoney(paidTotal, "MAD") : dict.fusion.reports.noData}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{inv.overdue}</div>
          <StatLine
            value={formatKpiAmount(overdueTotal)}
            unit={hasInvoices && overdueTotal > 0 ? "MAD" : undefined}
          />
          <div className="k-foot mt-2">
            {hasInvoices ? (
              <span className="fl-badge b-amber">
                {overdueCount} {inv.overdueStatus.toLowerCase()}
              </span>
            ) : (
              <span className="fl-faint text-[12px]">{dict.fusion.reports.noData}</span>
            )}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{inv.outstanding}</div>
          <StatLine
            value={formatKpiAmount(outstanding)}
            unit={hasInvoices && outstanding > 0 ? "MAD" : undefined}
          />
          <div className="k-foot fl-faint mt-2">
            {hasInvoices ? formatMoney(outstanding, "MAD") : dict.fusion.reports.noData}
          </div>
        </div>
      </div>

      <div className="fl-card fl-clients-card">
        <div className="fl-clients-toolbar">
          <h2 className="fl-clients-toolbar__title">{inv.recentInvoices}</h2>
          <div className="fl-clients-toolbar__row">
            <div className="fl-clients-search-wrap">
              <Search strokeWidth={2} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={inv.searchPlaceholder}
                className="fl-clients-search"
              />
            </div>
            <div className="fl-clients-status">
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter((v as InvoiceStatus | "all") ?? "all")
                }
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue>{statusFilterLabel(statusFilter)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  {STATUS_FILTERS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {statusFilterLabel(key)}
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
                title={inv.clearFilters}
              >
                <X className="size-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">{inv.clearFilters}</span>
              </button>
            ) : null}
            <Link
              href="/finance/invoices/new"
              className="fl-btn primary sm shrink-0"
            >
              <Plus strokeWidth={2} />
              <span className="hidden sm:inline">{inv.newInvoice}</span>
            </Link>
          </div>
        </div>

        <div className="fl-tbl-wrap">
          {filtered.length === 0 ? (
            <div className="px-4 py-10">
              <EmptyState
                icon={Receipt}
                title={hasFilters ? inv.noResults : inv.noInvoices}
                description={
                  hasFilters ? inv.noResultsHint : inv.recentInvoicesSub
                }
              />
            </div>
          ) : (
            <table className="fl-tbl">
              <thead>
                <tr>
                  <th>{inv.number}</th>
                  <th>{inv.client}</th>
                  <th>{inv.amount}</th>
                  <th>{inv.dueDate}</th>
                  <th>{inv.status}</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((row) => (
                  <tr key={row.id}>
                    <td className="fl-mono">{row.number}</td>
                    <td>
                      <b>{row.clientName}</b>
                    </td>
                    <td className="fl-mono">
                      {formatMoney(row.amount, row.currency)}
                    </td>
                    <td className="fl-muted">
                      {format(new Date(row.dueDate), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </td>
                    <td>
                      <span
                        className={`fl-badge ${INVOICE_STATUS_BADGE[row.status]}`}
                      >
                        {statusLabel(row)}
                      </span>
                    </td>
                    <td>
                      <FinanceRowActions
                        label={row.number}
                        onView={() => viewInvoicePdf(row)}
                        onEdit={() => {
                          setActive(row);
                          setFormOpen(true);
                        }}
                        onDelete={() => handleDelete(row.id)}
                      />
                    </td>
                  </tr>
                ))}
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

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        invoice={active && formOpen ? active : null}
        templates={templates}
        existingInvoices={invoices}
        onSave={handleSave}
      />

      <FinancePdfDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        kind="invoice"
        invoice={active}
        template={
          active?.templateId
            ? templatesById.get(active.templateId)
            : undefined
        }
        linkedQuote={
          active?.quoteId ? quotesById.get(active.quoteId) : undefined
        }
      />
    </div>
  );
}
