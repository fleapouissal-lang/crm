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
import { createClient } from "@/lib/supabase/client";
import { updateLeadStage } from "@/lib/actions/leads";
import type { Lead, LeadStage } from "@/types/database";
import { LEAD_STAGES } from "@/types/database";
import { useDict } from "@/components/shared/i18n-provider";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
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
      {lead.company && (
        <span className="fl-badge b-gray text-[10px]">{lead.company}</span>
      )}
      <h4>
        <Link
          href={`/crm/${lead.id}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {lead.title}
        </Link>
      </h4>
      <div className="kmeta">
        <div className="kl">
          <span className="fl-mono">{formatCurrency(Number(lead.value))}</span>
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

function SortableLeadCard({ lead }: { lead: Lead }) {
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
      <LeadCard lead={lead} />
    </div>
  );
}

function PipelineColumn({
  stage,
  leads,
}: {
  stage: LeadStage;
  leads: Lead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  const dict = useDict();

  return (
    <div
      ref={setNodeRef}
      className={cn("fl-kcol", isOver && "ring-2 ring-[var(--iris)]/30")}
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
        <div className="fl-kcards max-h-[calc(100vh-16rem)]">
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({
  initialLeads,
  organizationId,
}: {
  initialLeads: Lead[];
  organizationId: string;
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
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
            setLeads((prev) => {
              if (prev.some((l) => l.id === (payload.new as Lead).id)) return prev;
              return [payload.new as Lead, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            setLeads((prev) =>
              prev.map((l) =>
                l.id === (payload.new as Lead).id
                  ? { ...l, ...(payload.new as Lead) }
                  : l
              )
            );
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
  }, [organizationId]);

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
    if (LEAD_STAGES.includes(over.id as LeadStage)) {
      newStage = over.id as LeadStage;
    } else {
      const overLead = leads.find((l) => l.id === over.id);
      if (overLead) newStage = overLead.stage;
    }

    if (!newStage || newStage === lead.stage) return;

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="fl-kanban fl-kanban--7">
        {LEAD_STAGES.map((stage) => (
          <PipelineColumn key={stage} stage={stage} leads={byStage[stage]} />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? <LeadCard lead={activeLead} isDragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
