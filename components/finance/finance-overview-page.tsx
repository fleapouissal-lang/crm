"use client";

import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";

/** Empty finance overview — no demo KPIs. */
export function FinanceOverviewPage() {
  const dict = useDict();
  const fin = dict.fusion.finance;
  const l = dict.fusion.labels;
  const empty = dict.fusion.reports.noData;

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad text-center">
        <p className="text-[13px] text-[var(--muted)]">{empty}</p>
      </div>
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{fin.cashOnHand}</div>
          <StatLine value="—" />
          <div className="k-foot fl-faint mt-2">{fin.bankNote}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{fin.receivables}</div>
          <StatLine value="—" />
          <div className="k-foot fl-faint mt-2">{empty}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{fin.monthlyBurn}</div>
          <StatLine value="—" />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{dict.fusion.dashboard.runway}</div>
          <StatLine value="—" unit={l.months} />
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
          <div className="fl-pad flex h-[250px] items-center justify-center">
            <p className="text-[13px] text-[var(--muted)]">{empty}</p>
          </div>
        </div>
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{fin.expenseBreakdown}</h3>
              <div className="ch-sub">{l.thisMonth}</div>
            </div>
          </div>
          <div className="fl-pad flex h-[180px] items-center justify-center rounded-xl bg-[var(--glass-hi)]">
            <div className="text-center">
              <div className="fl-mono text-[22px] font-semibold">—</div>
              <div className="fl-faint fl-tny mt-1">MAD</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
