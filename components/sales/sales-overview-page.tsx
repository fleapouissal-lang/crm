"use client";

import { useDict } from "@/components/shared/i18n-provider";
import { StatLine, FlProgress } from "@/components/fusion/primitives";

/** Empty sales overview — no demo KPIs or recent deals. */
export function SalesOverviewPage() {
  const dict = useDict();
  const s = dict.fusion.sales;
  const l = dict.fusion.labels;
  const empty = dict.fusion.reports.noData;

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad text-center">
        <p className="text-[13px] text-[var(--muted)]">{empty}</p>
      </div>

      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{s.quotaAttainment}</div>
          <StatLine value="—" />
          <FlProgress value={0} className="mt-3 [&>i]:!bg-[var(--emerald)]" />
          <div className="k-foot mt-2 fl-faint">{empty}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.closedQ3}</div>
          <StatLine value="—" />
          <div className="k-foot mt-2 fl-faint">{empty}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.avgDealSize}</div>
          <StatLine value="—" />
          <div className="k-foot mt-2 fl-faint">{empty}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.salesCycle}</div>
          <StatLine value="—" unit={l.days} />
          <div className="k-foot mt-2 fl-faint">{empty}</div>
        </div>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{s.bookingsForecast}</h3>
              <div className="ch-sub">{s.bookingsForecastSub}</div>
            </div>
          </div>
          <div className="fl-pad flex h-[250px] items-center justify-center">
            <p className="text-[13px] text-[var(--muted)]">{empty}</p>
          </div>
        </div>
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{s.repLeaderboard}</h3>
              <div className="ch-sub">{l.quarterToDate}</div>
            </div>
          </div>
          <div className="fl-pad flex h-[200px] items-center justify-center">
            <p className="text-[13px] text-[var(--muted)]">{empty}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
