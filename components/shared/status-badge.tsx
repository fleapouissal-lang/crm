"use client";

import type { LeadStage, TaskPriority, TaskStatus } from "@/types/database";
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

const statusBadgeClass: Record<TaskStatus, string> = {
  todo: "b-gray",
  in_progress: "b-blue",
  done: "b-green",
  cancelled: "b-rose",
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
  return (
    <span className={cn("fl-badge", statusBadgeClass[status])}>
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
