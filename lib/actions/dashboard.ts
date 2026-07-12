"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/auth";
import {
  canViewAllTasks,
  isLeadership,
} from "@/lib/permissions/capabilities";
import type {
  Activity,
  Lead,
  LeadStage,
  Task,
} from "@/types/database";

export interface DashboardStats {
  totalLeads: number;
  openLeads: number;
  pipelineValue: number;
  wonValue: number;
  tasksDueToday: number;
  openTasks: number;
  overdueTasks: number;
  urgentTasks: number;
  conversionRate: number;
  leadsByStage: { stage: LeadStage; count: number; value: number }[];
  recentLeads: Lead[];
  upcomingTasks: Task[];
  urgentTaskList: Task[];
  activities: Activity[];
  pipelineTrend: { date: string; value: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const empty: DashboardStats = {
    totalLeads: 0,
    openLeads: 0,
    pipelineValue: 0,
    wonValue: 0,
    tasksDueToday: 0,
    openTasks: 0,
    overdueTasks: 0,
    urgentTasks: 0,
    conversionRate: 0,
    leadsByStage: [],
    recentLeads: [],
    upcomingTasks: [],
    urgentTaskList: [],
    activities: [],
    pipelineTrend: [],
  };

  if (!profile?.organization_id) return empty;

  const orgId = profile.organization_id;
  const today = new Date().toISOString().slice(0, 10);
  const memberScoped = !canViewAllTasks(profile);
  const taskOwnerFilter = `assigned_to.eq.${profile.id},created_by.eq.${profile.id}`;

  let tasksTodayQ = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("due_date", today)
    .neq("status", "done")
    .neq("status", "cancelled");
  let openTasksQ = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .neq("status", "done")
    .neq("status", "cancelled");
  let overdueTasksQ = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .lt("due_date", today)
    .neq("status", "done")
    .neq("status", "cancelled");
  let urgentCountQ = supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .in("priority", ["urgent", "high"])
    .neq("status", "done")
    .neq("status", "cancelled");
  let upcomingTasksQ = supabase
    .from("tasks")
    .select("*, assigned_profile:profiles!tasks_assigned_to_fkey(*)")
    .eq("organization_id", orgId)
    .neq("status", "done")
    .neq("status", "cancelled")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(6);
  let urgentListQ = supabase
    .from("tasks")
    .select("*, assigned_profile:profiles!tasks_assigned_to_fkey(*)")
    .eq("organization_id", orgId)
    .in("priority", ["urgent", "high"])
    .neq("status", "done")
    .neq("status", "cancelled")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(6);

  if (memberScoped) {
    tasksTodayQ = tasksTodayQ.or(taskOwnerFilter);
    openTasksQ = openTasksQ.or(taskOwnerFilter);
    overdueTasksQ = overdueTasksQ.or(taskOwnerFilter);
    urgentCountQ = urgentCountQ.or(taskOwnerFilter);
    upcomingTasksQ = upcomingTasksQ.or(taskOwnerFilter);
    urgentListQ = urgentListQ.or(taskOwnerFilter);
  }

  const leadership = isLeadership(profile);

  const [
    leadsRes,
    tasksTodayRes,
    openTasksRes,
    overdueTasksRes,
    urgentCountRes,
    recentLeadsRes,
    upcomingTasksRes,
    urgentListRes,
    activitiesRes,
  ] = await Promise.all([
    leadership
      ? supabase
          .from("leads")
          .select("id, value, stage, created_at")
          .eq("organization_id", orgId)
      : Promise.resolve({ data: [] as { id: string; value: number | null; stage: string; created_at: string }[] }),
    tasksTodayQ,
    openTasksQ,
    overdueTasksQ,
    urgentCountQ,
    leadership
      ? supabase
          .from("leads")
          .select("*, assigned_profile:profiles!leads_assigned_to_fkey(*)")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(5)
      : Promise.resolve({ data: [] }),
    upcomingTasksQ,
    urgentListQ,
    leadership
      ? supabase
          .from("activities")
          .select("*, profile:profiles!activities_user_id_fkey(*)")
          .eq("organization_id", orgId)
          .order("created_at", { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] }),
  ]);

  const leads = leadsRes.data ?? [];
  const totalLeads = leads.length;
  const openLeads = leads.filter(
    (l) => l.stage !== "lost" && l.stage !== "won"
  ).length;
  const pipelineValue = leads
    .filter((l) => l.stage !== "lost" && l.stage !== "won")
    .reduce((sum, l) => sum + Number(l.value ?? 0), 0);
  const wonValue = leads
    .filter((l) => l.stage === "won")
    .reduce((sum, l) => sum + Number(l.value ?? 0), 0);
  const wonCount = leads.filter((l) => l.stage === "won").length;
  const closedCount = leads.filter(
    (l) => l.stage === "won" || l.stage === "lost"
  ).length;
  const conversionRate =
    closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

  const stageMap = new Map<LeadStage, { count: number; value: number }>();
  for (const lead of leads) {
    const stage = lead.stage as LeadStage;
    const current = stageMap.get(stage) ?? { count: 0, value: 0 };
    current.count += 1;
    current.value += Number(lead.value ?? 0);
    stageMap.set(stage, current);
  }

  const leadsByStage = Array.from(stageMap.entries()).map(
    ([stage, data]) => ({ stage, ...data })
  );

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  const trendMap = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo);
    d.setDate(d.getDate() + i);
    trendMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const lead of leads) {
    const day = lead.created_at.slice(0, 10);
    if (trendMap.has(day)) {
      trendMap.set(day, (trendMap.get(day) ?? 0) + Number(lead.value ?? 0));
    }
  }
  const pipelineTrend = Array.from(trendMap.entries()).map(
    ([date, value]) => ({ date, value })
  );

  return {
    totalLeads,
    openLeads,
    pipelineValue,
    wonValue,
    tasksDueToday: tasksTodayRes.count ?? 0,
    openTasks: openTasksRes.count ?? 0,
    overdueTasks: overdueTasksRes.count ?? 0,
    urgentTasks: urgentCountRes.count ?? 0,
    conversionRate,
    leadsByStage,
    recentLeads: (recentLeadsRes.data as Lead[]) ?? [],
    upcomingTasks: (upcomingTasksRes.data as Task[]) ?? [],
    urgentTaskList: (urgentListRes.data as Task[]) ?? [],
    activities: (activitiesRes.data as Activity[]) ?? [],
    pipelineTrend,
  };
}
