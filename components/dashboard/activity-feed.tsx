import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { getDateFnsLocale, getIntlLocale } from "@/lib/i18n/locale-utils";
import { Activity as ActivityIcon } from "lucide-react";
import type { Activity, Lead, Task } from "@/types/database";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { LeadStageBadge } from "@/components/shared/status-badge";
import { TaskPriorityBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/page-header";

function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ActivityFeed({
  activities,
  dict,
  locale,
}: {
  activities: Activity[];
  dict: Dictionary;
  locale: Locale;
}) {
  const dateLocale = getDateFnsLocale(locale);

  return (
    <div className="fl-card">
      <div className="fl-card-head">
        <h3>{dict.dashboard.recentActivity}</h3>
      </div>
      <div className="fl-pad">
        {activities.length === 0 ? (
          <EmptyState
            icon={ActivityIcon}
            title={dict.dashboard.noActivity}
            description={dict.dashboard.noActivityHint}
            className="border-0 bg-transparent py-8"
          />
        ) : (
          <div>
            {activities.map((a) => (
              <div key={a.id} className="fl-act-item">
                <div
                  className="fl-act-dot"
                  style={{ background: "var(--accent-muted)" }}
                >
                  {(a.profile?.full_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="at-body">
                  <p>{a.message}</p>
                  <div className="at-time">
                    {a.profile?.full_name ?? dict.common.user} ·{" "}
                    {formatDistanceToNow(new Date(a.created_at), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function RecentLeads({
  leads,
  dict,
  locale,
}: {
  leads: Lead[];
  dict: Dictionary;
  locale: Locale;
}) {
  return (
    <div className="fl-card">
      <div className="fl-card-head">
        <div>
          <h3>{dict.dashboard.recentLeads}</h3>
          <div className="ch-sub">{dict.nav.leads}</div>
        </div>
        <Link href="/leads" className="fl-btn sm ghost">
          {dict.common.viewAll}
        </Link>
      </div>
      <div className="fl-tbl-wrap mt-4">
        {leads.length === 0 ? (
          <p className="fl-pad py-6 text-center text-sm fl-faint">
            {dict.dashboard.noLeadsYet}{" "}
            <Link href="/leads" className="text-[var(--iris)] hover:underline">
              {dict.dashboard.createOne}
            </Link>
          </p>
        ) : (
          <table className="fl-tbl">
            <thead>
              <tr>
                <th>{dict.common.title}</th>
                <th>{dict.common.stage}</th>
                <th>{dict.common.value}</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium hover:underline"
                    >
                      {lead.title}
                    </Link>
                    {lead.company && (
                      <p className="fl-faint text-[11.5px]">{lead.company}</p>
                    )}
                  </td>
                  <td>
                    <LeadStageBadge stage={lead.stage} />
                  </td>
                  <td className="fl-mono">
                    {formatMoney(Number(lead.value), locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export function UpcomingTasks({
  tasks,
  dict,
  locale,
  title,
  emptyTitle,
}: {
  tasks: Task[];
  dict: Dictionary;
  locale: Locale;
  title?: string;
  emptyTitle?: string;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const dateLocale = getIntlLocale(locale);

  return (
    <div className="fl-card">
      <div className="fl-card-head">
        <div>
          <h3>{title ?? dict.dashboard.upcomingTasks}</h3>
          <div className="ch-sub">{dict.nav.tasks}</div>
        </div>
        <Link href="/tasks?view=list" className="fl-btn sm ghost">
          {dict.common.viewAll}
        </Link>
      </div>
      <div className="fl-pad">
        {tasks.length === 0 ? (
          <p className="py-6 text-center text-sm fl-faint">
            {emptyTitle ?? dict.dashboard.noUpcomingTasks}
          </p>
        ) : (
          <div>
            {tasks.map((task) => {
              const overdue =
                task.due_date && task.due_date < today && task.status !== "done";
              return (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-3 last:border-0"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {task.title}
                    </Link>
                    <p
                      className={
                        overdue
                          ? "text-xs text-[var(--rose)]"
                          : "fl-faint text-xs"
                      }
                    >
                      {task.due_date
                        ? new Date(task.due_date + "T00:00:00").toLocaleDateString(
                            dateLocale
                          )
                        : dict.common.noDueDate}
                    </p>
                  </div>
                  <TaskPriorityBadge priority={task.priority} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
