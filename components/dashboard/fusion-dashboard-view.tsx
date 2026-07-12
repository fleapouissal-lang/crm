"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  DollarSign,
  FolderKanban,
  TrendingUp,
  CheckCircle2,
  FileText,
  Target,
  Settings,
  Star,
} from "lucide-react";
import {
  Sparkline,
  CellMain,
  AvatarStack,
  FlProgress,
  FlDelta,
} from "@/components/fusion/primitives";
import type { Activity } from "@/types/database";
import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";
import { formatDistanceToNow } from "date-fns";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { useDict, useI18n } from "@/components/shared/i18n-provider";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

type BadgeKey = keyof FusionDictionary["badges"];

const projectsData = [
  { initials: "لم", grad: "linear-gradient(135deg,#52525b,#71717a)", title: "Easy Touch — Clinic SaaS", sub: "Phase 2 · LiveKit voice", client: "Abu Nasser", progress: 72, badge: "b-green", statusKey: "onTrack" as BadgeKey, team: [{ i: "YK", bg: "#52525b" }, { i: "OB", bg: "#3ecf8e" }] },
  { initials: "AL", grad: "linear-gradient(135deg,#ff7a3d,#e04bb8)", title: "AutoLog", sub: "Fleet + Renter Score", client: "ILM Voyages", progress: 58, badge: "b-green", statusKey: "onTrack" as BadgeKey, team: [{ i: "YK", bg: "#52525b" }, { i: "AC", bg: "#f5a623" }] },
  { initials: "SH", grad: "linear-gradient(135deg,#3ecf8e,#2fa876)", title: "Shegl Marketplace", sub: "Maintenance · v1.4", client: "Nasser Aleidan", progress: 94, badge: "b-blue", statusKey: "live" as BadgeKey, team: [{ i: "OB", bg: "#3ecf8e" }] },
  { initials: "MK", grad: "linear-gradient(135deg,#71717a,#4169d6)", title: "Makkah Chamber site", sub: "RFP · due Jul 10", client: "via Pixel IT", progress: 40, badge: "b-amber", statusKey: "bidStage" as BadgeKey, team: [{ i: "YK", bg: "#52525b" }, { i: "AC", bg: "#f5a623" }] },
  { initials: "ST", grad: "linear-gradient(135deg,#f2557a,#d63e63)", title: "Service Time PWA", sub: "QA & handoff", client: "via Pixel IT", progress: 81, badge: "b-gold", statusKey: "review" as BadgeKey, team: [{ i: "OB", bg: "#3ecf8e" }, { i: "YK", bg: "#52525b" }] },
];

const clientShare = [
  { name: "Pixel IT (Gulf)", pct: "34%", color: "var(--iris)" },
  { name: "Easy Touch", pct: "23%", color: "var(--iris-2)" },
  { name: "Natus Marrakech", pct: "18%", color: "var(--gold)" },
  { name: "Shegl · Kuwait", pct: "14%", color: "var(--emerald)" },
  { nameKey: "other" as const, pct: "11%", color: "var(--text-faint)" },
];

export function FusionDashboardView({ activities }: { activities: Activity[] }) {
  const dict = useDict();
  const { locale } = useI18n();
  const [revTab, setRevTab] = useState(0);
  const dateLocale = getDateFnsLocale(locale);
  const d = dict.fusion.dashboard;
  const l = dict.fusion.labels;
  const b = dict.fusion.badges;

  const dashboardKpis = [
    { label: d.revenueMtd, value: "248.6", cur: "K MAD", icon: DollarSign, color: "var(--emerald)", delta: "18.4%", foot: l.vsLastMonth, up: true, spark: [34, 30, 36, 32, 40, 38, 46, 44, 52, 50, 58, 64] },
    { label: d.activeProjects, value: "12", icon: FolderKanban, color: "var(--iris)", delta: "3", foot: l.newThisQuarter, up: true, spark: [8, 8, 9, 9, 10, 10, 11, 11, 11, 12, 12, 12] },
    { label: d.openPipeline, value: "1.24", cur: "M SAR", icon: TrendingUp, color: "var(--gold)", delta: d.dealsCount, foot: l.inNegotiation, up: true, spark: [20, 28, 26, 34, 32, 44, 42, 50, 56, 54, 62, 70] },
    { label: d.collectionRate, value: "86", cur: "%", icon: CheckCircle2, color: "var(--sky)", delta: "4.2%", foot: l.receivablesAging, up: false, spark: [90, 88, 92, 89, 86, 88, 84, 86, 83, 85, 86, 86] },
  ];

  const revTabs = [d.revenue, d.margin, d.runway];
  const miniKpis = [
    { label: d.avgDealCycle, value: d.avgDealCycleValue, spark: [42, 40, 38, 39, 35, 34, 33, 31], color: "var(--iris)" },
    { label: d.utilizationTeam, value: "78%", spark: [70, 72, 71, 74, 76, 75, 77, 78], color: "var(--emerald)" },
    { label: d.nps30d, value: "+62", spark: [48, 52, 50, 55, 58, 57, 60, 62], color: "var(--gold)" },
  ];

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        {dashboardKpis.map((kpi) => (
          <div key={kpi.label} className="fl-card fl-kpi">
            <div className="k-top">
              <div>
                <div className="k-label">{kpi.label}</div>
                <div className="k-val">
                  {kpi.value}
                  {kpi.cur && <span className="cur">{kpi.cur}</span>}
                </div>
              </div>
              <div className="k-ico">
                <kpi.icon style={{ color: kpi.color }} strokeWidth={2} className="size-[19px]" />
              </div>
            </div>
            <div className="k-foot">
              <FlDelta up={kpi.up}>{kpi.delta}</FlDelta>
              {kpi.foot}
            </div>
            <Sparkline data={kpi.spark} color={kpi.color} />
          </div>
        ))}
      </div>

      <div className="grid mt gap-[18px]" style={{ gridTemplateColumns: "1.65fr 1fr" }}>
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{d.revenueCollections}</h3>
              <div className="ch-sub">{d.revenueCollectionsSub}</div>
            </div>
            <div className="fl-seg">
              {revTabs.map((t, i) => (
                <button key={t} type="button" className={i === revTab ? "on" : ""} onClick={() => setRevTab(i)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="fl-pad">
            <div className="relative h-[264px] w-full">
              <Chart
                type="line"
                height={264}
                series={[
                  { name: d.billed, data: [128, 142, 138, 156, 168, 150, 172, 188, 196, 214, 228, 249] },
                  { name: d.collected, data: [118, 130, 126, 142, 150, 138, 158, 170, 178, 190, 206, 214] },
                  { name: d.target, data: [130, 140, 145, 150, 160, 165, 170, 185, 195, 205, 215, 240] },
                ]}
                options={{
                  chart: { toolbar: { show: false }, fontFamily: "inherit", background: "transparent" },
                  colors: ["#ff7a3d", "#3ecf8e", "#8b5cf6"],
                  stroke: { curve: "smooth", width: [2.5, 2.5, 1.5], dashArray: [0, 0, 5] },
                  fill: { type: ["gradient", "solid", "solid"], gradient: { opacityFrom: 0.25, opacityTo: 0 } },
                  dataLabels: { enabled: false },
                  xaxis: { categories: [...d.months], labels: { style: { colors: "#646b81", fontSize: "11px" } }, axisBorder: { show: false } },
                  yaxis: { labels: { style: { colors: "#646b81", fontFamily: "monospace", fontSize: "10px" } } },
                  grid: { borderColor: "rgba(255,255,255,0.06)" },
                  legend: { show: false },
                }}
              />
            </div>
            <div className="fl-legend">
              <span><i style={{ background: "var(--iris)" }} />{d.billedMad}</span>
              <span><i style={{ background: "var(--emerald)" }} />{d.collectedMad}</span>
              <span><i style={{ background: "var(--gold)", opacity: 0.6 }} />{d.target}</span>
            </div>
          </div>
        </div>

        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{d.revenueByClient}</h3>
              <div className="ch-sub">{d.revenueByClientSub}</div>
            </div>
          </div>
          <div className="fl-pad">
            <div className="relative h-[190px] w-full">
              <Chart
                type="donut"
                height={190}
                series={[34, 23, 18, 14, 11]}
                options={{
                  labels: clientShare.map((c) => ("nameKey" in c ? l.other : c.name)),
                  colors: ["#ff7a3d", "#e04bb8", "#8b5cf6", "#3ecf8e", "#646b81"],
                  chart: { background: "transparent" },
                  stroke: { width: 0 },
                  dataLabels: { enabled: false },
                  legend: { show: false },
                  plotOptions: { pie: { donut: { size: "72%" } } },
                }}
              />
              <div className="donut-center">
                <div className="dc-val">832K</div>
                <div className="dc-lab">{l.madEquiv}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-[11px]">
              {clientShare.map((c) => (
                <div key={"nameKey" in c ? c.nameKey : c.name} className="flex items-center gap-2.5">
                  <i className="size-[9px] rounded-[3px]" style={{ background: c.color }} />
                  <span className="flex-1 text-[12.5px]">{"nameKey" in c ? l.other : c.name}</span>
                  <b className="fl-mono fl-tny">{c.pct}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid mt gap-[18px] lg:grid-cols-3">
        <div className="fl-card lg:col-span-2">
          <div className="fl-card-head">
            <div>
              <h3>{d.projectsOnFloor}</h3>
              <div className="ch-sub">{d.projectsOnFloorSub}</div>
            </div>
            <Link href="/projects" className="fl-btn sm ghost">{l.viewAll}</Link>
          </div>
          <div className="fl-tbl-wrap mt-4">
            <table className="fl-tbl">
              <thead>
                <tr>
                  <th>{l.project}</th>
                  <th>{l.client}</th>
                  <th>{l.progress}</th>
                  <th>{l.health}</th>
                  <th>{l.team}</th>
                </tr>
              </thead>
              <tbody>
                {projectsData.map((p) => (
                  <tr key={p.title}>
                    <td>
                      <CellMain initials={p.initials} gradient={p.grad} title={p.title} sub={p.sub} />
                    </td>
                    <td className="fl-muted">{p.client}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <FlProgress value={p.progress} className="min-w-[80px]" />
                        <span className="fl-mono fl-tny fl-faint">{p.progress}%</span>
                      </div>
                    </td>
                    <td><span className={`fl-badge ${p.badge}`}>{b[p.statusKey]}</span></td>
                    <td><AvatarStack items={p.team.map((t) => ({ initials: t.i, bg: t.bg }))} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="fl-card">
          <div className="fl-card-head"><h3>{l.activity}</h3></div>
          <div className="fl-pad">
            {(activities.length ? activities.slice(0, 5).map((a) => ({
              icon: FileText,
              color: "var(--iris)",
              bg: "rgba(82,82,91,0.14)",
              text: <>{a.message}</>,
              time: formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: dateLocale }),
            })) : []).map((item, idx) => (
              <div key={idx} className="fl-act-item">
                <div className="fl-act-dot" style={{ background: item.bg }}>
                  <item.icon style={{ color: item.color, width: 15, height: 15 }} strokeWidth={2} />
                </div>
                <div className="at-body">
                  <p className="text-[13px] leading-snug">{item.text}</p>
                  <div className="at-time">{item.time}</div>
                </div>
              </div>
            ))}
            {!activities.length && (
              <p className="fl-faint text-sm py-4 text-center">{dict.dashboard.noActivity}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid g-3 mt">
        {miniKpis.map((m) => (
          <div key={m.label} className="fl-card fl-pad">
            <div className="mini flex flex-col gap-1">
              <span className="m-lab">{m.label}</span>
              <span className="m-val">{m.value}</span>
            </div>
            <Sparkline data={m.spark} color={m.color} />
          </div>
        ))}
      </div>
    </div>
  );
}
