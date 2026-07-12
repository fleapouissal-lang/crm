"use client";

import { Pencil } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { AvatarStack, FlChip, FlProgress } from "@/components/fusion/primitives";
import type { ProjectRecord } from "@/lib/projects/types";
import { getTeamMembers, type TeamMemberOption } from "@/lib/team/members";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ProjectDetailDialog({
  open,
  onOpenChange,
  project,
  teamOptions,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectRecord | null;
  teamOptions: TeamMemberOption[];
  onEdit: () => void;
}) {
  const dict = useDict();
  const f = dict.fusion;
  const p = f.projects;
  const l = f.labels;
  if (!project) return null;

  const members = getTeamMembers(project.teamMemberIds, teamOptions);
  const lead = members[0];

  const phaseLabels = {
    inProgress: p.tabInProgress,
    review: p.tabReview,
    delivered: p.tabDelivered,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span>{project.title}</span>
            <span className={`fl-badge ${project.badgeClass}`}>
              {f.badges[project.statusKey]}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          {project.subtitle ? (
            <p className="text-sm text-muted-foreground">{project.subtitle}</p>
          ) : null}

          <dl className="grid gap-3 text-sm">
            <DetailRow label={l.progress} value={`${project.progress}%`} mono />
            <DetailRow label={p.phase} value={phaseLabels[project.phase]} />
            <DetailRow label={l.team}>
              {members.length === 0 ? (
                <span className="fl-faint">{p.noMembersSelected}</span>
              ) : (
                <div className="flex flex-col items-end gap-2">
                  <AvatarStack
                    items={members.map((m) => ({
                      initials: m.initials,
                      bg: m.color,
                    }))}
                  />
                  <span className="text-right text-xs font-medium">
                    {members.map((m) => m.name).join(" · ")}
                  </span>
                </div>
              )}
            </DetailRow>
            {lead ? (
              <DetailRow label={p.leadMember} value={lead.name} />
            ) : null}
            <DetailRow label={p.milestone}>
              <FlChip>
                <span className={project.chipRose ? "text-[var(--rose)]" : ""}>
                  {f.badges[project.chipKey]}
                </span>
              </FlChip>
            </DetailRow>
          </dl>

          <div>
            <div className="mb-2 flex justify-between text-xs">
              <span className="fl-muted">{l.progress}</span>
              <span className="fl-mono fl-faint">{project.progress}%</span>
            </div>
            <FlProgress value={project.progress} />
          </div>
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
            type="button"
            className="fl-btn primary sm"
            onClick={() => {
              onOpenChange(false);
              onEdit();
            }}
          >
            <Pencil className="size-4" strokeWidth={2} />
            {dict.common.edit}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({
  label,
  value,
  mono,
  children,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-end font-medium",
          mono && "fl-mono"
        )}
      >
        {children ?? value}
      </dd>
    </div>
  );
}
