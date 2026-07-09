"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/actions/auth";
import type {
  Activity,
  Lead,
  LeadStage,
  Task,
} from "@/types/database";

export interface DashboardStats {
  totalLeads: number;
  pipelineValue: number;
  tasksDueToday: number;
  conversionRate: number;
  leadsByStage: { stage: LeadStage; count: number; value: number }[];
  recentLeads: Lead[];
  upcomingTasks: Task[];
  activities: Activity[];
  pipelineTrend: { date: string; value: number }[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const empty: DashboardStats = {
    totalLeads: 0,
    pipelineValue: 0,
    tasksDueToday: 0,
    conversionRate: 0,
    leadsByStage: [],
    recentLeads: [],
    upcomingTasks: [],
    activities: [],
    pipelineTrend: [],
  };

  if (!profile?.organization_id) return empty;

  const orgId = profile.organization_id;
  const today = new Date().toISOString().slice(0, 10);

  const [
    leadsRes,
    tasksTodayRes,
    recentLeadsRes,
    upcomingTasksRes,
    activitiesRes,
  ] = await Promise.all([
    supabase
      .from("leads")
      .select("id, value, stage, created_at")
      .eq("organization_id", orgId),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("due_date", today)
      .neq("status", "done")
      .neq("status", "cancelled"),
    supabase
      .from("leads")
      .select("*, assigned_profile:profiles!leads_assigned_to_fkey(*)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("*, assigned_profile:profiles!tasks_assigned_to_fkey(*)")
      .eq("organization_id", orgId)
      .neq("status", "done")
      .neq("status", "cancelled")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(5),
    supabase
      .from("activities")
      .select("*, profile:profiles!activities_user_id_fkey(*)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const leads = leadsRes.data ?? [];
  const totalLeads = leads.length;
  const pipelineValue = leads
    .filter((l) => l.stage !== "lost" && l.stage !== "won")
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

  // Pipeline trend: sum of lead values created per day (last 30 days)
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
    pipelineValue,
    tasksDueToday: tasksTodayRes.count ?? 0,
    conversionRate,
    leadsByStage,
    recentLeads: (recentLeadsRes.data as Lead[]) ?? [],
    upcomingTasks: (upcomingTasksRes.data as Task[]) ?? [],
    activities: (activitiesRes.data as Activity[]) ?? [],
    pipelineTrend,
  };
}
