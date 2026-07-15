"use client";

import { useEffect, useState, useTransition } from "react";
import { Building2, Loader2, Phone, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { updateOrganizationAsAdmin } from "@/lib/actions/organizations";
import { useDict } from "@/components/shared/i18n-provider";
import { CompanyLogoPicker } from "@/components/shared/company-logo-picker";
import { CompanyProfileSelects } from "@/components/admin/company-profile-selects";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  normalizeActivityDomain,
  normalizeCity,
  normalizeCountry,
} from "@/lib/organizations/company-profile-options";
import type { Organization } from "@/types/database";

export function EditCompanyDialog({
  company,
  open,
  onOpenChange,
  onSaved,
}: {
  company: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const [name, setName] = useState("");
  const [emailDomain, setEmailDomain] = useState("");
  const [rc, setRc] = useState("");
  const [activityDomain, setActivityDomain] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (company && open) {
      setName(company.name);
      setEmailDomain(company.email_domain ?? "");
      setRc(company.rc ?? "");
      const nextCountry = normalizeCountry(company.country);
      setActivityDomain(normalizeActivityDomain(company.activity_domain));
      setCountry(nextCountry);
      setCity(normalizeCity(company.city, nextCountry));
      setPhone(company.phone ?? "");
      setLogoFile(null);
      setRemoveLogo(false);
      setLogoPreview(company.logo_url ?? null);
    }
  }, [company, open]);

  useEffect(() => {
    if (!logoFile) return;
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    setRemoveLogo(false);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  function handleSubmit() {
    if (!company) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("organizationId", company.id);
      fd.set("name", name);
      fd.set("emailDomain", emailDomain);
      fd.set("rc", rc);
      fd.set("activityDomain", activityDomain);
      fd.set("country", country);
      fd.set("city", city);
      fd.set("phone", phone);
      if (removeLogo) fd.set("removeLogo", "1");
      if (logoFile) fd.set("logo", logoFile);

      const result = await updateOrganizationAsAdmin(fd);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(s.companyUpdated);
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content fl-dialog-content--lg sm:max-w-xl">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-4" />
            {s.editCompany}
          </DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          <CompanyLogoPicker
            previewUrl={removeLogo ? null : logoPreview}
            disabled={pending}
            required={!company?.logo_url && !logoPreview}
            allowRemove={false}
            onFileChange={(file) => {
              setLogoFile(file);
              if (file) setRemoveLogo(false);
            }}
            onClear={() => {
              setLogoFile(null);
              setRemoveLogo(true);
              setLogoPreview(null);
            }}
          />
          <div className="fl-field">
            <label className="fl-field-label">{s.companyName}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="fl-input"
            />
          </div>
          <div className="fl-field">
            <label className="fl-field-label">{s.companyRc}</label>
            <div className="fl-input-affix">
              <ScrollText className="fl-input-affix__icon" strokeWidth={1.75} />
              <Input
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
              <label className="fl-field-label">{s.companyPhone}</label>
              <div className="fl-input-affix">
                <Phone className="fl-input-affix__icon" strokeWidth={1.75} />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="fl-input fl-input--with-icon"
                  placeholder="+212 6 00 00 00 00"
                />
              </div>
            </div>
            <div className="fl-field">
              <label className="fl-field-label">{s.emailDomain}</label>
              <Input
                value={emailDomain}
                onChange={(e) => setEmailDomain(e.target.value)}
                className="fl-input"
                placeholder="fusionleap.com"
              />
            </div>
          </div>
          <p className="text-xs fl-faint">{s.emailDomainHint}</p>
        </div>
        <DialogFooter className="fl-dialog-footer">
          <button
            type="button"
            className="fl-btn sm ghost"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn primary sm"
            onClick={handleSubmit}
            disabled={pending || !name.trim() || !emailDomain.trim()}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {dict.common.save}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
