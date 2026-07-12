"use client";

import { useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  CreditCard,
  Plus,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RecordPaymentDialog } from "@/components/admin/record-payment-dialog";
import {
  deletePlatformPayment,
  listPlatformPayments,
  updatePlatformPaymentStatus,
} from "@/lib/actions/platform-payments";
import { listPlatformInvoices } from "@/lib/actions/platform-billing";
import {
  PAYMENT_STATUS_BADGE,
} from "@/lib/billing/payments";
import { formatPlatformMoney } from "@/lib/billing/platform-docs";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import type {
  Organization,
  PlatformInvoice,
  PlatformPayment,
} from "@/types/database";
import { cn } from "@/lib/utils";

export function AdminPaymentsPageClient({
  initialPayments,
  companies,
  initialInvoices,
}: {
  initialPayments: PlatformPayment[];
  companies: Organization[];
  initialInvoices: PlatformInvoice[];
}) {
  const dict = useDict();
  const p = dict.fusion.platformPayments;
  const b = dict.fusion.platformBilling;
  const s = dict.fusion.settings;
  const { locale } = useI18n();
  const dateLocale = getDateFnsLocale(locale);
  const [payments, setPayments] = useState(initialPayments);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [formOpen, setFormOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const stats = useMemo(() => {
    const succeeded = payments.filter((x) => x.status === "succeeded");
    const failed = payments.filter((x) => x.status === "failed");
    const month = new Date().getMonth();
    const year = new Date().getFullYear();
    const monthPaid = succeeded.filter((x) => {
      if (!x.paid_at) return false;
      const d = new Date(x.paid_at);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const byBrand = { visa: 0, mastercard: 0, other: 0 };
    for (const pay of succeeded) {
      if (pay.card_brand === "visa") byBrand.visa += 1;
      else if (pay.card_brand === "mastercard") byBrand.mastercard += 1;
      else if (pay.method === "card") byBrand.other += 1;
    }
    return {
      succeeded: succeeded.length,
      failed: failed.length,
      collected: succeeded.reduce((n, x) => n + Number(x.amount), 0),
      monthCollected: monthPaid.reduce((n, x) => n + Number(x.amount), 0),
      byBrand,
    };
  }, [payments]);

  function refresh() {
    startTransition(async () => {
      const [nextPay, nextInv] = await Promise.all([
        listPlatformPayments(),
        listPlatformInvoices(),
      ]);
      setPayments(nextPay);
      setInvoices(nextInv);
    });
  }

  function handleStatus(id: string, status: "succeeded" | "failed" | "refunded") {
    startTransition(async () => {
      const result = await updatePlatformPaymentStatus(id, status);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(p.statusUpdated);
      refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deletePlatformPayment(id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(p.paymentDeleted);
      refresh();
    });
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{p.collectedMonth}</div>
          <StatLine value={formatPlatformMoney(stats.monthCollected)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{p.collectedTotal}</div>
          <StatLine value={formatPlatformMoney(stats.collected)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{p.succeededCount}</div>
          <StatLine value={String(stats.succeeded)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{p.failedCount}</div>
          <StatLine value={String(stats.failed)} />
        </div>
      </div>

      <div className="grid g-4 sm:grid-cols-3">
        <div className="fl-card fl-pad">
          <div className="k-label">Visa</div>
          <StatLine value={String(stats.byBrand.visa)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">Mastercard</div>
          <StatLine value={String(stats.byBrand.mastercard)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{p.otherCards}</div>
          <StatLine value={String(stats.byBrand.other)} />
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{p.paymentsTitle}</h3>
            <div className="ch-sub">{p.paymentsSub}</div>
          </div>
          <button
            type="button"
            className="fl-btn primary sm"
            onClick={() => setFormOpen(true)}
          >
            <Plus strokeWidth={2} />
            {p.recordPayment}
          </button>
        </div>
        <div className="fl-tbl-wrap">
          <table className="fl-tbl">
            <thead>
              <tr>
                <th>{b.reference}</th>
                <th>{b.company}</th>
                <th>{b.amount}</th>
                <th>{p.method}</th>
                <th>{p.card}</th>
                <th>{b.status}</th>
                <th>{p.paidAt}</th>
                <th className="w-[9rem]">{s.actions}</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm fl-faint">
                    {p.noPayments}
                  </td>
                </tr>
              ) : (
                payments.map((row) => (
                  <tr key={row.id}>
                    <td className="fl-mono">{row.number}</td>
                    <td>
                      <b>{row.organization?.name ?? "—"}</b>
                      {row.invoice?.number ? (
                        <div className="fl-faint fl-tny">{row.invoice.number}</div>
                      ) : null}
                    </td>
                    <td className="fl-mono">
                      {formatPlatformMoney(Number(row.amount), row.currency)}
                    </td>
                    <td className="fl-muted">{p.methods[row.method]}</td>
                    <td>
                      {row.method === "card" ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <CreditCard className="size-3.5 fl-faint" />
                          {row.card_brand ? p.cardBrands[row.card_brand] : "—"}
                          {row.card_last4 ? (
                            <span className="fl-mono fl-faint">•••• {row.card_last4}</span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <span
                        className={cn(
                          "fl-badge text-[11px]",
                          PAYMENT_STATUS_BADGE[row.status]
                        )}
                      >
                        {p.statuses[row.status]}
                      </span>
                    </td>
                    <td className="fl-faint fl-tny">
                      {row.paid_at
                        ? format(new Date(row.paid_at), "dd MMM yyyy", {
                            locale: dateLocale,
                          })
                        : "—"}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {row.status !== "succeeded" ? (
                          <button
                            type="button"
                            className="fl-btn sm ghost"
                            disabled={pending}
                            title={p.markSucceeded}
                            onClick={() => handleStatus(row.id, "succeeded")}
                          >
                            <CheckCircle2 className="size-3.5 text-[var(--emerald)]" />
                          </button>
                        ) : null}
                        {row.status === "pending" || row.status === "processing" ? (
                          <button
                            type="button"
                            className="fl-btn sm ghost"
                            disabled={pending}
                            title={p.markFailed}
                            onClick={() => handleStatus(row.id, "failed")}
                          >
                            <XCircle className="size-3.5 text-[var(--rose)]" />
                          </button>
                        ) : null}
                        {row.status === "succeeded" ? (
                          <button
                            type="button"
                            className="fl-btn sm ghost"
                            disabled={pending}
                            title={p.markRefunded}
                            onClick={() => handleStatus(row.id, "refunded")}
                          >
                            <RotateCcw className="size-3.5" />
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
                          title={p.deletePaymentTitle}
                          description={p.deletePaymentConfirm.replace(
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

      <RecordPaymentDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        companies={companies}
        invoices={invoices}
        onSaved={refresh}
      />
    </div>
  );
}
