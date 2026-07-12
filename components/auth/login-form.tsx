"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn } from "@/lib/actions/auth";
import { LoginBrandLogo } from "@/components/auth/login-brand-logo";
import { LoginStaticBackground } from "@/components/auth/login-static-bg";
import { LoginVisualPanel } from "@/components/auth/login-visual-panel";
import { LoginMobileDashboardPreview } from "@/components/auth/login-mobile-dashboard-preview";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { isRtlLocale } from "@/lib/i18n/locale-utils";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export function LoginForm() {
  const dict = useDict();
  const { locale } = useI18n();
  const rtl = isRtlLocale(locale);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await signIn(formData);
    if (result && !result.success) {
      setError(result.error);
      setPending(false);
    }
  }

  const formSection = (
    <section className="login-split__panel" dir="ltr">
      <header className="login-split__top">
        <LoginBrandLogo variant="split" className="login-split__logo" />
        <div className="login-split__tools login-split__tools--mobile">
          <ThemeToggle className="login-split__hero-icon-btn" />
          <LocaleSwitcher variant="icon" iconClassName="login-split__hero-icon-btn" />
        </div>
      </header>

      <div className="login-split__content" dir={rtl ? "rtl" : "ltr"}>
        <div className="login-split__intro">
          <h1>{dict.auth.loginSplitTitle}</h1>
          <p>{dict.auth.loginSplitSubtitle}</p>
        </div>

        <LoginMobileDashboardPreview className="login-split__mobile-preview" />

        <form action={handleSubmit} className="login-split__form">
          {error ? (
            <div className="login-split__error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="login-split__field">
            <label htmlFor="email">{dict.common.email}</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="vous@entreprise.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="login-split__field">
            <label htmlFor="password">{dict.common.password}</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ paddingInlineEnd: "2.75rem" }}
              />
              <button
                type="button"
                className="absolute end-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-lg opacity-70 hover:opacity-100"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword
                    ? dict.common.hidePassword
                    : dict.common.showPassword
                }
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="size-4" strokeWidth={2} />
                ) : (
                  <Eye className="size-4" strokeWidth={2} />
                )}
              </button>
            </div>
          </div>

          <div className="login-split__row">
            <label className="login-split__check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              <span>{dict.auth.rememberMe}</span>
            </label>
            <span className="login-split__forgot">{dict.auth.forgotPassword}</span>
          </div>

          <button type="submit" className="login-split__submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              dict.auth.signIn
            )}
          </button>
        </form>

        <p className="login-split__register">
          {dict.auth.noAccount}{" "}
          <Link href="/signup">{dict.auth.createOne}</Link>
        </p>
      </div>

      <footer className="login-split__legal">
        <span>© {new Date().getFullYear()} Fusion Leap CRM</span>
      </footer>
    </section>
  );
  const visualSection = (
    <section className="login-split__visual" aria-hidden={false}>
      <LoginVisualPanel />
    </section>
  );

  return (
    <div className="login-split">
      <LoginStaticBackground />
      {formSection}
      {visualSection}
    </div>
  );
}
