"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare,
  FolderKanban,
  Plus,
  Target,
  UserPlus,
  FileText,
  Receipt,
  AlertTriangle,
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
import { FlProgress } from "@/components/fusion/primitives";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getIntlLocale } from "@/lib/i18n/locale-utils";
import { isLeadership } from "@/lib/permissions/capabilities";
import { loadProjects } from "@/lib/projects/storage";
import { projectMatchesMember, type ProjectRecord } from "@/lib/projects/types";
import { buildTeamOptions } from "@/lib/team/members";
import type { Profile } from "@/types/database";
import { EmptyState } from "@/components/shared/page-header";

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

  if (!leadership) {
    return <MemberDashboardView stats={stats} profile={profile} />;
  }

  const quickActions = [
    {
      href: "/leads",
      label: dict.leads.newLead,
      icon: UserPlus,
      show: true,
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
      show: true,
    },
    {
      href: "/finance/quotes",
      label: dict.nav.quotes,
      icon: FileText,
      show: true,
    },
    {
      href: "/finance/invoices",
      label: dict.nav.invoices,
      icon: Receipt,
      show: true,
    },
  ];

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

function MemberDashboardView({
  stats,
  profile,
}: {
  stats: DashboardStats;
  profile: Profile;
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);

  useEffect(() => {
    const all = loadProjects(buildTeamOptions([profile]));
    setProjects(
      all.filter((p) => projectMatchesMember(p, profile.id)).slice(0, 6)
    );
  }, [profile]);

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {dict.dashboard.welcome}
            {profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h2>
          <p className="mt-1 text-sm fl-faint">
            {dict.dashboard.memberSubtitle ?? dict.dashboard.subtitle}
          </p>
        </div>
        <div className="fl-filter-bar__actions !ms-0">
          <Link href="/tasks/new" className="fl-btn sm primary shrink-0">
            <Plus strokeWidth={2} className="size-3.5" />
            <span className="hidden sm:inline">{dict.tasks.newTask}</span>
          </Link>
          <Link href="/tasks?view=board" className="fl-btn sm ghost shrink-0">
            {dict.nav.kanbanTasks}
          </Link>
          <Link href="/calendar" className="fl-btn sm ghost shrink-0">
            {dict.nav.calendar}
          </Link>
        </div>
      </div>

      <div className="grid g-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat
          label={dict.dashboard.openTasks}
          value={String(stats.openTasks)}
          hint={dict.dashboard.latestTasks ?? dict.tasks.subtitle}
          icon={<CheckSquare className="size-3.5" strokeWidth={2} />}
        />
        <MiniStat
          label={dict.dashboard.tasksDueToday}
          value={String(stats.tasksDueToday)}
          hint={dict.dashboard.tasksDueTodayHint}
        />
        <MiniStat
          label={dict.dashboard.overdueTasks}
          value={String(stats.overdueTasks)}
          hint={dict.dashboard.tasksDueTodayHint}
          danger={stats.overdueTasks > 0}
        />
        <MiniStat
          label={dict.dashboard.urgentTasks ?? dict.taskPriority.urgent}
          value={String(stats.urgentTasks)}
          hint={dict.dashboard.urgentTasksHint ?? ""}
          danger={stats.urgentTasks > 0}
          icon={<AlertTriangle className="size-3.5" strokeWidth={2} />}
        />
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{dict.dashboard.myProjects ?? dict.nav.projects}</h3>
            <div className="ch-sub">
              {dict.dashboard.myProjectsHint ?? ""}
            </div>
          </div>
          <Link href="/tasks?view=list" className="fl-btn sm ghost">
            {dict.nav.tasks}
          </Link>
        </div>
        <div className="fl-pad">
          {projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title={dict.dashboard.noAssignedProjects ?? "—"}
              description={dict.dashboard.myProjectsHint ?? ""}
              className="border-0 bg-transparent py-10"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-[11px] font-semibold text-white"
                      style={{ background: proj.gradient }}
                    >
                      {proj.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-sm">{proj.title}</b>
                      {proj.subtitle ? (
                        <p className="fl-tny fl-faint line-clamp-1">
                          {proj.subtitle}
                        </p>
                      ) : null}
                      <div className="mt-2">
                        <div className="mb-1 flex justify-between text-[11px]">
                          <span className="fl-muted">{dict.fusion.labels.progress}</span>
                          <span className="fl-mono fl-faint">{proj.progress}%</span>
                        </div>
                        <FlProgress value={proj.progress} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-2">
        <UpcomingTasks
          tasks={stats.upcomingTasks}
          dict={dict}
          locale={locale}
          title={dict.dashboard.latestTasks}
        />
        <UpcomingTasks
          tasks={stats.urgentTaskList}
          dict={dict}
          locale={locale}
          title={dict.dashboard.urgentTasks}
          emptyTitle={dict.dashboard.noUrgentTasks}
        />
      </div>
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
