"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useDict } from "@/components/shared/i18n-provider";
import {
  FunnelBar,
  StatLine,
  FlProgress,
  FlAva,
} from "@/components/fusion/primitives";
import { colorForMemberId, initialsFromName } from "@/lib/team/members";
import type { Lead, LeadStage, Profile } from "@/types/database";

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

function quarterStart(d = new Date()): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

export function SalesOverviewPage({
  leads = [],
  profiles = [],
}: {
  leads?: Lead[];
  profiles?: Profile[];
}) {
  const dict = useDict();
  const s = dict.fusion.sales;
  const m = dict.fusion.marketing;
  const l = dict.fusion.labels;
  const empty = dict.fusion.reports.noData;
  const hasLeads = leads.length > 0;

  const sales = useMemo(() => {
    const won = leads.filter((x) => x.stage === "won");
    const lost = leads.filter((x) => x.stage === "lost");
    const open = leads.filter(
      (x) => x.stage !== "won" && x.stage !== "lost"
    );
    const closed = won.length + lost.length;
    const winRate = closed === 0 ? 0 : Math.round((won.length / closed) * 100);

    const q0 = quarterStart().getTime();
    const wonQ = won.filter((x) => new Date(x.updated_at).getTime() >= q0);
    const closedValueQ = wonQ.reduce(
      (sum, x) => sum + (Number(x.value) || 0),
      0
    );

    const avgDeal =
      won.length === 0
        ? 0
        : won.reduce((sum, x) => sum + (Number(x.value) || 0), 0) /
          won.length;

    const cycleDays =
      won.length === 0
        ? 0
        : Math.round(
            won.reduce(
              (sum, x) => sum + daysBetween(x.created_at, x.updated_at),
              0
            ) / won.length
          );

    const months: string[] = [];
    const booked: number[] = [];
    const pipelineByMonth: number[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months.push(
        d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")
      );
      booked.push(
        Math.round(
          won
            .filter((x) => {
              const u = new Date(x.updated_at);
              return `${u.getFullYear()}-${u.getMonth()}` === key;
            })
            .reduce((sum, x) => sum + (Number(x.value) || 0), 0)
        )
      );
      pipelineByMonth.push(
        Math.round(
          open
            .filter((x) => {
              const u = new Date(x.updated_at);
              return `${u.getFullYear()}-${u.getMonth()}` === key;
            })
            .reduce((sum, x) => sum + (Number(x.value) || 0), 0)
        )
      );
    }

    const byRep = new Map<
      string,
      {
        name: string;
        initials: string;
        color: string;
        value: number;
        count: number;
      }
    >();
    for (const lead of won) {
      const id = lead.assigned_to ?? "unassigned";
      const profile = profiles.find((p) => p.id === id);
      const name =
        lead.assigned_profile?.full_name ??
        profile?.full_name ??
        profile?.email ??
        (id === "unassigned" ? "-" : id.slice(0, 8));
      const prev = byRep.get(id) ?? {
        name,
        initials: initialsFromName(name),
        color: colorForMemberId(id),
        value: 0,
        count: 0,
      };
      prev.value += Number(lead.value) || 0;
      prev.count += 1;
      byRep.set(id, prev);
    }

    return {
      winRate,
      closedValueQ,
      avgDeal,
      cycleDays,
      months,
      booked,
      pipelineByMonth,
      leaderboard: [...byRep.values()]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5),
      openCount: open.length,
    };
  }, [leads, profiles]);

  const marketing = useMemo(() => {
    const open = leads.filter((lead) => OPEN_STAGES.includes(lead.stage));
    const pipeline = open.reduce((sum, lead) => sum + (Number(lead.value) || 0), 0);
    const mql = leads.filter(
      (lead) => lead.stage === "qualified" || lead.stage === "proposal"
    ).length;
    const sql = leads.filter(
      (lead) => lead.stage === "negotiation" || lead.stage === "won"
    ).length;

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
        leads.filter((lead) => {
          const c = new Date(lead.created_at);
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
      leadCount: leads.length,
    };
  }, [leads]);

  const closedFmt = formatAmount(sales.closedValueQ);
  const avgFmt = formatAmount(sales.avgDeal);
  const pipeFmt = formatAmount(marketing.pipeline);
  const maxFunnel = Math.max(
    1,
    marketing.byStage.new + marketing.byStage.contacted,
    marketing.byStage.qualified,
    marketing.byStage.proposal,
    marketing.byStage.negotiation,
    marketing.byStage.won
  );

  return (
    <div className="space-y-[18px]">
      {!hasLeads ? (
        <div className="fl-card fl-pad text-center">
          <p className="text-[13px] text-[var(--muted)]">{empty}</p>
        </div>
      ) : null}

      <div className="fl-card-head px-0.5">
        <div>
          <h3>{dict.nav.sales}</h3>
          <div className="ch-sub">{dict.nav.salesSub}</div>
        </div>
      </div>

      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{s.quotaAttainment}</div>
          <StatLine value={hasLeads ? `${sales.winRate}%` : "-"} />
          <FlProgress
            value={hasLeads ? sales.winRate : 0}
            className="mt-3 [&>i]:!bg-[var(--emerald)]"
          />
          <div className="k-foot mt-2 fl-faint">
            {hasLeads ? dict.fusion.crm.winRate : empty}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.closedQ3}</div>
          <StatLine
            value={hasLeads ? closedFmt.value : "-"}
            unit={
              hasLeads
                ? closedFmt.unit
                  ? `${closedFmt.unit} MAD`
                  : "MAD"
                : undefined
            }
          />
          <div className="k-foot mt-2 fl-faint">
            {hasLeads ? l.quarterToDate : empty}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.avgDealSize}</div>
          <StatLine
            value={hasLeads ? avgFmt.value : "-"}
            unit={
              hasLeads
                ? avgFmt.unit
                  ? `${avgFmt.unit} MAD`
                  : "MAD"
                : undefined
            }
          />
          <div className="k-foot mt-2 fl-faint">
            {hasLeads ? dict.fusion.crm.won : empty}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.salesCycle}</div>
          <StatLine
            value={hasLeads ? String(sales.cycleDays) : "-"}
            unit={hasLeads ? l.days : undefined}
          />
          <div className="k-foot mt-2 fl-faint">
            {hasLeads
              ? `${sales.openCount} ${dict.fusion.crm.totalPipeline.toLowerCase()}`
              : empty}
          </div>
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
          <div className="fl-pad">
            {hasLeads ? (
              <div className="h-[250px]">
                <Chart
                  type="area"
                  height={250}
                  series={[
                    { name: dict.fusion.crm.won, data: sales.booked },
                    {
                      name: dict.fusion.crm.totalPipeline,
                      data: sales.pipelineByMonth,
                    },
                  ]}
                  options={{
                    chart: {
                      toolbar: { show: false },
                      background: "transparent",
                    },
                    colors: ["#3ecf8e", "#52525b"],
                    dataLabels: { enabled: false },
                    stroke: { curve: "smooth", width: 2 },
                    fill: {
                      type: "gradient",
                      gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
                    },
                    xaxis: {
                      categories: sales.months,
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
              <h3>{s.repLeaderboard}</h3>
              <div className="ch-sub">{l.quarterToDate}</div>
            </div>
          </div>
          <div className="fl-pad">
            {hasLeads && sales.leaderboard.length > 0 ? (
              <ul className="space-y-3">
                {sales.leaderboard.map((rep) => {
                  const fmt = formatAmount(rep.value);
                  return (
                    <li
                      key={`${rep.name}-${rep.initials}`}
                      className="flex items-center gap-3"
                    >
                      <FlAva sm style={{ background: rep.color }}>
                        {rep.initials}
                      </FlAva>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">
                          {rep.name}
                        </div>
                        <div className="fl-faint text-[11px]">
                          {rep.count} {dict.fusion.crm.won.toLowerCase()}
                        </div>
                      </div>
                      <div className="fl-mono text-[13px] font-semibold">
                        {fmt.value}
                        {fmt.unit ? `${fmt.unit} ` : " "}
                        MAD
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="flex h-[200px] items-center justify-center">
                <p className="text-[13px] text-[var(--muted)]">{empty}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fl-card-head px-0.5 pt-2">
        <div>
          <h3>{dict.nav.marketing}</h3>
          <div className="ch-sub">{dict.nav.marketingSub}</div>
        </div>
      </div>

      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{m.sourcedPipeline}</div>
          <StatLine
            value={hasLeads ? pipeFmt.value : "-"}
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
          <StatLine value="-" />
          <div className="k-foot mt-2 fl-faint">{empty}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{m.siteSessions}</div>
          <StatLine value={hasLeads ? String(marketing.leadCount) : "-"} />
          <div className="k-foot mt-2 fl-faint">
            {hasLeads ? dict.fusion.crm.lead : empty}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{m.mqlSql}</div>
          <StatLine
            value={hasLeads ? `${marketing.mql}/${marketing.sql}` : "-"}
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
                  series={[
                    { name: dict.fusion.crm.lead, data: marketing.created },
                  ]}
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
                      categories: marketing.months,
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
                  value={String(
                    marketing.byStage.new + marketing.byStage.contacted
                  )}
                  width={`${((marketing.byStage.new + marketing.byStage.contacted) / maxFunnel) * 100}%`}
                  color="var(--text-faint)"
                />
                <FunnelBar
                  label={dict.fusion.crm.qualified}
                  value={String(marketing.byStage.qualified)}
                  width={`${(marketing.byStage.qualified / maxFunnel) * 100}%`}
                  color="var(--sky)"
                />
                <FunnelBar
                  label={dict.fusion.crm.proposal}
                  value={String(marketing.byStage.proposal)}
                  width={`${(marketing.byStage.proposal / maxFunnel) * 100}%`}
                  color="var(--gold)"
                />
                <FunnelBar
                  label={dict.fusion.crm.negotiation}
                  value={String(marketing.byStage.negotiation)}
                  width={`${(marketing.byStage.negotiation / maxFunnel) * 100}%`}
                  color="var(--iris)"
                />
                <FunnelBar
                  label={dict.fusion.crm.won}
                  value={String(marketing.byStage.won)}
                  width={`${(marketing.byStage.won / maxFunnel) * 100}%`}
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
