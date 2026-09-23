"use client";

import type { LeadStage, SalesStatus, TaskPriority, TaskStatus } from "@/types/database";
import { SALES_STATUS_LABELS } from "@/lib/ai/sales-agent/constants";
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

const salesStatusBadgeClass: Record<SalesStatus, string> = {
  new: "b-gray",
  contacted: "b-blue",
  message_sent: "b-blue",
  reply_received: "b-iris",
  qualified: "b-blue",
  discussion: "b-iris",
  meeting_proposed: "b-gold",
  meeting_confirmed: "b-gold",
  proposal_sent: "b-gold",
  won: "b-green",
  lost: "b-rose",
  follow_up: "b-amber",
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

export function SalesStatusBadge({
  status,
  fallbackStage,
}: {
  status?: SalesStatus | string | null;
  fallbackStage?: LeadStage;
}) {
  const dict = useDict();
  const key = (status || fallbackStage || "new") as SalesStatus;
  const label =
    SALES_STATUS_LABELS[key]?.fr ||
    (dict.stages as Record<string, string>)[key] ||
    key;
  return (
    <span className={cn("fl-badge", salesStatusBadgeClass[key] || "b-gray")}>
      {label}
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
