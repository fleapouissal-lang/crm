"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useTransition, useCallback, type MouseEvent } from "react";
import {
  ChevronsLeft,
  ChevronsRight,
  LogOut,
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
import {
  getVerticalPreset,
  isNavIdVisibleInPreset,
  type VerticalNavId,
  type VerticalNavPreset,
  type VerticalPresetKey,
} from "@/lib/navigation/vertical-presets";
import { isPlatformAdmin, hasNavCapability, canViewFinanceDocumentsForRole } from "@/lib/permissions";
import { signOut } from "@/lib/actions/auth";
import { CompanyBrand } from "@/components/brand/company-brand";
import { SidebarLuxuryBg } from "@/components/layout/sidebar-luxury-bg";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDict } from "@/components/shared/i18n-provider";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";

function resolveNavTitle(
  item: NavItem,
  preset: VerticalNavPreset,
  dict: ReturnType<typeof useDict>
): string {
  const verticalKey = preset.key;
  const overrideKey = preset.labelOverrides?.[item.id as VerticalNavId];
  if (verticalKey !== "default" && overrideKey) {
    const vertical = dict.fusion.verticalNav?.[verticalKey] as
      | Record<string, string>
      | undefined;
    const label = vertical?.[overrideKey];
    if (label) return label;
  }
  return dict.nav[item.labelKey as keyof typeof dict.nav] as string;
}

function NavSection({
  items,
  pathname,
  profile,
  preset,
  applyVerticalFilter,
  leadCount,
  quoteCount,
  notificationCount,
  collapsed,
  onClose,
}: {
  items: NavItem[];
  pathname: string;
  profile: Profile;
  preset: VerticalNavPreset;
  /** When false (platform admin), show all section items. */
  applyVerticalFilter: boolean;
  leadCount?: number;
  quoteCount?: number;
  notificationCount?: number;
  collapsed?: boolean;
  onClose?: () => void;
}) {
  const dict = useDict();
  const visibleItems = items.filter((item) => {
    if (applyVerticalFilter && !isNavIdVisibleInPreset(preset, item.id)) return false;
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
        if (badge != null && badge <= 0) badge = undefined;

        const title = resolveNavTitle(item, preset, dict);
        const Icon =
          preset.iconOverrides?.[item.id as VerticalNavId] ?? item.icon;

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
  organizationName,
  organizationLogoUrl,
  activityDomain,
  leadCount,
  quoteCount,
  notificationCount,
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: {
  profile: Profile;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  activityDomain?: string | null;
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
  const preset = useMemo(
    () => getVerticalPreset(platformAdmin ? null : activityDomain),
    [platformAdmin, activityDomain]
  );
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
      data-vertical={preset.key as VerticalPresetKey}
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
              title={organizationName ?? "Fusion Leap"}
            >
              <CompanyBrand
                name={organizationName}
                logoUrl={platformAdmin ? null : organizationLogoUrl}
                collapsed={collapsed}
              />
            </Link>
          </div>
        </div>

        <button
          type="button"
          className="fusion-sidebar-rail-btn"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronsRight className="size-4" strokeWidth={2.25} />
          ) : (
            <ChevronsLeft className="size-4" strokeWidth={2.25} />
          )}
        </button>

        {showSettingsInFoot ? (
          <Link
            href="/settings"
            className="fusion-user-card fusion-user-card--top"
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
          <div className="fusion-user-card fusion-user-card--top cursor-default">
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

        <nav className="fusion-nav">
          {navSections.map((items, index) => (
            <NavSection
              key={index}
              items={items}
              pathname={pathname}
              profile={profile}
              preset={preset}
              applyVerticalFilter={!platformAdmin}
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
              preset={preset}
              applyVerticalFilter
              notificationCount={notificationCount}
              collapsed={collapsed}
              onClose={onClose}
            />
          ) : null}
        </nav>

        <div className="fusion-side-foot">
          <button
            type="button"
            className="fusion-logout-btn"
            disabled={pending}
            title={dict.auth.signOut}
            onClick={() => startTransition(() => void signOut())}
          >
            <LogOut className="size-4" strokeWidth={1.75} />
            <span className="fusion-logout-label">{dict.auth.signOut}</span>
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
