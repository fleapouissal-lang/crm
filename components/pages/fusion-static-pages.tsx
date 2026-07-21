"use client";

import Link from "next/link";
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

export function SalesPage() {
  const dict = useDict();
  const s = dict.fusion.sales;
  const l = dict.fusion.labels;

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{s.quotaAttainment}</div>
          <StatLine value="0%" />
          <FlProgress value={0} className="mt-3 [&>i]:!bg-[var(--emerald)]" />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.closedQ3}</div>
          <StatLine value="0" unit="SAR" />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.avgDealSize}</div>
          <StatLine value="0" unit="SAR" />
          <div className="k-foot fl-faint mt-2">{l.gulfAccounts}</div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{s.salesCycle}</div>
          <StatLine value="0" unit={l.days} />
        </div>
      </div>
      <div className="grid gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{s.bookingsForecast}</h3>
              <div className="ch-sub">{s.bookingsForecastSub}</div>
            </div>
            <div className="fl-seg">
              <button type="button">Q2</button>
              <button type="button" className="on">
                Q3
              </button>
              <button type="button">Q4</button>
            </div>
          </div>
          <div className="fl-pad flex h-[250px] items-center justify-center">
            <p className="text-[13px] text-[var(--muted)]">{dict.fusion.reports.noData}</p>
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
            <p className="text-[13px] text-[var(--muted)]">{dict.fusion.reports.noData}</p>
          </div>
        </div>
      </div>
      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{s.recentDeals}</h3>
            <div className="ch-sub">{s.recentDealsSub}</div>
          </div>
          <Link href="/leads" className="fl-btn sm ghost">
            {l.openCrm}
          </Link>
        </div>
        <div className="fl-tbl-wrap">
          <table className="fl-tbl">
            <thead>
              <tr>
                <th>{l.deal}</th>
                <th>{l.owner}</th>
                <th>{dict.common.value}</th>
                <th>{dict.common.stage}</th>
                <th>{l.probability}</th>
                <th>{l.closeDate}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm fl-faint">
                  {dict.fusion.reports.noData}
                </td>
              </tr>
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
  const emptySpark = [0, 0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        {[
          { l: m.sourcedPipeline, v: "0", u: "SAR", c: "var(--iris)" },
          { l: m.costPerLead, v: "0", u: "MAD", c: "var(--emerald)" },
          { l: m.siteSessions, v: "0", c: "var(--gold)" },
          { l: m.mqlSql, v: "0%", c: "var(--sky)" },
        ].map((k) => (
          <div key={k.l} className="fl-card fl-pad">
            <div className="k-label">{k.l}</div>
            <StatLine value={k.v} unit={k.u} />
            <Sparkline data={emptySpark} color={k.c} />
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
            <p className="text-[13px] text-[var(--muted)]">{dict.fusion.reports.noData}</p>
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
            <FunnelBar label={l.visitors} value="0" width="0%" color="var(--iris)" />
            <FunnelBar label={dict.nav.leads} value="0" width="0%" color="var(--iris-2)" />
            <FunnelBar label={l.mql} value="0" width="0%" color="var(--sky)" />
            <FunnelBar label={l.sql} value="0" width="0%" color="var(--gold)" />
            <FunnelBar label={l.opportunity} value="0" width="0%" color="var(--emerald)" />
          </div>
        </div>
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
          <div className="fl-card-head"><div><h3>{h.team}</h3><div className="ch-sub">Fusion Leap SARL AU</div></div><button type="button" className="fl-btn primary sm">+ {l.addPerson}</button></div>
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
