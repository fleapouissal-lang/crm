"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { activityAccent } from "@/lib/notifications/map";
import {
  useNotificationsOptional,
  type AppNotification,
} from "@/components/notifications/notifications-provider";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FlAva } from "@/components/fusion/primitives";
import { cn } from "@/lib/utils";

export function NotificationsBell() {
  const dict = useDict();
  const { locale } = useI18n();
  const router = useRouter();
  const ctx = useNotificationsOptional();
  const [open, setOpen] = useState(false);
  const dateLocale = getDateFnsLocale(locale);
  const n = dict.fusion.notifications;
  const l = dict.fusion.labels;

  const unreadCount = ctx?.unreadCount ?? 0;
  const preview = (ctx?.items ?? []).slice(0, 6);

  function openItem(item: AppNotification) {
    if (item.unread) ctx?.markRead(item.id);
    setOpen(false);
    if (item.href) router.push(item.href);
    else router.push("/notifications");
  }

  function handleMarkAll() {
    ctx?.markAllRead();
    toast.success(n.markedAllRead);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        className="fusion-icon-btn relative"
        aria-label={dict.common.notifications}
      >
        {unreadCount > 0 ? <span className="dot" /> : null}
        <Bell strokeWidth={2} />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-1.5rem))] gap-0 overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3.5 py-2.5">
          <div>
            <p className="text-[13px] font-semibold">
              {dict.common.notifications}
            </p>
            <p className="text-[11px] fl-faint">
              {unreadCount > 0
                ? n.unreadSummary.replace("{count}", String(unreadCount))
                : n.allCaughtUp}
            </p>
          </div>
          <button
            type="button"
            className="fl-btn sm ghost"
            disabled={unreadCount === 0}
            onClick={handleMarkAll}
          >
            <CheckCheck className="size-3.5" strokeWidth={2} />
            {l.markAllRead}
          </button>
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {preview.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm fl-faint">{n.empty}</p>
          ) : (
            preview.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn(
                  "notif-item w-full cursor-pointer border-0 bg-transparent text-start",
                  item.unread && "unread"
                )}
                onClick={() => openItem(item)}
              >
                <FlAva sm style={{ background: activityAccent(item.kind) }}>
                  {item.actorInitials}
                </FlAva>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-[12.5px] leading-snug">
                    {item.text}
                  </p>
                  <div className="at-time">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-[var(--border)] p-2">
          <Link
            href="/notifications"
            className="fl-btn sm ghost w-full justify-center"
            onClick={() => setOpen(false)}
          >
            {n.viewAll}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
