import type { PlanKey, SubscriptionStatus } from "@/lib/billing/plans";

export type { PlanKey, SubscriptionStatus };

export type Role = "platform_admin" | "admin" | "manager" | "member";

export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type ContactPermission =
  | "unknown"
  | "legitimate_interest"
  | "consented"
  | "opted_out";

export type OutreachChannel = "whatsapp" | "email" | "sms";
export type OutreachStatus =
  | "draft"
  | "approved"
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "replied"
  | "failed"
  | "cancelled";
export type LeadContactMethod = "phone" | "email" | "visit";

export type TaskStatus =
  | "testing"
  | "review"
  | "in_progress"
  | "todo"
  | "backlog";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ActivityType =
  | "lead_created"
  | "lead_updated"
  | "lead_stage_changed"
  | "lead_deleted"
  | "task_created"
  | "task_updated"
  | "task_completed"
  | "task_deleted";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  email_domain: string | null;
  director_id: string | null;
  created_by: string | null;
  created_at: string;
  is_active: boolean;
  plan: PlanKey;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  logo_url: string | null;
  rc: string | null;
  activity_domain: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
}

export type PlatformQuoteStatus = "draft" | "sent" | "accepted" | "expired" | "refused";
export type PlatformInvoiceStatus = "draft" | "pending" | "paid" | "overdue";
export type PlatformBillingReason = "subscription" | "plan_change" | "renewal" | "manual";

export interface PlatformQuote {
  id: string;
  number: string;
  organization_id: string;
  plan: PlanKey;
  amount: number;
  currency: string;
  validity_days: number;
  status: PlatformQuoteStatus;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  organization?: Pick<Organization, "id" | "name" | "email_domain"> | null;
}

export interface PlatformInvoice {
  id: string;
  number: string;
  organization_id: string;
  plan: PlanKey;
  amount: number;
  currency: string;
  due_date: string | null;
  period_start: string | null;
  period_end: string | null;
  status: PlatformInvoiceStatus;
  quote_id: string | null;
  billing_reason: PlatformBillingReason;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  organization?: Pick<Organization, "id" | "name" | "email_domain"> | null;
}

export type PlatformPaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "refunded";
export type PlatformPaymentMethod = "card" | "transfer" | "cash" | "other";
export type PlatformCardBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "discover"
  | "paypal"
  | "other";

export interface PlatformPayment {
  id: string;
  number: string;
  organization_id: string;
  invoice_id: string | null;
  amount: number;
  currency: string;
  status: PlatformPaymentStatus;
  method: PlatformPaymentMethod;
  card_brand: PlatformCardBrand | null;
  card_last4: string | null;
  card_holder: string | null;
  paid_at: string | null;
  reference: string;
  notes: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  organization?: Pick<Organization, "id" | "name" | "email_domain" | "logo_url"> | null;
  invoice?: Pick<PlatformInvoice, "id" | "number" | "status" | "plan"> | null;
}

export interface OrgJobRole {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  is_default: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  role: Role;
  organization_id: string | null;
  job_role_id: string | null;
  email: string | null;
  /** Custom CRM page ids for members (e.g. stagiaire). Null = job-role defaults. */
  member_pages?: string[] | null;
  created_at: string;
  updated_at: string;
  job_role?: OrgJobRole | null;
}

export interface Lead {
  id: string;
  organization_id: string;
  title: string;
  company: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  source: string | null;
  source_url: string | null;
  phone_normalized: string | null;
  email_normalized: string | null;
  ai_score: number | null;
    ai_summary: string | null;
    research_notes: string | null;
    research_sources: string[] | null;
    researched_at: string | null;
  contact_permission: ContactPermission;
  sales_project: string;
  last_contact_method: LeadContactMethod | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  value: number;
  stage: LeadStage;
  notes: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_profile?: Profile | null;
  relances?: Array<{ sequence: number; status: string; scheduled_for: string; sent_at?: string | null }>;
}

export interface OutreachMessage {
  id: string;
  organization_id: string;
  lead_id: string;
  channel: OutreachChannel;
  status: OutreachStatus;
    subject: string | null;
    body: string;
    message_parts: string[] | null;
  scheduled_for: string | null;
  provider: string | null;
  provider_message_id: string | null;
  idempotency_key: string | null;
  error_message: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
    lead?: Pick<Lead, "id" | "title" | "company" | "contact_name" | "phone" | "email" | "sales_project"> | null;
}

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  assigned_to: string | null;
  /** All assignees (may include assigned_to as first). */
  assignee_ids?: string[];
  lead_id: string | null;
  project_id?: string | null;
  task_phase?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_profile?: Profile | null;
  created_profile?: Profile | null;
  lead?: Lead | null;
}

export interface Activity {
  id: string;
  organization_id: string;
  type: ActivityType;
  entity_type: "lead" | "task";
  entity_id: string | null;
  message: string;
  user_id: string | null;
  created_at: string;
  profile?: Profile | null;
}

export const LEAD_STAGES: LeadStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "testing",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  testing: "Done",
  review: "To review",
  in_progress: "In progress",
  todo: "To do",
  backlog: "Backlog",
};

export const TASK_PRIORITIES: TaskPriority[] = [
  "low",
  "medium",
  "high",
  "urgent",
];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
