"use server";

import { getCurrentProfile } from "@/lib/actions/auth";
import { isLeadership } from "@/lib/permissions";

export type WhatsAppBridgeStatus = {
  connected: boolean;
  status: string;
  phone?: string | null;
};

export type WhatsAppProject = "Fusion Leap" | "Autolog";

type QrResult =
  | { success: true; qr?: string; alreadyConnected?: boolean }
  | { success: false; error: string };

function bridgeConfig(project: WhatsAppProject = "Fusion Leap") {
  const url = process.env.WA_BRIDGE_URL?.replace(/\/$/, "");
  const secret = process.env.WA_BRIDGE_SECRET;
  const instanceId = project === "Autolog"
    ? process.env.WA_BRIDGE_INSTANCE_ID_AUTOLOG || "autolog_crm"
    : process.env.WA_BRIDGE_INSTANCE_ID_FUSION_LEAP || process.env.WA_BRIDGE_INSTANCE_ID || "fusionleap_crm";
  if (!url || !secret) throw new Error("WhatsApp bridge is not configured");
  return { url, secret, instanceId };
}

async function requireLeadership() {
  const profile = await getCurrentProfile();
  if (!profile?.organization_id || !isLeadership(profile)) {
    throw new Error("Only leadership can manage WhatsApp");
  }
}

async function bridgeFetch(path: string, init?: RequestInit) {
  const { url, secret } = bridgeConfig();
  return fetch(`${url}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      apikey: secret,
      ...init?.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
}

export async function getWhatsAppBridgeStatus(project: WhatsAppProject = "Fusion Leap"): Promise<WhatsAppBridgeStatus> {
  await requireLeadership();
  const { instanceId } = bridgeConfig(project);
  const response = await bridgeFetch(`/instance/${encodeURIComponent(instanceId)}/status`);
  if (!response.ok) return { connected: false, status: "unavailable" };
  const payload = (await response.json()) as WhatsAppBridgeStatus;
  return {
    connected: payload.connected === true,
    status: payload.status || "unknown",
    phone: payload.phone || null,
  };
}

export async function generateWhatsAppQr(project: WhatsAppProject = "Fusion Leap"): Promise<QrResult> {
  try {
    await requireLeadership();
    const { instanceId } = bridgeConfig(project);
    const encodedId = encodeURIComponent(instanceId);
    const connectResponse = await bridgeFetch(`/instance/${encodedId}/connect`, {
      method: "POST",
      body: "{}",
    });
    if (!connectResponse.ok) {
      const error = (await connectResponse.json().catch(() => null)) as { error?: string } | null;
      return { success: false, error: error?.error || "Unable to start WhatsApp connection" };
    }

    const qrResponse = await bridgeFetch(`/instance/${encodedId}/qr`);
    const payload = (await qrResponse.json().catch(() => null)) as
      | { qr?: string | null; status?: string; error?: string }
      | null;
    if (!qrResponse.ok) return { success: false, error: payload?.error || "Unable to generate QR" };
    if (payload?.status === "already_connected") {
      return { success: true, alreadyConnected: true };
    }
    if (!payload?.qr) return { success: false, error: "QR is not ready. Please try again." };
    return { success: true, qr: payload.qr };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Connection failed" };
  }
}

export async function disconnectWhatsAppBridge(project: WhatsAppProject = "Fusion Leap"): Promise<{ success: boolean; error?: string }> {
  try {
    await requireLeadership();
    const { instanceId } = bridgeConfig(project);
    const response = await bridgeFetch(`/instance/${encodeURIComponent(instanceId)}/disconnect`, {
      method: "POST",
      body: "{}",
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      return { success: false, error: payload?.error || "Unable to disconnect WhatsApp" };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Disconnect failed" };
  }
}
