"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { FinanceRowActions } from "@/components/finance/finance-row-actions";
import { TemplateFormDialog } from "@/components/finance/template-form-dialog";
import { TemplateDetailDialog } from "@/components/finance/template-detail-dialog";
import type { DocumentTemplate } from "@/lib/finance/types";
import { loadTemplates, saveTemplates } from "@/lib/finance/storage";

export function TemplatesPageClient() {
  const dict = useDict();
  const f = dict.fusion.financeDocs;
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [active, setActive] = useState<DocumentTemplate | null>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const persist = useCallback((next: DocumentTemplate[]) => {
    setTemplates(next);
    saveTemplates(next);
  }, []);

  const quoteCount = templates.filter((t) => t.kind === "quote").length;
  const invoiceCount = templates.filter((t) => t.kind === "invoice").length;

  const sorted = useMemo(
    () => [...templates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [templates]
  );

  function handleSave(record: DocumentTemplate) {
    const exists = templates.some((t) => t.id === record.id);
    const next = exists
      ? templates.map((t) => (t.id === record.id ? record : t))
      : [record, ...templates];
    persist(next);
    toast.success(exists ? f.templateUpdated : f.templateCreated);
  }

  function handleDelete(id: string) {
    persist(templates.filter((t) => t.id !== id));
    toast.success(f.templateDeleted);
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{f.totalTemplates}</div>
          <StatLine value={String(templates.length)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{f.kindQuote}</div>
          <StatLine value={String(quoteCount)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{f.kindInvoice}</div>
          <StatLine value={String(invoiceCount)} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{f.variablesHint.split("·")[0]}</div>
          <StatLine value="8" unit="vars" />
          <div className="k-foot fl-faint mt-2">{"{{client}}, {{montant}}…"}</div>
        </div>
      </div>

      <div className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3>{f.templatesTitle}</h3>
            <div className="ch-sub">{f.templatesSub}</div>
          </div>
          <button type="button" className="fl-btn primary sm" onClick={() => { setActive(null); setFormOpen(true); }}>
            <Plus strokeWidth={2} />
            {f.newTemplate}
          </button>
        </div>
        <div className="fl-tbl-wrap">
          <table className="fl-tbl">
            <thead>
              <tr>
                <th>{dict.common.title}</th>
                <th>{f.templateKind}</th>
                <th>{dict.common.description}</th>
                <th>{dict.common.updated}</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id}>
                  <td><b>{row.name}</b></td>
                  <td>
                    <span className="fl-badge b-gold">
                      {row.kind === "quote" ? f.kindQuote : f.kindInvoice}
                    </span>
                  </td>
                  <td className="fl-muted max-w-[200px] truncate">{row.description || "—"}</td>
                  <td className="fl-muted text-xs">
                    {new Date(row.updatedAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td>
                    <FinanceRowActions
                      label={row.name}
                      onView={() => { setActive(row); setDetailOpen(true); }}
                      onEdit={() => { setActive(row); setFormOpen(true); }}
                      onDelete={() => handleDelete(row.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <TemplateFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        template={active}
        onSave={handleSave}
      />
      <TemplateDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        template={active}
        onEdit={() => { setDetailOpen(false); setFormOpen(true); }}
      />
    </div>
  );
}
