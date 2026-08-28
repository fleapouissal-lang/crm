import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  canAccessClients,
  canAccessLeads,
  canAccessProjects,
  canAccessTasks,
  canCreateTask,
  canModifyTask,
  canViewAllTasks,
  isLeadership,
} from "@/lib/permissions";
import { dispatchOutreachMessage } from "@/lib/outreach/dispatch";
import { memberTaskOrFilter } from "@/lib/tasks/visibility";
import { isTaskDoneStatus } from "@/lib/tasks/status";
import { inferTaskPhase, normalizeTaskPhase } from "@/lib/tasks/phases";
import type { McpAuthContext } from "@/lib/mcp/auth";
import type { ActivityType, LeadStage, TaskPriority, TaskStatus } from "@/types/database";

const taskStatusSchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "review",
  "testing",
]);
const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const aiModelSchema = z.enum(["haiku", "sonnet", "opus", "fable"]);
const aiModelModeSchema = z.enum(["auto", "model", "complexity"]);
const aiComplexitySchema = z.enum(["fast", "balanced", "deep"]);
const aiExecutionStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
const uuidSchema = z.string().uuid();
const leadStageSchema = z.enum([
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
]);
const contactPermissionSchema = z.enum([
  "unknown",
  "legitimate_interest",
  "consented",
  "opted_out",
]);
const outreachChannelSchema = z.enum(["whatsapp", "email", "sms"]);
const leadContactMethodSchema = z.enum(["phone", "email", "visit"]);

function normalizePhone(value?: string | null) {
  const digits = value?.replace(/\D/g, "") ?? "";
  return digits || null;
}

function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    structuredContent:
      value && typeof value === "object" ? (value as Record<string, unknown>) : { value },
  };
}

function errorResult(message: string) {
  return {
    isError: true,
    content: [{ type: "text" as const, text: message }],
  };
}

function appUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString();
}

async function validateOrgAssignees(
  context: McpAuthContext,
  assigneeIds: string[]
): Promise<boolean> {
  if (!assigneeIds.length) return true;
  const { data, error } = await context.supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", context.profile.organization_id!)
    .in("id", assigneeIds);
  return !error && data?.length === new Set(assigneeIds).size;
}

export function createFusionLeapMcpServer(
  context: McpAuthContext,
  baseUrl: string
) {
  const server = new McpServer(
    { name: "fusion-leap-crm", version: "1.0.0", websiteUrl: baseUrl },
    {
      instructions:
        "Fusion Leap CRM tools are organization-scoped. Read the current user and list records before changing them. Use returned UUIDs exactly. Write tools never delete data. Respect the user's CRM role and explain proposed assignments before creating tasks.",
    }
  );

  server.registerTool(
    "get_current_user",
    {
      title: "Get current CRM user",
      description: "Return the authenticated Fusion Leap user, role, and organization.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () =>
      jsonResult({
        id: context.profile.id,
        name: context.profile.full_name,
        role: context.profile.role,
        job_title: context.profile.job_title,
        organization_id: context.profile.organization_id,
      })
  );

  server.registerTool(
    "list_team_members",
    {
      title: "List team members",
      description: "List people in the current CRM organization for task assignment.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      if (!canAccessTasks(context.profile)) return errorResult("Tasks access is not allowed");
      const { data, error } = await context.supabase
        .from("profiles")
        .select("id, full_name, job_title, role")
        .eq("organization_id", context.profile.organization_id!)
        .order("full_name");
      if (error) return errorResult(error.message);
      return jsonResult({ members: data ?? [] });
    }
  );

  server.registerTool(
    "list_claude_code_agents",
    {
      title: "List Claude Code agents",
      description:
        "List Claude Code employees configured for the current CRM organization, including their default model-routing settings.",
      inputSchema: {},
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async () => {
      if (!canAccessTasks(context.profile)) return errorResult("Tasks access is not allowed");
      const { data, error } = await context.supabase
        .from("ai_agents")
        .select("id, name, provider, is_enabled, default_model_mode, default_model, default_complexity, created_at, updated_at")
        .eq("organization_id", context.profile.organization_id!)
        .order("created_at");
      if (error) return errorResult(error.message);
      return jsonResult({ agents: data ?? [] });
    }
  );

  server.registerTool(
    "list_claude_code_tasks",
    {
      title: "List Claude Code tasks",
      description:
        "List tasks assigned to Claude Code in the current organization, including selected model, execution status, and linked CRM project.",
      inputSchema: {
        agent_id: uuidSchema.optional(),
        execution_status: aiExecutionStatusSchema.optional(),
        project_id: uuidSchema.optional(),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ agent_id, execution_status, project_id, limit }) => {
      if (!canAccessTasks(context.profile)) return errorResult("Tasks access is not allowed");
      let request = context.supabase
        .from("tasks")
        .select("id, title, description, status, priority, due_date, project_id, ai_agent_id, ai_model_mode, ai_requested_model, ai_complexity, ai_selected_model, ai_execution_status, ai_session_id, ai_run_id, ai_result, ai_error, ai_started_at, ai_completed_at, created_at, updated_at")
        .eq("organization_id", context.profile.organization_id!)
        .not("ai_agent_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (agent_id) request = request.eq("ai_agent_id", agent_id);
      if (execution_status) request = request.eq("ai_execution_status", execution_status);
      if (project_id) request = request.eq("project_id", project_id);
      const { data, error } = await request;
      if (error) return errorResult(error.message);
      return jsonResult({
        tasks: (data ?? []).map((task) => ({ ...task, url: appUrl(baseUrl, `/tasks/${task.id}`) })),
      });
    }
  );

  server.registerTool(
    "create_claude_code_task",
    {
      title: "Assign a task to Claude Code",
      description:
        "Create a CRM task for a Claude Code employee. Use model_mode=auto for routing, model for an explicit Haiku/Sonnet/Opus/Fable choice, or complexity for fast/balanced/deep routing.",
      inputSchema: {
        agent_id: uuidSchema,
        title: z.string().min(1).max(200),
        description: z.string().max(12000).optional(),
        project_id: uuidSchema.nullable().optional(),
        priority: taskPrioritySchema.default("medium"),
        due_date: z.string().date().nullable().optional(),
        model_mode: aiModelModeSchema.default("auto"),
        requested_model: aiModelSchema.optional(),
        complexity: aiComplexitySchema.optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (values) => {
      if (!canCreateTask(context.profile)) return errorResult("Task creation is not allowed");
      if (values.model_mode === "model" && !values.requested_model) {
        return errorResult("requested_model is required when model_mode is model");
      }
      if (values.model_mode === "complexity" && !values.complexity) {
        return errorResult("complexity is required when model_mode is complexity");
      }
      const organizationId = context.profile.organization_id!;
      const { data: agent } = await context.supabase
        .from("ai_agents")
        .select("id, name, is_enabled")
        .eq("id", values.agent_id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (!agent) return errorResult("Claude Code agent not found in the current organization");
      if (!agent.is_enabled) return errorResult("This Claude Code agent is disabled");
      if (values.project_id) {
        const { data: project } = await context.supabase
          .from("projects")
          .select("id")
          .eq("id", values.project_id)
          .eq("organization_id", organizationId)
          .maybeSingle();
        if (!project) return errorResult("Project not found in the current organization");
      }
      const { data, error } = await context.supabase
        .from("tasks")
        .insert({
          organization_id: organizationId,
          title: values.title.trim(),
          description: values.description?.trim() || null,
          status: "todo" as TaskStatus,
          priority: values.priority as TaskPriority,
          due_date: values.due_date ?? null,
          assigned_to: context.profile.id,
          assignee_ids: [context.profile.id],
          created_by: context.profile.id,
          project_id: values.project_id ?? null,
          ai_agent_id: agent.id,
          ai_model_mode: values.model_mode,
          ai_requested_model: values.requested_model ?? null,
          ai_complexity: values.complexity ?? null,
          ai_execution_status: "queued",
        })
        .select("id, title, project_id, ai_agent_id, ai_model_mode, ai_requested_model, ai_complexity, ai_execution_status, created_at")
        .single();
      if (error) return errorResult(error.message);
      await context.supabase.from("activities").insert({
        organization_id: organizationId,
        type: "task_created" as ActivityType,
        entity_type: "task",
        entity_id: data.id,
        message: `Assigned task "${data.title}" to ${agent.name} via ChatGPT`,
        user_id: context.profile.id,
      });
      return jsonResult({ task: { ...data, url: appUrl(baseUrl, `/tasks/${data.id}`) } });
    }
  );

  server.registerTool(
    "update_claude_code_task_execution",
    {
      title: "Update Claude Code task execution",
      description:
        "Record a Claude Code run in the CRM task: chosen model, execution status, session/run identifiers, output, error, and timestamps. Use running before execution and completed or failed after it finishes.",
      inputSchema: {
        task_id: uuidSchema,
        execution_status: aiExecutionStatusSchema,
        selected_model: aiModelSchema.optional(),
        session_id: z.string().max(500).nullable().optional(),
        run_id: z.string().max(500).nullable().optional(),
        result: z.string().max(50000).nullable().optional(),
        error: z.string().max(10000).nullable().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ task_id, execution_status, selected_model, session_id, run_id, result, error }) => {
      if (!canAccessTasks(context.profile)) return errorResult("Tasks access is not allowed");
      const { data: existing } = await context.supabase
        .from("tasks")
        .select("id, title, organization_id, ai_agent_id, assigned_to, assignee_ids, created_by")
        .eq("id", task_id)
        .eq("organization_id", context.profile.organization_id!)
        .maybeSingle();
      if (!existing?.ai_agent_id) return errorResult("Claude Code task not found");
      if (!canModifyTask(context.profile, existing)) {
        return errorResult("The current user cannot modify this Claude Code task");
      }
      const now = new Date().toISOString();
      const update: Record<string, unknown> = {
        ai_execution_status: execution_status,
        last_modified_by: context.profile.id,
      };
      if (selected_model !== undefined) update.ai_selected_model = selected_model;
      if (session_id !== undefined) update.ai_session_id = session_id;
      if (run_id !== undefined) update.ai_run_id = run_id;
      if (result !== undefined) update.ai_result = result;
      if (error !== undefined) update.ai_error = error;
      if (execution_status === "running") update.ai_started_at = now;
      if (["completed", "failed", "cancelled"].includes(execution_status)) {
        update.ai_completed_at = now;
      }
      if (execution_status === "completed") update.status = "review";

      const { data, error: updateError } = await context.supabase
        .from("tasks")
        .update(update)
        .eq("id", task_id)
        .eq("organization_id", context.profile.organization_id!)
        .select("id, title, status, ai_execution_status, ai_selected_model, ai_session_id, ai_run_id, ai_started_at, ai_completed_at, updated_at")
        .single();
      if (updateError) return errorResult(updateError.message);
      await context.supabase.from("activities").insert({
        organization_id: context.profile.organization_id!,
        type: "task_updated" as ActivityType,
        entity_type: "task",
        entity_id: task_id,
        message: `Claude Code task "${data.title}" is ${execution_status}`,
        user_id: context.profile.id,
      });
      return jsonResult({ task: { ...data, url: appUrl(baseUrl, `/tasks/${task_id}`) } });
    }
  );

  server.registerTool(
    "list_clients",
    {
      title: "List CRM accounts",
      description: "List client accounts visible to the current CRM user.",
      inputSchema: {
        query: z.string().max(100).optional().describe("Optional client-name search"),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ query, limit }) => {
      if (!canAccessClients(context.profile)) return errorResult("Clients access is not allowed");
      let request = context.supabase
        .from("clients")
        .select(
          "id, name, subtitle, contact, market_code, location, engagement, value_amount, value_currency, status_key, updated_at"
        )
        .eq("organization_id", context.profile.organization_id!)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (query?.trim()) request = request.ilike("name", `%${query.trim()}%`);
      const { data, error } = await request;
      if (error) return errorResult(error.message);
      return jsonResult({
        clients: (data ?? []).map((client) => ({
          ...client,
          url: appUrl(baseUrl, `/clients?q=${encodeURIComponent(client.name)}`),
        })),
      });
    }
  );

  server.registerTool(
    "list_projects",
    {
      title: "List delivery projects",
      description: "List projects visible to the current CRM user.",
      inputSchema: {
        phase: z.string().max(50).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ phase, limit }) => {
      if (!canAccessProjects(context.profile)) return errorResult("Projects access is not allowed");
      let request = context.supabase
        .from("projects")
        .select(
          "id, title, subtitle, progress, status_key, team_member_ids, phase, delivery_phases, updated_at"
        )
        .eq("organization_id", context.profile.organization_id!)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (phase?.trim()) request = request.eq("phase", phase.trim());
      const { data, error } = await request;
      if (error) return errorResult(error.message);
      return jsonResult({
        projects: (data ?? []).map((project) => ({
          ...project,
          url: appUrl(baseUrl, "/projects"),
        })),
      });
    }
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List CRM tasks",
      description: "List tasks allowed by the current user's CRM role and assignments.",
      inputSchema: {
        task_id: uuidSchema.optional(),
        status: taskStatusSchema.optional(),
        due_date: z.string().date().optional(),
        assignee_id: uuidSchema.optional(),
        project_id: uuidSchema.optional(),
        task_phase: z.string().regex(/^P\d+$/).optional(),
        query: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ task_id, status, due_date, assignee_id, project_id, task_phase, query, limit }) => {
      if (!canAccessTasks(context.profile)) return errorResult("Tasks access is not allowed");
      let request = context.supabase
        .from("tasks")
        .select(
          "id, title, description, status, priority, due_date, assigned_to, assignee_ids, project_id, task_phase, created_by, created_at, updated_at"
        )
        .eq("organization_id", context.profile.organization_id!)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(limit);
      if (!canViewAllTasks(context.profile)) {
        request = request.or(memberTaskOrFilter(context.profile.id));
      }
      if (status) request = request.eq("status", status);
      if (task_id) request = request.eq("id", task_id);
      if (due_date) request = request.eq("due_date", due_date);
      if (assignee_id) request = request.contains("assignee_ids", [assignee_id]);
      if (project_id) request = request.eq("project_id", project_id);
      if (task_phase) request = request.eq("task_phase", task_phase.toUpperCase());
      if (query?.trim()) {
        const safe = query.trim().replace(/[,%()]/g, " ");
        request = request.ilike("title", `%${safe}%`);
      }
      const { data, error } = await request;
      if (error) return errorResult(error.message);
      return jsonResult({
        tasks: (data ?? []).map((task) => ({
          ...task,
          url: appUrl(baseUrl, `/tasks/${task.id}`),
        })),
      });
    }
  );

  server.registerTool(
    "update_task",
    {
      title: "Update CRM task",
      description:
        "Update a task title, description, workflow status, due date, priority, project, delivery phase, or assignees. Unspecified fields stay unchanged.",
      inputSchema: {
        task_id: uuidSchema,
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).nullable().optional(),
        status: taskStatusSchema.optional(),
        priority: taskPrioritySchema.optional(),
        due_date: z.string().date().nullable().optional(),
        assignee_ids: z.array(uuidSchema).max(25).optional(),
        project_id: uuidSchema.nullable().optional(),
        task_phase: z.string().regex(/^P\d+$/).nullable().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ task_id, ...values }) => {
      if (!canAccessTasks(context.profile)) return errorResult("Tasks access is not allowed");
      if (Object.values(values).every((value) => value === undefined)) {
        return errorResult("Provide at least one field to update");
      }

      const { data: existing, error: findError } = await context.supabase
        .from("tasks")
        .select(
          "id, title, assigned_to, assignee_ids, created_by, organization_id, project_id, task_phase"
        )
        .eq("id", task_id)
        .eq("organization_id", context.profile.organization_id!)
        .maybeSingle();
      if (findError || !existing) return errorResult("Task not found");
      if (!canModifyTask(context.profile, existing)) {
        return errorResult("The current user cannot modify this task");
      }

      const update: Record<string, unknown> = {};
      if (values.title !== undefined) update.title = values.title.trim();
      if (values.description !== undefined) {
        update.description = values.description?.trim() || null;
      }
      if (values.status !== undefined) update.status = values.status;
      if (values.priority !== undefined) update.priority = values.priority;
      if (values.due_date !== undefined) update.due_date = values.due_date;
      if (values.task_phase !== undefined) {
        update.task_phase = normalizeTaskPhase(values.task_phase);
      }

      if (values.project_id !== undefined) {
        if (values.project_id) {
          const { data: project } = await context.supabase
            .from("projects")
            .select("id")
            .eq("id", values.project_id)
            .eq("organization_id", context.profile.organization_id!)
            .maybeSingle();
          if (!project) return errorResult("Project not found in the current organization");
        }
        update.project_id = values.project_id;
      }

      if (values.assignee_ids !== undefined) {
        let assigneeIds = [...new Set(values.assignee_ids)];
        if (!isLeadership(context.profile) && !assigneeIds.includes(context.profile.id)) {
          assigneeIds.push(context.profile.id);
        }
        if (!assigneeIds.length) assigneeIds = [context.profile.id];
        if (!(await validateOrgAssignees(context, assigneeIds))) {
          return errorResult("Every assignee must belong to the current organization");
        }
        update.assignee_ids = assigneeIds;
        update.assigned_to = assigneeIds[0];
      }

      const { data, error } = await context.supabase
        .from("tasks")
        .update(update)
        .eq("id", task_id)
        .eq("organization_id", context.profile.organization_id!)
        .select(
          "id, title, description, status, priority, due_date, assigned_to, assignee_ids, project_id, task_phase, created_by, created_at, updated_at"
        )
        .single();
      if (error) return errorResult(error.message);

      await context.supabase.from("activities").insert({
        organization_id: context.profile.organization_id!,
        type: (values.status && isTaskDoneStatus(values.status)
          ? "task_completed"
          : "task_updated") as ActivityType,
        entity_type: "task",
        entity_id: task_id,
        message: values.status
          ? `Updated task "${data.title}" status to ${values.status} via ChatGPT`
          : `Updated task "${data.title}" via ChatGPT`,
        user_id: context.profile.id,
      });

      return jsonResult({ task: { ...data, url: appUrl(baseUrl, `/tasks/${data.id}`) } });
    }
  );

  server.registerTool(
    "create_task",
    {
      title: "Create CRM task",
      description: "Create a task and assign it to organization members. Does not delete data.",
      inputSchema: {
        title: z.string().min(1).max(200),
        description: z.string().max(5000).optional(),
        status: taskStatusSchema.default("todo"),
        priority: taskPrioritySchema.default("medium"),
        due_date: z.string().date().nullable().optional(),
        assignee_ids: z.array(uuidSchema).max(25).default([]),
        project_id: uuidSchema.nullable().optional(),
        task_phase: z.string().regex(/^P\d+$/).nullable().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (values) => {
      if (!canCreateTask(context.profile)) return errorResult("Task creation is not allowed");
      let assigneeIds = [...new Set(values.assignee_ids)];
      if (!isLeadership(context.profile) && !assigneeIds.includes(context.profile.id)) {
        assigneeIds.push(context.profile.id);
      }
      if (!assigneeIds.length) assigneeIds = [context.profile.id];
      if (!(await validateOrgAssignees(context, assigneeIds))) {
        return errorResult("Every assignee must belong to the current organization");
      }

      if (values.project_id) {
        const { data: project } = await context.supabase
          .from("projects")
          .select("id")
          .eq("id", values.project_id)
          .eq("organization_id", context.profile.organization_id!)
          .maybeSingle();
        if (!project) return errorResult("Project not found in the current organization");
      }

      const { data, error } = await context.supabase
        .from("tasks")
        .insert({
          organization_id: context.profile.organization_id!,
          title: values.title,
          description: values.description?.trim() || null,
          status: values.status as TaskStatus,
          priority: values.priority as TaskPriority,
          due_date: values.due_date ?? null,
          assigned_to: assigneeIds[0] ?? context.profile.id,
          assignee_ids: assigneeIds,
          lead_id: null,
          project_id: values.project_id ?? null,
          task_phase: normalizeTaskPhase(values.task_phase) ?? inferTaskPhase(values.title),
          created_by: context.profile.id,
        })
        .select(
          "id, title, description, status, priority, due_date, assigned_to, assignee_ids, project_id, task_phase, created_by, created_at, updated_at"
        )
        .single();
      if (error) return errorResult(error.message);

      await context.supabase.from("activities").insert({
        organization_id: context.profile.organization_id!,
        type: "task_created" as ActivityType,
        entity_type: "task",
        entity_id: data.id,
        message: `Created task "${data.title}" via ChatGPT`,
        user_id: context.profile.id,
      });

      return jsonResult({ task: { ...data, url: appUrl(baseUrl, `/tasks/${data.id}`) } });
    }
  );

  server.registerTool(
    "update_task_status",
    {
      title: "Update task status",
      description: "Move an existing task to another workflow status. Does not delete data.",
      inputSchema: { task_id: uuidSchema, status: taskStatusSchema },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ task_id, status }) => {
      if (!canAccessTasks(context.profile)) return errorResult("Tasks access is not allowed");
      const { data: existing, error: findError } = await context.supabase
        .from("tasks")
        .select("id, title, assigned_to, assignee_ids, created_by, organization_id")
        .eq("id", task_id)
        .eq("organization_id", context.profile.organization_id!)
        .maybeSingle();
      if (findError || !existing) return errorResult("Task not found");
      if (!canModifyTask(context.profile, existing)) {
        return errorResult("The current user cannot modify this task");
      }

      const { data, error } = await context.supabase
        .from("tasks")
        .update({ status })
        .eq("id", task_id)
        .eq("organization_id", context.profile.organization_id!)
        .select("id, title, status, priority, due_date, assignee_ids, updated_at")
        .single();
      if (error) return errorResult(error.message);

      await context.supabase.from("activities").insert({
        organization_id: context.profile.organization_id!,
        type: (isTaskDoneStatus(status) ? "task_completed" : "task_updated") as ActivityType,
        entity_type: "task",
        entity_id: task_id,
        message: `Updated task "${data.title}" status via ChatGPT`,
        user_id: context.profile.id,
      });

      return jsonResult({ task: { ...data, url: appUrl(baseUrl, `/tasks/${task_id}`) } });
    }
  );

  server.registerTool(
    "list_sales_leads",
    {
      title: "List sales prospects",
      description: "List prospects in the CRM Kanban, including AI score and follow-up state.",
      inputSchema: {
        stage: leadStageSchema.optional(),
        sales_project: z.string().max(120).optional(),
        query: z.string().max(120).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ stage, sales_project, query, limit }) => {
      if (!canAccessLeads(context.profile)) return errorResult("Sales workspace access is not allowed");
      let request = context.supabase
        .from("leads")
        .select("id, title, company, contact_name, email, phone, website, city, country, source, source_url, sales_project, ai_score, ai_summary, research_notes, research_sources, researched_at, contact_permission, stage, last_contact_method, last_contacted_at, next_follow_up_at, assigned_to, created_at, updated_at")
        .eq("organization_id", context.profile.organization_id!)
        .order("ai_score", { ascending: false, nullsFirst: false })
        .limit(limit);
      if (stage) request = request.eq("stage", stage);
      if (sales_project?.trim()) request = request.eq("sales_project", sales_project.trim());
      if (query?.trim()) {
        const safe = query.trim().replace(/[,%()]/g, " ");
        request = request.or(`company.ilike.%${safe}%,contact_name.ilike.%${safe}%,title.ilike.%${safe}%`);
      }
      const { data, error } = await request;
      if (error) return errorResult(error.message);
      return jsonResult({
        leads: (data ?? []).map((lead) => ({
          ...lead,
          url: appUrl(baseUrl, `/leads/${lead.id}`),
        })),
      });
    }
  );

  server.registerTool(
    "upsert_sales_lead",
    {
      title: "Add or enrich a sales prospect",
      description: "Create a prospect or enrich an existing match. Deduplicates by normalized phone, email, then source URL.",
      inputSchema: {
        company: z.string().min(1).max(200),
        contact_name: z.string().max(200).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(50).optional(),
        website: z.string().url().max(500).optional(),
        city: z.string().max(120).optional(),
        country: z.string().max(120).default("Morocco"),
        source: z.string().max(120).default("ai_prospecting"),
        source_url: z.string().url().max(1000).optional(),
        sales_project: z.string().min(1).max(120).optional(),
        ai_score: z.number().int().min(0).max(100).optional(),
        ai_summary: z.string().max(3000).optional(),
        contact_permission: contactPermissionSchema.default("unknown"),
        next_follow_up_at: z.string().datetime().nullable().optional(),
        assigned_to: uuidSchema.nullable().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (values) => {
      if (!canAccessLeads(context.profile)) return errorResult("Sales workspace access is not allowed");
      if (values.assigned_to && !(await validateOrgAssignees(context, [values.assigned_to]))) {
        return errorResult("Assignee must belong to the current organization");
      }
      const organizationId = context.profile.organization_id!;
      const salesProject = values.sales_project?.trim() || "Fusion Leap";
      const phoneNormalized = normalizePhone(values.phone);
      const emailNormalized = values.email?.trim().toLowerCase() || null;
      let existing: { id: string } | null = null;
      if (phoneNormalized) {
        const { data } = await context.supabase.from("leads").select("id").eq("organization_id", organizationId).eq("sales_project", salesProject).eq("phone_normalized", phoneNormalized).limit(1);
        existing = data?.[0] ?? null;
      }
      if (!existing && emailNormalized) {
        const { data } = await context.supabase.from("leads").select("id").eq("organization_id", organizationId).eq("sales_project", salesProject).eq("email_normalized", emailNormalized).limit(1);
        existing = data?.[0] ?? null;
      }
      if (!existing && values.source_url) {
        const { data } = await context.supabase.from("leads").select("id").eq("organization_id", organizationId).eq("sales_project", salesProject).eq("source_url", values.source_url).limit(1);
        existing = data?.[0] ?? null;
      }

      const createPayload = {
        title: values.company,
        company: values.company,
        contact_name: values.contact_name?.trim() || null,
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        phone_normalized: phoneNormalized,
        email_normalized: emailNormalized,
        website: values.website ?? null,
        city: values.city?.trim() || null,
        country: values.country,
        source: values.source,
        source_url: values.source_url ?? null,
        sales_project: salesProject,
        ai_score: values.ai_score ?? null,
        ai_summary: values.ai_summary?.trim() || null,
        contact_permission: values.contact_permission,
        next_follow_up_at: values.next_follow_up_at ?? null,
        assigned_to: values.assigned_to ?? null,
      };

      const updatePayload = Object.fromEntries(
        Object.entries({
          title: values.company,
          company: values.company,
          contact_name: values.contact_name?.trim(),
          email: values.email?.trim(),
          phone: values.phone?.trim(),
          phone_normalized: values.phone === undefined ? undefined : phoneNormalized,
          email_normalized: values.email === undefined ? undefined : emailNormalized,
          website: values.website,
          city: values.city?.trim(),
          country: values.country,
          source: values.source,
          source_url: values.source_url,
          sales_project: values.sales_project,
          ai_score: values.ai_score,
          ai_summary: values.ai_summary?.trim(),
          contact_permission: values.contact_permission,
          next_follow_up_at: values.next_follow_up_at,
          assigned_to: values.assigned_to,
        }).filter(([, value]) => value !== undefined)
      );

      const result = existing
        ? await context.supabase.from("leads").update(updatePayload).eq("id", existing.id).eq("organization_id", organizationId).select().single()
        : await context.supabase.from("leads").insert({ ...createPayload, organization_id: organizationId, stage: "new" as LeadStage, value: 0, created_by: context.profile.id }).select().single();
      if (result.error) return errorResult(result.error.message);

      await context.supabase.from("activities").insert({
        organization_id: organizationId,
        type: (existing ? "lead_updated" : "lead_created") as ActivityType,
        entity_type: "lead",
        entity_id: result.data.id,
        message: `${existing ? "Enriched" : "Created"} prospect "${result.data.title}" via AI agent`,
        user_id: context.profile.id,
      });
      return jsonResult({ lead: { ...result.data, deduplicated: Boolean(existing), url: appUrl(baseUrl, `/leads/${result.data.id}`) } });
    }
  );

  server.registerTool(
    "list_leads_needing_research",
    {
      title: "Find prospects that need research",
      description: "Return prospects that do not yet have a sourced research brief. Research each company on the public web before drafting outreach.",
      inputSchema: {
        sales_project: z.string().min(1).max(120).default("Autolog"),
        limit: z.number().int().min(1).max(20).default(20),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ sales_project, limit }) => {
      if (!canAccessLeads(context.profile)) return errorResult("Sales workspace access is not allowed");
      const { data, error } = await context.supabase
        .from("leads")
        .select("id, title, company, contact_name, website, city, country, source, source_url, sales_project, ai_summary, research_notes, researched_at")
        .eq("organization_id", context.profile.organization_id!)
        .eq("sales_project", sales_project.trim())
        .is("researched_at", null)
        .order("created_at", { ascending: true })
        .limit(limit);
      if (error) return errorResult(error.message);
      return jsonResult({
        leads: (data ?? []).map((lead) => ({ ...lead, url: appUrl(baseUrl, `/leads/${lead.id}`) })),
        required_output: ["verified company snapshot", "observed opportunity", "specific value to offer", "personalization hook", "source URLs"],
      });
    }
  );

  server.registerTool(
    "save_lead_research",
    {
      title: "Save a sourced prospect research brief",
      description: "Save verified public-web research that a message writer can use. Never invent facts; every company-specific claim must be supported by one of the supplied source URLs.",
      inputSchema: {
        lead_id: uuidSchema,
        company_snapshot: z.string().min(20).max(1200),
        observed_opportunity: z.string().min(20).max(1200),
        value_to_offer: z.string().min(20).max(1200),
        personalization_hook: z.string().min(10).max(500),
        confidence: z.enum(["high", "medium", "low"]),
        sources: z.array(z.string().url().max(1000)).min(1).max(5),
        ai_score: z.number().int().min(0).max(100).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ lead_id, company_snapshot, observed_opportunity, value_to_offer, personalization_hook, confidence, sources, ai_score }) => {
      if (!canAccessLeads(context.profile)) return errorResult("Sales workspace access is not allowed");
      const researchNotes = [
        `Company snapshot: ${company_snapshot.trim()}`,
        `Observed opportunity: ${observed_opportunity.trim()}`,
        `Specific value to offer: ${value_to_offer.trim()}`,
        `Personalization hook: ${personalization_hook.trim()}`,
        `Research confidence: ${confidence}`,
      ].join("\n");
      const { data, error } = await context.supabase
        .from("leads")
        .update({
          research_notes: researchNotes,
          research_sources: sources,
          researched_at: new Date().toISOString(),
          ai_summary: `${company_snapshot.trim()} ${observed_opportunity.trim()}`.slice(0, 3000),
          ...(ai_score !== undefined ? { ai_score } : {}),
        })
        .eq("id", lead_id)
        .eq("organization_id", context.profile.organization_id!)
        .select("id, title, research_notes, research_sources, researched_at, ai_score")
        .maybeSingle();
      if (error || !data) return errorResult(error?.message || "Lead not found");
      await context.supabase.from("activities").insert({
        organization_id: context.profile.organization_id!,
        type: "lead_updated",
        entity_type: "lead",
        entity_id: lead_id,
        message: `AI research brief completed for "${data.title}" with ${sources.length} source(s)`,
        user_id: context.profile.id,
      });
      return jsonResult({ lead: data, ready_for_outreach: true });
    }
  );

  server.registerTool(
    "move_sales_lead",
    {
      title: "Move prospect on sales Kanban",
      description: "Move a prospect to another sales stage and optionally schedule the next follow-up.",
      inputSchema: {
        lead_id: uuidSchema,
        stage: leadStageSchema,
        contact_method: leadContactMethodSchema.optional(),
        next_follow_up_at: z.string().datetime().nullable().optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async ({ lead_id, stage, contact_method, next_follow_up_at }) => {
      if (!canAccessLeads(context.profile)) return errorResult("Sales workspace access is not allowed");
      if (stage === "contacted" && !contact_method) {
        return errorResult("contact_method is required when moving a lead to contacted");
      }
      const { data, error } = await context.supabase
        .from("leads")
        .update({
          stage,
          ...(contact_method ? { last_contact_method: contact_method } : {}),
          ...(stage === "contacted" ? { last_contacted_at: new Date().toISOString() } : {}),
          ...(next_follow_up_at !== undefined ? { next_follow_up_at } : {}),
        })
        .eq("id", lead_id)
        .eq("organization_id", context.profile.organization_id!)
        .select("id, title, sales_project, stage, last_contact_method, last_contacted_at, next_follow_up_at, updated_at")
        .maybeSingle();
      if (error || !data) return errorResult(error?.message || "Lead not found or cannot be modified");
      return jsonResult({ lead: { ...data, url: appUrl(baseUrl, `/leads/${lead_id}`) } });
    }
  );

  server.registerTool(
    "queue_outreach_message",
    {
      title: "Draft personalized outreach",
      description: "Prepare an auditable, natural and personalized WhatsApp, email, or SMS message for human approval. Vary the opening, value angle and question by lead. For WhatsApp, message_parts may contain one or two short messages. This does not send anything.",
      inputSchema: {
        lead_id: uuidSchema,
        channel: outreachChannelSchema,
        subject: z.string().max(200).optional(),
        body: z.string().min(1).max(5000),
        message_parts: z.array(z.string().min(1).max(1000)).min(1).max(2).optional(),
        scheduled_for: z.string().datetime().nullable().optional(),
        idempotency_key: z.string().max(200).optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (values) => {
      if (!canAccessLeads(context.profile)) return errorResult("Sales workspace access is not allowed");
      const organizationId = context.profile.organization_id!;
      const { data: lead } = await context.supabase
        .from("leads")
        .select("id, title, phone, email, contact_permission, research_notes, research_sources, researched_at")
        .eq("id", values.lead_id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (!lead) return errorResult("Lead not found");
      if (lead.contact_permission === "opted_out") return errorResult("This contact opted out");
      if (!lead.researched_at || !lead.research_notes || !Array.isArray(lead.research_sources) || lead.research_sources.length === 0) {
        return errorResult("Complete sourced lead research before drafting outreach");
      }
      if (values.channel === "email" && !lead.email) return errorResult("Lead has no email address");
      if (values.channel !== "email" && !lead.phone) return errorResult("Lead has no phone number");

      const { data, error } = await context.supabase
        .from("outreach_messages")
        .insert({
          organization_id: organizationId,
          lead_id: values.lead_id,
          channel: values.channel,
          status: "draft",
          subject: values.subject?.trim() || null,
          body: values.body.trim(),
          message_parts: values.message_parts?.map((part) => part.trim()) ?? null,
          scheduled_for: values.scheduled_for ?? null,
          idempotency_key: values.idempotency_key ?? null,
          created_by: context.profile.id,
        })
        .select()
        .single();
      if (error) return errorResult(error.message);
      return jsonResult({ message: data, approval_required: true, workspace_url: appUrl(baseUrl, "/leads") });
    }
  );

  server.registerTool(
    "list_outreach_queue",
    {
      title: "List outreach queue",
      description: "List drafted, approved, sent, and failed prospect messages.",
      inputSchema: {
        status: z.enum(["draft", "approved", "queued", "sending", "sent", "delivered", "replied", "failed", "cancelled"]).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ status, limit }) => {
      if (!canAccessLeads(context.profile)) return errorResult("Sales workspace access is not allowed");
      let request = context.supabase
        .from("outreach_messages")
        .select("*, lead:leads(id, title, company, contact_name, phone, email, contact_permission)")
        .eq("organization_id", context.profile.organization_id!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (status) request = request.eq("status", status);
      const { data, error } = await request;
      if (error) return errorResult(error.message);
      return jsonResult({ messages: data ?? [], workspace_url: appUrl(baseUrl, "/leads") });
    }
  );

  server.registerTool(
    "send_approved_outreach_message",
    {
      title: "Send an approved outreach message",
      description: "Send one previously approved message through the configured provider webhook. Never sends drafts or opted-out contacts.",
      inputSchema: { message_id: uuidSchema },
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    },
    async ({ message_id }) => {
      if (!isLeadership(context.profile)) return errorResult("Only leadership can send outreach");
      const result = await dispatchOutreachMessage(
        context.supabase,
        context.profile.organization_id!,
        message_id
      );
      if (!result.success) return errorResult(result.error);
      return jsonResult({ message_id, status: "sent", provider_message_id: result.providerMessageId });
    }
  );

  return server;
}
