"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  CheckSquare,
  Home,
  LayoutGrid,
  Settings,
  UserPlus,
  Users,
} from "lucide-react";
import {
  getVerticalPreset,
  isNavIdVisibleInPreset,
  type VerticalNavId,
} from "@/lib/navigation/vertical-presets";
import {
  canAccessClients,
  canAccessLeads,
  canAccessTasks,
  isPlatformAdmin,
} from "@/lib/permissions";
import { useNotificationsOptional } from "@/components/notifications/notifications-provider";
import { useDict } from "@/components/shared/i18n-provider";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";

type BottomTab = {
  id: string;
  href?: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  match?: (pathname: string) => boolean;
  action?: "menu";
};

function isPathActive(pathname: string, href: string) {
  const [path] = href.split("?");
  if (pathname === path) return true;
  if (path === "/dashboard") return false;
  return pathname.startsWith(`${path}/`);
}

function formatBadge(n: number) {
  if (n <= 0) return null;
  if (n > 99) return "99+";
  return String(n);
}

export function MobileBottomNav({
  profile,
  activityDomain,
  leadCount = 0,
  menuOpen,
  onOpenMenu,
}: {
  profile: Profile;
  activityDomain?: string | null;
  leadCount?: number;
  menuOpen?: boolean;
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();
  const dict = useDict();
  const unread = useNotificationsOptional()?.unreadCount ?? 0;
  const platformAdmin = isPlatformAdmin(profile.role);
  const preset = useMemo(
    () => getVerticalPreset(platformAdmin ? null : activityDomain),
    [platformAdmin, activityDomain]
  );

  const tabs = useMemo((): BottomTab[] => {
    const moreTab: BottomTab = {
      id: "more",
      label: dict.nav.tabMenu,
      icon: LayoutGrid,
      action: "menu",
      badge: unread,
    };

    if (platformAdmin) {
      return [
        {
          id: "dashboard",
          href: "/dashboard",
          label: dict.nav.tabHome,
          icon: Home,
        },
        {
          id: "companies",
          href: "/admin/companies",
          label: dict.nav.companies,
          icon: Building2,
        },
        {
          id: "users",
          href: "/admin/users",
          label: dict.nav.users,
          icon: Users,
        },
        {
          id: "settings",
          href: "/settings",
          label: dict.nav.settings,
          icon: Settings,
        },
        moreTab,
      ];
    }

    const candidates: Array<{
      id: VerticalNavId;
      href: string;
      label: string;
      icon: LucideIcon;
      allowed: boolean;
      badge?: number;
      match?: (pathname: string) => boolean;
    }> = [
      {
        id: "dashboard",
        href: "/dashboard",
        label: dict.nav.tabHome,
        icon: Home,
        allowed: true,
      },
      {
        id: "leads",
        href: "/leads",
        label: dict.nav.tabLeads,
        icon: UserPlus,
        allowed:
          canAccessLeads(profile) && isNavIdVisibleInPreset(preset, "leads"),
        badge: leadCount,
      },
      {
        id: "clients",
        href: "/clients",
        label: dict.nav.tabClients,
        icon: Users,
        allowed:
          canAccessClients(profile) &&
          isNavIdVisibleInPreset(preset, "clients"),
      },
      {
        id: "tasks",
        href: "/tasks?view=list",
        label: dict.nav.tabTasks,
        icon: CheckSquare,
        allowed:
          canAccessTasks(profile) && isNavIdVisibleInPreset(preset, "tasks"),
        match: (path) => path === "/tasks" || path.startsWith("/tasks/"),
      },
    ];

    const primary = candidates
      .filter((c) => c.allowed)
      .slice(0, 4)
      .map(({ allowed: _allowed, ...tab }) => tab);

    return [...primary, moreTab];
  }, [dict.nav, leadCount, platformAdmin, preset, profile, unread]);

  return (
    <nav className="fusion-bottom-nav" aria-label={dict.nav.main}>
      <div className="fusion-bottom-nav__dock">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active =
            tab.action === "menu"
              ? Boolean(menuOpen)
              : tab.match
                ? tab.match(pathname)
                : tab.href
                  ? isPathActive(pathname, tab.href)
                  : false;
          const badge = formatBadge(tab.badge ?? 0);

          const content = (
            <>
              <span className="fusion-bottom-nav__icon-wrap">
                <Icon
                  strokeWidth={active ? 2.25 : 1.75}
                  className="fusion-bottom-nav__icon"
                  absoluteStrokeWidth={false}
                />
                {badge ? (
                  <span className="fusion-bottom-nav__badge">{badge}</span>
                ) : null}
              </span>
              <span className="fusion-bottom-nav__label">{tab.label}</span>
            </>
          );

          if (tab.action === "menu") {
            return (
              <button
                key={tab.id}
                type="button"
                className={cn("fusion-bottom-nav__item", active && "active")}
                aria-label={tab.label}
                aria-expanded={menuOpen}
                onClick={onOpenMenu}
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={tab.id}
              href={tab.href!}
              className={cn("fusion-bottom-nav__item", active && "active")}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
