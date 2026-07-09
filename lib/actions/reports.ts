"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, getOrgProfiles } from "@/lib/actions/auth";
import type { LeadStage, TaskStatus } from "@/types/database";

export type ReportsPeriod = "weekly" | "monthly" | "quarterly";

export interface ReportsKpis {
  pipelineValue: number;
  wonValue: number;
  conversionRate: number;
  tasksCompleted: number;
  totalLeads: number;
  openTasks: number;
  activityCount: number;
}

export interface TrendPoint {
  key: string;
  label: string;
  value: number;
  count: number;
}

export interface TeamPerformanceRow {
  profileId: string;
  name: string;
  initials: string;
  leads: number;
  pipelineValue: number;
  tasksDone: number;
}

export interface ReportsData {
  period: ReportsPeriod;
  kpis: ReportsKpis;
  pipelineTrend: TrendPoint[];
  leadsByStage: { stage: LeadStage; count: number; value: number }[];
  tasksByStatus: { status: TaskStatus; count: number }[];
  activitiesTrend: TrendPoint[];
  teamPerformance: TeamPerformanceRow[];
  recentWon: {
    id: string;
    title: string;
    company: string | null;
    value: number;
    date: string;
  }[];
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

function bucketKey(date: Date, period: ReportsPeriod): string {
  if (period === "weekly") {
    return startOfWeek(date).toISOString().slice(0, 10);
  }
  if (period === "quarterly") {
    const s = startOfQuarter(date);
    return `${s.getFullYear()}-Q${Math.floor(s.getMonth() / 3) + 1}`;
  }
  const s = startOfMonth(date);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}`;
}

function buildBuckets(period: ReportsPeriod): { key: string; label: string }[] {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];

  if (period === "weekly") {
    const start = startOfWeek(now);
    start.setDate(start.getDate() - 7 * 7);
    for (let i = 0; i < 8; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i * 7);
      const key = d.toISOString().slice(0, 10);
      buckets.push({
        key,
        label: d.toLocaleDateString("en", { month: "short", day: "numeric" }),
      });
    }
    return buckets;
  }

  if (period === "quarterly") {
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i * 3, 1);
      const s = startOfQuarter(d);
      const key = `${s.getFullYear()}-Q${Math.floor(s.getMonth() / 3) + 1}`;
      buckets.push({ key, label: key });
    }
    return buckets;
  }

  for (let i = 7; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key,
      label: d.toLocaleDateString("en", { month: "short", year: "2-digit" }),
    });
  }
  return buckets;
}

function inPeriodRange(iso: string, period: ReportsPeriod): boolean {
  const d = new Date(iso);
  const now = new Date();
  if (period === "weekly") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 56);
    return d >= cutoff;
  }
  if (period === "quarterly") {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 12, 1);
    return d >= cutoff;
  }
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 8, 1);
  return d >= cutoff;
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export async function getReportsData(
  period: ReportsPeriod = "monthly"
): Promise<ReportsData> {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const empty: ReportsData = {
    period,
    kpis: {
      pipelineValue: 0,
      wonValue: 0,
      conversionRate: 0,
      tasksCompleted: 0,
      totalLeads: 0,
      openTasks: 0,
      activityCount: 0,
    },
    pipelineTrend: buildBuckets(period).map((b) => ({ ...b, value: 0, count: 0 })),
    leadsByStage: [],
    tasksByStatus: [],
    activitiesTrend: buildBuckets(period).map((b) => ({ ...b, value: 0, count: 0 })),
    teamPerformance: [],
    recentWon: [],
  };

  if (!profile?.organization_id) return empty;

  const orgId = profile.organization_id;

  const [leadsRes, tasksRes, activitiesRes, profiles] = await Promise.all([
    supabase
      .from("leads")
      .select("id, title, company, value, stage, assigned_to, created_at, updated_at")
      .eq("organization_id", orgId),
    supabase
      .from("tasks")
      .select("id, status, assigned_to, created_at, updated_at")
      .eq("organization_id", orgId),
    supabase
      .from("activities")
      .select("id, created_at")
      .eq("organization_id", orgId),
    getOrgProfiles(),
  ]);

  const leads = leadsRes.data ?? [];
  const tasks = tasksRes.data ?? [];
  const activities = activitiesRes.data ?? [];

  const buckets = buildBuckets(period);
  const trendMap = new Map(buckets.map((b) => [b.key, { value: 0, count: 0 }]));
  const activityMap = new Map(buckets.map((b) => [b.key, 0]));

  for (const lead of leads) {
    if (!inPeriodRange(lead.created_at, period)) continue;
    const key = bucketKey(new Date(lead.created_at), period);
    const bucket = trendMap.get(key);
    if (bucket) {
      bucket.value += Number(lead.value ?? 0);
      bucket.count += 1;
    }
  }

  for (const act of activities) {
    if (!inPeriodRange(act.created_at, period)) continue;
    const key = bucketKey(new Date(act.created_at), period);
    if (activityMap.has(key)) {
      activityMap.set(key, (activityMap.get(key) ?? 0) + 1);
    }
  }

  const stageMap = new Map<LeadStage, { count: number; value: number }>();
  for (const lead of leads) {
    const stage = lead.stage as LeadStage;
    const cur = stageMap.get(stage) ?? { count: 0, value: 0 };
    cur.count += 1;
    cur.value += Number(lead.value ?? 0);
    stageMap.set(stage, cur);
  }

  const taskStatusMap = new Map<TaskStatus, number>();
  for (const task of tasks) {
    const s = task.status as TaskStatus;
    taskStatusMap.set(s, (taskStatusMap.get(s) ?? 0) + 1);
  }

  const wonLeads = leads.filter((l) => l.stage === "won");
  const lostLeads = leads.filter((l) => l.stage === "lost");
  const closed = wonLeads.length + lostLeads.length;
  const pipelineValue = leads
    .filter((l) => l.stage !== "won" && l.stage !== "lost")
    .reduce((s, l) => s + Number(l.value ?? 0), 0);
  const wonValue = wonLeads.reduce((s, l) => s + Number(l.value ?? 0), 0);
  const tasksCompleted = tasks.filter((t) => t.status === "done").length;
  const openTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  ).length;

  const profileMap = new Map(
    profiles.map((p) => [
      p.id,
      p.full_name ?? p.email ?? "User",
    ])
  );

  const teamMap = new Map<
    string,
    { leads: number; pipelineValue: number; tasksDone: number }
  >();

  for (const lead of leads) {
    if (!lead.assigned_to) continue;
    const cur = teamMap.get(lead.assigned_to) ?? {
      leads: 0,
      pipelineValue: 0,
      tasksDone: 0,
    };
    cur.leads += 1;
    if (lead.stage !== "won" && lead.stage !== "lost") {
      cur.pipelineValue += Number(lead.value ?? 0);
    }
    teamMap.set(lead.assigned_to, cur);
  }

  for (const task of tasks) {
    if (!task.assigned_to || task.status !== "done") continue;
    const cur = teamMap.get(task.assigned_to) ?? {
      leads: 0,
      pipelineValue: 0,
      tasksDone: 0,
    };
    cur.tasksDone += 1;
    teamMap.set(task.assigned_to, cur);
  }

  const teamPerformance: TeamPerformanceRow[] = [...teamMap.entries()]
    .map(([profileId, stats]) => {
      const name = profileMap.get(profileId) ?? "User";
      return {
        profileId,
        name,
        initials: initialsFromName(name),
        ...stats,
      };
    })
    .sort((a, b) => b.pipelineValue - a.pipelineValue)
    .slice(0, 8);

  const recentWon = wonLeads
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
    .slice(0, 6)
    .map((l) => ({
      id: l.id,
      title: l.title,
      company: l.company,
      value: Number(l.value ?? 0),
      date: l.updated_at,
    }));

  return {
    period,
    kpis: {
      pipelineValue,
      wonValue,
      conversionRate: closed > 0 ? Math.round((wonLeads.length / closed) * 100) : 0,
      tasksCompleted,
      totalLeads: leads.length,
      openTasks,
      activityCount: activities.length,
    },
    pipelineTrend: buckets.map((b) => ({
      key: b.key,
      label: b.label,
      value: trendMap.get(b.key)?.value ?? 0,
      count: trendMap.get(b.key)?.count ?? 0,
    })),
    leadsByStage: Array.from(stageMap.entries()).map(([stage, data]) => ({
      stage,
      ...data,
    })),
    tasksByStatus: Array.from(taskStatusMap.entries()).map(([status, count]) => ({
      status,
      count,
    })),
    activitiesTrend: buckets.map((b) => ({
      key: b.key,
      label: b.label,
      value: activityMap.get(b.key) ?? 0,
      count: activityMap.get(b.key) ?? 0,
    })),
    teamPerformance,
    recentWon,
  };
}
