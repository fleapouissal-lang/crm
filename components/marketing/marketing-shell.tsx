"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { LoginBrandLogo } from "@/components/auth/login-brand-logo";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/pricing", key: "pricing" as const },
  { href: "/faq", key: "faq" as const },
  { href: "/about", key: "about" as const },
  { href: "/contact", key: "contact" as const },
];

export function MarketingShell({ children }: { children: React.ReactNode }) {
  const dict = useDict();
  const m = dict.marketing;
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const scrollRoot = document.querySelector(".marketing-layout");
    if (!scrollRoot) return;

    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollRoot;
      const maxScroll = scrollHeight - clientHeight;
      const progress = maxScroll > 0 ? scrollTop / maxScroll : 0;
      setScrollProgress(progress);
      setScrolled(scrollTop > 12);
    };

    onScroll();
    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      scrollRoot.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [pathname]);

  return (
    <div className="marketing">
      <div className="marketing__scroll-track" aria-hidden />
      <div
        className="marketing__scroll-progress"
        style={{ width: `${scrollProgress * 100}%` }}
        aria-hidden
      />

      <div className="marketing__glow" aria-hidden />
      <div className="marketing__glow marketing__glow--2" aria-hidden />

      <header
        className={cn(
          "marketing__header",
          scrolled && "marketing__header--scrolled"
        )}
      >
        <Link href="/login" className="marketing__logo">
          <LoginBrandLogo variant="plain" className="marketing__logo-img" />
        </Link>

        <div className="marketing__header-end">
          <nav className="marketing__nav" aria-label="Navigation">
            {NAV.map(({ href, key }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "marketing__nav-link",
                  pathname === href && "marketing__nav-link--active"
                )}
              >
                {m.nav[key]}
              </Link>
            ))}
          </nav>

          <div className="marketing__header-tools">
            <ThemeToggle className="marketing__icon-btn" />
            <LocaleSwitcher variant="icon" iconClassName="marketing__icon-btn" />
          </div>

          <Link href="/login" className="marketing__nav-cta">
            {m.nav.login}
          </Link>
        </div>
      </header>

      <main className="marketing__main">{children}</main>

      <MarketingFooter />
    </div>
  );
}
