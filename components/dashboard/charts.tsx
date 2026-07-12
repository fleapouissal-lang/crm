"use client";

import dynamic from "next/dynamic";
import type { LeadStage } from "@/types/database";
import { getIntlLocale } from "@/lib/i18n/locale-utils";
import { useDict, useI18n } from "@/components/shared/i18n-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

interface PipelineChartProps {
  trend: { date: string; value: number }[];
}

export function PipelineTrendChart({ trend }: PipelineChartProps) {
  const dict = useDict();
  const { locale } = useI18n();
  const dateLocale = getIntlLocale(locale);

  const categories = trend.map((t) => {
    const d = new Date(t.date + "T00:00:00");
    return d.toLocaleDateString(dateLocale, { month: "short", day: "numeric" });
  });
  const series = [{ name: dict.common.value, data: trend.map((t) => t.value) }];

  return (
    <div className="fl-card">
      <div className="fl-card-head">
        <div>
          <h3>{dict.dashboard.pipelineTrend}</h3>
          <div className="ch-sub">{dict.dashboard.subtitle}</div>
        </div>
        <div className="fl-seg">
          <button type="button" className="on">
            {dict.common.value}
          </button>
        </div>
      </div>
      <div className="fl-pad">
        <div className="relative w-full" style={{ height: 264 }}>
          <Chart
            type="area"
            height={264}
            series={series}
            options={{
              chart: {
                toolbar: { show: false },
                fontFamily: "inherit",
                zoom: { enabled: false },
                background: "transparent",
              },
              dataLabels: { enabled: false },
              stroke: { curve: "smooth", width: 2 },
              fill: {
                type: "gradient",
                gradient: {
                  shadeIntensity: 1,
                  opacityFrom: 0.35,
                  opacityTo: 0.02,
                },
              },
              colors: ["#52525b"],
              xaxis: {
                categories,
                labels: {
                  style: { colors: "#646b81", fontSize: "11px" },
                  showDuplicates: false,
                },
                axisBorder: { show: false },
                axisTicks: { show: false },
              },
              yaxis: {
                labels: {
                  style: { colors: "#646b81", fontSize: "11px" },
                  formatter: (v: number) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`,
                },
              },
              grid: {
                borderColor: "rgba(255,255,255,0.06)",
                strokeDashArray: 4,
              },
              tooltip: {
                theme: "dark",
                y: {
                  formatter: (v: number) =>
                    new Intl.NumberFormat(dateLocale, {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(v),
                },
              },
            }}
          />
        </div>
        <div className="fl-legend">
          <span>
            <i style={{ background: "var(--iris)" }} />
            {dict.dashboard.pipelineTrend}
          </span>
        </div>
      </div>
    </div>
  );
}

interface BreakdownProps {
  data: { stage: LeadStage; count: number; value: number }[];
}

export function PipelineBreakdownChart({ data }: BreakdownProps) {
  const dict = useDict();
  const labels = data.map((d) => dict.stages[d.stage]);
  const series = data.map((d) => d.count);
  const colors = [
    "#646b81",
    "#71717a",
    "#3ecf8e",
    "#ff7a3d",
    "#8b5cf6",
    "#3ecf8e",
    "#f2557a",
  ];
  const total = series.reduce((a, b) => a + b, 0);

  return (
    <div className="fl-card">
      <div className="fl-card-head">
        <div>
          <h3>{dict.dashboard.leadsByStage}</h3>
          <div className="ch-sub">{dict.nav.leads}</div>
        </div>
      </div>
      <div className="fl-pad">
        {series.length === 0 ? (
          <div className="flex h-[230px] items-center justify-center text-sm fl-faint">
            {dict.dashboard.noLeads}
          </div>
        ) : (
          <>
            <div className="relative w-full" style={{ height: 190 }}>
              <Chart
                type="donut"
                height={190}
                series={series}
                options={{
                  labels,
                  colors,
                  chart: { fontFamily: "inherit", background: "transparent" },
                  legend: { show: false },
                  dataLabels: { enabled: false },
                  stroke: { width: 0 },
                  plotOptions: {
                    pie: {
                      donut: {
                        size: "72%",
                      },
                    },
                  },
                }}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-[family-name:var(--font-display)] text-2xl font-semibold">
                  {total}
                </div>
                <div className="fl-faint text-[11px]">{dict.nav.leads}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-[11px]">
              {data.map((d, i) => (
                <div key={d.stage} className="flex items-center gap-2.5">
                  <i
                    className="size-[9px] rounded-[3px]"
                    style={{ background: colors[i % colors.length] }}
                  />
                  <span className="flex-1 text-[12.5px]">{dict.stages[d.stage]}</span>
                  <b className="fl-mono fl-tny">{d.count}</b>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
