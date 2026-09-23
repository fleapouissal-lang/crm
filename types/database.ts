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

export type SalesStatus =
  | "new"
  | "contacted"
  | "message_sent"
  | "reply_received"
  | "qualified"
  | "discussion"
  | "meeting_proposed"
  | "meeting_confirmed"
  | "proposal_sent"
  | "won"
  | "lost"
  | "follow_up";

export type AiConversationMode = "ai" | "human" | "paused";
export type ConversationMessageRole = "prospect" | "assistant" | "human" | "system";
export type AppointmentType = "online" | "onsite";
export type AppointmentStatus =
  | "proposed"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

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
export type AiModel = "haiku" | "sonnet" | "opus" | "fable";
export type AiModelMode = "auto" | "model" | "complexity";
export type AiComplexity = "fast" | "balanced" | "deep";
export type AiExecutionStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

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
  sales_status?: SalesStatus;
  notes: string | null;
  assigned_to: string | null;
  client_id?: string | null;
  memory_facts?: Record<string, string>;
  client?: {
    id: string;
    name: string;
    status_key: string;
    location: string | null;
    engagement: string | null;
  } | null;
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
    lead?: Pick<Lead, "id" | "title" | "company" | "contact_name" | "phone" | "email" | "city" | "sales_project"> | null;
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
  acceptance_criteria?: string | null;
  estimated_minutes?: number | null;
  tracked_minutes?: number;
  next_step?: string | null;
  last_modified_by?: string | null;
  ai_agent_id?: string | null;
  ai_model_mode?: AiModelMode | null;
  ai_requested_model?: AiModel | null;
  ai_complexity?: AiComplexity | null;
  ai_selected_model?: AiModel | null;
  ai_execution_status?: AiExecutionStatus | null;
  ai_session_id?: string | null;
  ai_run_id?: string | null;
  ai_result?: string | null;
  ai_error?: string | null;
  ai_started_at?: string | null;
  ai_completed_at?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_profile?: Profile | null;
  created_profile?: Profile | null;
  lead?: Lead | null;
}

export interface AiAgent {
  id: string;
  organization_id: string;
  profile_id: string | null;
  name: string;
  provider: "anthropic" | "gemini";
  is_enabled: boolean;
  default_model_mode: AiModelMode;
  default_model: AiModel | null;
  default_complexity: AiComplexity;
  created_at: string;
  updated_at: string;
}

export type TaskDependencyRelation = "depends_on" | "blocks" | "relates_to";
export type TaskResourceKind = "link" | "github" | "document" | "design" | "file";

export interface TaskSubtask {
  id: string;
  organization_id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskDependency {
  id: string;
  organization_id: string;
  task_id: string;
  related_task_id: string;
  relation: TaskDependencyRelation;
  created_by: string | null;
  created_at: string;
  related_task?: Pick<Task, "id" | "title" | "status"> | null;
}

export interface TaskResource {
  id: string;
  organization_id: string;
  task_id: string;
  label: string;
  url: string;
  kind: TaskResourceKind;
  created_by: string | null;
  created_at: string;
}

export interface TaskComment {
  id: string;
  organization_id: string;
  task_id: string;
  body: string;
  created_by: string | null;
  created_at: string;
  profile?: Profile | null;
}

export interface TaskWorkspaceData {
  subtasks: TaskSubtask[];
  dependencies: TaskDependency[];
  resources: TaskResource[];
  comments: TaskComment[];
  activities: Activity[];
  availableTasks: Pick<Task, "id" | "title" | "status">[];
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

export const SALES_STATUSES: SalesStatus[] = [
  "new",
  "contacted",
  "message_sent",
  "reply_received",
  "qualified",
  "discussion",
  "meeting_proposed",
  "meeting_confirmed",
  "proposal_sent",
  "won",
  "lost",
  "follow_up",
];

export const SALES_STATUS_LABELS: Record<SalesStatus, string> = {
  new: "New",
  contacted: "Contacted",
  message_sent: "Message sent",
  reply_received: "Reply received",
  qualified: "Qualified",
  discussion: "Discussion",
  meeting_proposed: "Meeting proposed",
  meeting_confirmed: "Meeting confirmed",
  proposal_sent: "Proposal sent",
  won: "Won",
  lost: "Lost",
  follow_up: "Follow up",
};

export interface SalesAgentSettings {
  id: string;
  organization_id: string;
  sales_project: string;
  enabled: boolean;
  auto_first_touch: boolean;
  auto_reply: boolean;
  require_human_approval: boolean;
  max_msgs_per_lead_day: number;
  max_msgs_per_org_hour: number;
  require_opt_in_mode: boolean;
  handoff_assignee_id: string | null;
  relance_delays_hours: number[];
  project_playbook: Record<string, unknown>;
  match_prospect_language: boolean;
  reply_delay_min_sec: number;
  reply_delay_max_sec: number;
  first_touch_stagger_min_sec: number;
  first_touch_stagger_max_sec: number;
  daily_first_touch_limit?: number;
  auto_discover?: boolean;
  daily_discover_limit?: number;
  discover_cities?: string[];
  discover_sectors?: string[];
  send_window_start_hour: number;
  send_window_end_hour: number;
  created_at: string;
  updated_at: string;
}

export interface AiConversation {
  id: string;
  organization_id: string;
  lead_id: string;
  sales_project: string;
  mode: AiConversationMode;
  handoff_reason: string | null;
  assigned_to: string | null;
  urgent: boolean;
  clarify_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: {
    id: string;
    title: string;
    company: string | null;
    contact_name: string | null;
    sales_project: string;
  } | null;
}

export interface ConversationMessage {
  id: string;
  organization_id: string;
  conversation_id: string;
  lead_id: string;
  role: ConversationMessageRole;
  body: string;
  provider_message_id: string | null;
  outreach_message_id: string | null;
  outreach_reply_id: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  created_at: string;
}

export interface LeadQualification {
  id: string;
  organization_id: string;
  lead_id: string;
  need: string | null;
  budget: string | null;
  timeline: string | null;
  service_interest: string | null;
  interest_level: number | null;
  objections: string[];
  questions: string[];
  availability: string | null;
  score: number | null;
  notes: string | null;
  updated_by: "ai" | "human";
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  organization_id: string;
  lead_id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  starts_at: string;
  ends_at: string;
  reminder_at: string | null;
  meet_url: string | null;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  lead?: Pick<Lead, "id" | "title" | "contact_name" | "company" | "phone"> | null;
}

export type AiActionLogInsert = {
  organization_id: string;
  lead_id?: string | null;
  sales_project?: string | null;
  action: string;
  model?: string | null;
  success?: boolean;
  error_message?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
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
