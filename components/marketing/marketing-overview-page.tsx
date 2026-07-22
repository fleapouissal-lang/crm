"use client";

import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";

/** Empty marketing overview — no demo KPIs or funnel data. */
export function MarketingOverviewPage() {
  const dict = useDict();
  const m = dict.fusion.marketing;
  const empty = dict.fusion.reports.noData;

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad text-center">
        <p className="text-[13px] text-[var(--muted)]">{empty}</p>
      </div>

      <div className="grid g-4">
        {[
          { label: m.sourcedPipeline },
          { label: m.costPerLead },
          { label: m.siteSessions },
          { label: m.mqlSql },
        ].map((k) => (
          <div key={k.label} className="fl-card fl-pad">
            <div className="k-label">{k.label}</div>
            <StatLine value="—" />
            <div className="k-foot mt-2 fl-faint">{empty}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[1.5fr_1fr]">
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{m.channelPerformance}</h3>
              <div className="ch-sub">{m.channelPerformanceSub}</div>
            </div>
          </div>
          <div className="fl-pad flex h-[250px] items-center justify-center">
            <p className="text-[13px] text-[var(--muted)]">{empty}</p>
          </div>
        </div>
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{m.conversionFunnel}</h3>
              <div className="ch-sub">{m.conversionFunnelSub}</div>
            </div>
          </div>
          <div className="fl-pad flex h-[250px] items-center justify-center">
            <p className="text-[13px] text-[var(--muted)]">{empty}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
