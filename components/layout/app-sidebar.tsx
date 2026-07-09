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
  platformAdminNav,
  type NavItem,
} from "@/lib/navigation";
import { isPlatformAdmin, hasNavCapability, canViewFinanceDocumentsForRole } from "@/lib/permissions";
import { signOut } from "@/lib/actions/auth";
import { FusionLeapBrand } from "@/components/brand/fusion-leap-logo";
import { SidebarLuxuryBg } from "@/components/layout/sidebar-luxury-bg";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDict } from "@/components/shared/i18n-provider";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";

function NavSection({
  items,
  pathname,
  profile,
  leadCount,
  quoteCount,
  notificationCount,
  collapsed,
  onClose,
}: {
  items: NavItem[];
  pathname: string;
  profile: Profile;
  leadCount?: number;
  quoteCount?: number;
  notificationCount?: number;
  collapsed?: boolean;
  onClose?: () => void;
}) {
  const dict = useDict();
  const visibleItems = items.filter((item) => {
    if (item.adminOnly && !canViewFinanceDocumentsForRole(profile.role)) return false;
    if (item.capability && !hasNavCapability(profile, item.capability)) return false;
    return true;
  });

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
  const platformAdmin = isPlatformAdmin(profile.role);
  const navSections = platformAdmin
    ? [platformAdminNav]
    : [workspaceNav, operationsNav, systemNav.filter((item) => item.id !== "settings")];
  const showSettingsInFoot = !platformAdmin;

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
          {navSections.map((items, index) => (
            <NavSection
              key={index}
              items={items}
              pathname={pathname}
              profile={profile}
              leadCount={leadCount}
              quoteCount={quoteCount}
              notificationCount={notificationCount}
              collapsed={collapsed}
              onClose={onClose}
            />
          ))}
          {!platformAdmin ? (
            <NavSection
              items={systemNav.filter((item) => item.id === "settings")}
              pathname={pathname}
              profile={profile}
              notificationCount={notificationCount}
              collapsed={collapsed}
              onClose={onClose}
            />
          ) : null}
        </nav>

        <div className="fusion-side-foot">
          {showSettingsInFoot ? (
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
          ) : (
            <div className="fusion-user-card cursor-default">
              <UserAvatar
                name={displayName}
                avatarUrl={profile.avatar_url}
                variant="sidebar"
              />
              <div className="fusion-user-meta">
                <b>{displayName}</b>
                <small>{dict.roles[profile.role]}</small>
              </div>
            </div>
          )}

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
