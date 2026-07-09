"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { format } from "date-fns";
import { getDateFnsLocale } from "@/lib/i18n/locale-utils";
import { matchPageMeta } from "@/lib/navigation";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { Profile } from "@/types/database";

export function AppHeader({
  profile,
  activityCount = 0,
}: {
  profile: Profile;
  activityCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dict = useDict();
  const { locale } = useI18n();
  const [greeting, setGreeting] = useState("");

  const pageMeta = useMemo(() => matchPageMeta(pathname), [pathname]);
  const title = dict.nav[pageMeta.titleKey as keyof typeof dict.nav] as string;
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
        <h1>{title}</h1>
        <p>{greeting || staticSub}</p>
      </div>

      <form
        className="fusion-search"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q") as string;
          if (q?.trim()) router.push(`/crm?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search strokeWidth={2} className="size-4 shrink-0" />
        <input name="q" placeholder={dict.nav.searchPlaceholder} />
        <kbd>⌘K</kbd>
      </form>

      <div className="fusion-top-actions">
        <ThemeToggle />
        <LocaleSwitcher />
        <button type="button" className="fusion-icon-btn" aria-label={dict.common.notifications} onClick={() => router.push("/notifications")}>
          {(activityCount > 0) && <span className="dot" />}
          <Bell strokeWidth={2} />
        </button>
        <button
          type="button"
          className="border-0 bg-transparent p-0"
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
