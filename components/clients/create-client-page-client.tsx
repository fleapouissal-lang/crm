"use client";

import { useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";
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
import { loadClients, saveClients } from "@/lib/clients/storage";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function toClientRecord(values: ClientFormValues): ClientRecord {
  const id = `cl-${crypto.randomUUID().slice(0, 8)}`;
  const amount = values.valueAmount?.trim()
    ? Number(values.valueAmount.replace(/,/g, ""))
    : null;
  return {
    id,
    initials: initialsFromName(values.name),
    gradient: gradientForId(id),
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

export function CreateClientPageClient() {
  const dict = useDict();
  const cl = dict.clients;
  const f = dict.fusion;
  const badges = f.badges as FusionDictionary["badges"];
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      subtitle: "",
      contact: "",
      marketCode: "KSA",
      location: "",
      engagement: "",
      valueAmount: "",
      valueCurrency: "SAR",
      statusKey: "active",
    },
  });

  function onSubmit(values: ClientFormValues) {
    startTransition(() => {
      const record = toClientRecord(values);
      const existing = loadClients();
      saveClients([record, ...existing]);
      toast.success(cl.createdClient);
      router.push("/clients");
      router.refresh();
    });
  }

  return (
    <div className="fl-create-client space-y-[18px]">
      <div className="fl-card fl-pad">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="grid size-11 place-items-center rounded-xl text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <UserPlus className="size-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="text-lg font-semibold">{cl.newClient}</h2>
              <p className="mt-1 text-sm fl-faint">{cl.newClientSub}</p>
            </div>
          </div>
          <Link href="/clients" className="fl-btn sm ghost">
            <ArrowLeft className="size-4" />
            {cl.backToClients}
          </Link>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-[18px]">
        <section className="fl-card">
          <div className="fl-card-head">
            <div>
              <h3>{cl.clientDetails}</h3>
              <div className="ch-sub">{cl.clientDetailsSub}</div>
            </div>
          </div>
          <div className="fl-pad">
            <div className="fl-form gap-4">
              <FormField
                label={`${dict.common.title} *`}
                htmlFor="create-client-name"
                error={errors.name?.message}
              >
                <Input
                  id="create-client-name"
                  className="fl-input"
                  {...register("name")}
                />
              </FormField>

              <FormField label={cl.subtitle} htmlFor="create-client-subtitle">
                <Input
                  id="create-client-subtitle"
                  className="fl-input"
                  {...register("subtitle")}
                />
              </FormField>

              <FormField label={dict.common.contact} htmlFor="create-client-contact">
                <Input
                  id="create-client-contact"
                  className="fl-input"
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
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
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

                <FormField label={cl.location} htmlFor="create-client-location">
                  <Input
                    id="create-client-location"
                    className="fl-input"
                    {...register("location")}
                  />
                </FormField>
              </div>

              <div className="fl-form-row">
                <FormField
                  label={f.labels.engagement}
                  htmlFor="create-client-engagement"
                >
                  <Input
                    id="create-client-engagement"
                    className="fl-input"
                    {...register("engagement")}
                  />
                </FormField>

                <FormField label={dict.common.status}>
                  <Select
                    value={watch("statusKey")}
                    onValueChange={(v) => v && setValue("statusKey", v)}
                  >
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
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
                <FormField label={f.labels.lifetimeValue} htmlFor="create-client-value">
                  <Input
                    id="create-client-value"
                    type="number"
                    min={0}
                    placeholder="0"
                    className="fl-input"
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
                    <SelectTrigger className="fl-select-trigger fl-input w-full">
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
        </section>

        <div className="fl-card fl-pad flex flex-wrap items-center justify-end gap-2">
          <Link href="/clients" className="fl-btn ghost">
            {dict.common.cancel}
          </Link>
          <button type="submit" className="fl-btn primary" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <Plus className="size-4" strokeWidth={2} />
            )}
            {cl.createClient}
          </button>
        </div>
      </form>
    </div>
  );
}
