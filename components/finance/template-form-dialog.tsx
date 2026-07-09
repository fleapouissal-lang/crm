"use client";

import { useEffect, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import type { DocumentTemplate, TemplateKind } from "@/lib/finance/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const schema = z.object({
  name: z.string().min(1),
  kind: z.enum(["quote", "invoice"]),
  description: z.string().optional(),
  content: z.string().min(1),
  footerNote: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
  className?: string;
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

function toValues(t?: DocumentTemplate | null): FormValues {
  return {
    name: t?.name ?? "",
    kind: t?.kind ?? "quote",
    description: t?.description ?? "",
    content: t?.content ?? "",
    footerNote: t?.footerNote ?? "",
  };
}

export function TemplateFormDialog({
  open,
  onOpenChange,
  template,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: DocumentTemplate | null;
  onSave: (record: DocumentTemplate) => void;
}) {
  const dict = useDict();
  const f = dict.fusion.financeDocs;
  const isEdit = Boolean(template?.id);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(template),
  });

  const kind = watch("kind");

  useEffect(() => {
    if (open) reset(toValues(template));
  }, [open, template, reset]);

  function onSubmit(values: FormValues) {
    const now = new Date().toISOString();
    const id = template?.id ?? `tpl-${crypto.randomUUID().slice(0, 8)}`;
    onSave({
      id,
      name: values.name.trim(),
      kind: values.kind as TemplateKind,
      description: values.description?.trim() ?? "",
      content: values.content.trim(),
      footerNote: values.footerNote?.trim() ?? "",
      createdAt: template?.createdAt ?? now,
      updatedAt: now,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{isEdit ? f.editTemplate : f.newTemplate}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="fl-dialog-body space-y-4">
          <Field label={dict.common.title} htmlFor="tpl-name" error={errors.name?.message}>
            <Input id="tpl-name" className="fl-inp" {...register("name")} />
          </Field>
          <Field label={f.templateKind} error={errors.kind?.message}>
            <Select
              value={kind}
              onValueChange={(v) => v && setValue("kind", v as TemplateKind)}
            >
              <SelectTrigger className="fl-inp h-auto w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quote">{f.kindQuote}</SelectItem>
                <SelectItem value="invoice">{f.kindInvoice}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label={dict.common.description} htmlFor="tpl-desc">
            <Input id="tpl-desc" className="fl-inp" {...register("description")} />
          </Field>
          <Field label={f.templateBody} htmlFor="tpl-content" error={errors.content?.message}>
            <Textarea
              id="tpl-content"
              className="fl-inp min-h-[200px] font-mono text-xs"
              {...register("content")}
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">{f.variablesHint}</p>
          </Field>
          <Field label={f.footerNote} htmlFor="tpl-footer">
            <Input id="tpl-footer" className="fl-inp" {...register("footerNote")} />
          </Field>
          <DialogFooter className="fl-dialog-footer">
            <button type="button" className="fl-btn sm ghost" onClick={() => onOpenChange(false)}>
              {dict.common.cancel}
            </button>
            <button type="submit" className="fl-btn sm primary" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {dict.common.save}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
