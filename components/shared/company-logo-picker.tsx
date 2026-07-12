"use client";

import { useRef } from "react";
import { Building2, ImagePlus, X } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

export function CompanyLogoPicker({
  previewUrl,
  onFileChange,
  onClear,
  disabled,
}: {
  previewUrl: string | null;
  onFileChange: (file: File | null) => void;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const dict = useDict();
  const s = dict.fusion.settings;
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fl-logo-picker">
      <button
        type="button"
        className={cn("fl-logo-picker__preview", previewUrl && "has-image")}
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        aria-label={s.companyLogo}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className="fl-logo-picker__img" />
        ) : (
          <span className="fl-logo-picker__placeholder">
            <Building2 className="size-6" strokeWidth={1.5} />
          </span>
        )}
      </button>
      <div className="fl-logo-picker__meta">
        <p className="fl-field-label">{s.companyLogo}</p>
        <p className="fl-field-hint">{s.companyLogoHint}</p>
        <div className="fl-logo-picker__actions">
          <button
            type="button"
            className="fl-btn sm ghost"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-3.5" />
            {previewUrl ? s.changeLogo : s.uploadLogo}
          </button>
          {previewUrl && onClear ? (
            <button
              type="button"
              className="fl-btn sm ghost text-[var(--rose)]"
              disabled={disabled}
              onClick={onClear}
            >
              <X className="size-3.5" />
              {s.removeLogo}
            </button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          onFileChange(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
