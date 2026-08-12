"use client";

import type { LeadStage, TaskPriority, TaskStatus } from "@/types/database";
import { TASK_STATUS_PILL } from "@/lib/tasks/status";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

const stageBadgeClass: Record<LeadStage, string> = {
  new: "b-gray",
  contacted: "b-blue",
  qualified: "b-blue",
  proposal: "b-gold",
  negotiation: "b-iris",
  won: "b-green",
  lost: "b-rose",
};

const priorityBadgeClass: Record<TaskPriority, string> = {
  low: "b-gray",
  medium: "b-blue",
  high: "b-amber",
  urgent: "b-rose",
};

export function LeadStageBadge({ stage }: { stage: LeadStage }) {
  const dict = useDict();
  return (
    <span className={cn("fl-badge", stageBadgeClass[stage])}>
      {dict.stages[stage]}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const dict = useDict();
  const pill = TASK_STATUS_PILL[status];
  return (
    <span
      className="fl-badge fl-task-status-pill"
      style={{
        background: pill.bg,
        color: pill.color,
        border: pill.border ?? "1px solid transparent",
      }}
    >
      {dict.taskStatus[status]}
    </span>
  );
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  const dict = useDict();
  return (
    <span className={cn("fl-badge", priorityBadgeClass[priority])}>
      {dict.taskPriority[priority]}
    </span>
  );
}
