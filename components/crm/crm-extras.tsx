"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { FunnelBar, StatLine } from "@/components/fusion/primitives";
import { useDict } from "@/components/shared/i18n-provider";
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
    return { value: (value / 1_000_000).toFixed(2).replace(/\.?0+$/, ""), unit: "M" };
  }
  if (value >= 1_000) {
    return { value: String(Math.round(value / 1_000)), unit: "K" };
  }
  return { value: String(Math.round(value)) };
}

function computeKpis(leads: Lead[]) {
  const open = leads.filter((l) => OPEN_STAGES.includes(l.stage));
  const won = leads.filter((l) => l.stage === "won");
  const lost = leads.filter((l) => l.stage === "lost");
  const closed = won.length + lost.length;

  const pipeline = open.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  // No probability field — use a simple stage weight for open deals
  const stageWeight: Partial<Record<LeadStage, number>> = {
    new: 0.1,
    contacted: 0.2,
    qualified: 0.35,
    proposal: 0.5,
    negotiation: 0.7,
  };
  const weighted = open.reduce(
    (sum, l) => sum + (Number(l.value) || 0) * (stageWeight[l.stage] ?? 0.25),
    0
  );
  const winRate = closed === 0 ? 0 : Math.round((won.length / closed) * 100);

  const staleCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const stale = open.filter(
    (l) =>
      (l.stage === "proposal" || l.stage === "negotiation") &&
      new Date(l.updated_at).getTime() < staleCutoff
  ).length;

  return { pipeline, weighted, winRate, stale, open, won, leads };
}

export function CrmPipelineExtras({ leads = [] }: { leads?: Lead[] }) {
  const dict = useDict();
  const f = dict.fusion;
  const empty = f.reports.noData;

  const counts = useMemo(() => {
    const byStage: Record<string, number> = {
      new: 0,
      qualified: 0,
      proposal: 0,
      negotiation: 0,
      won: 0,
    };
    for (const lead of leads) {
      if (lead.stage in byStage) byStage[lead.stage] += 1;
      if (lead.stage === "contacted") byStage.new += 1;
    }
    return byStage;
  }, [leads]);

  const max = Math.max(1, ...Object.values(counts));
  const hasData = leads.length > 0;

  return (
    <div className="grid mt gap-[18px]" style={{ gridTemplateColumns: "1fr 1fr" }}>
      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{f.crm.stageConversion}</h3>
            <div className="ch-sub">{f.crm.dealsFunnel}</div>
          </div>
        </div>
        <div className="fl-pad">
          {hasData ? (
            <>
              <FunnelBar
                label={f.crm.lead}
                value={String(counts.new)}
                width={`${(counts.new / max) * 100}%`}
                color="var(--text-faint)"
              />
              <FunnelBar
                label={f.crm.qualified}
                value={String(counts.qualified)}
                width={`${(counts.qualified / max) * 100}%`}
                color="var(--sky)"
              />
              <FunnelBar
                label={f.crm.proposal}
                value={String(counts.proposal)}
                width={`${(counts.proposal / max) * 100}%`}
                color="var(--gold)"
              />
              <FunnelBar
                label={f.crm.negotiation}
                value={String(counts.negotiation)}
                width={`${(counts.negotiation / max) * 100}%`}
                color="var(--iris)"
              />
              <FunnelBar
                label={f.crm.won}
                value={String(counts.won)}
                width={`${(counts.won / max) * 100}%`}
                color="var(--emerald)"
              />
            </>
          ) : (
            <p className="py-10 text-center text-[13px] text-[var(--muted)]">{empty}</p>
          )}
        </div>
      </div>
      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{f.crm.leadSources}</h3>
            <div className="ch-sub">{f.crm.leadSourcesSub}</div>
          </div>
        </div>
        <div className="fl-pad">
          {hasData ? (
            <div className="h-[230px]">
              <Chart
                type="bar"
                height={230}
                series={[
                  {
                    data: [
                      counts.new,
                      counts.qualified,
                      counts.proposal,
                      counts.negotiation,
                      counts.won,
                      0,
                    ],
                  },
                ]}
                options={{
                  chart: { toolbar: { show: false }, background: "transparent" },
                  colors: ["#52525b"],
                  plotOptions: { bar: { borderRadius: 8, columnWidth: "55%" } },
                  dataLabels: { enabled: false },
                  xaxis: {
                    categories: [
                      f.crm.lead,
                      f.crm.qualified,
                      f.crm.proposal,
                      f.crm.negotiation,
                      f.crm.won,
                      "—",
                    ],
                    labels: { style: { colors: "#646b81", fontSize: "10px" } },
                  },
                  yaxis: { labels: { style: { colors: "#646b81" } } },
                  grid: { borderColor: "rgba(255,255,255,0.06)" },
                }}
              />
            </div>
          ) : (
            <p className="flex h-[230px] items-center justify-center text-[13px] text-[var(--muted)]">
              {empty}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function CrmKpiRow({ leads = [] }: { leads?: Lead[] }) {
  const dict = useDict();
  const f = dict.fusion;
  const empty = f.reports.noData;
  const hasLeads = leads.length > 0;

  const { pipeline, weighted, winRate, stale } = useMemo(
    () => computeKpis(leads),
    [leads]
  );

  const pipelineFmt = formatAmount(pipeline);
  const weightedFmt = formatAmount(weighted);

  const kpis = [
    {
      label: f.crm.totalPipeline,
      value: hasLeads ? pipelineFmt.value : "—",
      unit: hasLeads
        ? pipelineFmt.unit
          ? `${pipelineFmt.unit} MAD`
          : "MAD"
        : undefined,
    },
    {
      label: f.crm.weightedForecast,
      value: hasLeads ? weightedFmt.value : "—",
      unit: hasLeads
        ? weightedFmt.unit
          ? `${weightedFmt.unit} MAD`
          : "MAD"
        : undefined,
    },
    {
      label: f.crm.winRate,
      value: hasLeads ? `${winRate}%` : "—",
    },
    {
      label: f.crm.staleDeals,
      value: hasLeads ? String(stale) : "—",
      badge: hasLeads && stale > 0 ? f.badges.needsFollowUp : undefined,
    },
  ];

  return (
    <div className="grid g-4 mb-[18px]">
      {kpis.map((k) => (
        <div key={k.label} className="fl-card fl-pad">
          <div className="k-label">{k.label}</div>
          <StatLine value={k.value} unit={k.unit} />
          {k.badge ? (
            <div className="k-foot mt-2">
              <span className="fl-badge b-amber">{k.badge}</span>
            </div>
          ) : !hasLeads ? (
            <div className="k-foot mt-2 fl-faint">{empty}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
