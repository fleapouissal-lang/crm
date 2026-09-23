"use client";

import { useEffect, useState, useTransition } from "react";
import { Bot, Check, ChevronLeft, ChevronRight, Mail, MessageCircle, Send, X } from "lucide-react";
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
  project,
  embedded = false,
}: {
  initialMessages: OutreachMessage[];
  role: Role;
  project: string;
  embedded?: boolean;
}) {
  const dict = useDict();
  const labels = dict.leads;
  const [messages, setMessages] = useState(initialMessages);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [, startTransition] = useTransition();
  const leadership = role === "admin" || role === "manager";
  const pageSize = 8;
  const filtered = messages.filter(
    (message) =>
      message.status !== "cancelled" &&
      (project === "all" || message.lead?.sales_project === project)
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const visible = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    const timer = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [project]);

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
    <section className={cn(!embedded && "fl-card overflow-hidden")}>
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
          {visible.map((message, index) => {
            const pending = activeId === message.id;
            const parts = message.message_parts?.length ? message.message_parts : [message.body];
            return (
              <article key={message.id} className="grid gap-3 p-4 lg:grid-cols-[minmax(12rem,0.8fr)_minmax(20rem,2fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="fl-mono text-[11px] fl-faint">#{pageStart + index + 1}</span>
                    {message.channel === "email" ? <Mail className="size-4" /> : <MessageCircle className="size-4" />}
                    <strong className="truncate text-sm">{message.lead?.company || message.lead?.title || "Lead"}</strong>
                  </div>
                  <span className={cn("fl-badge mt-2 text-[10px]", STATUS_CLASS[message.status])}>{message.status}</span>
                </div>
                <div className="space-y-2">
                  {parts.map((part, partIndex) => (
                    <div key={partIndex} className="rounded-xl bg-[var(--surface-soft)] px-3 py-2.5 text-sm leading-6 text-[var(--text-muted)]">
                      {parts.length > 1 ? (
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide fl-faint">
                          Message {partIndex + 1}/{parts.length}
                        </span>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">{part}</p>
                    </div>
                  ))}
                </div>
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
          {pageCount > 1 ? (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-xs fl-faint">
                {pageStart + 1}–{Math.min(pageStart + pageSize, filtered.length)} / {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="fl-btn sm"
                  disabled={safePage === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="min-w-16 text-center text-xs font-medium">{safePage} / {pageCount}</span>
                <button
                  type="button"
                  className="fl-btn sm"
                  disabled={safePage === pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
