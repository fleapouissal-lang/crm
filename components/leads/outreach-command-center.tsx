"use client";

import { useState, useTransition } from "react";
import { Bot, Check, Mail, MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { OutreachMessage, Role } from "@/types/database";
import {
  approveOutreachMessage,
  cancelOutreachMessage,
  sendOutreachMessage,
} from "@/lib/actions/outreach";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<OutreachMessage["status"], string> = {
  draft: "b-gray",
  approved: "b-gold",
  queued: "b-blue",
  sending: "b-blue",
  sent: "b-green",
  delivered: "b-green",
  replied: "b-iris",
  failed: "b-rose",
  cancelled: "b-gray",
};

export function OutreachCommandCenter({
  initialMessages,
  role,
}: {
  initialMessages: OutreachMessage[];
  role: Role;
}) {
  const dict = useDict();
  const labels = dict.leads;
  const [messages, setMessages] = useState(initialMessages);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const leadership = role === "admin" || role === "manager";
  const visible = messages.filter((message) => message.status !== "cancelled").slice(0, 8);

  function run(
    id: string,
    action: "approve" | "send" | "cancel"
  ) {
    setActiveId(id);
    startTransition(async () => {
      const result =
        action === "approve"
          ? await approveOutreachMessage(id)
          : action === "send"
            ? await sendOutreachMessage(id)
            : await cancelOutreachMessage(id);
      setActiveId(null);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setMessages((current) =>
        current.map((message) =>
          message.id === id
            ? {
                ...message,
                status:
                  action === "approve"
                    ? "approved"
                    : action === "send"
                      ? "sent"
                      : "cancelled",
              }
            : message
        )
      );
      toast.success(
        action === "approve"
          ? labels.outreachApproved
          : action === "send"
            ? labels.outreachSent
            : labels.outreachCancelled
      );
    });
  }

  return (
    <section className="fl-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl text-white" style={{ background: "var(--grad-fusion)" }}>
            <Bot className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">{labels.outreachTitle}</h2>
            <p className="text-sm fl-faint">{labels.outreachSubtitle}</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="fl-badge b-gray">{messages.filter((m) => m.status === "draft").length} draft</span>
          <span className="fl-badge b-green">{messages.filter((m) => ["sent", "delivered", "replied"].includes(m.status)).length} sent</span>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="p-6 text-center text-sm fl-faint">{labels.outreachEmpty}</p>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {visible.map((message) => {
            const pending = activeId === message.id;
            return (
              <article key={message.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(12rem,0.8fr)_minmax(20rem,2fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {message.channel === "email" ? <Mail className="size-4" /> : <MessageCircle className="size-4" />}
                    <strong className="truncate text-sm">{message.lead?.company || message.lead?.title || "Lead"}</strong>
                  </div>
                  <span className={cn("fl-badge mt-2 text-[10px]", STATUS_CLASS[message.status])}>{message.status}</span>
                </div>
                <p className="line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">{message.body}</p>
                <div className="flex flex-wrap justify-end gap-2">
                  {leadership && message.status === "draft" ? (
                    <button className="fl-btn sm" disabled={pending} onClick={() => run(message.id, "approve")}>
                      <Check className="size-3.5" /> {labels.approveMessage}
                    </button>
                  ) : null}
                  {leadership && ["approved", "queued", "failed"].includes(message.status) ? (
                    <button className="fl-btn primary sm" disabled={pending} onClick={() => run(message.id, "send")}>
                      <Send className="size-3.5" /> {labels.sendMessage}
                    </button>
                  ) : null}
                  {(message.status === "draft" || (leadership && ["approved", "queued", "failed"].includes(message.status))) ? (
                    <button className="fl-btn sm" disabled={pending} onClick={() => run(message.id, "cancel")} aria-label={labels.cancelMessage}>
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
