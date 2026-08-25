"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { Building2, CalendarClock, Mail, MapPin, MessageCircle, Phone, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateLeadStage } from "@/lib/actions/leads";
import type { Lead, LeadContactMethod, LeadStage } from "@/types/database";
import { LEAD_STAGES } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-MA", {
    style: "currency",
    currency: "MAD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFollowUp(value: string) {
  return new Intl.DateTimeFormat("fr-MA", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function whatsappUrl(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `212${digits.slice(1)}`;
  return digits ? `https://wa.me/${digits}` : null;
}

const STAGE_DOT: Record<LeadStage, string> = {
  new: "var(--text-faint)",
  contacted: "var(--sky)",
  qualified: "var(--sky)",
  proposal: "var(--gold)",
  negotiation: "var(--iris)",
  won: "var(--emerald)",
  lost: "var(--rose)",
};

function LeadCard({
  lead,
  isDragging,
}: {
  lead: Lead;
  isDragging?: boolean;
}) {
  return (
    <div
      className={cn(
        "fl-kcard",
        isDragging && "opacity-90 ring-2 ring-[var(--iris)]/40"
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {lead.ai_score !== null && lead.ai_score !== undefined ? (
          <span className="fl-badge b-iris text-[10px]">
            <Sparkles className="size-3" /> {lead.ai_score}/100
          </span>
        ) : null}
      </div>
      <h4>
        <Link
          href={`/leads/${lead.id}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {lead.contact_name || lead.title}
        </Link>
      </h4>
      {lead.contact_name && lead.title !== lead.contact_name ? (
        <p className="text-xs fl-faint">{lead.title}</p>
      ) : null}
      <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
        {lead.company ? <span className="flex items-center gap-1.5"><Building2 className="size-3" />{lead.company}</span> : null}
        {lead.phone ? <span className="flex items-center gap-1.5"><Phone className="size-3" />{lead.phone}</span> : null}
        {lead.email ? <span className="flex items-center gap-1.5 break-all"><Mail className="size-3" />{lead.email}</span> : null}
      </div>
      {(lead.city || lead.source || lead.next_follow_up_at) && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] fl-faint">
          {lead.city ? <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{lead.city}</span> : null}
          {lead.source ? <span>{lead.source}</span> : null}
          {lead.next_follow_up_at ? (
            <span className="inline-flex items-center gap-1 text-[var(--gold)]">
              <CalendarClock className="size-3" />{formatFollowUp(lead.next_follow_up_at)}
            </span>
          ) : null}
        </div>
      )}
      {lead.stage === "contacted" && lead.last_contact_method ? (
        <span className="fl-badge b-green w-fit text-[10px]">
          {lead.last_contact_method === "phone"
            ? "Téléphone"
            : lead.last_contact_method === "email"
              ? "E-mail"
              : "Visite"}
        </span>
      ) : null}
      {lead.relances?.length ? (
        <div className="flex flex-wrap gap-1 pt-1" aria-label="Relances">
          {[1, 2, 3].map((sequence) => {
            const relance = lead.relances?.find((item) => item.sequence === sequence);
            if (!relance) return null;
            const completed = ["sent", "replied", "lost"].includes(relance.status);
            return <span key={sequence} title={`Relance ${sequence} · ${relance.status}`} className={cn("fl-badge text-[10px]", completed ? "b-green" : "b-gold")}><MessageCircle className="size-3" /> R{sequence}</span>;
          })}
        </div>
      ) : null}
      <div className="kmeta">
        <div className="kl">
          {lead.phone && whatsappUrl(lead.phone) ? (
            <a
              href={whatsappUrl(lead.phone)!}
              target="_blank"
              rel="noreferrer"
              aria-label={`Ouvrir WhatsApp pour ${lead.contact_name || lead.title}`}
              title="Ouvrir WhatsApp"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[var(--emerald)] transition-colors hover:bg-[var(--emerald)]/10"
              onClick={(event) => event.stopPropagation()}
            >
              <MessageCircle className="size-4" />
              <span className="text-[10px] font-medium">WhatsApp</span>
            </a>
          ) : (
            <span className="fl-mono">{formatCurrency(Number(lead.value))}</span>
          )}
        </div>
        {lead.assigned_profile && (
          <div
            className="fl-ava sm"
            style={{ background: "var(--grad-fusion)" }}
          >
            {(lead.assigned_profile.full_name ?? "?")
              .charAt(0)
              .toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

function SortableLeadCard({ lead, onOpen }: { lead: Lead; onOpen: (lead: Lead) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id, data: { lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div onClick={() => onOpen(lead)}><LeadCard lead={lead} /></div>
    </div>
  );
}

function PipelineColumn({
  stage,
  leads,
  onOpen,
}: {
  stage: LeadStage;
  leads: Lead[];
  onOpen: (lead: Lead) => void;
}) {
  // Keep a dedicated, full-height drop target inside every column. Without it,
  // an empty (or nearly empty) adjacent column has no reliable collision box
  // while the dragged card is crossing the horizontal board.
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const { setNodeRef: setDropZoneRef, isOver: isDropZoneOver } = useDroppable({
    id: `${stage}::dropzone`,
    data: { stage },
  });

  const dict = useDict();

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "fl-kcol",
        (isOver || isDropZoneOver) && "ring-2 ring-[var(--iris)]/30"
      )}
    >
      <div className="fl-kcol-head">
        <span className="kdot" style={{ background: STAGE_DOT[stage] }} />
        <b>{dict.stages[stage]}</b>
        <span className="kcount">{leads.length}</span>
      </div>
      <SortableContext
        items={leads.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setDropZoneRef}
          className="fl-kcards min-h-24 max-h-[calc(100vh-16rem)]"
        >
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({
  initialLeads,
  organizationId,
  salesProject,
}: {
  initialLeads: Lead[];
  organizationId: string;
  salesProject: string;
}) {
  const dict = useDict();
  const [leads, setLeads] = useState(initialLeads);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [contactMove, setContactMove] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    // Server refreshes replace the canonical lead list after actions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLeads(initialLeads);
  }, [initialLeads]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            if (salesProject !== "all" && (payload.new as Lead).sales_project !== salesProject) return;
            setLeads((prev) => {
              if (prev.some((l) => l.id === (payload.new as Lead).id)) return prev;
              return [payload.new as Lead, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const nextLead = payload.new as Lead;
            setLeads((prev) => {
              if (salesProject !== "all" && nextLead.sales_project !== salesProject) {
                return prev.filter((lead) => lead.id !== nextLead.id);
              }
              return prev.some((lead) => lead.id === nextLead.id)
                ? prev.map((lead) => lead.id === nextLead.id ? { ...lead, ...nextLead } : lead)
                : [nextLead, ...prev];
            });
          } else if (payload.eventType === "DELETE") {
            setLeads((prev) =>
              prev.filter((l) => l.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [organizationId, salesProject]);

  const byStage = useMemo(() => {
    const map = Object.fromEntries(
      LEAD_STAGES.map((s) => [s, [] as Lead[]])
    ) as Record<LeadStage, Lead[]>;
    for (const lead of leads) {
      map[lead.stage]?.push(lead);
    }
    return map;
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    let newStage: LeadStage | null = null;
    const overId = String(over.id);
    const dropZoneStage = overId.endsWith("::dropzone")
      ? overId.slice(0, -"::dropzone".length)
      : null;
    if (dropZoneStage && LEAD_STAGES.includes(dropZoneStage as LeadStage)) {
      newStage = dropZoneStage as LeadStage;
    } else if (LEAD_STAGES.includes(overId as LeadStage)) {
      newStage = overId as LeadStage;
    } else {
      const overLead = leads.find((l) => l.id === overId);
      if (overLead) newStage = overLead.stage;
    }

    if (!newStage || newStage === lead.stage) return;

    if (newStage === "contacted") {
      setContactMove(lead);
      return;
    }

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage! } : l))
    );

    startTransition(async () => {
      const result = await updateLeadStage(leadId, newStage!);
      if (!result.success) {
        toast.error(result.error);
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, stage: lead.stage } : l))
        );
      }
    });
  }

  function confirmContact(method: LeadContactMethod) {
    const lead = contactMove;
    if (!lead) return;
    setContactMove(null);
    const contactedAt = new Date().toISOString();
    setLeads((prev) =>
      prev.map((item) =>
        item.id === lead.id
          ? { ...item, stage: "contacted", last_contact_method: method, last_contacted_at: contactedAt }
          : item
      )
    );
    startTransition(async () => {
      const result = await updateLeadStage(lead.id, "contacted", method);
      if (!result.success) {
        toast.error(result.error);
        setLeads((prev) => prev.map((item) => item.id === lead.id ? lead : item));
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="fl-kanban fl-kanban--7">
        {LEAD_STAGES.map((stage) => (
          <PipelineColumn key={stage} stage={stage} leads={byStage[stage]} onOpen={setDetailLead} />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
      </DragOverlay>
      <Dialog open={!!contactMove} onOpenChange={(open) => !open && setContactMove(null)}>
        <DialogContent className="fl-dialog-content ring-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dict.leads.chooseContactMethod}</DialogTitle>
          </DialogHeader>
          <p className="text-sm fl-faint">{contactMove?.contact_name || contactMove?.title}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <button className="fl-btn" onClick={() => confirmContact("phone")}><Phone className="size-4" />{dict.leads.contactByPhone}</button>
            <button className="fl-btn" onClick={() => confirmContact("email")}><Mail className="size-4" />{dict.leads.contactByEmail}</button>
            <button className="fl-btn" onClick={() => confirmContact("visit")}><MapPin className="size-4" />{dict.leads.contactByVisit}</button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!detailLead} onOpenChange={(open) => !open && setDetailLead(null)}>
        <DialogContent className="fl-dialog-content ring-0 sm:max-w-lg">
          <DialogHeader><DialogTitle>{detailLead?.contact_name || detailLead?.title}</DialogTitle></DialogHeader>
          {detailLead ? <div className="grid gap-2 text-sm"><p><strong>الشركة:</strong> {detailLead.company || detailLead.title}</p><p><strong>الهاتف:</strong> {detailLead.phone || "—"}</p><p><strong>البريد:</strong> {detailLead.email || "—"}</p><p><strong>المدينة:</strong> {detailLead.city || "—"}</p><p><strong>المصدر:</strong> {detailLead.source || "—"}</p><p><strong>ملاحظات:</strong> {detailLead.notes || detailLead.research_notes || "—"}</p></div> : null}
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
