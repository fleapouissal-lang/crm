import {
  DollarSign,
  Percent,
  Target,
  CheckSquare,
} from "lucide-react";
import type { Dictionary, Locale } from "@/lib/i18n/types";
import { getIntlLocale } from "@/lib/i18n/locale-utils";

interface KpiCardsProps {
  dict: Dictionary;
  locale: Locale;
  totalLeads: number;
  pipelineValue: number;
  tasksDueToday: number;
  conversionRate: number;
}

function formatCurrency(value: number, locale: Locale) {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: "USD",
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
}: KpiCardsProps) {
  const items = [
    {
      label: dict.dashboard.pipelineValue,
      value: formatCurrency(pipelineValue, locale).replace("$", ""),
      cur: "USD",
      icon: DollarSign,
      iconColor: "var(--emerald)",
      foot: dict.dashboard.pipelineValueHint,
    },
    {
      label: dict.dashboard.totalLeads,
      value: String(totalLeads),
      cur: undefined,
      icon: Target,
      iconColor: "var(--iris)",
      foot: dict.dashboard.totalLeadsHint,
    },
    {
      label: dict.dashboard.tasksDueToday,
      value: String(tasksDueToday),
      cur: undefined,
      icon: CheckSquare,
      iconColor: "var(--gold)",
      foot: dict.dashboard.tasksDueTodayHint,
    },
    {
      label: dict.dashboard.conversionRate,
      value: String(conversionRate),
      cur: "%",
      icon: Percent,
      iconColor: "var(--sky)",
      foot: dict.dashboard.conversionRateHint,
    },
  ];

  return (
    <div className="grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="fl-card fl-kpi">
          <div className="k-top">
            <div>
              <div className="k-label">{item.label}</div>
              <div className="k-val">
                {item.value}
                {item.cur && <span className="cur">{item.cur}</span>}
              </div>
            </div>
            <div className="k-ico">
              <item.icon style={{ color: item.iconColor }} strokeWidth={2} className="size-[19px]" />
            </div>
          </div>
          <div className="k-foot">{item.foot}</div>
        </div>
      ))}
    </div>
  );
}
