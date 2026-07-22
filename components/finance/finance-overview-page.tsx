"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import {
  loadExpenses,
  loadInvoices,
} from "@/lib/finance/storage";
import type { ExpenseRecord, InvoiceRecord } from "@/lib/finance/types";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function formatAmount(value: number): { value: string; unit?: string } {
  if (value <= 0) return { value: "0" };
  if (value >= 1_000_000) {
    return {
      value: (value / 1_000_000).toFixed(2).replace(/\.?0+$/, ""),
      unit: "M",
    };
  }
  if (value >= 1_000) {
    return { value: String(Math.round(value / 1_000)), unit: "K" };
  }
  return { value: String(Math.round(value)) };
}

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function FinanceOverviewPage() {
  const dict = useDict();
  const fin = dict.fusion.finance;
  const l = dict.fusion.labels;
  const empty = dict.fusion.reports.noData;
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);

  useEffect(() => {
    setInvoices(loadInvoices());
    setExpenses(loadExpenses());
  }, []);

  const hasData = invoices.length > 0 || expenses.length > 0;

  const stats = useMemo(() => {
    const paid = invoices
      .filter((x) => x.status === "paid")
      .reduce((s, x) => s + x.amount, 0);
    const receivables = invoices
      .filter((x) => x.status === "pending" || x.status === "overdue")
      .reduce((s, x) => s + x.amount, 0);

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${now.getMonth()}`;
    const burn = expenses
      .filter((x) => monthKey(x.date) === thisMonth)
      .reduce((s, x) => s + x.amount, 0);

    const cash = paid - expenses.reduce((s, x) => s + x.amount, 0);
    const runway =
      burn > 0 && cash > 0 ? Math.max(0, Math.round((cash / burn) * 10) / 10) : 0;

    const months: string[] = [];
    const inflows: number[] = [];
    const outflows: number[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push(
        d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")
      );
      inflows.push(
        Math.round(
          invoices
            .filter((x) => x.status === "paid" && monthKey(x.updatedAt) === key)
            .reduce((s, x) => s + x.amount, 0)
        )
      );
      outflows.push(
        Math.round(
          expenses
            .filter((x) => monthKey(x.date) === key)
            .reduce((s, x) => s + x.amount, 0)
        )
      );
    }

    const byCat = new Map<string, number>();
    for (const e of expenses) {
      byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    }
    const breakdown = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const expenseTotal = expenses.reduce((s, x) => s + x.amount, 0);

    return {
      cash,
      receivables,
      burn,
      runway,
      months,
      inflows,
      outflows,
      breakdown,
      expenseTotal,
    };
  }, [invoices, expenses]);

  const cashFmt = formatAmount(Math.abs(stats.cash));
  const recvFmt = formatAmount(stats.receivables);
  const burnFmt = formatAmount(stats.burn);
  const expenseFmt = formatAmount(stats.expenseTotal);

  return (
    <div className="space-y-[18px]">
      {!hasData ? (
        <div className="fl-card fl-pad text-center">
          <p className="text-[13px] text-[var(--muted)]">{empty}</p>
        </div>
      ) : null}
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{fin.cashOnHand}</div>
          <StatLine
            value={hasData ? `${stats.cash < 0 ? "-" : ""}${cashFmt.value}` : "—"}
            unit={
              hasData
                ? cashFmt.unit
                  ? `${cashFmt.unit} MAD`
                  : "MAD"
                : undefined
            }
          />
          <div className="k-foot fl-faint mt-2">{fin.bankNote}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{fin.receivables}</div>
          <StatLine
            value={hasData ? recvFmt.value : "—"}
            unit={
              hasData
                ? recvFmt.unit
                  ? `${recvFmt.unit} MAD`
                  : "MAD"
                : undefined
            }
          />
          <div className="k-foot fl-faint mt-2">
            {hasData ? dict.fusion.invoices.outstanding : empty}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{fin.monthlyBurn}</div>
          <StatLine
            value={hasData ? burnFmt.value : "—"}
            unit={
              hasData
                ? burnFmt.unit
                  ? `${burnFmt.unit} MAD`
                  : "MAD"
                : undefined
            }
          />
          <div className="k-foot fl-faint mt-2">{l.thisMonth}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{dict.fusion.dashboard.runway}</div>
          <StatLine
            value={hasData && stats.burn > 0 ? String(stats.runway) : "—"}
            unit={hasData && stats.burn > 0 ? l.months : undefined}
          />
          <div className="k-foot fl-faint mt-2">{l.atCurrentBurn}</div>
        </div>
      </div>
      <div className="grid gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{fin.cashFlow}</h3>
              <div className="ch-sub">{fin.cashFlowSub}</div>
            </div>
          </div>
          <div className="fl-pad">
            {hasData ? (
              <div className="h-[250px]">
                <Chart
                  type="bar"
                  height={250}
                  series={[
                    { name: dict.fusion.invoices.paidMonth, data: stats.inflows },
                    { name: fin.monthlyBurn, data: stats.outflows },
                  ]}
                  options={{
                    chart: {
                      toolbar: { show: false },
                      background: "transparent",
                      stacked: false,
                    },
                    colors: ["#3ecf8e", "#d63e63"],
                    dataLabels: { enabled: false },
                    plotOptions: { bar: { borderRadius: 6, columnWidth: "55%" } },
                    xaxis: {
                      categories: stats.months,
                      labels: {
                        style: { colors: "#646b81", fontSize: "10px" },
                      },
                    },
                    yaxis: { labels: { style: { colors: "#646b81" } } },
                    legend: { labels: { colors: "#646b81" } },
                    grid: { borderColor: "rgba(255,255,255,0.06)" },
                    tooltip: { theme: "dark" },
                  }}
                />
              </div>
            ) : (
              <div className="flex h-[250px] items-center justify-center">
                <p className="text-[13px] text-[var(--muted)]">{empty}</p>
              </div>
            )}
          </div>
        </div>
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{fin.expenseBreakdown}</h3>
              <div className="ch-sub">{l.thisMonth}</div>
            </div>
          </div>
          <div className="fl-pad">
            {hasData && stats.breakdown.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-[var(--glass-hi)] px-4 py-3 text-center">
                  <div className="fl-mono text-[22px] font-semibold">
                    {expenseFmt.value}
                    {expenseFmt.unit ? expenseFmt.unit : ""}
                  </div>
                  <div className="fl-faint fl-tny mt-1">MAD</div>
                </div>
                <ul className="space-y-2">
                  {stats.breakdown.map(([cat, amount]) => {
                    const fmt = formatAmount(amount);
                    const pct =
                      stats.expenseTotal > 0
                        ? Math.round((amount / stats.expenseTotal) * 100)
                        : 0;
                    return (
                      <li
                        key={cat}
                        className="flex items-center justify-between gap-2 text-[12px]"
                      >
                        <span className="truncate capitalize text-[var(--muted)]">
                          {cat}
                        </span>
                        <span className="fl-mono shrink-0">
                          {fmt.value}
                          {fmt.unit ?? ""} · {pct}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="flex h-[180px] items-center justify-center rounded-xl bg-[var(--glass-hi)]">
                <div className="text-center">
                  <div className="fl-mono text-[22px] font-semibold">—</div>
                  <div className="fl-faint fl-tny mt-1">MAD</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
