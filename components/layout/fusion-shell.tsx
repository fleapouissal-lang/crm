"use client";

import { useCallback, useEffect, useState } from "react";
import { AuroraBackground } from "@/components/layout/aurora-background";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { CursorGlow } from "@/components/layout/cursor-glow";
import { VerticalModuleGuard } from "@/components/layout/vertical-module-guard";
import type { Profile } from "@/types/database";
import { cn } from "@/lib/utils";
import { isPlatformAdmin } from "@/lib/permissions";

const SIDEBAR_COLLAPSED_KEY = "fusion-sidebar-collapsed";

export function FusionShell({
  profile,
  organizationName,
  organizationLogoUrl,
  activityDomain,
  activityCount,
  leadCount,
  quoteCount,
  children,
}: {
  profile: Profile;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  activityDomain?: string | null;
  activityCount: number;
  leadCount: number;
  quoteCount: number;
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
    <>
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
        <AppSidebar
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
            activityCount={activityCount}
          />
          <div className="fusion-scroll">
            <div className="fusion-page">{children}</div>
          </div>
        </div>
      </div>
    </>
  );
}
