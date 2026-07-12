"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

type PasswordInputProps = Omit<ComponentProps<"input">, "type"> & {
  /** Extra classes on the input (e.g. fl-inp, fl-input). */
  inputClassName?: string;
  /** Use a plain <input> (login split styles) instead of shared Input. */
  native?: boolean;
};

export function PasswordInput({
  className,
  inputClassName,
  native = false,
  ...props
}: PasswordInputProps) {
  const dict = useDict();
  const [visible, setVisible] = useState(false);
  const showLabel = dict.common.showPassword;
  const hideLabel = dict.common.hidePassword;

  const inputClasses = cn("pe-11", inputClassName);

  return (
    <div className={cn("relative", className)}>
      {native ? (
        <input
          {...props}
          type={visible ? "text" : "password"}
          className={inputClasses}
        />
      ) : (
        <Input
          {...props}
          type={visible ? "text" : "password"}
          className={inputClasses}
        />
      )}
      <button
        type="button"
        className="absolute end-2.5 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-[var(--text-faint)] transition-colors hover:bg-[var(--glass-hi)] hover:text-[var(--text)]"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? hideLabel : showLabel}
        title={visible ? hideLabel : showLabel}
        tabIndex={-1}
      >
        {visible ? (
          <EyeOff className="size-4" strokeWidth={2} />
        ) : (
          <Eye className="size-4" strokeWidth={2} />
        )}
      </button>
    </div>
  );
}
