"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CheckCircle2, Eye, FilePenLine, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PlatformInvoiceDialog } from "@/components/admin/platform-invoice-dialog";
import { PlatformInvoicePdfDialog } from "@/components/admin/platform-invoice-pdf-dialog";
import {
  deletePlatformInvoice,
  listPlatformInvoices,
  setPlatformInvoiceStatus,
} from "@/lib/actions/platform-billing";
import { resolvePlatformCurrency } from "@/lib/billing/currency";
import {
  INVOICE_STATUS_BADGE,
  formatPlatformMoney,
} from "@/lib/billing/platform-docs";
import { loadPreferences } from "@/lib/settings/storage";
import type { CurrencyCode } from "@/lib/settings/types";
import type { Organization, PlatformInvoice } from "@/types/database";
import { cn } from "@/lib/utils";

export function AdminInvoicesPageClient({
  initialInvoices,
  companies,
}: {
  initialInvoices: PlatformInvoice[];
  companies: Organization[];
}) {
  const dict = useDict();
  const b = dict.fusion.platformBilling;
  const s = dict.fusion.settings;
  const [invoices, setInvoices] = useState(initialInvoices);
  const [formOpen, setFormOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [active, setActive] = useState<PlatformInvoice | null>(null);
  const [pending, startTransition] = useTransition();
  const [currency, setCurrency] = useState<CurrencyCode>("MAD");

  useEffect(() => {
    setCurrency(loadPreferences().currency);
  }, []);

  const stats = useMemo(() => {
    const unpaid = invoices.filter(
      (i) => i.status === "pending" || i.status === "overdue" || i.status === "draft"
    );
    const paid = invoices.filter((i) => i.status === "paid");
    return {
      unpaid: unpaid.length,
      unpaidAmount: unpaid.reduce((n, i) => n + Number(i.amount), 0),
      paidAmount: paid.reduce((n, i) => n + Number(i.amount), 0),
      total: invoices.length,
    };
  }, [invoices]);

  function refresh() {
    startTransition(async () => {
      setInvoices(await listPlatformInvoices());
    });
  }

  function openEdit(row: PlatformInvoice) {
    setActive(row);
    setFormOpen(true);
  }

  function openPdf(row: PlatformInvoice) {
    setActive(row);
    setPdfOpen(true);
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePlatformInvoice(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(b.invoiceDeleted);
      refresh();
    });
  }

  function handleMarkPaid(id: string) {
    startTransition(async () => {
      const result = await setPlatformInvoiceStatus(id, "paid");
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(b.invoiceMarkedPaid);
      refresh();
    });
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{b.unpaidInvoices}</div>
          <StatLine value={String(stats.unpaid)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{b.unpaidAmount}</div>
          <StatLine value={formatPlatformMoney(stats.unpaidAmount, currency)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{b.paidAmount}</div>
          <StatLine value={formatPlatformMoney(stats.paidAmount, currency)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{b.invoices}</div>
          <StatLine value={String(stats.total)} />
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{b.invoicesTitle}</h3>
            <div className="ch-sub">{b.invoicesSub}</div>
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
            {b.newInvoice}
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
                <th>{b.dueDate}</th>
                <th>{b.reason}</th>
                <th>{b.status}</th>
                <th className="w-[10rem]">{s.actions}</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm fl-faint">
                    {b.noInvoices}
                  </td>
                </tr>
              ) : (
                invoices.map((row) => (
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
                    <td className="fl-faint fl-tny">{row.due_date ?? "—"}</td>
                    <td className="fl-faint fl-tny">
                      {b.billingReasons[row.billing_reason]}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "fl-badge text-[11px]",
                          INVOICE_STATUS_BADGE[row.status]
                        )}
                      >
                        {b.invoiceStatuses[row.status]}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="fl-btn sm ghost"
                          disabled={pending}
                          title={b.viewInvoicePdf}
                          aria-label={b.viewInvoicePdf}
                          onClick={() => openPdf(row)}
                        >
                          <Eye className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          className="fl-btn sm ghost"
                          disabled={pending}
                          title={b.editInvoice}
                          aria-label={b.editInvoice}
                          onClick={() => openEdit(row)}
                        >
                          <FilePenLine className="size-3.5" />
                        </button>
                        {row.status !== "paid" ? (
                          <button
                            type="button"
                            className="fl-btn sm ghost"
                            disabled={pending}
                            title={b.markPaid}
                            aria-label={b.markPaid}
                            onClick={() => handleMarkPaid(row.id)}
                          >
                            <CheckCircle2 className="size-3.5 text-[var(--emerald)]" />
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
                          title={b.deleteInvoiceTitle}
                          description={b.deleteInvoiceConfirm.replace(
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

      <PlatformInvoiceDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        companies={companies}
        invoice={active}
        onSaved={refresh}
        onPreviewPdf={(inv) => {
          setActive(inv);
          setFormOpen(false);
          setPdfOpen(true);
        }}
      />

      <PlatformInvoicePdfDialog
        open={pdfOpen}
        onOpenChange={setPdfOpen}
        invoice={active}
      />
    </div>
  );
}
