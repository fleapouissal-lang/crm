import type { FusionDictionary } from "@/lib/i18n/dictionaries/fusion/en";

export type ClientStatusKey = keyof FusionDictionary["badges"];

export type ClientMarketTab = "all" | "gulf" | "morocco";

export interface ClientRecord {
  id: string;
  initials: string;
  gradient: string;
  name: string;
  subtitle: string;
  contact: string;
  marketCode: string;
  location: string;
  engagement: string;
  valueAmount: number | null;
  valueCurrency: string;
  statusKey: ClientStatusKey;
}

export const CLIENT_STATUS_OPTIONS: ClientStatusKey[] = [
  "active",
  "partner",
  "pending",
  "bidStage",
  "pilot",
  "prospect",
  "live",
  "onTrack",
];

export const STATUS_BADGE_CLASS: Partial<Record<ClientStatusKey, string>> = {
  active: "b-green",
  partner: "b-blue",
  pending: "b-gold",
  bidStage: "b-amber",
  pilot: "b-blue",
  prospect: "b-gray",
  live: "b-blue",
  onTrack: "b-green",
  review: "b-gold",
  delivered: "b-blue",
};

const GRADIENTS = [
  "linear-gradient(135deg,#52525b,#71717a)",
  "linear-gradient(135deg,#3ecf8e,#2fa876)",
  "linear-gradient(135deg,#e6b567,#d99a4e)",
  "linear-gradient(135deg,#71717a,#3f3f46)",
  "linear-gradient(135deg,#f2557a,#d63e63)",
  "linear-gradient(135deg,#52525b,#4169d6)",
  "linear-gradient(135deg,#3ecf8e,#52525b)",
  "linear-gradient(135deg,#8a90a6,#646b81)",
];

export function clientRegion(marketCode: string): "gulf" | "morocco" {
  return marketCode === "MA" ? "morocco" : "gulf";
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function gradientForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % GRADIENTS.length;
  return GRADIENTS[hash]!;
}

export function formatClientValue(client: ClientRecord): string {
  if (client.valueAmount == null) return "—";
  return `${client.valueCurrency} ${client.valueAmount.toLocaleString("en-US")}`;
}

export function matchesMarketTab(client: ClientRecord, tab: ClientMarketTab): boolean {
  if (tab === "all") return true;
  return clientRegion(client.marketCode) === tab;
}
