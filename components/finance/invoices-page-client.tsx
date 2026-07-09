"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine, FlDelta } from "@/components/fusion/primitives";
import { FinanceRowActions } from "@/components/finance/finance-row-actions";
import { InvoiceFormDialog } from "@/components/finance/invoice-form-dialog";
import {
  INVOICE_STATUS_BADGE,
  formatMoney,
  type InvoiceRecord,
} from "@/lib/finance/types";
import {
  loadInvoices,
  loadQuotes,
  loadTemplates,
  saveInvoices,
} from "@/lib/finance/storage";
export function InvoicesPageClient() {
  const dict = useDict();
  const inv = dict.fusion.invoices;
  const f = dict.fusion.financeDocs;
  const b = dict.fusion.badges;
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [quotes, setQuotes] = useState(loadQuotes());
  const [templates, setTemplates] = useState(loadTemplates());
  const [formOpen, setFormOpen] = useState(false);
  const [active, setActive] = useState<InvoiceRecord | null>(null);

  useEffect(() => {
    setInvoices(loadInvoices());
    setQuotes(loadQuotes());
    setTemplates(loadTemplates());
  }, []);

  const persist = useCallback((next: InvoiceRecord[]) => {
    setInvoices(next);
    saveInvoices(next);
  }, []);

  const issuedMonth = invoices.length;
  const issuedTotal = invoices.reduce((s, x) => s + x.amount, 0);
  const paidTotal = invoices.filter((x) => x.status === "paid").reduce((s, x) => s + x.amount, 0);
  const overdueTotal = invoices.filter((x) => x.status === "overdue").reduce((s, x) => s + x.amount, 0);
  const outstanding = invoices
    .filter((x) => x.status === "pending" || x.status === "overdue")
    .reduce((s, x) => s + x.amount, 0);

  const sorted = useMemo(
    () => [...invoices].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [invoices]
  );

  function statusLabel(row: InvoiceRecord): string {
    if (row.status === "overdue") return inv.overdueStatus;
    return inv[row.status] as string;
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
    window.open(`/finance/invoices/${row.id}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{inv.issuedMonth}</div>
          <StatLine value={String(issuedMonth)} />
          <div className="k-foot fl-faint mt-2">{formatMoney(issuedTotal, "MAD")}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{inv.paidMonth}</div>
          <StatLine value={Math.round(paidTotal / 1000) + "K"} unit="MAD" />
          <div className="k-foot mt-2"><FlDelta up>18%</FlDelta></div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{inv.overdue}</div>
          <StatLine value={Math.round(overdueTotal / 1000) + "K"} unit="MAD" />
          <div className="k-foot mt-2"><span className="fl-badge b-amber">{b.overdueCount}</span></div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{inv.outstanding}</div>
          <StatLine value={Math.round(outstanding / 1000) + "K"} unit="MAD" />
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{inv.recentInvoices}</h3>
            <div className="ch-sub">{inv.recentInvoicesSub}</div>
          </div>
          <button type="button" className="fl-btn primary sm" onClick={() => { setActive(null); setFormOpen(true); }}>
            <Plus strokeWidth={2} />
            {inv.newInvoice}
          </button>
        </div>
        <div className="fl-tbl-wrap">
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
              {sorted.map((row) => (
                <tr key={row.id}>
                  <td className="fl-mono">{row.number}</td>
                  <td><b>{row.clientName}</b></td>
                  <td className="fl-mono">{formatMoney(row.amount, row.currency)}</td>
                  <td className="fl-muted">
                    {format(new Date(row.dueDate), "d MMM yyyy", { locale: fr })}
                  </td>
                  <td>
                    <span className={`fl-badge ${INVOICE_STATUS_BADGE[row.status]}`}>
                      {statusLabel(row)}
                    </span>
                  </td>
                  <td>
                    <FinanceRowActions
                      label={row.number}
                      onView={() => viewInvoicePdf(row)}
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

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        invoice={active}
        templates={templates}
        existingInvoices={invoices}
        onSave={handleSave}
      />
    </div>
  );
}
