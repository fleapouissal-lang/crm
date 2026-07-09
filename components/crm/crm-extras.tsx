"use client";

import dynamic from "next/dynamic";
import { FunnelBar, StatLine, FlDelta } from "@/components/fusion/primitives";
import { useDict } from "@/components/shared/i18n-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export function CrmPipelineExtras() {
  const dict = useDict();
  const f = dict.fusion;

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
          <FunnelBar label={f.crm.lead} value="48" width="100%" color="var(--text-faint)" />
          <FunnelBar label={f.crm.qualified} value="34" width="71%" color="var(--sky)" />
          <FunnelBar label={f.crm.proposal} value="22" width="46%" color="var(--gold)" />
          <FunnelBar label={f.crm.negotiation} value="14" width="29%" color="var(--iris)" />
          <FunnelBar label={f.crm.won} value="9" width="19%" color="var(--emerald)" />
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
          <div className="h-[230px]">
            <Chart
              type="bar"
              height={230}
              series={[{ data: [38, 26, 18, 14, 11, 22] }]}
              options={{
                chart: { toolbar: { show: false }, background: "transparent" },
                colors: ["#52525b"],
                plotOptions: { bar: { borderRadius: 8, columnWidth: "55%" } },
                dataLabels: { enabled: false },
                xaxis: {
                  categories: ["Referral", "Pixel IT", "Inbound", "LinkedIn", "RFP portals", "Existing"],
                  labels: { style: { colors: "#646b81", fontSize: "10px" } },
                },
                yaxis: { labels: { style: { colors: "#646b81" } } },
                grid: { borderColor: "rgba(255,255,255,0.06)" },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CrmKpiRow() {
  const dict = useDict();
  const f = dict.fusion;

  const kpis = [
    { label: f.crm.totalPipeline, value: "1.24M", unit: "SAR", delta: "12%", foot: f.labels.qoq, up: true },
    { label: f.crm.weightedForecast, value: "612K", unit: "SAR", foot: f.labels.blendedWinProb },
    { label: f.crm.winRate, value: "41%", delta: "6pts", foot: f.labels.trailing90d, up: true },
    { label: f.crm.staleDeals, value: "2", badge: f.badges.needsFollowUp },
  ];

  return (
    <div className="grid g-4 mb-[18px]">
      {kpis.map((k) => (
        <div key={k.label} className="fl-card fl-pad">
          <div className="k-label">{k.label}</div>
          <StatLine value={k.value} unit={k.unit} />
          <div className="k-foot mt-2">
            {k.delta && <FlDelta up={k.up}>{k.delta}</FlDelta>}
            {k.badge ? <span className="fl-badge b-amber">{k.badge}</span> : k.foot}
          </div>
        </div>
      ))}
    </div>
  );
}
