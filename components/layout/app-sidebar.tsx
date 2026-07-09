"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition, useCallback, type MouseEvent } from "react";
import {
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Settings,
} from "lucide-react";
import {
  workspaceNav,
  operationsNav,
  systemNav,
  type NavItem,
} from "@/lib/navigation";
import { signOut } from "@/lib/actions/auth";
import { FusionLeapBrand } from "@/components/brand/fusion-leap-logo";
import { SidebarLuxuryBg } from "@/components/layout/sidebar-luxury-bg";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDict } from "@/components/shared/i18n-provider";
import type { Profile, Role } from "@/types/database";
import { cn } from "@/lib/utils";

function NavSection({
  items,
  pathname,
  role,
  leadCount,
  quoteCount,
  notificationCount,
  collapsed,
  onClose,
}: {
  items: NavItem[];
  pathname: string;
  role: Role;
  leadCount?: number;
  quoteCount?: number;
  notificationCount?: number;
  collapsed?: boolean;
  onClose?: () => void;
}) {
  const dict = useDict();
  const visibleItems = items.filter((item) => !item.adminOnly || role === "admin");

  if (visibleItems.length === 0) return null;

  return (
    <div className="fusion-nav-group">
      {visibleItems.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));

        let badge: number | undefined;
        if (item.badge === "notifications") badge = notificationCount;
        else if (item.badge === "leads") badge = leadCount;
        else if (item.badge === "quotes") badge = quoteCount;

        const title = dict.nav[item.labelKey as keyof typeof dict.nav] as string;
        const Icon = item.icon;

        return (
          <Link
            key={item.id}
            href={item.href}
            className={cn("fusion-nav-item", active && "active")}
            title={collapsed ? title : undefined}
            aria-label={title}
            aria-current={active ? "page" : undefined}
            onClick={onClose}
          >
            <span className="fusion-nav-icon-wrap">
              <Icon strokeWidth={1.5} className="fusion-nav-svg" />
              {collapsed && badge != null && badge > 0 ? (
                <span className="fusion-nav-dot" />
              ) : null}
            </span>
            <span className="fusion-nav-text">{title}</span>
            {!collapsed && badge != null && badge > 0 && (
              <span
                className={cn(
                  "fusion-nav-badge",
                  item.id !== "crm" &&
                    item.id !== "notifications" &&
                    item.id !== "quotes" &&
                    "soft"
                )}
              >
                {badge}
              </span>
            )}
            {active ? <span className="fusion-nav-active-glow" aria-hidden /> : null}
          </Link>
        );
      })}
    </div>
  );
}

export function AppSidebar({
  profile,
  leadCount,
  quoteCount,
  notificationCount = 4,
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: {
  profile: Profile;
  leadCount?: number;
  quoteCount?: number;
  notificationCount?: number;
  open?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();
  const dict = useDict();
  const [pending, startTransition] = useTransition();
  const displayName = profile.full_name ?? dict.common.user;

  const handleSidebarDoubleClick = useCallback(
    (e: MouseEvent<HTMLElement>) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, input, select, textarea, label")) return;
      onToggleCollapse?.();
    },
    [onToggleCollapse]
  );

  return (
    <aside
      className={cn("fusion-sidebar", open && "open", collapsed && "collapsed")}
      id="sidebar"
      data-collapsed={collapsed ? "true" : "false"}
      onDoubleClick={handleSidebarDoubleClick}
    >
      <SidebarLuxuryBg />

      <div className="fusion-sidebar-inner">
        <div className="fusion-sidebar-head">
          <div className="fusion-sidebar-head-card">
            <Link
              href="/dashboard"
              className="fusion-brand"
              onClick={onClose}
              title="Fusion Leap"
            >
              <FusionLeapBrand collapsed={collapsed} />
            </Link>
            <button
              type="button"
              className="fusion-sidebar-collapse-btn"
              onClick={onToggleCollapse}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <span className="fusion-sidebar-collapse-btn__shine" aria-hidden />
              {collapsed ? (
                <PanelLeft className="size-[18px]" strokeWidth={1.75} />
              ) : (
                <PanelLeftClose className="size-[18px]" strokeWidth={1.75} />
              )}
            </button>
          </div>
        </div>

        <nav className="fusion-nav">
          <NavSection
            items={workspaceNav}
            pathname={pathname}
            role={profile.role}
            leadCount={leadCount}
            quoteCount={quoteCount}
            notificationCount={notificationCount}
            collapsed={collapsed}
            onClose={onClose}
          />
          <NavSection
            items={operationsNav}
            pathname={pathname}
            role={profile.role}
            leadCount={leadCount}
            quoteCount={quoteCount}
            collapsed={collapsed}
            onClose={onClose}
          />
          <NavSection
            items={systemNav}
            pathname={pathname}
            role={profile.role}
            notificationCount={notificationCount}
            collapsed={collapsed}
            onClose={onClose}
          />
        </nav>

        <div className="fusion-side-foot">
          <Link
            href="/settings"
            className="fusion-user-card"
            onClick={onClose}
            title={displayName}
          >
            <UserAvatar
              name={displayName}
              avatarUrl={profile.avatar_url}
              variant="sidebar"
            />
            <div className="fusion-user-meta">
              <b>{displayName}</b>
              <small>{dict.roles[profile.role]}</small>
            </div>
            {!collapsed ? (
              <span className="fusion-nav-icon-wrap fusion-user-settings">
                <Settings className="fusion-nav-svg" strokeWidth={1.5} />
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            className="fusion-nav-item fusion-logout-btn"
            disabled={pending}
            title={dict.auth.signOut}
            onClick={() => startTransition(() => void signOut())}
          >
            <span className="fusion-nav-icon-wrap">
              <LogOut className="fusion-nav-svg" strokeWidth={1.5} />
            </span>
            <span className="fusion-nav-text fusion-logout-label">{dict.auth.signOut}</span>
          </button>

          <button
            type="button"
            className="fusion-sidebar-toggle mobile-only"
            onClick={onToggleCollapse}
            aria-label="Close sidebar"
          >
            <PanelLeftClose className="size-4" strokeWidth={1.5} />
            <span>{dict.common.cancel}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
