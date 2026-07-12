"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Zap } from "lucide-react";
import { signUp } from "@/lib/actions/auth";
import { useDict } from "@/components/shared/i18n-provider";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { AuroraBackground } from "@/components/layout/aurora-background";
import { PasswordInput } from "@/components/ui/password-input";

export function SignupForm() {
  const dict = useDict();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await signUp(formData);
    if (result && !result.success) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center p-4">
      <AuroraBackground />
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <ThemeToggle />
        <LocaleSwitcher variant="icon" />
      </div>
      <div className="relative z-10 w-full max-w-md">
        <div className="fl-card fl-pad">
          <div className="mb-6 text-center">
            <div className="fusion-brand mx-auto mb-4 w-fit justify-center">
              <div className="mark">
                <Zap className="size-[21px] text-white" fill="white" strokeWidth={0} />
              </div>
              <div className="text-left">
                <div className="name">Fusion Leap</div>
                <div className="sub">Operations Cloud</div>
              </div>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">
              {dict.auth.createAccount}
            </h1>
            <p className="mt-1 text-sm fl-faint">{dict.auth.signUpSubtitle}</p>
          </div>
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-[11px] border border-[var(--rose)]/30 bg-[rgba(242,85,122,0.1)] px-3 py-2 text-sm text-[var(--rose)]">
                {error}
              </div>
            )}
            <div className="fl-field">
              <label htmlFor="full_name">{dict.common.fullName}</label>
              <input id="full_name" name="full_name" className="fl-inp" placeholder="Jane Smith" required autoComplete="name" />
            </div>
            <div className="fl-field">
              <label htmlFor="organization_name">{dict.common.organization}</label>
              <input id="organization_name" name="organization_name" className="fl-inp" placeholder="Acme Inc." required />
            </div>
            <div className="fl-field">
              <label htmlFor="email">{dict.common.email}</label>
              <input id="email" name="email" type="email" className="fl-inp" placeholder="ouissal@fusionleap.com" required autoComplete="email" />
              <p className="mt-1 text-xs fl-faint">{dict.auth.companyEmailHint}</p>
            </div>
            <div className="fl-field">
              <label htmlFor="password">{dict.common.password}</label>
              <PasswordInput
                id="password"
                name="password"
                inputClassName="fl-inp"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="fl-btn primary w-full justify-center" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              {dict.auth.createAccountBtn}
            </button>
            <p className="text-center text-sm fl-faint">
              {dict.auth.hasAccount}{" "}
              <Link href="/login" className="font-medium text-[var(--iris)] hover:underline">
                {dict.auth.signIn}
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
