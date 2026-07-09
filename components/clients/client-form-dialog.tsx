"use client";

import { useEffect, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";
import {
  CLIENT_STATUS_OPTIONS,
  STATUS_BADGE_CLASS,
  type ClientRecord,
  type ClientStatusKey,
  gradientForId,
  initialsFromName,
} from "@/lib/clients/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MARKETS = ["KSA", "KW", "MA"] as const;
const CURRENCIES = ["SAR", "MAD", "KWD", "USD"] as const;

const clientFormSchema = z.object({
  name: z.string().min(1, "Required"),
  subtitle: z.string().optional(),
  contact: z.string().optional(),
  marketCode: z.enum(MARKETS),
  location: z.string().optional(),
  engagement: z.string().optional(),
  valueAmount: z.string().optional(),
  valueCurrency: z.enum(CURRENCIES),
  statusKey: z.string(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

function FormField({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("fl-field", className)}>
      <label className="fl-field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function toFormValues(client?: ClientRecord | null): ClientFormValues {
  return {
    name: client?.name ?? "",
    subtitle: client?.subtitle ?? "",
    contact: client?.contact ?? "",
    marketCode: (client?.marketCode as (typeof MARKETS)[number]) ?? "KSA",
    location: client?.location ?? "",
    engagement: client?.engagement ?? "",
    valueAmount:
      client?.valueAmount != null ? String(client.valueAmount) : "",
    valueCurrency:
      (client?.valueCurrency as (typeof CURRENCIES)[number]) ?? "SAR",
    statusKey: client?.statusKey ?? "active",
  };
}

function toClientRecord(
  values: ClientFormValues,
  existing?: ClientRecord | null
): ClientRecord {
  const id = existing?.id ?? `cl-${crypto.randomUUID().slice(0, 8)}`;
  const amount = values.valueAmount?.trim()
    ? Number(values.valueAmount.replace(/,/g, ""))
    : null;
  return {
    id,
    initials: initialsFromName(values.name),
    gradient: existing?.gradient ?? gradientForId(id),
    name: values.name.trim(),
    subtitle: values.subtitle?.trim() ?? "",
    contact: values.contact?.trim() ?? "",
    marketCode: values.marketCode,
    location: values.location?.trim() ?? "",
    engagement: values.engagement?.trim() ?? "",
    valueAmount: Number.isFinite(amount) ? amount : null,
    valueCurrency: values.valueCurrency,
    statusKey: values.statusKey as ClientStatusKey,
  };
}

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientRecord | null;
  onSave: (record: ClientRecord) => void;
}) {
  const dict = useDict();
  const cl = dict.clients;
  const f = dict.fusion;
  const badges = f.badges as FusionDictionary["badges"];
  const [pending, startTransition] = useTransition();
  const isEdit = !!client;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: toFormValues(client),
  });

  useEffect(() => {
    if (open) reset(toFormValues(client));
  }, [open, client, reset]);

  function onSubmit(values: ClientFormValues) {
    startTransition(() => {
      onSave(toClientRecord(values, client));
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-[34rem]">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{isEdit ? cl.editClient : cl.newClient}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="fl-dialog-body">
            <div className="fl-form">
              <FormField
                label={`${dict.common.title} *`}
                htmlFor="client-name"
                error={errors.name?.message}
              >
                <Input
                  id="client-name"
                  className="fl-control"
                  {...register("name")}
                />
              </FormField>

              <FormField label={cl.subtitle} htmlFor="client-subtitle">
                <Input
                  id="client-subtitle"
                  className="fl-control"
                  {...register("subtitle")}
                />
              </FormField>

              <FormField label={dict.common.contact} htmlFor="client-contact">
                <Input
                  id="client-contact"
                  className="fl-control"
                  {...register("contact")}
                />
              </FormField>

              <div className="fl-form-row">
                <FormField label={f.labels.market}>
                  <Select
                    value={watch("marketCode")}
                    onValueChange={(v) =>
                      v &&
                      setValue("marketCode", v as ClientFormValues["marketCode"])
                    }
                  >
                    <SelectTrigger className="fl-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel" align="start">
                      {MARKETS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label={cl.location} htmlFor="client-location">
                  <Input
                    id="client-location"
                    className="fl-control"
                    {...register("location")}
                  />
                </FormField>
              </div>

              <div className="fl-form-row">
                <FormField label={f.labels.engagement} htmlFor="client-engagement">
                  <Input
                    id="client-engagement"
                    className="fl-control"
                    {...register("engagement")}
                  />
                </FormField>

                <FormField label={dict.common.status}>
                  <Select
                    value={watch("statusKey")}
                    onValueChange={(v) => v && setValue("statusKey", v)}
                  >
                    <SelectTrigger className="fl-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel" align="start">
                      {CLIENT_STATUS_OPTIONS.map((key) => (
                        <SelectItem key={key} value={key}>
                          <span
                            className={cn(
                              "fl-badge !text-[10.5px]",
                              STATUS_BADGE_CLASS[key] ?? "b-blue"
                            )}
                          >
                            {badges[key]}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <div className="fl-form-row">
                <FormField label={f.labels.lifetimeValue} htmlFor="client-value">
                  <Input
                    id="client-value"
                    type="number"
                    min={0}
                    placeholder="0"
                    className="fl-control"
                    {...register("valueAmount")}
                  />
                </FormField>

                <FormField label={cl.currency}>
                  <Select
                    value={watch("valueCurrency")}
                    onValueChange={(v) =>
                      v &&
                      setValue(
                        "valueCurrency",
                        v as ClientFormValues["valueCurrency"]
                      )
                    }
                  >
                    <SelectTrigger className="fl-select-trigger">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="fl-select-panel" align="start">
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </div>
          </div>

          <DialogFooter className="fl-dialog-footer">
            <button
              type="button"
              className="fl-btn sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {dict.common.cancel}
            </button>
            <button type="submit" className="fl-btn primary sm" disabled={pending}>
              {pending ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              ) : null}
              {isEdit ? dict.common.save : cl.createClient}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
