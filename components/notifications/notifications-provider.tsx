"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Activity } from "@/types/database";
import { getNotifications } from "@/lib/actions/notifications";
import { loadPreferences } from "@/lib/settings/storage";
import {
  DEFAULT_PREFERENCES,
  type WorkspacePreferences,
} from "@/lib/settings/types";
import {
  loadReadIds,
  markIdsRead,
  markIdsUnread,
  saveReadIds,
} from "@/lib/notifications/read-state";
import { activityHref, activityKind, type NotifKind } from "@/lib/notifications/map";

export type AppNotification = {
  id: string;
  text: string;
  createdAt: string;
  unread: boolean;
  kind: NotifKind;
  href: string | null;
  actorName: string | null;
  actorInitials: string;
};

type NotificationsContextValue = {
  userId: string;
  items: AppNotification[];
  unreadCount: number;
  prefs: WorkspacePreferences;
  setPrefs: (next: WorkspacePreferences) => void;
  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  markAllRead: () => void;
  toggleRead: (id: string) => void;
  refresh: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

function passesPrefs(kind: NotifKind, prefs: WorkspacePreferences): boolean {
  if (kind === "lead") return prefs.leadAlerts;
  if (kind === "task") return prefs.taskReminders;
  return true;
}

function toItem(
  activity: Activity,
  readIds: Set<string>
): AppNotification {
  const kind = activityKind(activity.type);
  const actorName = activity.profile?.full_name ?? null;
  const parts = (actorName ?? "").trim().split(/\s+/).filter(Boolean);
  const actorInitials =
    parts.length === 0
      ? "?"
      : parts.length === 1
        ? parts[0].slice(0, 2).toUpperCase()
        : `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();

  return {
    id: activity.id,
    text: activity.message,
    createdAt: activity.created_at,
    unread: !readIds.has(activity.id),
    kind,
    href: activityHref(activity),
    actorName,
    actorInitials,
  };
}

export function NotificationsProvider({
  userId,
  enabled = true,
  children,
}: {
  userId: string;
  enabled?: boolean;
  children: ReactNode;
}) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const [prefs, setPrefsState] =
    useState<WorkspacePreferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  const loadActivities = useCallback(() => {
    if (!enabled) {
      setActivities([]);
      return;
    }
    void getNotifications(30).then((data) => {
      setActivities(data);
      try {
        const initKey = `fusion-notif-init-v1:${userId}`;
        if (!localStorage.getItem(initKey) && data.length > 0) {
          const seeded = markIdsRead(
            userId,
            data.map((a) => a.id)
          );
          setReadIds(new Set(seeded));
          localStorage.setItem(initKey, "1");
        }
      } catch {
        /* ignore */
      }
    });
  }, [enabled, userId]);

  useEffect(() => {
    setReadIds(loadReadIds(userId));
    setPrefsState(loadPreferences());
    setHydrated(true);
  }, [userId]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  const setPrefs = useCallback((next: WorkspacePreferences) => {
    setPrefsState(next);
  }, []);

  const items = useMemo(() => {
    const mapped = activities.map((a) =>
      toItem(a, hydrated ? readIds : new Set())
    );
    return mapped.filter((item) => passesPrefs(item.kind, prefs));
  }, [activities, readIds, prefs, hydrated]);

  const unreadCount = useMemo(
    () => (hydrated ? items.filter((i) => i.unread).length : 0),
    [items, hydrated]
  );

  const markRead = useCallback(
    (id: string) => {
      const next = markIdsRead(userId, [id]);
      setReadIds(new Set(next));
    },
    [userId]
  );

  const markUnread = useCallback(
    (id: string) => {
      const next = markIdsUnread(userId, [id]);
      setReadIds(new Set(next));
    },
    [userId]
  );

  const toggleRead = useCallback(
    (id: string) => {
      setReadIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        saveReadIds(userId, next);
        return next;
      });
    },
    [userId]
  );

  const markAllRead = useCallback(() => {
    const ids = activities.map((a) => a.id);
    const next = markIdsRead(userId, ids);
    setReadIds(new Set(next));
  }, [activities, userId]);

  const value = useMemo(
    () => ({
      userId,
      items,
      unreadCount,
      prefs,
      setPrefs,
      markRead,
      markUnread,
      markAllRead,
      toggleRead,
      refresh: loadActivities,
    }),
    [
      userId,
      items,
      unreadCount,
      prefs,
      setPrefs,
      markRead,
      markUnread,
      markAllRead,
      toggleRead,
      loadActivities,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationsContext);
}
