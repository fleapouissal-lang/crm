"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { EmptyState } from "@/components/shared/page-header";
import { DataPagination } from "@/components/shared/data-pagination";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";
import { FinanceRowActions } from "@/components/finance/finance-row-actions";
import { TemplateFormDialog } from "@/components/finance/template-form-dialog";
import { TemplateDetailDialog } from "@/components/finance/template-detail-dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DocumentTemplate, TemplateKind } from "@/lib/finance/types";
import { deleteTemplate, upsertTemplate } from "@/lib/actions/finance-docs";

export function TemplatesPageClient({
  initialTemplates = [],
}: {
  initialTemplates?: DocumentTemplate[];
}) {
  const dict = useDict();
  const router = useRouter();
  const f = dict.fusion.financeDocs;
  const [templates, setTemplates] = useState<DocumentTemplate[]>(initialTemplates);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [active, setActive] = useState<DocumentTemplate | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<TemplateKind | "all">("all");

  useEffect(() => {
    setTemplates(initialTemplates);
  }, [initialTemplates]);

  const quoteCount = templates.filter((t) => t.kind === "quote").length;
  const invoiceCount = templates.filter((t) => t.kind === "invoice").length;
  const variableCount = useMemo(() => {
    const vars = new Set<string>();
    for (const t of templates) {
      const body = `${t.content}\n${t.footerNote}`;
      for (const match of body.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
        if (match[1]) vars.add(match[1]);
      }
    }
    return vars.size;
  }, [templates]);
  const hasTemplates = templates.length > 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...templates]
      .filter((row) => {
        if (kindFilter !== "all" && row.kind !== kindFilter) return false;
        if (!q) return true;
        return (
          row.name.toLowerCase().includes(q) ||
          row.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [templates, search, kindFilter]);

  const pagination = useAdaptivePagination(filtered, {
    rowHeight: 60,
    resetKey: `${kindFilter}:${search}`,
  });

  const hasFilters = search.trim() !== "" || kindFilter !== "all";

  async function handleSave(record: DocumentTemplate) {
    const exists = templates.some((t) => t.id === record.id);
    const result = await upsertTemplate(record);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setTemplates((prev) => {
      const idx = prev.findIndex(
        (t) => t.id === result.data.id || t.id === record.id
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = result.data;
        return next;
      }
      return [result.data, ...prev];
    });
    toast.success(exists ? f.templateUpdated : f.templateCreated);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deleteTemplate(id);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast.success(f.templateDeleted);
    router.refresh();
  }

  function clearFilters() {
    setSearch("");
    setKindFilter("all");
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{f.totalTemplates}</div>
          <StatLine value={hasTemplates ? String(templates.length) : "—"} />
          {!hasTemplates ? (
            <div className="k-foot fl-faint mt-2">{dict.fusion.reports.noData}</div>
          ) : null}
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{f.kindQuote}</div>
          <StatLine value={hasTemplates ? String(quoteCount) : "—"} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{f.kindInvoice}</div>
          <StatLine value={hasTemplates ? String(invoiceCount) : "—"} />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{f.variablesHint.split("·")[0]}</div>
          <StatLine
            value={hasTemplates ? String(variableCount) : "—"}
            unit={hasTemplates ? "vars" : undefined}
          />
          <div className="k-foot fl-faint mt-2">
            {hasTemplates
              ? f.variablesHint
              : dict.fusion.reports.noData}
          </div>
        </div>
      </div>

      <div className="fl-card fl-clients-card">
        <div className="fl-clients-toolbar">
          <h2 className="fl-clients-toolbar__title">{f.templatesTitle}</h2>
          <div className="fl-clients-toolbar__row">
            <div className="fl-clients-search-wrap">
              <Search strokeWidth={2} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={f.templateSearchPlaceholder}
                className="fl-clients-search"
              />
            </div>
            <div className="fl-clients-status">
              <Select
                value={kindFilter}
                onValueChange={(v) =>
                  setKindFilter((v as TemplateKind | "all") ?? "all")
                }
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue>
                    {kindFilter === "all"
                      ? f.allTemplateKinds
                      : kindFilter === "quote"
                        ? f.kindQuote
                        : f.kindInvoice}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  <SelectItem value="all">{f.allTemplateKinds}</SelectItem>
                  <SelectItem value="quote">{f.kindQuote}</SelectItem>
                  <SelectItem value="invoice">{f.kindInvoice}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasFilters ? (
              <button
                type="button"
                className="fl-btn sm ghost shrink-0"
                onClick={clearFilters}
                title={f.clearFilters}
              >
                <X className="size-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">{f.clearFilters}</span>
              </button>
            ) : null}
            <button
              type="button"
              className="fl-btn primary sm shrink-0"
              onClick={() => {
                setActive(null);
                setFormOpen(true);
              }}
            >
              <Plus strokeWidth={2} />
              <span className="hidden sm:inline">{f.newTemplate}</span>
            </button>
          </div>
        </div>

        <div className="fl-tbl-wrap">
          {filtered.length === 0 ? (
            <div className="px-4 py-10">
              <EmptyState
                icon={FileText}
                title={hasFilters ? f.noTemplateResults : f.noTemplates}
                description={f.templatesSub}
              />
            </div>
          ) : (
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
                {pagination.pageItems.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <b>{row.name}</b>
                    </td>
                    <td>
                      <span className="fl-badge b-gold">
                        {row.kind === "quote" ? f.kindQuote : f.kindInvoice}
                      </span>
                    </td>
                    <td className="fl-muted max-w-[200px] truncate">
                      {row.description || "—"}
                    </td>
                    <td className="fl-muted text-xs">
                      {new Date(row.updatedAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td>
                      <FinanceRowActions
                        label={row.name}
                        onView={() => {
                          setActive(row);
                          setDetailOpen(true);
                        }}
                        onEdit={() => {
                          setActive(row);
                          setFormOpen(true);
                        }}
                        onDelete={() => handleDelete(row.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <DataPagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
        />
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
        onEdit={() => {
          setDetailOpen(false);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
