"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CheckCheck,
  Circle,
  ExternalLink,
  ListTodo,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { DataPagination } from "@/components/shared/data-pagination";
import { FlAva } from "@/components/fusion/primitives";
import { savePreferences } from "@/lib/settings/storage";
import type { WorkspacePreferences } from "@/lib/settings/types";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { activityAccent } from "@/lib/notifications/map";
import {
  useNotifications,
  type AppNotification,
} from "@/components/notifications/notifications-provider";
import { cn } from "@/lib/utils";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";

type NotifFilter = "all" | "unread" | "tasks" | "leads";

function FlSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cn(
        "relative h-[25px] w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-[var(--iris)]" : "bg-[var(--track)]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "absolute top-[3px] size-[19px] rounded-full bg-white shadow transition-[inset-inline-start]",
          checked ? "inset-inline-start-[22px]" : "inset-inline-start-[3px]"
        )}
      />
    </button>
  );
}

function PrefRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-3.5 last:border-0">
      <div className="min-w-0">
        <b className="block text-[13.5px]">{title}</b>
        {hint ? <small className="mt-0.5 block text-xs fl-faint">{hint}</small> : null}
      </div>
      <FlSwitch checked={checked} onChange={onChange} />
    </div>
  );
}

function KindBadge({
  kind,
  label,
}: {
  kind: AppNotification["kind"];
  label: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        kind === "task"
          ? "bg-[color-mix(in_oklab,var(--iris)_14%,transparent)] text-[var(--iris)]"
          : "bg-[color-mix(in_oklab,var(--amber)_18%,transparent)] text-[var(--amber)]"
      )}
    >
      {kind === "task" ? (
        <ListTodo className="size-2.5" strokeWidth={2.5} />
      ) : (
        <Target className="size-2.5" strokeWidth={2.5} />
      )}
      {label}
    </span>
  );
}

export function NotificationsPageClient() {
  const dict = useDict();
  const { locale } = useI18n();
  const router = useRouter();
  const n = dict.fusion.notifications;
  const s = dict.fusion.settings;
  const l = dict.fusion.labels;
  const dateLocale = getDateFnsLocale(locale);
  const {
    items,
    unreadCount,
    prefs,
    setPrefs,
    markAllRead,
    toggleRead,
    markRead,
  } = useNotifications();
  const [filter, setFilter] = useState<NotifFilter>("all");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter === "unread") return item.unread;
      if (filter === "tasks") return item.kind === "task";
      if (filter === "leads") return item.kind === "lead";
      return true;
    });
  }, [items, filter]);
  const pagination = useAdaptivePagination(filtered, {
    rowHeight: 82,
    resetKey: filter,
  });

  function updatePrefs(patch: Partial<WorkspacePreferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(next);
    toast.success(s.prefsSaved);
  }

  function handleMarkAll() {
    markAllRead();
    toast.success(n.markedAllRead);
  }

  function openItem(item: AppNotification) {
    if (item.unread) markRead(item.id);
    if (item.href) router.push(item.href);
  }

  const filters: { key: NotifFilter; label: string }[] = [
    { key: "all", label: n.all },
    { key: "unread", label: n.unread },
    { key: "tasks", label: n.tasks },
    { key: "leads", label: n.leads },
  ];

  return (
    <div className="space-y-[18px]">
      <div className="fl-card fl-pad">
        <div className="mb-1 flex items-center gap-2">
          <Bell className="size-4 text-[var(--iris)]" strokeWidth={2} />
          <h3 className="text-[15px] font-semibold">{s.notifications}</h3>
        </div>
        <p className="text-sm fl-faint">{n.prefsHint}</p>
        <div className="mt-2">
          <PrefRow
            title={l.emailNotifications}
            hint={s.emailNotificationsHint}
            checked={prefs.emailNotifications}
            onChange={(v) => updatePrefs({ emailNotifications: v })}
          />
          <PrefRow
            title={s.activityDigest}
            hint={s.activityDigestHint}
            checked={prefs.activityDigest}
            onChange={(v) => updatePrefs({ activityDigest: v })}
          />
          <PrefRow
            title={s.taskReminders}
            hint={s.taskRemindersHint}
            checked={prefs.taskReminders}
            onChange={(v) => updatePrefs({ taskReminders: v })}
          />
          <PrefRow
            title={s.leadAlerts}
            hint={s.leadAlertsHint}
            checked={prefs.leadAlerts}
            onChange={(v) => updatePrefs({ leadAlerts: v })}
          />
        </div>
      </div>

      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="fl-seg">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                className={cn(filter === f.key && "on")}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
                {f.key === "unread" && unreadCount > 0
                  ? ` Â· ${unreadCount}`
                  : ""}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="fl-btn sm ghost"
            onClick={handleMarkAll}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="size-3.5" strokeWidth={2} />
            {l.markAllRead}
          </button>
        </div>

        <div className="fl-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <Circle className="mx-auto mb-3 size-8 text-[var(--text-faint)]" strokeWidth={1.5} />
              <p className="text-sm fl-faint">{n.empty}</p>
              <p className="mt-1 text-xs fl-faint">{n.emptyHint}</p>
            </div>
          ) : (
            pagination.pageItems.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={cn(
                  "notif-item cursor-pointer",
                  item.unread && "unread"
                )}
                onClick={() => openItem(item)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openItem(item);
                  }
                }}
              >
                <FlAva sm style={{ background: activityAccent(item.kind) }}>
                  {item.actorInitials}
                </FlAva>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <KindBadge
                      kind={item.kind}
                      label={item.kind === "task" ? n.tasks : n.leads}
                    />
                    {item.href ? (
                      <ExternalLink
                        className="size-3 text-[var(--text-faint)]"
                        strokeWidth={2}
                      />
                    ) : null}
                  </div>
                  <p className="text-[13px] leading-snug">{item.text}</p>
                  <div className="at-time">
                    {item.actorName ?? dict.common.user} Â·{" "}
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </div>
                </div>
                <FlSwitch
                  checked={!item.unread}
                  onChange={() => toggleRead(item.id)}
                />
              </div>
            ))
          )}
          <DataPagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
          />
        </div>
        <p className="mt-2 text-center text-[11px] fl-faint">
          {n.readSwitchHint}{" "}
          <Link href="/settings" className="text-[var(--iris)] hover:underline">
            {s.notifications}
          </Link>
        </p>
      </div>
    </div>
  );
}
