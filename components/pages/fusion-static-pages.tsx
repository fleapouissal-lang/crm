"use client";

import Link from "next/link";
import { Plus, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";
import {
  CellMain,
  StatLine,
  FlDelta,
  FlProgress,
  FlChip,
  FlAva,
  Sparkline,
  FunnelBar,
} from "@/components/fusion/primitives";

type BadgeKey = keyof FusionDictionary["badges"];

const calDays: { n: number; dim?: boolean; today?: boolean; ev?: { t: string; c: string }[] }[] = [
  { n: 30, dim: true }, { n: 1, ev: [{ t: "Natus retainer bill", c: "gr" }] }, { n: 2 },
  { n: 3, ev: [{ t: "Easy Touch standup", c: "ir" }] }, { n: 4 }, { n: 5, ev: [{ t: "Treasury QRA watch", c: "go" }] }, { n: 6 },
  { n: 7, ev: [{ t: "Sprint 14 planning", c: "ir" }] }, { n: 8, today: true, ev: [{ t: "Pixel IT sync", c: "ir" }, { t: "Makkah appendix", c: "ro" }] },
  { n: 9, ev: [{ t: "Makkah due (internal)", c: "ro" }] }, { n: 10, ev: [{ t: "Makkah RFP deadline", c: "ro" }] }, { n: 11 },
  { n: 12, ev: [{ t: "ElevenLabs cutover", c: "go" }] }, { n: 13 }, { n: 14, ev: [{ t: "Dalal · Samnan call", c: "ir" }] },
  { n: 15, ev: [{ t: "Payroll run", c: "gr" }] }, { n: 16 }, { n: 17, ev: [{ t: "Easy Touch Phase 2 sign", c: "go" }] },
  { n: 18, ev: [{ t: "Sprint 14 review", c: "ir" }] }, { n: 19 }, { n: 20 }, { n: 21, ev: [{ t: "AutoLog demo · ILM", c: "gr" }] },
  { n: 22, ev: [{ t: "Easy Touch milestone", c: "ir" }] }, { n: 23 }, { n: 24 }, { n: 25 }, { n: 26 }, { n: 27 }, { n: 28 }, { n: 29 },
  { n: 30, ev: [{ t: "Month-end close", c: "gr" }] }, { n: 31 }, { n: 1, dim: true },
];

export function CalendarPage() {
  const dict = useDict();
  const l = dict.fusion.labels;
  const d = dict.fusion.dashboard;
  const todayItems = [
    { t: "Pixel IT sync", s: "Financial reconciliation · 10:00", c: "var(--iris)" },
    { t: "Makkah appendix", s: "Deep work · 13:30", c: "var(--rose)" },
    { t: "Ouissal 1:1", s: "Voice pipeline · 16:00", c: "var(--emerald)" },
    { t: "Portfolio review", s: "HYPE · ENA window · 18:00", c: "var(--gold)" },
  ];
  return (
    <div className="grid gap-[18px] lg:grid-cols-[1fr_300px]">
      <div className="fl-card">
        <div className="fl-card-head">
          <div className="flex items-center gap-3">
            <h3>{l.july2026}</h3>
            <div className="flex gap-1">
              <button type="button" className="rowbtn"><ChevronLeft className="size-4" /></button>
              <button type="button" className="rowbtn"><ChevronRight className="size-4" /></button>
            </div>
          </div>
          <div className="fl-seg"><button type="button">{l.day}</button><button type="button">{l.week}</button><button type="button" className="on">{l.month}</button></div>
        </div>
        <div className="fl-pad">
          <div className="cal">
            {d.weekdays.map((day) => (
              <div key={day} className="cdow">{day}</div>
            ))}
            {calDays.map((day, idx) => (
              <div key={idx} className={`cday ${day.dim ? "dim" : ""} ${day.today ? "today" : ""}`}>
                <div className="cnum">{day.n}</div>
                {day.ev?.map((e) => (
                  <div key={e.t} className={`cev ${e.c}`}>{e.t}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="fl-card">
        <div className="fl-card-head"><h3>{l.todayJul8}</h3></div>
        <div className="fl-pad flex flex-col gap-0.5">
          {todayItems.map((item) => (
            <div key={item.t} className="list-row flex items-center gap-3 rounded-[11px] py-3">
              <div className="h-[38px] w-1 rounded-[9px]" style={{ background: item.c }} />
              <div><b className="text-[13px]">{item.t}</b><div className="fl-faint fl-tny">{item.s}</div></div>
            </div>
          ))}
        </div>
        <div className="fl-pad border-t border-[var(--border)]">
          <button type="button" className="fl-btn primary w-full justify-center"><Plus strokeWidth={2} />{l.newEvent}</button>
        </div>
      </div>
    </div>
  );
}

export function SalesPage() {
  const dict = useDict();
  const s = dict.fusion.sales;
  const l = dict.fusion.labels;

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad"><div className="k-label">{s.quotaAttainment}</div><StatLine value="104%" /><FlProgress value={100} className="mt-3 [&>i]:!bg-[var(--emerald)]" /></div>
        <div className="fl-card fl-pad"><div className="k-label">{s.closedQ3}</div><StatLine value="486K" unit="SAR" /><div className="k-foot mt-2"><FlDelta up>22%</FlDelta></div></div>
        <div className="fl-card fl-pad"><div className="k-label">{s.avgDealSize}</div><StatLine value="122K" unit="SAR" /><div className="k-foot fl-faint mt-2">{l.gulfAccounts}</div></div>
        <div className="fl-card fl-pad"><div className="k-label">{s.salesCycle}</div><StatLine value="31" unit={l.days} /><div className="k-foot mt-2"><FlDelta up>{l.faster}</FlDelta></div></div>
      </div>
      <div className="grid gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <div className="fl-card">
          <div className="fl-card-head">
            <div><h3>{s.bookingsForecast}</h3><div className="ch-sub">{s.bookingsForecastSub}</div></div>
            <div className="fl-seg"><button type="button">Q2</button><button type="button" className="on">Q3</button><button type="button">Q4</button></div>
          </div>
          <div className="fl-pad"><div className="h-[250px] rounded-xl bg-[var(--glass-hi)]" /></div>
        </div>
        <div className="fl-card">
          <div className="fl-card-head"><div><h3>{s.repLeaderboard}</h3><div className="ch-sub">{l.quarterToDate}</div></div></div>
          <div className="fl-pad flex flex-col gap-4">
            {[{ i: "DL", n: "Dalal", r: l.commercialLead, v: "312K", p: 100 }, { i: "YK", n: "Youssef", r: l.founderKeyAccounts, v: "174K", p: 56 }].map((rep) => (
              <div key={rep.i}>
                <div className="mb-2 flex items-center gap-3">
                  <FlAva style={{ background: rep.i === "DL" ? "#71717a" : "#52525b" }}>{rep.i}</FlAva>
                  <div className="flex-1"><b className="text-[13px]">{rep.n}</b><div className="fl-faint fl-tny">{rep.r}</div></div>
                  <div className="text-right"><div className="fl-mono font-semibold">{rep.v}</div><div className="fl-faint fl-tny">SAR</div></div>
                </div>
                <FlProgress value={rep.p} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="fl-card">
        <div className="fl-card-head">
          <div><h3>{s.recentDeals}</h3><div className="ch-sub">{s.recentDealsSub}</div></div>
          <Link href="/crm" className="fl-btn sm ghost">{l.openCrm}</Link>
        </div>
        <div className="fl-tbl-wrap">
          <table className="fl-tbl">
            <thead><tr><th>{l.deal}</th><th>{l.owner}</th><th>{dict.common.value}</th><th>{dict.common.stage}</th><th>{l.probability}</th><th>{l.closeDate}</th></tr></thead>
            <tbody>
              {[
                { d: "Makkah Chamber redesign", s: "Pixel IT prime", o: "YK", v: "SAR 410,000", st: "b-gold", sl: dict.stages.proposal, p: 45 },
                { d: "Easy Touch Phase 2", s: l.advancedModules, o: "DL", v: "SAR 96,000", st: "b-iris", sl: dict.stages.negotiation, p: 78 },
              ].map((row) => (
                <tr key={row.d}>
                  <td><div className="font-medium">{row.d}</div><div className="cell-sub fl-faint text-[11.5px]">{row.s}</div></td>
                  <td><FlAva sm style={{ background: row.o === "YK" ? "#52525b" : "#71717a" }}>{row.o}</FlAva></td>
                  <td className="fl-mono">{row.v}</td>
                  <td><span className={`fl-badge ${row.st}`}>{row.sl}</span></td>
                  <td><div className="flex items-center gap-2"><FlProgress value={row.p} className="min-w-[60px]" /><span className="fl-mono fl-tny fl-faint">{row.p}%</span></div></td>
                  <td className="fl-faint fl-tny">Jul 24</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function MarketingPage() {
  const dict = useDict();
  const m = dict.fusion.marketing;
  const l = dict.fusion.labels;

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        {[
          { l: m.sourcedPipeline, v: "318K", u: "SAR", spark: [20, 26, 24, 32, 30, 40, 44, 52], c: "var(--iris)" },
          { l: m.costPerLead, v: "142", u: "MAD", spark: [200, 190, 180, 175, 165, 158, 150, 142], c: "var(--emerald)" },
          { l: m.siteSessions, v: "24.8K", spark: [14, 16, 15, 19, 22, 21, 24, 25], c: "var(--gold)" },
          { l: m.mqlSql, v: "28%", spark: [18, 20, 19, 22, 24, 25, 27, 28], c: "var(--sky)" },
        ].map((k) => (
          <div key={k.l} className="fl-card fl-pad">
            <div className="k-label">{k.l}</div>
            <StatLine value={k.v} unit={k.u} />
            <Sparkline data={k.spark} color={k.c} />
          </div>
        ))}
      </div>
      <div className="grid gap-[18px] lg:grid-cols-[1.5fr_1fr]">
        <div className="fl-card"><div className="fl-card-head"><div><h3>{m.channelPerformance}</h3><div className="ch-sub">{m.channelPerformanceSub}</div></div></div><div className="fl-pad"><div className="h-[250px] rounded-xl bg-[var(--glass-hi)]" /></div></div>
        <div className="fl-card">
          <div className="fl-card-head"><div><h3>{m.conversionFunnel}</h3><div className="ch-sub">{m.conversionFunnelSub}</div></div></div>
          <div className="fl-pad">
            <FunnelBar label={l.visitors} value="24.8K" width="100%" color="var(--iris)" />
            <FunnelBar label={dict.nav.leads} value="2.1K" width="38%" color="var(--iris-2)" />
            <FunnelBar label={l.mql} value="640" width="22%" color="var(--sky)" />
            <FunnelBar label={l.sql} value="180" width="12%" color="var(--gold)" />
            <FunnelBar label={l.opportunity} value="42" width="6%" color="var(--emerald)" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinancePage() {
  const dict = useDict();
  const fin = dict.fusion.finance;
  const l = dict.fusion.labels;
  const b = dict.fusion.badges;

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad"><div className="k-label">{fin.cashOnHand}</div><StatLine value="642K" unit="MAD" /><div className="k-foot fl-faint mt-2">{fin.bankNote}</div></div>
        <div className="fl-card fl-pad"><div className="k-label">{fin.receivables}</div><StatLine value="318K" unit="MAD" /><div className="k-foot mt-2"><span className="fl-badge b-amber">{b.overdueCount}</span></div></div>
        <div className="fl-card fl-pad"><div className="k-label">{fin.monthlyBurn}</div><StatLine value="96K" unit="MAD" /><div className="k-foot mt-2"><FlDelta>3%</FlDelta></div></div>
        <div className="fl-card fl-pad"><div className="k-label">{dict.fusion.dashboard.runway}</div><StatLine value="11" unit={l.months} /><div className="k-foot fl-faint mt-2">{l.atCurrentBurn}</div></div>
      </div>
      <div className="grid gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <div className="fl-card"><div className="fl-card-head"><div><h3>{fin.cashFlow}</h3><div className="ch-sub">{fin.cashFlowSub}</div></div><button type="button" className="fl-btn sm ghost">{l.export}</button></div><div className="fl-pad"><div className="h-[250px] rounded-xl bg-[var(--glass-hi)]" /></div></div>
        <div className="fl-card"><div className="fl-card-head"><div><h3>{fin.expenseBreakdown}</h3><div className="ch-sub">{l.thisMonth}</div></div></div><div className="fl-pad"><div className="relative h-[180px] rounded-xl bg-[var(--glass-hi)]"><div className="donut-center"><div className="dc-val">96K</div><div className="dc-lab">MAD</div></div></div></div></div>
      </div>
    </div>
  );
}

export function HrPage() {
  const dict = useDict();
  const h = dict.fusion.hr;
  const l = dict.fusion.labels;
  const b = dict.fusion.badges;
  const team = [
    { i: "YK", g: "#52525b", n: "Youssef Kaab", s: "Founder & Managing Director", r: "Technical & client relations", c: "Founder", p: 92 },
    { i: "AC", g: "#f5a623", n: "Achraf", s: "Design Lead", r: "Product & brand design", c: "Core", p: 74 },
    { i: "OB", g: "#3ecf8e", n: "Ouissal BenZahi", s: "Developer", r: "Full-stack engineering", c: "CDD", p: 86 },
    { i: "DL", g: "#71717a", n: "Dalal", s: "Commercial / Sales", r: "Outreach & AutoLog sales", c: "Commission", p: 68 },
  ];
  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad"><div className="k-label">{h.headcount}</div><StatLine value="6" /><div className="k-foot mt-2"><FlDelta up>2</FlDelta> {l.hiresYtd}</div></div>
        <div className="fl-card fl-pad"><div className="k-label">{h.openRoles}</div><StatLine value="1" /><div className="k-foot fl-faint mt-2">{l.marketingSales}</div></div>
        <div className="fl-card fl-pad"><div className="k-label">{h.avgUtilization}</div><StatLine value="78%" /><FlProgress value={78} className="mt-3" /></div>
        <div className="fl-card fl-pad"><div className="k-label">{h.payrollMonthly}</div><StatLine value="58K" unit="MAD" /><div className="k-foot fl-faint mt-2">{l.nextRunJul15}</div></div>
      </div>
      <div className="grid gap-[18px] lg:grid-cols-[1.5fr_1fr]">
        <div className="fl-card">
          <div className="fl-card-head"><div><h3>{h.team}</h3><div className="ch-sub">Fusion Leap SARL AU</div></div><button type="button" className="fl-btn primary sm"><Plus strokeWidth={2} />{l.addPerson}</button></div>
          <div className="fl-tbl-wrap">
            <table className="fl-tbl">
              <thead><tr><th>{l.person}</th><th>{l.role}</th><th>{l.contract}</th><th>{l.utilization}</th><th>{dict.common.status}</th></tr></thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.i}>
                    <td><CellMain initials={m.i} gradient={m.g} title={m.n} sub={m.s} /></td>
                    <td className="fl-muted">{m.r}</td>
                    <td><FlChip>{m.c}</FlChip></td>
                    <td><FlProgress value={m.p} className="min-w-[80px]" /></td>
                    <td><span className="fl-badge b-green">{b.active}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="fl-card">
          <div className="fl-card-head"><div><h3>{h.attendanceWeek}</h3><div className="ch-sub">{h.attendanceSub}</div></div></div>
          <div className="fl-pad flex flex-col gap-4">
            {[{ l: l.present, v: "96%", p: 96, c: "var(--emerald)" }, { l: l.remote, v: l.twoPeople, p: 40, c: "var(--sky)" }].map((a) => (
              <div key={a.l}><div className="mb-1.5 flex justify-between text-[12.5px]"><span className="fl-muted">{a.l}</span><b className="fl-mono">{a.v}</b></div><FlProgress value={a.p} className={`[&>i]:!bg-[${a.c}]`} /></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportsPage() {
  const dict = useDict();
  const r = dict.fusion.reports;
  const l = dict.fusion.labels;

  const reportCards = [
    { t: r.grossMargin },
    { t: r.deliveryVelocity },
    { t: r.clientSatisfaction },
  ] as const;

  return (
    <div className="space-y-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="fl-seg"><button type="button">{l.weekly}</button><button type="button" className="on">{l.monthly}</button><button type="button">{l.quarterly}</button></div>
        <div className="flex gap-2"><button type="button" className="fl-btn sm">{l.jul2026}</button><button type="button" className="fl-btn sm">{l.exportPdf}</button></div>
      </div>
      <div className="grid gap-[18px] lg:grid-cols-[2fr_1fr]">
        <div className="fl-card"><div className="fl-card-head"><div><h3>{r.revenueByMarket}</h3><div className="ch-sub">{r.revenueByMarketSub}</div></div></div><div className="fl-pad"><div className="h-[270px] rounded-xl bg-[var(--glass-hi)]" /></div></div>
        <div className="fl-card"><div className="fl-card-head"><div><h3>{r.serviceMix}</h3><div className="ch-sub">{r.serviceMixSub}</div></div></div><div className="fl-pad"><div className="h-[190px] rounded-xl bg-[var(--glass-hi)]" /></div></div>
      </div>
      <div className="grid g-3">
        {reportCards.map((card) => (
          <div key={card.t} className="fl-card"><div className="fl-card-head"><h3>{card.t}</h3></div><div className="fl-pad"><div className="h-[150px] rounded-xl bg-[var(--glass-hi)]" /></div></div>
        ))}
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const dict = useDict();
  const n = dict.fusion.notifications;
  const l = dict.fusion.labels;
  const items = [
    { t: "Payment received — 42,000 SAR from Shegl cleared to Bank of Africa.", time: "14 minutes ago", unread: true },
    { t: "Invoice FL-2026-079 overdue — SAR 48,000 from Pixel IT · ADK is 14 days past due.", time: "1 hour ago", unread: true },
    { t: "Dalal mentioned you on Easy Touch Phase 2: \"Client approved 96K SAR, sending contract.\"", time: "3 hours ago", unread: true },
    { t: "Deadline approaching — Makkah Chamber RFP submission closes in 2 days (Jul 10).", time: "5 hours ago", unread: true },
    { t: "Ouissal deployed AutoLog GPS sync to staging and requested review.", time: "Yesterday", unread: false },
  ];
  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="fl-seg"><button type="button" className="on">{n.all}</button><button type="button">{l.unreadCount}</button><button type="button">{l.mentions}</button><button type="button">{l.system}</button></div>
        <button type="button" className="fl-btn sm ghost">{l.markAllRead}</button>
      </div>
      <div className="fl-card">
        {items.map((n) => (
          <div key={n.t} className={`notif-item ${n.unread ? "unread" : ""}`}>
            <FlAva sm style={{ background: "var(--grad-fusion)" }}>FL</FlAva>
            <div className="flex-1">
              <p className="text-[13px]">{n.t}</p>
              <div className="at-time">{n.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const dict = useDict();
  const l = dict.fusion.labels;

  const workspaceRows = [
    l.organizationName,
    l.defaultCurrency,
    l.timezone,
    l.emailNotifications,
  ] as const;

  return (
    <div className="grid gap-[18px] lg:grid-cols-2">
      <div className="fl-card fl-pad">
        <h3 className="mb-4 text-[15px] font-semibold">{l.workspace}</h3>
        {workspaceRows.map((row) => (
          <div key={row} className="set-row flex items-center justify-between border-b border-[var(--border)] py-4 last:border-0">
            <div><b className="text-[13.5px]">{row}</b><small className="block fl-faint text-xs">{l.demoOrg}</small></div>
            <div className="switch h-[25px] w-11 rounded-full bg-[var(--track)]" />
          </div>
        ))}
      </div>
      <div className="fl-card fl-pad">
        <h3 className="mb-4 text-[15px] font-semibold">{l.appearance}</h3>
        <p className="fl-faint text-sm">{l.appearanceHint}</p>
      </div>
    </div>
  );
}
