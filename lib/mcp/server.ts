import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  canAccessClients,
  canAccessProjects,
  canAccessTasks,
  canCreateTask,
  canModifyTask,
  canViewAllTasks,
  isLeadership,
} from "@/lib/permissions";
import { memberTaskOrFilter } from "@/lib/tasks/visibility";
import { isTaskDoneStatus } from "@/lib/tasks/status";
import type { McpAuthContext } from "@/lib/mcp/auth";
import type { ActivityType, TaskPriority, TaskStatus } from "@/types/database";

const taskStatusSchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "review",
  "testing",
]);
const taskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
const uuidSchema = z.string().uuid();

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
          "id, title, subtitle, progress, status_key, team_member_ids, phase, updated_at"
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
        status: taskStatusSchema.optional(),
        due_date: z.string().date().optional(),
        assignee_id: uuidSchema.optional(),
        limit: z.number().int().min(1).max(100).default(50),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    },
    async ({ status, due_date, assignee_id, limit }) => {
      if (!canAccessTasks(context.profile)) return errorResult("Tasks access is not allowed");
      let request = context.supabase
        .from("tasks")
        .select(
          "id, title, description, status, priority, due_date, assigned_to, assignee_ids, project_id, created_by, created_at, updated_at"
        )
        .eq("organization_id", context.profile.organization_id!)
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(limit);
      if (!canViewAllTasks(context.profile)) {
        request = request.or(memberTaskOrFilter(context.profile.id));
      }
      if (status) request = request.eq("status", status);
      if (due_date) request = request.eq("due_date", due_date);
      if (assignee_id) request = request.contains("assignee_ids", [assignee_id]);
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
          created_by: context.profile.id,
        })
        .select(
          "id, title, description, status, priority, due_date, assigned_to, assignee_ids, project_id, created_by, created_at, updated_at"
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

  return server;
}
