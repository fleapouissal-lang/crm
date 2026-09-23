"use client";

import { useEffect, useState, useTransition } from "react";
import { Bot, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getSalesAgentSettings,
  updateSalesAgentSettings,
  runProspectDiscoveryNow,
} from "@/lib/actions/sales-agent";
import type { SalesAgentSettings } from "@/types/database";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { discoverProfileForProject } from "@/lib/ai/sales-agent/constants";

function FlToggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-[25px] w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-[var(--iris)]" : "bg-[var(--track)]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] size-[21px] rounded-full bg-white transition-transform",
          checked && "translate-x-[19px]"
        )}
      />
    </button>
  );
}

const PROJECTS = ["Fusion Leap", "Autolog", "Evana"] as const;

export function SalesAgentSettingsPanel({
  members = [],
}: {
  members?: Array<{ id: string; full_name: string | null }>;
}) {
  const [project, setProject] = useState<(typeof PROJECTS)[number]>("Fusion Leap");
  const [settings, setSettings] = useState<SalesAgentSettings | null>(null);
  const [offer, setOffer] = useState("");
  const [pending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getSalesAgentSettings(project).then((data) => {
      if (cancelled) return;
      if (!data) {
        setSettings(null);
        setLoading(false);
        return;
      }
      const defaults = discoverProfileForProject(project);
      setSettings({
        ...data,
        discover_cities: data.discover_cities?.length
          ? data.discover_cities
          : defaults.cities,
        discover_sectors: data.discover_sectors?.length
          ? data.discover_sectors
          : defaults.sectors,
      });
      const playbook = (data?.project_playbook || {}) as { offer?: string };
      setOffer(playbook.offer || "");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [project]);

  function patch<K extends keyof SalesAgentSettings>(key: K, value: SalesAgentSettings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function save() {
    if (!settings) return;
    const profileDefaults = discoverProfileForProject(project);
    startTransition(async () => {
      const result = await updateSalesAgentSettings({
        sales_project: project,
        enabled: settings.enabled,
        auto_first_touch: settings.auto_first_touch,
        auto_reply: settings.auto_reply,
        require_human_approval: settings.require_human_approval,
        max_msgs_per_lead_day: settings.max_msgs_per_lead_day,
        max_msgs_per_org_hour: settings.max_msgs_per_org_hour,
        require_opt_in_mode: settings.require_opt_in_mode,
        handoff_assignee_id: settings.handoff_assignee_id,
        relance_delays_hours: settings.relance_delays_hours?.length
          ? settings.relance_delays_hours
          : [8, 16, 24],
        match_prospect_language: settings.match_prospect_language ?? true,
        reply_delay_min_sec: settings.reply_delay_min_sec ?? 45,
        reply_delay_max_sec: settings.reply_delay_max_sec ?? 180,
        first_touch_stagger_min_sec: settings.first_touch_stagger_min_sec ?? 90,
        first_touch_stagger_max_sec: settings.first_touch_stagger_max_sec ?? 420,
        daily_first_touch_limit: settings.daily_first_touch_limit ?? 30,
        auto_discover: settings.auto_discover ?? false,
        daily_discover_limit: settings.daily_discover_limit ?? 20,
        discover_cities: settings.discover_cities?.length
          ? settings.discover_cities
          : profileDefaults.cities,
        discover_sectors: settings.discover_sectors?.length
          ? settings.discover_sectors
          : profileDefaults.sectors,
        send_window_start_hour: settings.send_window_start_hour ?? 9,
        send_window_end_hour: settings.send_window_end_hour ?? 21,
        project_playbook: {
          ...(settings.project_playbook || {}),
          offer,
        },
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setSettings(result.data);
      toast.success("AI Sales Agent settings saved");
    });
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm fl-faint">
        <Loader2 className="size-4 animate-spin" /> Loading agent settings…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-[#111114] text-white">
          <Bot className="size-5" />
        </span>
        <div>
          <h3 className="font-medium">AI Sales Agent</h3>
          <p className="text-sm fl-faint">
            Full-auto WhatsApp outreach with kill-switch and per-project playbook.
          </p>
        </div>
      </div>

      <div className="fl-seg">
        {PROJECTS.map((p) => (
          <button
            key={p}
            type="button"
            className={cn(project === p && "on")}
            onClick={() => setProject(p)}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["enabled", "Agent enabled (kill-switch)"],
            ["auto_first_touch", "Auto first WhatsApp (quotidien via cron, pas blast instantané)"],
            ["auto_discover", "Découvrir des prospects (web + Instagram + Maps → leads)"],
            ["auto_reply", "Auto reply to inbound messages"],
            ["match_prospect_language", "Reply in prospect language (AR/Darija/FR/ES/EN)"],
            ["require_human_approval", "Require human approval (overrides full auto)"],
            ["require_opt_in_mode", "Require explicit opt-in before send"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm">
            <span>{label}</span>
            <FlToggle
              checked={Boolean(settings[key] ?? (key === "match_prospect_language" ? true : false))}
              onChange={(v) => patch(key, v as never)}
            />
          </label>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="fl-faint">Reply delay min (sec)</span>
          <Input
            type="number"
            min={0}
            max={900}
            value={settings.reply_delay_min_sec ?? 45}
            onChange={(e) => patch("reply_delay_min_sec", Number(e.target.value) || 0)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="fl-faint">Reply delay max (sec)</span>
          <Input
            type="number"
            min={0}
            max={1800}
            value={settings.reply_delay_max_sec ?? 180}
            onChange={(e) => patch("reply_delay_max_sec", Number(e.target.value) || 0)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="fl-faint">First-touch stagger min (sec)</span>
          <Input
            type="number"
            min={0}
            max={3600}
            value={settings.first_touch_stagger_min_sec ?? 90}
            onChange={(e) => patch("first_touch_stagger_min_sec", Number(e.target.value) || 0)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="fl-faint">First-touch stagger max (sec)</span>
          <Input
            type="number"
            min={0}
            max={7200}
            value={settings.first_touch_stagger_max_sec ?? 420}
            onChange={(e) => patch("first_touch_stagger_max_sec", Number(e.target.value) || 0)}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="fl-faint">
            Villes à prospecter pour {project} (virgule)
          </span>
          <Input
            value={(settings.discover_cities || []).join(", ")}
            onChange={(e) =>
              patch(
                "discover_cities",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder={discoverProfileForProject(project).cities.join(", ")}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="fl-faint">
            Secteurs cibles pour {project} (virgule)
          </span>
          <Input
            value={(settings.discover_sectors || []).join(", ")}
            onChange={(e) =>
              patch(
                "discover_sectors",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder={discoverProfileForProject(project).sectors.join(", ")}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="fl-faint">Découverte auto / jour (max leads)</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={settings.daily_discover_limit ?? 20}
            onChange={(e) => patch("daily_discover_limit", Number(e.target.value) || 0)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="fl-faint">First-touch auto / jour (max contacts)</span>
          <Input
            type="number"
            min={0}
            max={200}
            value={settings.daily_first_touch_limit ?? 30}
            onChange={(e) => patch("daily_first_touch_limit", Number(e.target.value) || 0)}
          />
          <span className="text-[10px] fl-faint">
            Cron: jusqu’à N leads « new » avec téléphone, étalés dans la fenêtre d’envoi.
          </span>
        </label>
        <label className="space-y-1 text-sm">
          <span className="fl-faint">Send window start (Casablanca hour)</span>
          <Input
            type="number"
            min={0}
            max={23}
            value={settings.send_window_start_hour ?? 9}
            onChange={(e) => patch("send_window_start_hour", Number(e.target.value) || 0)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="fl-faint">Send window end (Casablanca hour)</span>
          <Input
            type="number"
            min={0}
            max={23}
            value={settings.send_window_end_hour ?? 21}
            onChange={(e) => patch("send_window_end_hour", Number(e.target.value) || 0)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="fl-faint">Max messages / lead / day</span>
          <Input
            type="number"
            min={1}
            max={50}
            value={settings.max_msgs_per_lead_day}
            onChange={(e) => patch("max_msgs_per_lead_day", Number(e.target.value) || 1)}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="fl-faint">Max messages / org / hour</span>
          <Input
            type="number"
            min={1}
            max={500}
            value={settings.max_msgs_per_org_hour}
            onChange={(e) => patch("max_msgs_per_org_hour", Number(e.target.value) || 1)}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="fl-faint">Relance delays (hours, comma-separated)</span>
          <Input
            value={(settings.relance_delays_hours || [8, 16, 24]).join(", ")}
            onChange={(e) =>
              patch(
                "relance_delays_hours",
                e.target.value
                  .split(",")
                  .map((x) => Number(x.trim()))
                  .filter((n) => Number.isFinite(n) && n > 0)
              )
            }
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="fl-faint">Handoff assignee</span>
          <select
            className="fl-select-trigger w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={settings.handoff_assignee_id || ""}
            onChange={(e) => patch("handoff_assignee_id", e.target.value || null)}
          >
            <option value="">— Unassigned —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.id}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="fl-faint">Project offer / playbook</span>
          <textarea
            className="min-h-24 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={offer}
            onChange={(e) => setOffer(e.target.value)}
            placeholder="Describe the offer, tone and constraints for this project…"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="fl-btn sm ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await runProspectDiscoveryNow(project);
              if (!result.success) toast.error(result.error);
              else
                toast.success(
                  `Découverte ${project}: ${result.data.created} créés, ${result.data.enriched} enrichis`
                );
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Bot className="size-4" />}
          Lancer découverte maintenant
        </button>
        <button type="button" className="fl-btn primary sm" disabled={pending} onClick={save}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save agent settings
        </button>
      </div>
    </div>
  );
}
