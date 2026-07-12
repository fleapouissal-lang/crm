"use client";

import { Briefcase, Globe2, MapPin } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACTIVITY_DOMAIN_KEYS,
  COUNTRY_OPTIONS,
  getCitiesForCountry,
} from "@/lib/organizations/company-profile-options";

export function CompanyProfileSelects({
  activityDomain,
  country,
  city,
  disabled,
  onActivityChange,
  onCountryChange,
  onCityChange,
}: {
  activityDomain: string;
  country: string;
  city: string;
  disabled?: boolean;
  onActivityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onCityChange: (value: string) => void;
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const cities = getCitiesForCountry(country);

  return (
    <>
      <div className="fl-field">
        <label className="fl-field-label">{s.companyActivityDomain}</label>
        <Select
          value={activityDomain || null}
          onValueChange={(v) => onActivityChange(v ?? "")}
          disabled={disabled}
        >
          <SelectTrigger className="fl-select-trigger fl-input w-full">
            <span className="inline-flex min-w-0 flex-1 items-center gap-2">
              <Briefcase className="size-4 shrink-0 fl-faint" strokeWidth={1.75} />
              <SelectValue placeholder={s.selectActivity} />
            </span>
          </SelectTrigger>
          <SelectContent className="fl-select-panel">
            {ACTIVITY_DOMAIN_KEYS.map((key) => (
              <SelectItem key={key} value={key}>
                {s.activityDomains[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="fl-form-row">
        <div className="fl-field">
          <label className="fl-field-label">{s.companyCountry}</label>
          <Select
            value={country || null}
            onValueChange={(v) => {
              const next = v ?? "";
              onCountryChange(next);
              const nextCities = getCitiesForCountry(next);
              if (city && !nextCities.includes(city)) onCityChange("");
            }}
            disabled={disabled}
          >
            <SelectTrigger className="fl-select-trigger fl-input w-full">
              <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                <Globe2 className="size-4 shrink-0 fl-faint" strokeWidth={1.75} />
                <SelectValue placeholder={s.selectCountry} />
              </span>
            </SelectTrigger>
            <SelectContent className="fl-select-panel">
              {COUNTRY_OPTIONS.map((opt) => (
                <SelectItem key={opt.code} value={opt.code}>
                  {s.countries[opt.code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="fl-field">
          <label className="fl-field-label">{s.companyCity}</label>
          <Select
            value={city || null}
            onValueChange={(v) => onCityChange(v ?? "")}
            disabled={disabled || !country}
          >
            <SelectTrigger className="fl-select-trigger fl-input w-full">
              <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                <MapPin className="size-4 shrink-0 fl-faint" strokeWidth={1.75} />
                <SelectValue
                  placeholder={country ? s.selectCity : s.selectCountryFirst}
                />
              </span>
            </SelectTrigger>
            <SelectContent className="fl-select-panel">
              {cities.map((key) => (
                <SelectItem key={key} value={key}>
                  {s.cities[key as keyof typeof s.cities]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
