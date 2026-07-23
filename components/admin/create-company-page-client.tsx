"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  Building2,
  CreditCard,
  KeyRound,
  Loader2,
  Phone,
  Plus,
  ScrollText,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { createOrganizationWithDirector } from "@/lib/actions/organizations";
import {
  PLAN_KEYS,
  PLAN_PRICES_EUR,
  SUBSCRIPTION_STATUSES,
  defaultTrialEndsAt,
  type PlanKey,
  type SubscriptionStatus,
} from "@/lib/billing/plans";
import { useDict } from "@/components/shared/i18n-provider";
import { CompanyLogoPicker } from "@/components/shared/company-logo-picker";
import { CompanyProfileSelects } from "@/components/admin/company-profile-selects";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function toDateInput(value: string | null | undefined): string {
  if (!value) return "";
  return value.slice(0, 10);
}

export function CreateCompanyPageClient() {
  const dict = useDict();
  const s = dict.fusion.settings;
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [rc, setRc] = useState("");
  const [activityDomain, setActivityDomain] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<PlanKey>("free");
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus>("active");
  const [trialEndsAt, setTrialEndsAt] = useState("");
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState("");
  const [directorName, setDirectorName] = useState("");
  const [directorEmail, setDirectorEmail] = useState("");
  const [directorPassword, setDirectorPassword] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  function handlePlanChange(next: PlanKey) {
    setPlan(next);
    if (next === "free") {
      setSubscriptionStatus("active");
      setTrialEndsAt("");
      return;
    }
    if (subscriptionStatus === "active" && !trialEndsAt) {
      setSubscriptionStatus("trialing");
      setTrialEndsAt(toDateInput(defaultTrialEndsAt()));
    }
  }

  function handleSubmit() {
    if (!logoFile) {
      toast.error(s.companyLogoRequiredHint);
      return;
    }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("organizationName", organizationName);
      fd.set("emailDomain", emailDomain);
      fd.set("rc", rc);
      fd.set("activityDomain", activityDomain);
      fd.set("country", country);
      fd.set("city", city);
      fd.set("phone", phone);
      fd.set("plan", plan);
      fd.set("subscriptionStatus", subscriptionStatus);
      fd.set("trialEndsAt", trialEndsAt);
      fd.set("currentPeriodEnd", currentPeriodEnd);
      fd.set("directorName", directorName);
      fd.set("directorEmail", directorEmail);
      fd.set("directorPassword", directorPassword);
      fd.set("logo", logoFile);

      const result = await createOrganizationWithDirector(fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(
        plan !== "free"
          ? `${s.companyCreated} · ${dict.fusion.platformBilling.invoiceCreated}`
          : s.companyCreated
      );
      router.push("/admin/companies");
      router.refresh();
    });
  }

  const canSubmit =
    organizationName.trim() &&
    directorName.trim() &&
    directorEmail.trim().includes("@") &&
    directorPassword.length >= 6 &&
    logoFile;

  return (
    <div className="fl-create-company space-y-[18px]">
      <div className="fl-card fl-pad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 place-items-center rounded-xl text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <Building2 className="size-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{s.createCompany}</h2>
              <p className="mt-1 text-sm fl-faint">{s.createCompanySub}</p>
            </div>
          </div>
          <Link href="/admin/companies" className="fl-btn sm ghost">
            <ArrowLeft className="size-4" />
            {s.backToCompanies}
          </Link>
        </div>
      </div>

      <div className="grid gap-[18px] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{s.companyDetails}</h3>
              <div className="ch-sub">{s.companyDetailsSub}</div>
            </div>
          </div>
          <div className="fl-pad space-y-4">
            <CompanyLogoPicker
              previewUrl={logoPreview}
              disabled={pending}
              required
              allowRemove={false}
              onFileChange={setLogoFile}
              onClear={() => setLogoFile(null)}
            />
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="create-org-name">
                {s.companyName}
              </label>
              <Input
                id="create-org-name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="fl-input"
                placeholder="Fusion Leap"
                autoComplete="organization"
              />
            </div>
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="create-org-rc">
                {s.companyRc}
              </label>
              <div className="fl-input-affix">
                <ScrollText className="fl-input-affix__icon" strokeWidth={1.75} />
                <Input
                  id="create-org-rc"
                  value={rc}
                  onChange={(e) => setRc(e.target.value)}
                  className="fl-input fl-input--with-icon"
                  placeholder="RC 123456"
                />
              </div>
            </div>
            <CompanyProfileSelects
              activityDomain={activityDomain}
              country={country}
              city={city}
              disabled={pending}
              onActivityChange={setActivityDomain}
              onCountryChange={setCountry}
              onCityChange={setCity}
            />
            <div className="fl-form-row">
              <div className="fl-field">
                <label className="fl-field-label" htmlFor="create-org-phone">
                  {s.companyPhone}
                </label>
                <div className="fl-input-affix">
                  <Phone className="fl-input-affix__icon" strokeWidth={1.75} />
                  <Input
                    id="create-org-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="fl-input fl-input--with-icon"
                    placeholder="+212 6 00 00 00 00"
                    autoComplete="tel"
                  />
                </div>
              </div>
              <div className="fl-field">
                <label className="fl-field-label" htmlFor="create-org-domain">
                  {s.emailDomain}
                </label>
                <div className="fl-input-affix">
                  <AtSign className="fl-input-affix__icon" strokeWidth={1.75} />
                  <Input
                    id="create-org-domain"
                    value={emailDomain}
                    onChange={(e) => setEmailDomain(e.target.value.replace(/^@+/, ""))}
                    className="fl-input fl-input--with-icon"
                    placeholder="fusionleap.com"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
            <small className="fl-field-hint">{s.emailDomainHint}</small>
          </div>
        </section>

        <section className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{s.directorAccount}</h3>
              <div className="ch-sub">{s.directorAccountSub}</div>
            </div>
          </div>
          <div className="fl-pad space-y-4">
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="create-dir-name">
                {s.fullName}
              </label>
              <div className="fl-input-affix">
                <UserRound className="fl-input-affix__icon" strokeWidth={1.75} />
                <Input
                  id="create-dir-name"
                  value={directorName}
                  onChange={(e) => setDirectorName(e.target.value)}
                  className="fl-input fl-input--with-icon"
                  placeholder="Youssef Kaab"
                  autoComplete="name"
                />
              </div>
            </div>
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="create-dir-email">
                {dict.common.email}
              </label>
              <div className="fl-input-affix">
                <AtSign className="fl-input-affix__icon" strokeWidth={1.75} />
                <Input
                  id="create-dir-email"
                  type="email"
                  value={directorEmail}
                  onChange={(e) => setDirectorEmail(e.target.value)}
                  className="fl-input fl-input--with-icon"
                  placeholder="directeur@gmail.com"
                  autoComplete="email"
                />
              </div>
              <small className="fl-field-hint">{s.memberPersonalEmailHint}</small>
            </div>
            <div className="fl-field">
              <label className="fl-field-label" htmlFor="create-dir-password">
                {dict.common.password}
              </label>
              <div className="fl-input-affix">
                <KeyRound className="fl-input-affix__icon" strokeWidth={1.75} />
                <PasswordInput
                  id="create-dir-password"
                  value={directorPassword}
                  onChange={(e) => setDirectorPassword(e.target.value)}
                  inputClassName="fl-input fl-input--with-icon"
                  minLength={6}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <small className="fl-field-hint">{s.passwordMinHint}</small>
            </div>
          </div>
        </section>
      </div>

      <section className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3 className="inline-flex items-center gap-2">
              <CreditCard className="size-4" />
              {s.subscriptionOnCreate}
            </h3>
            <div className="ch-sub">{s.subscriptionOnCreateSub}</div>
          </div>
        </div>
        <div className="fl-pad space-y-4">
          <div className="fl-form-row">
            <div className="fl-field">
              <label className="fl-field-label">{s.plan}</label>
              <Select value={plan} onValueChange={(v) => handlePlanChange(v as PlanKey)}>
                <SelectTrigger className="fl-select-trigger fl-input w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="fl-select-panel">
                  {PLAN_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      <span className="fl-select-plan">
                        <span>{s.plans[key]}</span>
                        <span className="fl-select-plan__price">
                          {PLAN_PRICES_EUR[key]} MAD
                          {key === "free" ? ` ${s.perMonthFree}` : `/${s.perMonthShort}`}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="fl-field">
              <label className="fl-field-label">{s.subscriptionStatus}</label>
              <Select
                value={subscriptionStatus}
                onValueChange={(v) => setSubscriptionStatus(v as SubscriptionStatus)}
              >
                <SelectTrigger className="fl-select-trigger fl-input w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="fl-select-panel">
                  {SUBSCRIPTION_STATUSES.map((key) => (
                    <SelectItem key={key} value={key}>
                      {s.subscriptionStatuses[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="fl-form-row">
            <div className="fl-field">
              <label className="fl-field-label">{s.trialEndsAt}</label>
              <Input
                type="date"
                value={trialEndsAt}
                onChange={(e) => setTrialEndsAt(e.target.value)}
                className="fl-input"
                disabled={plan === "free"}
              />
            </div>
            <div className="fl-field">
              <label className="fl-field-label">{s.currentPeriodEnd}</label>
              <Input
                type="date"
                value={currentPeriodEnd}
                onChange={(e) => setCurrentPeriodEnd(e.target.value)}
                className="fl-input"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="fl-card fl-pad flex flex-wrap items-center justify-end gap-2">
        <Link href="/admin/companies" className="fl-btn ghost">
          {dict.common.cancel}
        </Link>
        <button
          type="button"
          className="fl-btn primary"
          disabled={pending || !canSubmit}
          onClick={handleSubmit}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {s.createCompany}
        </button>
      </div>
    </div>
  );
}
