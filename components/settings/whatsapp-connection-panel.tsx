"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2, MessageCircle, QrCode, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import {
  disconnectWhatsAppBridge,
  generateWhatsAppQr,
  getWhatsAppBridgeStatus,
  type WhatsAppBridgeStatus,
  type WhatsAppProject,
} from "@/lib/actions/whatsapp-bridge";
import type { Locale } from "@/lib/i18n/types";

const copy = {
  ar: {
    title: "ربط واتساب",
    subtitle: "اربط رقم العمل بمحرك EasyTouch الآمن داخل خادم Fusion Leap.",
    connected: "متصل",
    disconnected: "غير متصل",
    generate: "إظهار رمز QR",
    refresh: "تحديث الرمز",
    disconnect: "فصل الرقم",
    scan: "افتح واتساب ← الأجهزة المرتبطة ← ربط جهاز، ثم امسح الرمز.",
    waiting: "بانتظار مسح الرمز…",
    connectedToast: "تم ربط واتساب بنجاح",
    disconnectedToast: "تم فصل واتساب وحذف الجلسة",
  },
  fr: {
    title: "Connexion WhatsApp",
    subtitle: "Connectez le numéro professionnel au moteur EasyTouch hébergé par Fusion Leap.",
    connected: "Connecté",
    disconnected: "Non connecté",
    generate: "Afficher le QR",
    refresh: "Actualiser le QR",
    disconnect: "Déconnecter",
    scan: "WhatsApp → Appareils connectés → Connecter un appareil, puis scannez le code.",
    waiting: "En attente du scan…",
    connectedToast: "WhatsApp est connecté",
    disconnectedToast: "WhatsApp a été déconnecté et la session supprimée",
  },
  en: {
    title: "WhatsApp connection",
    subtitle: "Connect the business number to the EasyTouch engine hosted by Fusion Leap.",
    connected: "Connected",
    disconnected: "Not connected",
    generate: "Show QR code",
    refresh: "Refresh QR",
    disconnect: "Disconnect",
    scan: "Open WhatsApp → Linked devices → Link a device, then scan the code.",
    waiting: "Waiting for scan…",
    connectedToast: "WhatsApp connected successfully",
    disconnectedToast: "WhatsApp disconnected and the session was removed",
  },
} as const;

export function WhatsAppConnectionPanel({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [project, setProject] = useState<WhatsAppProject>("Fusion Leap");
  const [status, setStatus] = useState<WhatsAppBridgeStatus>({ connected: false, status: "loading" });
  const [qr, setQr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refreshStatus = useCallback(async () => {
    try {
      const next = await getWhatsAppBridgeStatus(project);
      setStatus(next);
      if (next.connected) {
        setQr(null);
        toast.success(t.connectedToast);
      }
    } catch {
      setStatus({ connected: false, status: "unavailable" });
    }
  }, [project, t.connectedToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshStatus(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshStatus]);

  useEffect(() => {
    if (!qr || status.connected) return;
    const timer = window.setInterval(() => void refreshStatus(), 3000);
    return () => window.clearInterval(timer);
  }, [qr, status.connected, refreshStatus]);

  function showQr() {
    startTransition(async () => {
      const result = await generateWhatsAppQr(project);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.alreadyConnected) {
        await refreshStatus();
        return;
      }
      setQr(result.qr || null);
      setStatus((current) => ({ ...current, connected: false, status: "waiting_qr" }));
    });
  }

  function disconnect() {
    startTransition(async () => {
      const result = await disconnectWhatsAppBridge(project);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setQr(null);
      setStatus({ connected: false, status: "not_found" });
      toast.success(t.disconnectedToast);
    });
  }

  return (
    <div className="grid gap-[18px] lg:grid-cols-[1fr_360px]">
      <section className="fl-card fl-pad">
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold">{t.title}</h3>
            <p className="mt-1 text-sm fl-faint">{t.subtitle}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--border)] p-4">
          <div className="flex items-center gap-3">
            {status.connected ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : (
              <span className="size-3 rounded-full bg-slate-400" />
            )}
            <div>
              <div className="font-medium">{status.connected ? t.connected : t.disconnected}</div>
              {status.phone ? <div className="mt-0.5 text-xs fl-faint">+{status.phone}</div> : null}
            </div>
          </div>
          {status.connected ? (
            <button type="button" className="fl-btn sm" disabled={pending} onClick={disconnect}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Unplug className="size-4" />}
              {t.disconnect}
            </button>
          ) : (
            <button type="button" className="fl-btn primary" disabled={pending} onClick={showQr}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : qr ? <RefreshCw className="size-4" /> : <QrCode className="size-4" />}
              {qr ? t.refresh : t.generate}
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="WhatsApp project">
          {(["Fusion Leap", "Autolog"] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={project === name}
              className={`fl-btn sm ${project === name ? "primary" : ""}`}
              onClick={() => {
                setProject(name);
                setQr(null);
              }}
            >
              <MessageCircle className="size-4" />
              WhatsApp · {name}
            </button>
          ))}
        </div>
      </section>

      <section className="fl-card fl-pad grid min-h-72 place-items-center text-center">
        {qr ? (
          <div>
            <Image
              src={`data:image/png;base64,${qr}`}
              alt="WhatsApp QR code"
              width={256}
              height={256}
              unoptimized
              className="mx-auto size-64 rounded-xl bg-white p-2"
            />
            <p className="mt-3 text-sm font-medium">{t.waiting}</p>
            <p className="mt-1 text-xs fl-faint">{t.scan}</p>
          </div>
        ) : status.connected ? (
          <div>
            <CheckCircle2 className="mx-auto size-16 text-emerald-500" />
            <p className="mt-4 font-semibold">{t.connected}</p>
          </div>
        ) : (
          <div>
            <QrCode className="mx-auto size-16 fl-faint" />
            <p className="mt-4 text-sm fl-faint">{t.scan}</p>
          </div>
        )}
      </section>
    </div>
  );
}
