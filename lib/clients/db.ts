import type { ClientRecord } from "@/lib/clients/types";

export type ClientRow = {
  id: string;
  organization_id: string;
  initials: string;
  gradient: string;
  name: string;
  subtitle: string;
  contact: string;
  market_code: string;
  location: string;
  engagement: string;
  value_amount: number | string | null;
  value_currency: string;
  status_key: string;
  created_at?: string;
  updated_at?: string;
};

export function rowToClient(row: ClientRow): ClientRecord {
  return {
    id: row.id,
    initials: row.initials ?? "",
    gradient: row.gradient ?? "",
    name: row.name,
    subtitle: row.subtitle ?? "",
    contact: row.contact ?? "",
    marketCode: row.market_code ?? "MA",
    location: row.location ?? "",
    engagement: row.engagement ?? "",
    valueAmount:
      row.value_amount == null || row.value_amount === ""
        ? null
        : Number(row.value_amount),
    valueCurrency: row.value_currency ?? "MAD",
    statusKey: row.status_key as ClientRecord["statusKey"],
  };
}

export function clientToRow(
  client: ClientRecord,
  organizationId: string
): Omit<ClientRow, "created_at" | "updated_at"> {
  return {
    id: client.id,
    organization_id: organizationId,
    initials: client.initials,
    gradient: client.gradient,
    name: client.name,
    subtitle: client.subtitle,
    contact: client.contact,
    market_code: client.marketCode,
    location: client.location,
    engagement: client.engagement,
    value_amount: client.valueAmount,
    value_currency: client.valueCurrency,
    status_key: client.statusKey,
  };
}
