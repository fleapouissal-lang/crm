"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useDict } from "@/components/shared/i18n-provider";
import { FunnelBar, StatLine } from "@/components/fusion/primitives";
import type { Lead, LeadStage } from "@/types/database";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

const OPEN_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
];

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

export function MarketingOverviewPage({ leads = [] }: { leads?: Lead[] }) {
  const dict = useDict();
  const m = dict.fusion.marketing;
  const empty = dict.fusion.reports.noData;
  const hasLeads = leads.length > 0;

  const stats = useMemo(() => {
    const open = leads.filter((l) => OPEN_STAGES.includes(l.stage));
    const pipeline = open.reduce((s, l) => s + (Number(l.value) || 0), 0);
    const mql = leads.filter(
      (l) => l.stage === "qualified" || l.stage === "proposal"
    ).length;
    const sql = leads.filter(
      (l) => l.stage === "negotiation" || l.stage === "won"
    ).length;
    const total = leads.length;

    const byStage: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
    };
    for (const lead of leads) {
      if (lead.stage in byStage) byStage[lead.stage] += 1;
    }

    const months: string[] = [];
    const created: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push(
        d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")
      );
      created.push(
        leads.filter((l) => {
          const c = new Date(l.created_at);
          return `${c.getFullYear()}-${c.getMonth()}` === key;
        }).length
      );
    }

    return {
      pipeline,
      mql,
      sql,
      byStage,
      months,
      created,
      sessionsProxy: total,
    };
  }, [leads]);

  const pipeFmt = formatAmount(stats.pipeline);
  const maxFunnel = Math.max(
    1,
    stats.byStage.new + stats.byStage.contacted,
    stats.byStage.qualified,
    stats.byStage.proposal,
    stats.byStage.negotiation,
    stats.byStage.won
  );

  return (
    <div className="space-y-[18px]">
      {!hasLeads ? (
        <div className="fl-card fl-pad text-center">
          <p className="text-[13px] text-[var(--muted)]">{empty}</p>
        </div>
      ) : null}

      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{m.sourcedPipeline}</div>
          <StatLine
            value={hasLeads ? pipeFmt.value : "—"}
            unit={
              hasLeads
                ? pipeFmt.unit
                  ? `${pipeFmt.unit} MAD`
                  : "MAD"
                : undefined
            }
          />
          <div className="k-foot mt-2 fl-faint">
            {hasLeads ? dict.fusion.crm.totalPipeline : empty}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{m.costPerLead}</div>
          <StatLine value={hasLeads ? "—" : "—"} />
          <div className="k-foot mt-2 fl-faint">{empty}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{m.siteSessions}</div>
          <StatLine value={hasLeads ? String(stats.sessionsProxy) : "—"} />
          <div className="k-foot mt-2 fl-faint">
            {hasLeads ? dict.fusion.crm.lead : empty}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{m.mqlSql}</div>
          <StatLine
            value={hasLeads ? `${stats.mql}/${stats.sql}` : "—"}
          />
          <div className="k-foot mt-2 fl-faint">
            {hasLeads
              ? `${dict.fusion.crm.qualified} / ${dict.fusion.crm.negotiation}`
              : empty}
          </div>
        </div>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[1.5fr_1fr]">
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{m.channelPerformance}</h3>
              <div className="ch-sub">{m.channelPerformanceSub}</div>
            </div>
          </div>
          <div className="fl-pad">
            {hasLeads ? (
              <div className="h-[250px]">
                <Chart
                  type="bar"
                  height={250}
                  series={[{ name: dict.fusion.crm.lead, data: stats.created }]}
                  options={{
                    chart: {
                      toolbar: { show: false },
                      background: "transparent",
                    },
                    colors: ["#52525b"],
                    plotOptions: {
                      bar: { borderRadius: 8, columnWidth: "55%" },
                    },
                    dataLabels: { enabled: false },
                    xaxis: {
                      categories: stats.months,
                      labels: {
                        style: { colors: "#646b81", fontSize: "10px" },
                      },
                    },
                    yaxis: { labels: { style: { colors: "#646b81" } } },
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
              <h3>{m.conversionFunnel}</h3>
              <div className="ch-sub">{m.conversionFunnelSub}</div>
            </div>
          </div>
          <div className="fl-pad">
            {hasLeads ? (
              <>
                <FunnelBar
                  label={dict.fusion.crm.lead}
                  value={String(stats.byStage.new + stats.byStage.contacted)}
                  width={`${((stats.byStage.new + stats.byStage.contacted) / maxFunnel) * 100}%`}
                  color="var(--text-faint)"
                />
                <FunnelBar
                  label={dict.fusion.crm.qualified}
                  value={String(stats.byStage.qualified)}
                  width={`${(stats.byStage.qualified / maxFunnel) * 100}%`}
                  color="var(--sky)"
                />
                <FunnelBar
                  label={dict.fusion.crm.proposal}
                  value={String(stats.byStage.proposal)}
                  width={`${(stats.byStage.proposal / maxFunnel) * 100}%`}
                  color="var(--gold)"
                />
                <FunnelBar
                  label={dict.fusion.crm.negotiation}
                  value={String(stats.byStage.negotiation)}
                  width={`${(stats.byStage.negotiation / maxFunnel) * 100}%`}
                  color="var(--iris)"
                />
                <FunnelBar
                  label={dict.fusion.crm.won}
                  value={String(stats.byStage.won)}
                  width={`${(stats.byStage.won / maxFunnel) * 100}%`}
                  color="var(--emerald)"
                />
              </>
            ) : (
              <div className="flex h-[250px] items-center justify-center">
                <p className="text-[13px] text-[var(--muted)]">{empty}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
