"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { getDateFnsLocale, getIntlLocale } from "@/lib/i18n/locale-utils";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import type { ReportsData, ReportsPeriod } from "@/lib/actions/reports";
import { PipelineBreakdownChart } from "@/components/dashboard/charts";
import { ProjectReportsSection } from "@/components/reports/project-reports-section";
import { StatLine, FlProgress } from "@/components/fusion/primitives";
import { cn } from "@/lib/utils";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

function formatCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ReportsPageClient({ data }: { data: ReportsData }) {
  const dict = useDict();
  const r = dict.fusion.reports;
  const l = dict.fusion.labels;
  const { locale } = useI18n();
  const intlLocale = getIntlLocale(locale);
  const dateLocale = getDateFnsLocale(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = (searchParams.get("period") as ReportsPeriod) ?? data.period;

  const periods: { key: ReportsPeriod; label: string }[] = [
    { key: "weekly", label: l.weekly },
    { key: "monthly", label: l.monthly },
    { key: "quarterly", label: l.quarterly },
  ];

  function setPeriod(p: ReportsPeriod) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", p);
    router.push(`/reports?${params.toString()}`);
  }

  const kpis = useMemo(
    () => [
      {
        label: r.pipelineValue,
        value: formatCurrency(data.kpis.pipelineValue, intlLocale),
        sub: `${data.kpis.totalLeads} ${dict.nav.leads.toLowerCase()}`,
      },
      {
        label: r.wonRevenue,
        value: formatCurrency(data.kpis.wonValue, intlLocale),
        sub: r.recentDeals,
      },
      {
        label: r.conversionRate,
        value: `${data.kpis.conversionRate}%`,
        sub: dict.dashboard.conversionRateHint,
      },
      {
        label: r.tasksCompleted,
        value: String(data.kpis.tasksCompleted),
        sub: `${data.kpis.openTasks} ${r.openTasks}`,
      },
    ],
    [data, r, dict, intlLocale]
  );

  const pipelineCategories = data.pipelineTrend.map((t) => t.label);
  const pipelineSeries = [
    { name: dict.common.value, data: data.pipelineTrend.map((t) => t.value) },
  ];

  const taskLabels = data.tasksByStatus.map((t) => dict.taskStatus[t.status]);
  const taskSeries = [{ data: data.tasksByStatus.map((t) => t.count) }];

  const activityCategories = data.activitiesTrend.map((t) => t.label);
  const activitySeries = [
    { name: r.activityVolume, data: data.activitiesTrend.map((t) => t.count) },
  ];

  const maxTeamValue = Math.max(
    ...data.teamPerformance.map((t) => t.pipelineValue),
    1
  );

  return (
    <div className="space-y-[18px]">
      <div className="fl-filter-bar">
        <div className="fl-seg shrink-0">
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              className={cn(period === p.key && "on")}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="fl-tny fl-faint shrink-0">
          {r.dataFromDb} · {format(new Date(), "PPP", { locale: dateLocale })}
        </div>
      </div>

      <div className="grid g-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="fl-card fl-pad">
            <div className="k-label">{kpi.label}</div>
            <StatLine value={kpi.value} />
            <div className="k-foot fl-faint mt-2">{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[2fr_1fr]">
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{r.revenueByMarket}</h3>
              <div className="ch-sub">{r.revenueByMarketSub}</div>
            </div>
          </div>
          <div className="fl-pad">
            {data.pipelineTrend.every((t) => t.value === 0) ? (
              <div className="flex h-[270px] items-center justify-center text-sm fl-faint">
                {r.noData}
              </div>
            ) : (
              <Chart
                type="area"
                height={270}
                series={pipelineSeries}
                options={{
                  chart: {
                    toolbar: { show: false },
                    fontFamily: "inherit",
                    background: "transparent",
                  },
                  dataLabels: { enabled: false },
                  stroke: { curve: "smooth", width: 2 },
                  fill: {
                    type: "gradient",
                    gradient: { opacityFrom: 0.3, opacityTo: 0.02 },
                  },
                  colors: ["#52525b"],
                  xaxis: {
                    categories: pipelineCategories,
                    labels: { style: { fontSize: "11px" } },
                  },
                  yaxis: {
                    labels: {
                      formatter: (v: number) =>
                        v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v),
                    },
                  },
                  grid: { strokeDashArray: 4 },
                  tooltip: {
                    y: {
                      formatter: (v: number) => formatCurrency(v, intlLocale),
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        <PipelineBreakdownChart data={data.leadsByStage} />
      </div>

      <div className="grid gap-[18px] lg:grid-cols-3">
        <div className="fl-card">
          <div className="fl-card-head">
            <h3>{r.deliveryVelocity}</h3>
            <div className="ch-sub">{r.tasksByStatus}</div>
          </div>
          <div className="fl-pad">
            {data.tasksByStatus.length === 0 ? (
              <div className="flex h-[150px] items-center justify-center text-sm fl-faint">
                {r.noData}
              </div>
            ) : (
              <Chart
                type="bar"
                height={180}
                series={taskSeries}
                options={{
                  chart: { toolbar: { show: false }, fontFamily: "inherit" },
                  plotOptions: {
                    bar: { borderRadius: 6, columnWidth: "55%" },
                  },
                  colors: ["#3ecf8e"],
                  xaxis: { categories: taskLabels },
                  dataLabels: { enabled: false },
                  grid: { strokeDashArray: 4 },
                }}
              />
            )}
          </div>
        </div>

        <div className="fl-card">
          <div className="fl-card-head">
            <h3>{r.grossMargin}</h3>
            <div className="ch-sub">{r.activityVolume}</div>
          </div>
          <div className="fl-pad">
            <Chart
              type="line"
              height={180}
              series={activitySeries}
              options={{
                chart: { toolbar: { show: false }, fontFamily: "inherit" },
                stroke: { curve: "smooth", width: 2 },
                colors: ["#e6b567"],
                xaxis: { categories: activityCategories },
                dataLabels: { enabled: false },
                grid: { strokeDashArray: 4 },
              }}
            />
          </div>
        </div>

        <div className="fl-card">
          <div className="fl-card-head">
            <h3>{r.clientSatisfaction}</h3>
            <div className="ch-sub">{r.teamPerformance}</div>
          </div>
          <div className="fl-pad space-y-3">
            {data.teamPerformance.length === 0 ? (
              <p className="py-8 text-center text-sm fl-faint">{r.noData}</p>
            ) : (
              data.teamPerformance.map((member) => (
                <div key={member.profileId}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-medium">{member.name}</span>
                    <span className="fl-mono fl-faint">
                      {formatCurrency(member.pipelineValue, intlLocale)}
                    </span>
                  </div>
                  <FlProgress
                    value={Math.round((member.pipelineValue / maxTeamValue) * 100)}
                  />
                  <div className="mt-1 flex gap-3 fl-tny fl-faint">
                    <span>
                      {member.leads} {dict.nav.leads.toLowerCase()}
                    </span>
                    <span>
                      {member.tasksDone} {r.tasksDone}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {data.recentWon.length > 0 ? (
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{r.recentWonDeals}</h3>
              <div className="ch-sub">{r.recentDeals}</div>
            </div>
          </div>
          <div className="fl-tbl-wrap">
            <table className="fl-tbl">
              <thead>
                <tr>
                  <th>{dict.common.title}</th>
                  <th>{l.client}</th>
                  <th>{dict.common.value}</th>
                  <th>{r.dateColumn}</th>
                </tr>
              </thead>
              <tbody>
                {data.recentWon.map((deal) => (
                  <tr key={deal.id}>
                    <td className="font-medium">{deal.title}</td>
                    <td className="fl-muted">{deal.company ?? "—"}</td>
                    <td className="fl-mono">
                      {formatCurrency(deal.value, intlLocale)}
                    </td>
                    <td className="fl-faint fl-tny">
                      {format(new Date(deal.date), "dd MMM yyyy", {
                        locale: dateLocale,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <ProjectReportsSection />
    </div>
  );
}
