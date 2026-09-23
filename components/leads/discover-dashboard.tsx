"use client";

import { useMemo } from "react";
import { Sparkline, StatLine } from "@/components/fusion/primitives";
import type { Lead } from "@/types/database";
import { cn } from "@/lib/utils";

const REPLY_STATUSES = new Set([
  "reply_received",
  "qualified",
  "discussion",
  "meeting_proposed",
  "meeting_confirmed",
  "proposal_sent",
  "won",
]);

const CONTACTED_STATUSES = new Set([
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
]);

function casaDayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function statusOf(lead: Lead): string {
  return String(lead.sales_status || lead.stage || "new");
}

function hasPhone(lead: Lead): boolean {
  const digits = String(lead.phone_normalized || lead.phone || "").replace(
    /\D/g,
    ""
  );
  return digits.length >= 9;
}

export type DiscoverStats = {
  today: number;
  last7: number;
  total: number;
  withPhone: number;
  withPhonePct: number;
  contacted: number;
  replied: number;
  replyRate: number;
  avgScore: number | null;
  junkish: number;
  series7: number[];
  dayLabels: string[];
  byProject: Array<{
    project: string;
    total: number;
    today: number;
    withPhone: number;
    replied: number;
  }>;
  byCanal: { web: number; instagram: number; maps: number; other: number };
};

export function computeDiscoverStats(leads: Lead[]): DiscoverStats {
  const discovered = leads.filter((l) => l.source === "auto_discover");
  const todayKey = casaDayKey(new Date());
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayKeys.push(casaDayKey(d));
  }

  const series7 = dayKeys.map(
    (key) => discovered.filter((l) => casaDayKey(l.created_at) === key).length
  );
  const dayLabels = dayKeys.map((key) => {
    const [, m, d] = key.split("-");
    return `${d}/${m}`;
  });

  const today = discovered.filter((l) => casaDayKey(l.created_at) === todayKey)
    .length;
  const last7 = series7.reduce((a, b) => a + b, 0);
  const withPhone = discovered.filter(hasPhone).length;
  const contacted = discovered.filter((l) =>
    CONTACTED_STATUSES.has(statusOf(l))
  ).length;
  const replied = discovered.filter((l) =>
    REPLY_STATUSES.has(statusOf(l))
  ).length;
  const scored = discovered.filter(
    (l) => l.ai_score != null && Number.isFinite(l.ai_score)
  );
  const avgScore =
    scored.length === 0
      ? null
      : Math.round(
          scored.reduce((s, l) => s + Number(l.ai_score), 0) / scored.length
        );
  const junkish = discovered.filter(
    (l) => l.ai_score == null || Number(l.ai_score) <= 35
  ).length;

  const projects = Array.from(
    new Set(discovered.map((l) => l.sales_project).filter(Boolean))
  ).sort();
  const byProject = projects.map((project) => {
    const rows = discovered.filter((l) => l.sales_project === project);
    return {
      project,
      total: rows.length,
      today: rows.filter((l) => casaDayKey(l.created_at) === todayKey).length,
      withPhone: rows.filter(hasPhone).length,
      replied: rows.filter((l) => REPLY_STATUSES.has(statusOf(l))).length,
    };
  });

  const byCanal = { web: 0, instagram: 0, maps: 0, other: 0 };
  for (const l of discovered) {
    const c = l.memory_facts?.canal;
    if (c === "web" || c === "instagram" || c === "maps") byCanal[c] += 1;
    else byCanal.other += 1;
  }

  return {
    today,
    last7,
    total: discovered.length,
    withPhone,
    withPhonePct:
      discovered.length === 0
        ? 0
        : Math.round((withPhone / discovered.length) * 100),
    contacted,
    replied,
    replyRate:
      contacted === 0 ? 0 : Math.round((replied / contacted) * 100),
    avgScore,
    junkish,
    series7,
    dayLabels,
    byProject,
    byCanal,
  };
}

export function DiscoverDashboard({
  leads,
  showByProject = false,
}: {
  leads: Lead[];
  showByProject?: boolean;
}) {
  const stats = useMemo(() => computeDiscoverStats(leads), [leads]);

  const kpis = [
    {
      label: "Découverts aujourd’hui",
      value: String(stats.today),
      foot: `${stats.last7} sur 7 jours`,
    },
    {
      label: "Avec téléphone",
      value: String(stats.withPhone),
      foot: stats.total ? `${stats.withPhonePct}% des découverts` : "—",
    },
    {
      label: "Ont répondu",
      value: String(stats.replied),
      foot:
        stats.contacted > 0
          ? `${stats.replyRate}% des contactés (${stats.contacted})`
          : "Pas encore contactés",
    },
    {
      label: "Score moyen",
      value: stats.avgScore != null ? String(stats.avgScore) : "—",
      foot:
        stats.junkish > 0
          ? `${stats.junkish} junk potentiels (≤35)`
          : `${stats.total} leads auto`,
      unit: stats.avgScore != null ? "/100" : undefined,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide fl-faint">
            Découverte auto
          </p>
          <p className="text-[11px] fl-faint">
            Créés / téléphone / réponses · sources web + Instagram + Maps
            (Casablanca)
          </p>
        </div>
        {stats.total > 0 ? (
          <div className="min-w-[140px] max-w-[220px] flex-1">
            <Sparkline data={stats.series7} color="var(--iris)" />
            <div className="mt-0.5 flex justify-between text-[9px] fl-faint">
              <span>{stats.dayLabels[0]}</span>
              <span>{stats.dayLabels[stats.dayLabels.length - 1]}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid g-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="fl-card fl-pad !mb-0">
            <div className="k-label">{k.label}</div>
            <StatLine value={k.value} unit={k.unit} />
            <div className="k-foot mt-2 text-[11px] fl-faint">{k.foot}</div>
          </div>
        ))}
      </div>

      {stats.total > 0 ? (
        <p className="text-[11px] fl-faint">
          Sources: web {stats.byCanal.web} · Instagram {stats.byCanal.instagram}{" "}
          · Maps {stats.byCanal.maps}
          {stats.byCanal.other > 0 ? ` · autres ${stats.byCanal.other}` : ""}
        </p>
      ) : null}

      {showByProject && stats.byProject.length > 1 ? (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
          <table className="fl-tbl text-sm">
            <thead>
              <tr>
                <th>Projet</th>
                <th>Total</th>
                <th>Aujourd’hui</th>
                <th>Tél</th>
                <th>Réponses</th>
              </tr>
            </thead>
            <tbody>
              {stats.byProject.map((row) => (
                <tr key={row.project}>
                  <td>
                    <span className="fl-badge b-blue text-[10px]">
                      {row.project}
                    </span>
                  </td>
                  <td className="fl-mono">{row.total}</td>
                  <td className="fl-mono">{row.today}</td>
                  <td className="fl-mono">{row.withPhone}</td>
                  <td className="fl-mono">{row.replied}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {stats.total === 0 ? (
        <p className={cn("text-xs fl-faint")}>
          Aucun lead `auto_discover` pour ce filtre — lance{" "}
          <strong>Découvrir</strong> ou active le cron.
        </p>
      ) : null}
    </div>
  );
}
