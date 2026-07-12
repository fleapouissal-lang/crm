"use client";

import { useEffect, useTransition, type ReactNode } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";
import type { TeamMemberOption } from "@/lib/team/members";
import {
  PROJECT_CHIP_KEYS,
  PROJECT_FORM_STATUSES,
  badgeClassForStatus,
  gradientForId,
  initialsFromTitle,
  type ProjectPhase,
  type ProjectRecord,
  type ProjectStatusKey,
} from "@/lib/projects/types";
import { TeamMemberPicker } from "@/components/projects/team-member-picker";
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

const PHASES = ["inProgress", "review", "delivered"] as const;

const projectFormSchema = z.object({
  title: z.string().min(1, "Required"),
  subtitle: z.string().optional(),
  progress: z.string().optional(),
  phase: z.enum(PHASES),
  statusKey: z.string(),
  chipKey: z.string(),
  teamMemberIds: z.array(z.string()),
  chipRose: z.boolean().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

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

function toFormValues(project?: ProjectRecord | null): ProjectFormValues {
  return {
    title: project?.title ?? "",
    subtitle: project?.subtitle ?? "",
    progress: project?.progress != null ? String(project.progress) : "0",
    phase: project?.phase ?? "inProgress",
    statusKey: project?.statusKey ?? "onTrack",
    chipKey: project?.chipKey ?? "onTrack",
    teamMemberIds: project?.teamMemberIds ?? [],
    chipRose: project?.chipRose ?? false,
  };
}

function toProjectRecord(
  values: ProjectFormValues,
  existing?: ProjectRecord | null
): ProjectRecord {
  const id = existing?.id ?? `pr-${crypto.randomUUID().slice(0, 8)}`;
  const statusKey = values.statusKey as ProjectStatusKey;
  const progress = Math.min(100, Math.max(0, Number(values.progress) || 0));
  return {
    id,
    initials: initialsFromTitle(values.title),
    gradient: existing?.gradient ?? gradientForId(id),
    title: values.title.trim(),
    subtitle: values.subtitle?.trim() ?? "",
    progress,
    badgeClass: badgeClassForStatus(statusKey),
    statusKey,
    teamMemberIds: values.teamMemberIds,
    chipKey: values.chipKey as ProjectStatusKey,
    chipRose: values.chipRose,
    phase: values.phase as ProjectPhase,
  };
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  teamOptions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectRecord | null;
  teamOptions: TeamMemberOption[];
  onSave: (record: ProjectRecord) => void;
}) {
  const dict = useDict();
  const p = dict.fusion.projects;
  const l = dict.fusion.labels;
  const badges = dict.fusion.badges as FusionDictionary["badges"];
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(project?.id);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: toFormValues(project),
  });

  useEffect(() => {
    if (open) reset(toFormValues(project));
  }, [open, project, reset]);

  function onSubmit(values: ProjectFormValues) {
    startTransition(() => {
      onSave(toProjectRecord(values, project));
      onOpenChange(false);
    });
  }

  const phase = watch("phase");
  const statusKey = watch("statusKey");
  const chipKey = watch("chipKey");

  const phaseLabels: Record<ProjectPhase, string> = {
    inProgress: p.tabInProgress,
    review: p.tabReview,
    delivered: p.tabDelivered,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{isEdit ? p.editProject : p.newProject}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="fl-dialog-body max-h-[70vh] space-y-4 overflow-y-auto">
            <FormField
              label={`${dict.common.title} *`}
              htmlFor="project-title"
              error={errors.title?.message}
            >
              <Input
                id="project-title"
                className="fl-inp"
                {...register("title")}
              />
            </FormField>

            <FormField label={p.subtitle} htmlFor="project-subtitle">
              <Input
                id="project-subtitle"
                className="fl-inp"
                {...register("subtitle")}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label={l.progress}
                htmlFor="project-progress"
                error={errors.progress?.message}
              >
                <Input
                  id="project-progress"
                  type="number"
                  min={0}
                  max={100}
                  className="fl-inp"
                  {...register("progress")}
                />
              </FormField>

              <FormField label={p.phase}>
                <Select
                  value={phase}
                  onValueChange={(v) =>
                    v && setValue("phase", v as ProjectFormValues["phase"])
                  }
                >
                  <SelectTrigger className="fl-inp h-auto w-full">
                    <SelectValue>{phaseLabels[phase]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel" align="start">
                    {PHASES.map((ph) => (
                      <SelectItem key={ph} value={ph}>
                        {phaseLabels[ph]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={dict.common.status}>
                <Select
                  value={statusKey}
                  onValueChange={(v) => v && setValue("statusKey", v)}
                >
                  <SelectTrigger className="fl-inp h-auto w-full">
                    <SelectValue>
                      {badges[statusKey as ProjectStatusKey] ?? statusKey}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel" align="start">
                    {PROJECT_FORM_STATUSES.map((key) => (
                      <SelectItem key={key} value={key}>
                        {badges[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label={p.milestone}>
                <Select
                  value={chipKey}
                  onValueChange={(v) => v && setValue("chipKey", v)}
                >
                  <SelectTrigger className="fl-inp h-auto w-full">
                    <SelectValue>
                      {badges[chipKey as ProjectStatusKey] ?? chipKey}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="fl-select-panel" align="start">
                    {PROJECT_CHIP_KEYS.map((key) => (
                      <SelectItem key={key} value={key}>
                        {badges[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <FormField label={p.assignTeam}>
              <Controller
                name="teamMemberIds"
                control={control}
                render={({ field }) => (
                  <TeamMemberPicker
                    options={teamOptions}
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>
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
              type="submit"
              className="fl-btn primary sm"
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" strokeWidth={2} />
              ) : null}
              {isEdit ? dict.common.save : p.createProject}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
