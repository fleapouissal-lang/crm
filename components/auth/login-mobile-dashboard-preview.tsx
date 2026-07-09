"use client";

import {
  BarChart3,
  Bell,
  CheckCircle2,
  DollarSign,
  FolderKanban,
  LayoutDashboard,
  TrendingUp,
  Users,
} from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

const BARS = [38, 52, 46, 68, 58, 82, 72, 92, 78, 88];

const KPI_CONFIG = [
  {
    key: "revenue",
    value: "248.6",
    unit: "K MAD",
    delta: "+18.4%",
    up: true,
    spark: [28, 34, 32, 40, 44, 48, 52, 58, 56, 64],
    color: "#5ee08f",
    icon: DollarSign,
  },
  {
    key: "projects",
    value: "12",
    unit: "",
    delta: "+3",
    up: true,
    spark: [6, 7, 8, 8, 9, 10, 11, 11, 12, 12],
    color: "#8b9cff",
    icon: FolderKanban,
  },
  {
    key: "pipeline",
    value: "1.24",
    unit: "M SAR",
    delta: "7 deals",
    up: true,
    spark: [18, 24, 22, 30, 28, 36, 40, 44, 48, 52],
    color: "#ffb347",
    icon: TrendingUp,
  },
  {
    key: "collection",
    value: "86",
    unit: "%",
    delta: "+4.2%",
    up: true,
    spark: [78, 80, 79, 82, 84, 83, 85, 86, 85, 86],
    color: "#6ec8ff",
    icon: CheckCircle2,
  },
] as const;

function MiniSparkline({
  data,
  color,
}: {
  data: readonly number[];
  color: string;
}) {
  const max = Math.max(...data);
  return (
    <div className="login-mock-dashboard__mini-spark" aria-hidden>
      {data.map((point, index) => (
        <span
          key={index}
          style={{
            height: `${Math.max(18, (point / max) * 100)}%`,
            background: `linear-gradient(180deg, ${color}, ${color}33)`,
          }}
        />
      ))}
    </div>
  );
}

function LoginFloatCards() {
  const a = useDict().auth;

  return (
    <>
      <div
        className="login-split__card login-split__card--promo login-mobile-float__promo"
        aria-hidden
      >
        <span className="login-split__card-kicker">{a.loginFloatPromo}</span>
        <p>{a.loginFloatPromoSub}</p>
        <button type="button" className="login-split__card-btn">
          {a.loginFloatPromoBtn}
        </button>
      </div>

      <div
        className="login-split__card login-split__card--notif login-mobile-float__notif"
        aria-hidden
      >
        <div className="login-split__card-avatar">FE</div>
        <div className="login-split__card-body">
          <strong>{a.loginFloatNotifName}</strong>
          <span>{a.loginFloatNotifMsg}</span>
        </div>
        <button type="button" className="login-split__card-icon-btn">
          →
        </button>
      </div>
    </>
  );
}

export function LoginMobileDashboardPreview({
  framed = false,
  className,
}: {
  framed?: boolean;
  className?: string;
}) {
  const dict = useDict();
  const d = dict.fusion.dashboard;
  const a = dict.auth;

  const kpiLabels = {
    revenue: d.revenueMtd,
    projects: d.activeProjects,
    pipeline: d.openPipeline,
    collection: d.collectionRate,
  };

  const screen = (
    <div className="login-mock-dashboard">
      <div className="login-mock-dashboard__status" aria-hidden>
        <span>9:41</span>
        <span className="login-mock-dashboard__status-icons">
          <i />
          <i />
          <i />
        </span>
      </div>

      <header className="login-mock-dashboard__header">
        <div>
          <p className="login-mock-dashboard__eyebrow">{a.loginMobileWelcome}</p>
          <h3>{a.loginMobileCompany}</h3>
        </div>
        <button type="button" className="login-mock-dashboard__icon-btn" aria-hidden>
          <Bell size={14} />
          <span className="login-mock-dashboard__dot" />
        </button>
      </header>

      <div className="login-mock-dashboard__hero-stat">
        <div className="login-mock-dashboard__hero-stat-top">
          <span>{d.openPipeline}</span>
          <span className="login-mock-dashboard__hero-pill">{a.loginFloatPromo}</span>
        </div>
        <strong className="login-mock-dashboard__hero-value">
          1.24M <small>SAR</small>
        </strong>
        <p className="login-mock-dashboard__hero-sub">{d.dealsCount}</p>
      </div>

      <div className="login-mock-dashboard__kpis">
        {KPI_CONFIG.map((kpi) => {
          const Icon = kpi.icon;
          const delta =
            kpi.key === "pipeline" ? d.dealsCount : kpi.delta;
          return (
            <article key={kpi.key} className="login-mock-dashboard__kpi-card">
              <div className="login-mock-dashboard__kpi-top">
                <span>{kpiLabels[kpi.key]}</span>
                <span
                  className="login-mock-dashboard__kpi-ico"
                  style={{ color: kpi.color, background: `${kpi.color}18` }}
                >
                  <Icon size={12} />
                </span>
              </div>
              <div className="login-mock-dashboard__kpi-val">
                <strong>{kpi.value}</strong>
                {kpi.unit ? <small>{kpi.unit}</small> : null}
              </div>
              <div className="login-mock-dashboard__kpi-foot">
                <em className={kpi.up ? "login-mock-dashboard__up" : "login-mock-dashboard__down"}>
                  {delta}
                </em>
                <MiniSparkline data={kpi.spark} color={kpi.color} />
              </div>
            </article>
          );
        })}
      </div>

      <div className="login-mock-dashboard__chart">
        <div className="login-mock-dashboard__chart-head">
          <div>
            <strong>{d.revenueCollections}</strong>
            <p>{d.revenueCollectionsSub}</p>
          </div>
          <span className="login-mock-dashboard__chart-badge">+18.4%</span>
        </div>
        <div className="login-mock-dashboard__bars" aria-hidden>
          {BARS.map((height, index) => (
            <span
              key={index}
              style={{
                height: `${height}%`,
                opacity: 0.55 + (index / BARS.length) * 0.45,
              }}
            />
          ))}
        </div>
      </div>

      <ul className="login-mock-dashboard__feed">
        <li>
          <span className="login-mock-dashboard__feed-ico login-mock-dashboard__feed-ico--lead">
            <TrendingUp size={12} />
          </span>
          <div>
            <strong>{a.loginMobileActivity1}</strong>
            <span>AutoLog · ILM Voyages</span>
          </div>
        </li>
        <li>
          <span className="login-mock-dashboard__feed-ico login-mock-dashboard__feed-ico--deal">
            <Users size={12} />
          </span>
          <div>
            <strong>{a.loginMobileActivity2}</strong>
            <span>Fusion Leap · 42K MAD</span>
          </div>
        </li>
      </ul>

      <nav className="login-mock-dashboard__tabs" aria-hidden>
        <span className="is-active">
          <LayoutDashboard size={14} />
          {dict.nav.dashboard}
        </span>
        <span>
          <TrendingUp size={14} />
          {dict.nav.leads}
        </span>
        <span>
          <Users size={14} />
          {dict.nav.clients}
        </span>
        <span>
          <BarChart3 size={14} />
          {dict.nav.reports}
        </span>
      </nav>
    </div>
  );

  if (!framed) {
    return (
      <div className={cn("login-mobile-showcase", className)}>
        <div className="login-mock-dashboard-wrap login-mock-dashboard-wrap--inline">
          {screen}
        </div>
        <LoginFloatCards />
      </div>
    );
  }

  return (
    <div className={cn("login-phone-frame", className)}>
      <div className="login-phone-frame__glow" aria-hidden />
      <div className="login-phone-frame__device">
        <div className="login-phone-frame__notch" aria-hidden />
        <div className="login-phone-frame__screen">{screen}</div>
      </div>
    </div>
  );
}
