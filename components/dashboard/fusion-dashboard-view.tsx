"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckSquare,
  Columns3,
  FolderKanban,
  Plus,
  Target,
  UserPlus,
  FileText,
  Receipt,
  AlertTriangle,
  type LucideIcon,
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
import { CalendarPageClient } from "@/components/calendar/calendar-page-client";
import { FlProgress } from "@/components/fusion/primitives";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getIntlLocale } from "@/lib/i18n/locale-utils";
import {
  canAccessCalendar,
  canAccessClients,
  canAccessLeads,
  canAccessTasks,
  isLeadership,
} from "@/lib/permissions/capabilities";
import { projectMatchesMember, type ProjectRecord } from "@/lib/projects/types";
import type { Profile, Task } from "@/types/database";
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
  projects: allProjects = [],
  tasks = [],
}: {
  stats: DashboardStats;
  profile: Profile;
  projects?: ProjectRecord[];
  tasks?: Task[];
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const intlLocale = getIntlLocale(locale);
  const leadership = isLeadership(profile);

  if (!leadership) {
    return (
      <MemberDashboardView
        stats={stats}
        profile={profile}
        projects={allProjects}
        tasks={tasks}
      />
    );
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
    <div className="space-y-[18px] dash-home">
      <div className="fl-card fl-pad dash-home__welcome flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">
            {dict.dashboard.welcome}
            {profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h2>
          <p className="mt-1 text-sm fl-faint">{dict.dashboard.subtitle}</p>
        </div>
        <div className="fl-filter-bar__actions dash-home__actions !ms-0">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="fl-btn sm ghost shrink-0"
              title={action.label}
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

      <div className="dash-kpi-grid">
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
  projects: allProjects = [],
  tasks = [],
}: {
  stats: DashboardStats;
  profile: Profile;
  projects?: ProjectRecord[];
  tasks?: Task[];
}) {
  const dict = useDict();
  const { locale } = useI18n();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const isCommercial =
    canAccessLeads(profile) || canAccessClients(profile);
  const showTasks = canAccessTasks(profile);
  const showCalendar = canAccessCalendar(profile);

  useEffect(() => {
    setProjects(
      allProjects
        .filter((p: ProjectRecord) => projectMatchesMember(p, profile.id))
        .slice(0, 6)
    );
  }, [allProjects, profile.id]);

  if (!isCommercial && !showTasks) {
    return (
      <div className="space-y-[18px]">
        <div className="fl-card fl-pad flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {dict.dashboard.welcome}
              {profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h2>
            <p className="mt-1 text-sm fl-faint">
              {dict.dashboard.restrictedSubtitle ??
                dict.dashboard.memberSubtitle}
            </p>
          </div>
          <div className="fl-filter-bar__actions !ms-0">
            <Link href="/settings" className="fl-btn sm primary shrink-0">
              {dict.nav.settings}
            </Link>
            <Link href="/notifications" className="fl-btn sm ghost shrink-0">
              {dict.nav.notifications}
            </Link>
          </div>
        </div>
        <EmptyState
          icon={FolderKanban}
          title={dict.dashboard.restrictedTitle ?? dict.dashboard.welcome}
          description={
            dict.dashboard.restrictedHint ??
            dict.dashboard.restrictedSubtitle ??
            ""
          }
          className="border border-[var(--border)] bg-[var(--glass-hi)] py-14"
        />
      </div>
    );
  }

  if (isCommercial) {
    return (
      <div className="space-y-[18px] dash-home">
        <div className="fl-card fl-pad flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {dict.dashboard.welcome}
              {profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
            </h2>
            <p className="mt-1 text-sm fl-faint">
              {dict.dashboard.commercialSubtitle ?? dict.dashboard.subtitle}
            </p>
          </div>
          <div className="fl-filter-bar__actions !ms-0">
            {canAccessLeads(profile) ? (
              <Link href="/leads" className="fl-btn sm primary shrink-0">
                <UserPlus strokeWidth={2} className="size-3.5" />
                <span className="hidden sm:inline">{dict.leads.newLead}</span>
              </Link>
            ) : null}
            {canAccessClients(profile) ? (
              <Link href="/clients/new" className="fl-btn sm ghost shrink-0">
                <Target strokeWidth={2} className="size-3.5" />
                <span className="hidden sm:inline">{dict.clients.newClient}</span>
              </Link>
            ) : null}
            {showTasks ? (
              <Link href="/tasks/new" className="fl-btn sm ghost shrink-0">
                <Plus strokeWidth={2} className="size-3.5" />
                <span className="hidden sm:inline">{dict.tasks.newTask}</span>
              </Link>
            ) : null}
            {showCalendar ? (
              <Link href="/calendar" className="fl-btn sm ghost shrink-0">
                <CalendarDays strokeWidth={2} className="size-3.5" />
                <span className="hidden sm:inline">{dict.nav.calendar}</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="dash-kpi-grid">
          <MiniStat
            href="/leads"
            label={dict.dashboard.openLeads}
            value={String(stats.openLeads)}
            hint={dict.dashboard.totalLeadsHint}
            icon={<UserPlus className="size-3.5" strokeWidth={2} />}
          />
          <MiniStat
            href="/clients"
            label={dict.dashboard.totalClients ?? dict.nav.clients}
            value={String(stats.totalClients)}
            hint={dict.dashboard.totalClientsHint ?? dict.nav.clientsSub}
            icon={<Target className="size-3.5" strokeWidth={2} />}
          />
          <MiniStat
            href="/tasks?view=list"
            label={dict.dashboard.openTasks}
            value={String(stats.openTasks)}
            hint={dict.dashboard.latestTasks ?? dict.tasks.subtitle}
            icon={<CheckSquare className="size-3.5" strokeWidth={2} />}
          />
          <MiniStat
            href="/calendar"
            label={dict.dashboard.tasksDueToday}
            value={String(stats.tasksDueToday)}
            hint={dict.dashboard.tasksDueTodayHint}
            danger={stats.overdueTasks > 0}
            icon={<CalendarDays className="size-3.5" strokeWidth={2} />}
          />
        </div>

        <div className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{dict.dashboard.modulesTitle ?? dict.nav.main}</h3>
              <div className="ch-sub">
                {dict.dashboard.modulesHint ?? dict.dashboard.commercialSubtitle}
              </div>
            </div>
          </div>
          <div className="fl-pad">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  canAccessLeads(profile)
                    ? {
                        href: "/leads",
                        label: dict.nav.leads,
                        hint: dict.nav.leadsSub,
                        icon: UserPlus,
                        value: String(stats.openLeads),
                      }
                    : null,
                  canAccessClients(profile)
                    ? {
                        href: "/clients",
                        label: dict.nav.clients,
                        hint: dict.nav.clientsSub,
                        icon: Target,
                        value: String(stats.totalClients),
                      }
                    : null,
                  showTasks
                    ? {
                        href: "/tasks?view=list",
                        label: dict.nav.tasks,
                        hint: dict.nav.tasksSub,
                        icon: CheckSquare,
                        value: String(stats.openTasks),
                      }
                    : null,
                  showTasks
                    ? {
                        href: "/tasks?view=board",
                        label: dict.nav.kanbanTasks,
                        hint: dict.tasks.subtitle,
                        icon: Columns3,
                        value: String(stats.openTasks),
                      }
                    : null,
                  showCalendar
                    ? {
                        href: "/calendar",
                        label: dict.nav.calendar,
                        hint: dict.nav.calendarSub,
                        icon: CalendarDays,
                        value: String(stats.tasksDueToday),
                      }
                    : null,
                ] as Array<{
                  href: string;
                  label: string;
                  hint: string;
                  icon: LucideIcon;
                  value: string;
                } | null>
              )
                .filter(Boolean)
                .map((mod) => {
                  const item = mod!;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-xl border border-[var(--border)] bg-[var(--glass-hi)] p-3 transition hover:border-[var(--iris)] hover:bg-[color-mix(in_oklch,var(--iris),transparent_94%)]"
                    >
                      <div className="flex items-start gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[color-mix(in_oklch,var(--iris),transparent_88%)] text-[var(--iris)]">
                          <Icon className="size-4" strokeWidth={2} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <b className="truncate text-sm">{item.label}</b>
                            <span className="fl-mono text-sm tabular-nums">
                              {item.value}
                            </span>
                          </div>
                          <p className="fl-tny fl-faint line-clamp-2">
                            {item.hint}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="grid gap-[18px] lg:grid-cols-2">
          <RecentLeads
            leads={stats.recentLeads}
            dict={dict}
            locale={locale}
          />
          {showTasks ? (
            <UpcomingTasks
              tasks={stats.upcomingTasks}
              dict={dict}
              locale={locale}
              title={dict.dashboard.latestTasks}
            />
          ) : null}
        </div>

        {showCalendar ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">
                  {dict.nav.calendar}
                </h3>
                <p className="text-xs fl-faint">{dict.nav.calendarSub}</p>
              </div>
              <Link href="/calendar" className="fl-btn sm ghost">
                {dict.common.viewDetails}
              </Link>
            </div>
            <CalendarPageClient tasks={tasks} />
          </div>
        ) : null}
      </div>
    );
  }

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

      <div className="dash-kpi-grid">
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
  href,
}: {
  label: string;
  value: string;
  hint: string;
  suffix?: string;
  danger?: boolean;
  icon?: React.ReactNode;
  href?: string;
}) {
  const body = (
    <>
      <div className="k-label flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className={`k-val mt-1 ${danger ? "text-[var(--rose)]" : ""}`}>
        {value}
        {suffix ? <span className="cur">{suffix}</span> : null}
      </div>
      <div className="k-foot fl-faint mt-2">{hint}</div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="fl-card fl-pad block transition hover:border-[var(--iris)]"
      >
        {body}
      </Link>
    );
  }

  return <div className="fl-card fl-pad">{body}</div>;
}
