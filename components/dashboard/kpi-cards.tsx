import Link from "next/link";
import {
  DollarSign,
  Percent,
  Target,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { getIntlLocale } from "@/lib/i18n/locale-utils";
import { cn } from "@/lib/utils";

interface KpiCardsProps {
  dict: Dictionary;
  locale: Locale;
  totalLeads: number;
  pipelineValue: number;
  tasksDueToday: number;
  conversionRate: number;
  overdueTasks?: number;
}

function formatMoney(value: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function KpiCards({
  dict,
  locale,
  totalLeads,
  pipelineValue,
  tasksDueToday,
  conversionRate,
  overdueTasks = 0,
}: KpiCardsProps) {
  const items: {
    label: string;
    value: string;
    cur?: string;
    icon: LucideIcon;
    iconColor: string;
    foot: string;
    href: string;
    accent?: boolean;
  }[] = [
    {
      label: dict.dashboard.pipelineValue,
      value: formatMoney(pipelineValue, locale).replace(/\s?MAD$/, ""),
      cur: "MAD",
      icon: DollarSign,
      iconColor: "var(--emerald)",
      foot: dict.dashboard.pipelineValueHint,
      href: "/crm",
    },
    {
      label: dict.dashboard.totalLeads,
      value: String(totalLeads),
      icon: Target,
      iconColor: "var(--iris)",
      foot: dict.dashboard.totalLeadsHint,
      href: "/crm",
    },
    {
      label: dict.dashboard.tasksDueToday,
      value: String(tasksDueToday),
      icon: CheckSquare,
      iconColor: overdueTasks > 0 ? "var(--rose)" : "var(--gold)",
      foot:
        overdueTasks > 0
          ? (dict.dashboard.overdueTasksHint ?? dict.dashboard.tasksDueTodayHint)
          : dict.dashboard.tasksDueTodayHint,
      href: "/tasks",
      accent: overdueTasks > 0,
    },
    {
      label: dict.dashboard.conversionRate,
      value: String(conversionRate),
      cur: "%",
      icon: Percent,
      iconColor: "var(--sky)",
      foot: dict.dashboard.conversionRateHint,
      href: "/reports",
    },
  ];

  return (
    <div className="dash-kpi-grid">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn(
            "fl-card fl-kpi dash-kpi-card",
            item.accent && "dash-kpi-card--warn"
          )}
        >
          <div className="k-top">
            <div className="min-w-0">
              <div className="k-label">{item.label}</div>
              <div className="k-val">
                {item.value}
                {item.cur ? <span className="cur">{item.cur}</span> : null}
              </div>
            </div>
            <div className="k-ico" style={{ color: item.iconColor }}>
              <item.icon strokeWidth={2} className="size-[19px]" />
            </div>
          </div>
          <div className="k-foot">{item.foot}</div>
        </Link>
      ))}
    </div>
  );
}
