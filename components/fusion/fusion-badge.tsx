"use client";

import { useDict } from "@/components/shared/i18n-provider";
import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";

type BadgeKey = keyof FusionDictionary["badges"];

export function FusionBadge({
  name,
  className,
}: {
  name: BadgeKey;
  className?: string;
}) {
  const dict = useDict();
  return <span className={className}>{dict.fusion.badges[name]}</span>;
}

export function fusionBadge(
  dict: { fusion: FusionDictionary },
  name: BadgeKey
) {
  return dict.fusion.badges[name];
}
