"use client";

import { useCallback, useEffect, useState } from "react";
import { AuroraBackground } from "@/components/layout/aurora-background";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { CursorGlow } from "@/components/layout/cursor-glow";
import { VerticalModuleGuard } from "@/components/layout/vertical-module-guard";
import { NotificationsProvider, useNotificationsOptional } from "@/components/notifications/notifications-provider";
import { OrgIssuerProvider } from "@/components/finance/org-issuer-provider";
import type { Profile } from "@/types/database";
import type { FinanceOrgInput } from "@/lib/finance/company-info";
import { cn } from "@/lib/utils";
import { isPlatformAdmin } from "@/lib/permissions";
import { migrateLocalCrmToDb } from "@/lib/crm/migrate-local-to-db";

const SIDEBAR_COLLAPSED_KEY = "fusion-sidebar-collapsed";

function SidebarWithUnread({
  profile,
  organizationName,
  organizationLogoUrl,
  activityDomain,
  leadCount,
  quoteCount,
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}: {
  profile: Profile;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  activityDomain?: string | null;
  leadCount: number;
  quoteCount: number;
  open: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}) {
  const unread = useNotificationsOptional()?.unreadCount ?? 0;
  return (
    <AppSidebar
      profile={profile}
      organizationName={organizationName}
      organizationLogoUrl={organizationLogoUrl}
      activityDomain={activityDomain}
      leadCount={leadCount}
      quoteCount={quoteCount}
      notificationCount={unread}
      open={open}
      collapsed={collapsed}
      onClose={onClose}
      onToggleCollapse={onToggleCollapse}
    />
  );
}

export function FusionShell({
  profile,
  organization,
  organizationName,
  organizationLogoUrl,
  activityDomain,
  leadCount,
  quoteCount,
  loadNotifications = false,
  children,
}: {
  profile: Profile;
  organization?: FinanceOrgInput | null;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  activityDomain?: string | null;
  leadCount: number;
  quoteCount: number;
  loadNotifications?: boolean;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setSidebarCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true");
    } catch {
      /* ignore */
    }
    void migrateLocalCrmToDb().then((didMigrate) => {
      if (didMigrate) {
        window.location.reload();
      }
    });
  }, []);

  const toggleCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const platformAdmin = isPlatformAdmin(profile.role);

  return (
    <OrgIssuerProvider organization={organization}>
      <NotificationsProvider
        userId={profile.id}
        enabled={loadNotifications && !platformAdmin}
      >
        <CursorGlow />
        <AuroraBackground />
        {!platformAdmin ? (
          <VerticalModuleGuard activityDomain={activityDomain} enabled />
        ) : null}
        <div
          className={cn(
            "fusion-app",
            mounted && sidebarCollapsed && "sidebar-collapsed"
          )}
        >
          <SidebarWithUnread
            profile={profile}
            organizationName={organizationName}
            organizationLogoUrl={organizationLogoUrl}
            activityDomain={platformAdmin ? null : activityDomain}
            leadCount={leadCount}
            quoteCount={quoteCount}
            open={sidebarOpen}
            collapsed={mounted ? sidebarCollapsed : false}
            onClose={() => setSidebarOpen(false)}
            onToggleCollapse={() => {
              if (typeof window !== "undefined" && window.innerWidth <= 960) {
                setSidebarOpen(false);
                return;
              }
              toggleCollapse();
            }}
          />
          <div
            className={cn("fusion-scrim", sidebarOpen && "on")}
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="fusion-main">
            <AppHeader
              profile={profile}
              organizationName={organizationName}
              organizationLogoUrl={organizationLogoUrl}
              activityDomain={platformAdmin ? null : activityDomain}
            />
            <div className="fusion-scroll">
              <div className="fusion-page">{children}</div>
            </div>
            <MobileBottomNav
              profile={profile}
              activityDomain={platformAdmin ? null : activityDomain}
              leadCount={leadCount}
              menuOpen={sidebarOpen}
              onOpenMenu={() => setSidebarOpen(true)}
            />
          </div>
        </div>
      </NotificationsProvider>
    </OrgIssuerProvider>
  );
}
