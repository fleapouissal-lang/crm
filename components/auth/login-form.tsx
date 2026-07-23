"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signIn } from "@/lib/actions/auth";
import { LoginBrandLogo } from "@/components/auth/login-brand-logo";
import { LoginStaticBackground } from "@/components/auth/login-static-bg";
import { LoginVisualPanel } from "@/components/auth/login-visual-panel";
import { useDict, useI18n } from "@/components/shared/i18n-provider";
import { isRtlLocale } from "@/lib/i18n/locale-utils";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PasswordInput } from "@/components/ui/password-input";

function useIsMobileLogin() {
  const [mobile, setMobile] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setMobile(mq.matches);
    apply();
    setReady(true);
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return { mobile, ready };
}

export function LoginForm() {
  const dict = useDict();
  const { locale } = useI18n();
  const rtl = isRtlLocale(locale);
  const { mobile, ready } = useIsMobileLogin();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [remember, setRemember] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await signIn(formData);
    if (result && !result.success) {
      setError(result.error);
      setPending(false);
    }
  }

  const formFields = (
    <>
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
          inputMode="email"
          placeholder="vous@entreprise.com"
          required
          autoComplete="email"
        />
      </div>

      <div className="login-split__field">
        <label htmlFor="password">{dict.common.password}</label>
        <PasswordInput
          native
          id="password"
          name="password"
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />
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
      </div>

      <button type="submit" className="login-split__submit" disabled={pending}>
        {pending ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          dict.auth.signIn
        )}
      </button>
    </>
  );

  if (!ready) {
    return <div className="login-split login-split--boot" aria-busy="true" />;
  }

  return (
    <div className={mobile ? "login-split login-split--mobile" : "login-split"}>
      <LoginStaticBackground />

      <section className="login-split__panel" dir="ltr">
        <header className="login-split__top">
          <LoginBrandLogo variant="split" className="login-split__logo" />
          <div className="login-split__tools login-split__tools--mobile">
            <ThemeToggle className="login-split__hero-icon-btn" />
            <LocaleSwitcher
              variant="icon"
              iconClassName="login-split__hero-icon-btn"
            />
          </div>
        </header>

        <div className="login-split__content" dir={rtl ? "rtl" : "ltr"}>
          <div className="login-split__intro">
            <h1>{dict.auth.loginSplitTitle}</h1>
            <p>{dict.auth.loginSplitSubtitle}</p>
          </div>

          <form action={handleSubmit} className="login-split__form">
            {formFields}
          </form>

          <p className="login-split__register">
            {dict.auth.noAccount}{" "}
            <Link href="/signup">{dict.auth.createOne}</Link>
          </p>
        </div>

        <footer className="login-split__legal">
          <span>© {new Date().getFullYear()} CRM</span>
        </footer>
      </section>

      {!mobile ? (
        <section className="login-split__visual" aria-hidden="true">
          <LoginVisualPanel />
        </section>
      ) : null}
    </div>
  );
}
