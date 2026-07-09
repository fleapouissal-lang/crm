"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

  return (
    <div className="marketing">
      <div className="marketing__glow" aria-hidden />
      <div className="marketing__glow marketing__glow--2" aria-hidden />

      <header className="marketing__header">
        <Link href="/login" className="marketing__logo">
          <LoginBrandLogo variant="split" />
        </Link>

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

        <div className="marketing__header-actions">
          <ThemeToggle className="marketing__icon-btn" />
          <LocaleSwitcher variant="icon" iconClassName="marketing__icon-btn" />
          <Link href="/login" className="marketing__nav-login">
            {m.nav.login}
          </Link>
          <Link href="/signup" className="marketing__nav-cta">
            {m.nav.signup}
          </Link>
        </div>
      </header>

      <main className="marketing__main">{children}</main>

      <footer className="marketing__footer">
        <p>© {new Date().getFullYear()} Fusion Leap. {m.footer.rights}</p>
      </footer>
    </div>
  );
}
