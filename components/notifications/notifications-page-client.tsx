"use client";

import { useMemo, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { FlAva } from "@/components/fusion/primitives";
import {
  loadPreferences,
  savePreferences,
} from "@/lib/settings/storage";
import type { WorkspacePreferences } from "@/lib/settings/types";
import { cn } from "@/lib/utils";

type NotifFilter = "all" | "unread" | "mentions" | "system";

type NotifItem = {
  id: string;
  text: string;
  time: string;
  unread: boolean;
  kind: "mention" | "system" | "task" | "finance";
};

const SEED: NotifItem[] = [
  {
    id: "n1",
    text: "Payment received — 42,000 SAR from Shegl cleared to Bank of Africa.",
    time: "14 min",
    unread: true,
    kind: "finance",
  },
  {
    id: "n2",
    text: "Invoice FL-2026-079 overdue — SAR 48,000 from Pixel IT.",
    time: "1 h",
    unread: true,
    kind: "finance",
  },
  {
    id: "n3",
    text: "Dalal mentioned you on Easy Touch Phase 2: \"Client approved, sending contract.\"",
    time: "3 h",
    unread: true,
    kind: "mention",
  },
  {
    id: "n4",
    text: "Deadline approaching — Makkah Chamber RFP closes in 2 days.",
    time: "5 h",
    unread: true,
    kind: "system",
  },
  {
    id: "n5",
    text: "Task reminder — review AutoLog GPS sync on staging.",
    time: "Yesterday",
    unread: false,
    kind: "task",
  },
];

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
      onClick={() => onChange(!checked)}
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

export function NotificationsPageClient() {
  const dict = useDict();
  const n = dict.fusion.notifications;
  const s = dict.fusion.settings;
  const l = dict.fusion.labels;
  const [filter, setFilter] = useState<NotifFilter>("all");
  const [items, setItems] = useState(SEED);
  const [prefs, setPrefs] = useState<WorkspacePreferences>(() => loadPreferences());

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filter === "unread") return item.unread;
      if (filter === "mentions") return item.kind === "mention";
      if (filter === "system") return item.kind === "system";
      return true;
    });
  }, [items, filter]);

  const unreadCount = items.filter((i) => i.unread).length;

  function updatePrefs(patch: Partial<WorkspacePreferences>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePreferences(next);
    toast.success(s.prefsSaved);
  }

  function markAllRead() {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
    toast.success(n.markedAllRead);
  }

  function toggleRead(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, unread: !item.unread } : item
      )
    );
  }

  const filters: { key: NotifFilter; label: string }[] = [
    { key: "all", label: n.all },
    { key: "unread", label: l.unreadCount },
    { key: "mentions", label: l.mentions },
    { key: "system", label: l.system },
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
                {f.key === "unread" && unreadCount > 0 ? ` · ${unreadCount}` : ""}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="fl-btn sm ghost"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="size-3.5" strokeWidth={2} />
            {l.markAllRead}
          </button>
        </div>

        <div className="fl-card overflow-hidden">
          {filtered.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm fl-faint">{n.empty}</p>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={cn("notif-item", item.unread && "unread")}
              >
                <FlAva sm style={{ background: "var(--grad-fusion)" }}>
                  FL
                </FlAva>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px]">{item.text}</p>
                  <div className="at-time">{item.time}</div>
                </div>
                <FlSwitch
                  checked={!item.unread}
                  onChange={() => toggleRead(item.id)}
                />
              </div>
            ))
          )}
        </div>
        <p className="mt-2 text-center text-[11px] fl-faint">{n.readSwitchHint}</p>
      </div>
    </div>
  );
}
