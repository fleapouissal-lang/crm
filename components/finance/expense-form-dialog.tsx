"use client";

import { useEffect, useMemo, type ComponentType } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Building2,
  CalendarDays,
  CircleDollarSign,
  Loader2,
  Megaphone,
  Package,
  Plane,
  Settings2,
  Tag,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUS_BADGE,
  formatMoney,
  nextExpenseNumber,
  type ExpenseCategory,
  type ExpenseRecord,
  type ExpenseStatus,
} from "@/lib/finance/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STATUSES: ExpenseStatus[] = ["draft", "pending", "paid", "cancelled"];

const CATEGORY_ICONS: Record<
  ExpenseCategory,
  ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  rent: Building2,
  salaries: Users,
  software: Settings2,
  marketing: Megaphone,
  travel: Plane,
  supplies: Package,
  utilities: Zap,
  other: Tag,
};

const schema = z.object({
  title: z.string().min(1),
  category: z.enum([
    "rent",
    "salaries",
    "software",
    "marketing",
    "travel",
    "supplies",
    "utilities",
    "other",
  ]),
  vendor: z.string().optional(),
  amount: z
    .string()
    .min(1)
    .refine((v) => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0;
    }),
  currency: z.string().min(1),
  date: z.string().min(1),
  status: z.string(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
  existingExpenses,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: ExpenseRecord | null;
  existingExpenses: ExpenseRecord[];
  onSave: (record: ExpenseRecord) => void;
}) {
  const dict = useDict();
  const e = dict.fusion.expenses;
  const isEdit = Boolean(expense?.id);
  const previewNumber = useMemo(
    () => expense?.number ?? nextExpenseNumber(existingExpenses),
    [expense?.number, existingExpenses]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      category: "other",
      vendor: "",
      amount: "",
      currency: "MAD",
      date: "",
      status: "draft",
      notes: "",
    },
  });

  const category = watch("category");
  const status = watch("status") as ExpenseStatus;
  const amount = watch("amount");
  const currency = watch("currency") || "MAD";
  const title = watch("title");
  const vendor = watch("vendor");
  const date = watch("date");

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().slice(0, 10);
    reset({
      title: expense?.title ?? "",
      category: expense?.category ?? "other",
      vendor: expense?.vendor ?? "",
      amount: expense ? String(expense.amount) : "",
      currency: expense?.currency ?? "MAD",
      date: expense?.date ?? today,
      status: expense?.status ?? "draft",
      notes: expense?.notes ?? "",
    });
  }, [open, expense, reset]);

  function categoryLabel(key: ExpenseCategory) {
    return e.categories[key];
  }

  function statusLabel(key: ExpenseStatus) {
    return e.statuses[key];
  }

  const amountNum = Number(amount) || 0;

  function onSubmit(values: FormValues) {
    const now = new Date().toISOString();
    const id = expense?.id ?? `exp-${crypto.randomUUID().slice(0, 8)}`;
    const number = expense?.number ?? nextExpenseNumber(existingExpenses);

    onSave({
      id,
      number,
      title: values.title.trim(),
      category: values.category as ExpenseCategory,
      vendor: values.vendor?.trim() ?? "",
      amount: Math.round(Number(values.amount) * 100) / 100,
      currency: values.currency.trim() || "MAD",
      date: values.date,
      status: values.status as ExpenseStatus,
      notes: values.notes?.trim() ?? "",
      createdAt: expense?.createdAt ?? now,
      updatedAt: now,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content fl-dialog-content--lg ring-0 max-h-[94vh]">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex items-center gap-3">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-xl text-white"
              style={{ background: "var(--grad-brand)" }}
            >
              <CircleDollarSign className="size-5" strokeWidth={2} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span>{isEdit ? e.editExpense : e.newExpense}</span>
              <span className="text-xs font-normal fl-faint">
                {isEdit ? e.editExpenseSub : e.newExpenseSub}
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="fl-dialog-body space-y-4">
            <div className="fl-expense-summary">
              <div className="min-w-0">
                <p className="fl-expense-summary__kicker fl-mono">
                  {previewNumber}
                </p>
                <p className="fl-expense-summary__title">
                  {title.trim() || e.titlePlaceholder}
                </p>
                <p className="fl-expense-summary__meta">
                  {categoryLabel(category)}
                  {vendor?.trim() ? ` · ${vendor.trim()}` : ""}
                  {date ? ` · ${date}` : ""}
                </p>
              </div>
              <div className="fl-expense-summary__amount">
                <span className={`fl-badge ${EXPENSE_STATUS_BADGE[status]}`}>
                  {statusLabel(status)}
                </span>
                <p className="fl-mono">
                  {formatMoney(amountNum, currency || "MAD")}
                </p>
              </div>
            </div>

            <section className="fl-form-section">
              <div className="fl-form-section__head">
                <Wallet className="size-3.5 text-[var(--iris)]" strokeWidth={1.75} />
                <h4>{e.infoSection}</h4>
              </div>
              <div className="grid gap-4">
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="exp-title">
                    {e.title}
                  </label>
                  <Input
                    id="exp-title"
                    className="fl-input"
                    placeholder={e.titlePlaceholder}
                    {...register("title")}
                  />
                  {errors.title ? (
                    <span className="fl-field-hint text-[var(--rose)]">
                      {e.titleRequired}
                    </span>
                  ) : null}
                </div>

                <div className="fl-field">
                  <label className="fl-field-label">{e.category}</label>
                  <div className="fl-expense-cats">
                    {EXPENSE_CATEGORIES.map((c) => {
                      const Icon = CATEGORY_ICONS[c];
                      const on = category === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          className={cn("fl-expense-cat", on && "on")}
                          onClick={() =>
                            setValue("category", c, { shouldValidate: true })
                          }
                        >
                          <Icon className="size-3.5" strokeWidth={1.85} />
                          <span>{categoryLabel(c)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="exp-vendor">
                    {e.vendor}
                  </label>
                  <Input
                    id="exp-vendor"
                    className="fl-input"
                    placeholder={e.vendorPlaceholder}
                    {...register("vendor")}
                  />
                </div>
              </div>
            </section>

            <section className="fl-form-section">
              <div className="fl-form-section__head">
                <CalendarDays
                  className="size-3.5 text-[var(--iris)]"
                  strokeWidth={1.75}
                />
                <h4>{e.amountSection}</h4>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="fl-field sm:col-span-2">
                  <label className="fl-field-label" htmlFor="exp-amount">
                    {e.amount}
                  </label>
                  <Input
                    id="exp-amount"
                    type="number"
                    min={0}
                    step={0.01}
                    className="fl-input fl-mono"
                    placeholder="0"
                    {...register("amount")}
                  />
                  {errors.amount ? (
                    <span className="fl-field-hint text-[var(--rose)]">
                      {e.amountRequired}
                    </span>
                  ) : null}
                </div>
                <div className="fl-field">
                  <label className="fl-field-label" htmlFor="exp-currency">
                    {dict.fusion.financeDocs.currency}
                  </label>
                  <Input
                    id="exp-currency"
                    className="fl-input"
                    {...register("currency")}
                  />
                </div>
                <div className="fl-field sm:col-span-3">
                  <label className="fl-field-label" htmlFor="exp-date">
                    {e.date}
                  </label>
                  <Input
                    id="exp-date"
                    type="date"
                    className="fl-input"
                    {...register("date")}
                  />
                </div>
                <div className="fl-field sm:col-span-3">
                  <label className="fl-field-label">{e.status}</label>
                  <div className="fl-seg fl-expense-status">
                    {STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={cn(status === s && "on")}
                        onClick={() =>
                          setValue("status", s, { shouldValidate: true })
                        }
                      >
                        {statusLabel(s)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="fl-form-section">
              <div className="fl-form-section__head">
                <Tag className="size-3.5 text-[var(--iris)]" strokeWidth={1.75} />
                <h4>{dict.common.notes}</h4>
              </div>
              <div className="fl-field">
                <Textarea
                  id="exp-notes"
                  className="fl-input min-h-[88px]"
                  placeholder={e.notesPlaceholder}
                  {...register("notes")}
                />
              </div>
            </section>
          </div>

          <DialogFooter className="fl-dialog-footer">
            <button
              type="button"
              className="fl-btn sm ghost"
              onClick={() => onOpenChange(false)}
            >
              {dict.common.cancel}
            </button>
            <button
              type="submit"
              className="fl-btn sm primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {isEdit ? dict.common.save : e.createExpense}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
