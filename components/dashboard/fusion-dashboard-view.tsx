"use client";

import Link from "next/link";
import {
  CheckSquare,
  Plus,
  Target,
  UserPlus,
  FileText,
  Receipt,
} from "lucide-react";
import type { DashboardStats } from "@/lib/actions/dashboard";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import {
  PipelineBreakdownChart,
  PipelineTrendChart,
} from "@/components/dashboard/charts";
import {
  ActivityFeed,
  RecentLeads,
  UpcomingTasks,
} from "@/components/dashboard/activity-feed";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getIntlLocale } from "@/lib/i18n/locale-utils";
import { isLeadership } from "@/lib/permissions/capabilities";
import type { Profile } from "@/types/database";

function formatCompact(value: number, locale: string) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  }
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

export function FusionDashboardView({
  stats,
  profile,
}: {
  stats: DashboardStats;
  profile: Profile;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const intlLocale = getIntlLocale(locale);
  const leadership = isLeadership(profile);

  const quickActions = [
    {
      href: "/leads",
      label: dict.leads.newLead,
      icon: UserPlus,
      show: leadership,
    },
    {
      href: "/tasks/new",
      label: dict.tasks.newTask,
      icon: Plus,
      show: true,
    },
    {
      href: "/clients/new",
      label: dict.clients.newClient,
      icon: Target,
      show: leadership,
    },
    {
      href: "/finance/quotes",
      label: dict.nav.quotes,
      icon: FileText,
      show: leadership,
    },
    {
      href: "/finance/invoices",
      label: dict.nav.invoices,
      icon: Receipt,
      show: leadership,
    },
  ].filter((a) => a.show);

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {dict.dashboard.welcome}
            {profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h2>
          <p className="mt-1 text-sm fl-faint">{dict.dashboard.subtitle}</p>
        </div>
        <div className="fl-filter-bar__actions !ms-0">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="fl-btn sm ghost shrink-0"
            >
              <action.icon strokeWidth={2} className="size-3.5" />
              <span className="hidden sm:inline">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <KpiCards
        dict={dict}
        locale={locale}
        totalLeads={stats.totalLeads}
        pipelineValue={stats.pipelineValue}
        tasksDueToday={stats.tasksDueToday}
        conversionRate={stats.conversionRate}
      />

      <div className="grid g-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label={dict.dashboard.openLeads ?? "Open leads"}
          value={String(stats.openLeads)}
          hint={dict.dashboard.totalLeadsHint}
        />
        <MiniStat
          label={dict.dashboard.wonValue ?? "Won value"}
          value={formatCompact(stats.wonValue, intlLocale)}
          hint={dict.dashboard.pipelineValueHint}
          suffix="USD"
        />
        <MiniStat
          label={dict.dashboard.openTasks ?? "Open tasks"}
          value={String(stats.openTasks)}
          hint={dict.tasks.subtitle}
          icon={<CheckSquare className="size-3.5" strokeWidth={2} />}
        />
        <MiniStat
          label={dict.dashboard.overdueTasks ?? "Overdue"}
          value={String(stats.overdueTasks)}
          hint={dict.dashboard.tasksDueTodayHint}
          danger={stats.overdueTasks > 0}
        />
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[1.65fr_1fr]">
        <PipelineTrendChart trend={stats.pipelineTrend} />
        <PipelineBreakdownChart data={stats.leadsByStage} />
      </div>

      <div className="grid gap-[18px] lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentLeads
            leads={stats.recentLeads}
            dict={dict}
            locale={locale}
          />
        </div>
        <UpcomingTasks
          tasks={stats.upcomingTasks}
          dict={dict}
          locale={locale}
        />
      </div>

      <ActivityFeed
        activities={stats.activities}
        dict={dict}
        locale={locale}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  hint,
  suffix,
  danger,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  suffix?: string;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="fl-card fl-pad">
      <div className="k-label flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className={`k-val mt-1 ${danger ? "text-[var(--rose)]" : ""}`}>
        {value}
        {suffix ? <span className="cur">{suffix}</span> : null}
      </div>
      <div className="k-foot fl-faint mt-2">{hint}</div>
    </div>
  );
}
