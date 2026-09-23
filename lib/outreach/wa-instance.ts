/**
 * WhatsApp EasyTouch instance mapping by commercial project.
 * Evana shares Fusion Leap's number / session.
 */

export function fusionLeapInstanceId(): string {
  return (
    process.env.WA_BRIDGE_INSTANCE_ID_FUSION_LEAP ||
    process.env.WA_BRIDGE_INSTANCE_ID ||
    "fusionleap_crm"
  );
}

export function autologInstanceId(): string {
  return process.env.WA_BRIDGE_INSTANCE_ID_AUTOLOG || "autolog_crm";
}

/** Instance used when sending WhatsApp for a lead's sales_project. */
export function whatsappInstanceIdForProject(
  salesProject: string | null | undefined
): string {
  if (salesProject === "Autolog") return autologInstanceId();
  // Fusion Leap + Evana (+ unknown) → Fusion Leap session
  return fusionLeapInstanceId();
}

/**
 * Which CRM sales_project values can receive inbound on this bridge instance.
 * Fusion instance covers both Fusion Leap and Evana.
 */
export function salesProjectsForWhatsAppInstance(
  instanceId: string
): string[] | null {
  if (!instanceId) return null;
  if (instanceId === autologInstanceId()) return ["Autolog"];
  if (instanceId === fusionLeapInstanceId()) return ["Fusion Leap", "Evana"];
  return null;
}
