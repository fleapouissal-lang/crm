"use client";

import { useEffect, useState, useTransition } from "react";
import { Bot, Loader2, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  getLeadConversation,
  sendHumanConversationMessage,
  takeOverConversation,
  triggerFirstTouch,
} from "@/lib/actions/sales-agent";
import { createProposalFromLead } from "@/lib/actions/sales-proposals";
import type {
  AiConversation,
  ConversationMessage,
  LeadQualification,
} from "@/types/database";
import { cn } from "@/lib/utils";

export function LeadConversationPanel({
  leadId,
  canControl,
}: {
  leadId: string;
  canControl: boolean;
}) {
  const [conversation, setConversation] = useState<AiConversation | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [qualification, setQualification] = useState<LeadQualification | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  function refresh() {
    setLoading(true);
    void getLeadConversation(leadId).then((data) => {
      setConversation(data.conversation);
      setMessages(data.messages);
      setQualification(data.qualification);
      setLoading(false);
    });
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => {
      void getLeadConversation(leadId).then((data) => {
        setConversation(data.conversation);
        setMessages(data.messages);
        setQualification(data.qualification);
        setLoading(false);
      });
    }, 8_000);
    return () => window.clearInterval(timer);
  }, [leadId]);

  return (
    <div className="fl-card fl-pad space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot className="size-4" />
          <h3 className="text-sm font-semibold">AI conversation</h3>
          {conversation ? (
            <>
              <span
                className={cn(
                  "fl-badge",
                  conversation.mode === "ai"
                    ? "b-green"
                    : conversation.mode === "human"
                      ? conversation.urgent
                        ? "b-rose"
                        : "b-amber"
                      : "b-gray"
                )}
              >
                {conversation.urgent && conversation.mode === "human"
                  ? "URGENT"
                  : conversation.mode}
              </span>
            </>
          ) : (
            <span className="fl-badge b-gray">idle</span>
          )}
        </div>
        {canControl ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="fl-btn sm ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await triggerFirstTouch(leadId);
                  if (!result.success) toast.error(result.error);
                  else {
                    toast.success("First touch sent");
                    refresh();
                  }
                })
              }
            >
              Send first touch
            </button>
            <button
              type="button"
              className="fl-btn sm ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const amount = Number(
                    window.prompt("Montant proposition (MAD)", "5000") || "0"
                  );
                  const service =
                    window.prompt("Service / offre", "Proposition commerciale") ||
                    "Proposition commerciale";
                  const result = await createProposalFromLead(leadId, amount, service);
                  if (!result.success) toast.error(result.error);
                  else {
                    toast.success(`Proposition ${result.data.number} envoyée`);
                    refresh();
                  }
                })
              }
            >
              Send proposal
            </button>
            <button
              type="button"
              className="fl-btn sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await takeOverConversation(leadId, "human");
                  if (!result.success) toast.error(result.error);
                  else {
                    toast.success("Taken over");
                    refresh();
                  }
                })
              }
            >
              <UserRound className="size-3.5" /> Take over
            </button>
            <button
              type="button"
              className="fl-btn sm ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await takeOverConversation(leadId, "ai");
                  if (!result.success) toast.error(result.error);
                  else {
                    toast.success("AI resumed");
                    refresh();
                  }
                })
              }
            >
              Resume AI
            </button>
          </div>
        ) : null}
      </div>

      {qualification ? (
        <div className="grid gap-2 rounded-xl border border-[var(--border)] p-3 text-xs sm:grid-cols-3">
          <div>
            <div className="fl-faint">Need</div>
            <div>{qualification.need || "—"}</div>
          </div>
          <div>
            <div className="fl-faint">Budget</div>
            <div>{qualification.budget || "—"}</div>
          </div>
          <div>
            <div className="fl-faint">Score</div>
            <div>{qualification.score ?? "—"} / interest {qualification.interest_level ?? "—"}</div>
          </div>
        </div>
      ) : null}

      {conversation?.urgent && conversation.mode === "human" ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          Urgent — l’IA n’a pas compris le dernier message. Réponds manuellement
          ci-dessous (aucun WhatsApp auto n’a été envoyé).
          {conversation.handoff_reason ? ` (${conversation.handoff_reason})` : ""}
        </p>
      ) : conversation?.handoff_reason ? (
        <p className="text-xs fl-faint">Handoff: {conversation.handoff_reason}</p>
      ) : null}

      <div className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] p-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm fl-faint">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : messages.length === 0 ? (
          <p className="text-sm fl-faint">No messages yet.</p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                m.role === "prospect"
                  ? "bg-[var(--surface-2)]"
                  : m.role === "human"
                    ? "bg-[var(--iris)]/10"
                    : "border border-[var(--border)]"
              )}
            >
              <div className="mb-1 text-[10px] uppercase tracking-wide fl-faint">
                {m.role}
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          ))
        )}
      </div>

      {canControl ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const text = draft.trim();
            if (!text) return;
            startTransition(async () => {
              const result = await sendHumanConversationMessage(leadId, text);
              if (!result.success) toast.error(result.error);
              else {
                setDraft("");
                refresh();
              }
            });
          }}
        >
          <input
            className="fl-input flex-1 rounded-md border border-[var(--border)] px-3 py-2 text-sm"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Reply as human…"
          />
          <button type="submit" className="fl-btn primary sm" disabled={pending || !draft.trim()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </form>
      ) : null}
    </div>
  );
}
