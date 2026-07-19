"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  CircleDollarSign,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { StatLine } from "@/components/fusion/primitives";
import { EmptyState } from "@/components/shared/page-header";
import { DataPagination } from "@/components/shared/data-pagination";
import { useAdaptivePagination } from "@/hooks/use-adaptive-pagination";
import { ExpenseFormDialog } from "@/components/finance/expense-form-dialog";
import { DeleteConfirmDialog } from "@/components/shared/delete-confirm-dialog";
import { RowActionsMenu, type RowActionItem } from "@/components/shared/row-actions-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_STATUS_BADGE,
  formatMoney,
  type ExpenseCategory,
  type ExpenseRecord,
  type ExpenseStatus,
} from "@/lib/finance/types";
import { loadExpenses, saveExpenses } from "@/lib/finance/storage";

const STATUS_FILTERS: Array<ExpenseStatus | "all"> = [
  "all",
  "draft",
  "pending",
  "paid",
  "cancelled",
];

function ExpenseRowActions({
  label,
  onEdit,
  onDelete,
}: {
  label: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dict = useDict();
  const f = dict.fusion.financeDocs;
  const [deleteOpen, setDeleteOpen] = useState(false);

  const actions: RowActionItem[] = [
    {
      label: dict.common.edit,
      icon: <Pencil className="size-4" />,
      onClick: onEdit,
    },
    { separator: true },
    {
      label: dict.common.delete,
      icon: <Trash2 className="size-4" />,
      destructive: true,
      onClick: () => setDeleteOpen(true),
    },
  ];

  return (
    <>
      <RowActionsMenu actions={actions} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={f.deleteTitle}
        description={
          <>
            {f.deleteConfirm.split("{{name}}")[0]}
            <strong className="fl-delete-dialog__name">{label}</strong>
            {f.deleteConfirm.split("{{name}}")[1] ?? ""}
          </>
        }
        onConfirm={onDelete}
      />
    </>
  );
}

export function ExpensesPageClient() {
  const dict = useDict();
  const e = dict.fusion.expenses;
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [active, setActive] = useState<ExpenseRecord | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">(
    "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<
    ExpenseCategory | "all"
  >("all");

  useEffect(() => {
    setExpenses(loadExpenses());
  }, []);

  const persist = useCallback((next: ExpenseRecord[]) => {
    setExpenses(next);
    saveExpenses(next);
  }, []);

  const totalCount = expenses.length;
  const totalAmount = expenses.reduce((s, x) => s + x.amount, 0);
  const paidAmount = expenses
    .filter((x) => x.status === "paid")
    .reduce((s, x) => s + x.amount, 0);
  const pendingAmount = expenses
    .filter((x) => x.status === "pending")
    .reduce((s, x) => s + x.amount, 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...expenses]
      .filter((row) => {
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        if (categoryFilter !== "all" && row.category !== categoryFilter)
          return false;
        if (!q) return true;
        return (
          row.number.toLowerCase().includes(q) ||
          row.title.toLowerCase().includes(q) ||
          row.vendor.toLowerCase().includes(q) ||
          row.notes.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, search, statusFilter, categoryFilter]);

  const pagination = useAdaptivePagination(filtered, {
    rowHeight: 60,
    resetKey: `${statusFilter}:${categoryFilter}:${search}`,
  });

  const hasFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    categoryFilter !== "all";

  function handleSave(record: ExpenseRecord) {
    const exists = expenses.some((x) => x.id === record.id);
    const next = exists
      ? expenses.map((x) => (x.id === record.id ? record : x))
      : [record, ...expenses];
    persist(next);
    toast.success(exists ? e.expenseUpdated : e.expenseCreated);
  }

  function handleDelete(id: string) {
    persist(expenses.filter((x) => x.id !== id));
    toast.success(e.expenseDeleted);
  }

  function openCreate() {
    setActive(null);
    setFormOpen(true);
  }

  function openEdit(row: ExpenseRecord) {
    setActive(row);
    setFormOpen(true);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setCategoryFilter("all");
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        <div className="fl-card fl-pad">
          <div className="k-label">{e.statCount}</div>
          <StatLine value={String(totalCount)} />
          <div className="k-foot fl-faint mt-2">
            {formatMoney(totalAmount, "MAD")}
          </div>
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{e.statPaid}</div>
          <StatLine
            value={
              paidAmount >= 1000
                ? Math.round(paidAmount / 1000) + "K"
                : String(Math.round(paidAmount))
            }
            unit="MAD"
          />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{e.statPending}</div>
          <StatLine
            value={
              pendingAmount >= 1000
                ? Math.round(pendingAmount / 1000) + "K"
                : String(Math.round(pendingAmount))
            }
            unit="MAD"
          />
        </div>
        <div className="fl-card fl-pad">
          <div className="k-label">{e.statTotal}</div>
          <StatLine
            value={
              totalAmount >= 1000
                ? Math.round(totalAmount / 1000) + "K"
                : String(Math.round(totalAmount))
            }
            unit="MAD"
          />
        </div>
      </div>

      <div className="fl-card fl-clients-card">
        <div className="fl-clients-toolbar">
          <h2 className="fl-clients-toolbar__title">{e.listTitle}</h2>
          <div className="fl-clients-toolbar__row">
            <div className="fl-clients-search-wrap">
              <Search strokeWidth={2} />
              <Input
                value={search}
                onChange={(ev) => setSearch(ev.target.value)}
                placeholder={e.searchPlaceholder}
                className="fl-clients-search"
              />
            </div>
            <div className="fl-clients-status">
              <Select
                value={categoryFilter}
                onValueChange={(v) =>
                  setCategoryFilter((v as ExpenseCategory | "all") ?? "all")
                }
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue>
                    {categoryFilter === "all"
                      ? e.allCategories
                      : e.categories[categoryFilter]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  <SelectItem value="all">{e.allCategories}</SelectItem>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {e.categories[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="fl-clients-status">
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter((v as ExpenseStatus | "all") ?? "all")
                }
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue>
                    {statusFilter === "all"
                      ? e.allStatuses
                      : e.statuses[statusFilter]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  {STATUS_FILTERS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key === "all" ? e.allStatuses : e.statuses[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {hasFilters ? (
              <button
                type="button"
                className="fl-btn sm ghost shrink-0"
                onClick={clearFilters}
                title={e.clearFilters}
              >
                <X className="size-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">{e.clearFilters}</span>
              </button>
            ) : null}
            <button
              type="button"
              className="fl-btn primary sm shrink-0"
              onClick={openCreate}
            >
              <Plus strokeWidth={2} />
              <span className="hidden sm:inline">{e.newExpense}</span>
            </button>
          </div>
        </div>

        <div className="fl-tbl-wrap">
          {filtered.length === 0 ? (
            <div className="px-4 py-10">
              <EmptyState
                icon={CircleDollarSign}
                title={hasFilters ? e.noResults : e.noExpenses}
                description={hasFilters ? e.noResultsHint : e.listSub}
              />
            </div>
          ) : (
            <table className="fl-tbl">
              <thead>
                <tr>
                  <th>{e.number}</th>
                  <th>{e.title}</th>
                  <th>{e.category}</th>
                  <th>{e.vendor}</th>
                  <th>{e.amount}</th>
                  <th>{e.date}</th>
                  <th>{e.status}</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {pagination.pageItems.map((row) => (
                  <tr key={row.id}>
                    <td className="fl-mono">{row.number}</td>
                    <td>
                      <b>{row.title}</b>
                    </td>
                    <td className="fl-muted">{e.categories[row.category]}</td>
                    <td className="fl-muted">{row.vendor || "—"}</td>
                    <td className="fl-mono">
                      {formatMoney(row.amount, row.currency)}
                    </td>
                    <td className="fl-muted">
                      {format(new Date(row.date + "T00:00:00"), "d MMM yyyy", {
                        locale: fr,
                      })}
                    </td>
                    <td>
                      <span
                        className={`fl-badge ${EXPENSE_STATUS_BADGE[row.status]}`}
                      >
                        {e.statuses[row.status]}
                      </span>
                    </td>
                    <td>
                      <ExpenseRowActions
                        label={row.number}
                        onEdit={() => openEdit(row)}
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

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={active && formOpen ? active : null}
        existingExpenses={expenses}
        onSave={handleSave}
      />
    </div>
  );
}
