"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { matchPageMeta } from "@/lib/navigation";
import {
  getVerticalPreset,
  pathnameToNavId,
  type VerticalNavId,
} from "@/lib/navigation/vertical-presets";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { Profile } from "@/types/database";

import { isPlatformAdmin } from "@/lib/permissions";

export function AppHeader({
  profile,
  organizationName,
  organizationLogoUrl,
  activityDomain,
  activityCount = 0,
}: {
  profile: Profile;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  activityDomain?: string | null;
  activityCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dict = useDict();
  const { locale } = useI18n();
  const [greeting, setGreeting] = useState("");

  const platformAdmin = isPlatformAdmin(profile.role);
  const pageMeta = useMemo(() => matchPageMeta(pathname), [pathname]);
  const title = useMemo(() => {
    const fallback = dict.nav[pageMeta.titleKey as keyof typeof dict.nav] as string;
    if (platformAdmin) return fallback;
    const preset = getVerticalPreset(activityDomain);
    if (preset.key === "default") return fallback;
    const navId = pathnameToNavId(pathname);
    if (!navId) return fallback;
    const overrideKey = preset.labelOverrides?.[navId as VerticalNavId];
    if (!overrideKey) return fallback;
    const vertical = dict.fusion.verticalNav?.[preset.key] as
      | Record<string, string>
      | undefined;
    return vertical?.[overrideKey] ?? fallback;
  }, [dict, pageMeta.titleKey, platformAdmin, activityDomain, pathname]);
  const staticSub = dict.nav[pageMeta.subtitleKey as keyof typeof dict.nav] as string;

  const firstName = profile.full_name?.split(" ")[0];

  useEffect(() => {
    if (pathname !== "/dashboard") {
      setGreeting(staticSub);
      return;
    }
    const dateLocale = getDateFnsLocale(locale);
    const dateStr = format(new Date(), "EEEE, d MMMM yyyy", { locale: dateLocale });
    const hour = new Date().getHours();
    const greet =
      hour < 12
        ? locale === "fr" ? "Bonjour" : locale === "ar" ? "صباح الخير" : "Good morning"
        : hour < 18
          ? locale === "fr" ? "Bon après-midi" : locale === "ar" ? "مساء الخير" : "Good afternoon"
          : locale === "fr" ? "Bonsoir" : locale === "ar" ? "مساء الخير" : "Good evening";
    setGreeting(firstName ? `${dateStr} · ${greet}, ${firstName}` : dateStr);
  }, [locale, firstName, pathname, staticSub]);

  return (
    <header className="fusion-topbar">
      <div className="fusion-page-head">
        <div className="fusion-page-head__row">
          <h1>{title}</h1>
          {organizationName && !platformAdmin ? (
            <span className="fl-badge b-gray fusion-org-badge text-[11px]">
              {organizationLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={organizationLogoUrl}
                  alt=""
                  className="fusion-org-badge__logo"
                />
              ) : null}
              {organizationName} CRM
            </span>
          ) : null}
          {platformAdmin ? (
            <span className="fl-badge b-gray text-[11px]">{dict.auth.globalPortal}</span>
          ) : null}
        </div>
        <p>{greeting || staticSub}</p>
      </div>

      {!platformAdmin ? (
      <form
        className="fusion-search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q") as string;
          if (q?.trim()) router.push(`/leads?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search strokeWidth={2} className="size-4 shrink-0" />
        <input name="q" placeholder={dict.nav.searchPlaceholder} />
        <kbd>⌘K</kbd>
      </form>
      ) : null}

      <div className="fusion-top-actions">
        <LocaleSwitcher />
        <ThemeToggle />
        <button
          type="button"
          className="fusion-icon-btn"
          aria-label={dict.common.notifications}
          onClick={() => router.push("/notifications")}
        >
          {activityCount > 0 ? <span className="dot" /> : null}
          <Bell strokeWidth={2} />
        </button>
        <button
          type="button"
          className="fusion-top-actions__profile"
          aria-label={dict.auth.profile}
          title={dict.nav.settings}
          onClick={() => router.push("/settings")}
        >
          <UserAvatar
            name={profile.full_name ?? dict.common.user}
            avatarUrl={profile.avatar_url}
            variant="header"
          />
        </button>
      </div>
    </header>
  );
}
