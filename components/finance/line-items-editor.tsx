"use client";

import { Plus, Trash2 } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import { Input } from "@/components/ui/input";
import {
  createEmptyLineItem,
  documentAmountTtc,
  formatMoney,
  lineItemTotalTtc,
  type FinanceLineItem,
} from "@/lib/finance/types";
import { cn } from "@/lib/utils";

export function LineItemsEditor({
  items,
  currency,
  onChange,
  className,
  error,
}: {
  items: FinanceLineItem[];
  currency: string;
  onChange: (items: FinanceLineItem[]) => void;
  className?: string;
  error?: string;
}) {
  const dict = useDict();
  const f = dict.fusion.financeDocs;
  const total = documentAmountTtc(items);

  function updateItem(id: string, patch: Partial<FinanceLineItem>) {
    onChange(items.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeItem(id: string) {
    if (items.length <= 1) {
      onChange([createEmptyLineItem()]);
      return;
    }
    onChange(items.filter((row) => row.id !== id));
  }

  function addItem() {
    onChange([...items, createEmptyLineItem()]);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <label className="fl-field-label mb-0">{f.lineItems}</label>
        <button type="button" className="fl-btn sm ghost" onClick={addItem}>
          <Plus className="size-3.5" strokeWidth={2} />
          {f.addLine}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--glass-hi)] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">{f.lineDescription}</th>
              <th className="w-24 px-2 py-2 font-medium">{f.quantity}</th>
              <th className="w-32 px-2 py-2 font-medium">{f.unitPrice}</th>
              <th className="w-32 px-2 py-2 font-medium">{f.lineTotal}</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-2 py-2">
                  <Input
                    className="fl-inp"
                    value={row.description}
                    placeholder={f.lineDescriptionPlaceholder}
                    onChange={(e) =>
                      updateItem(row.id, { description: e.target.value })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    className="fl-inp"
                    value={row.quantity}
                    onChange={(e) =>
                      updateItem(row.id, {
                        quantity: Number(e.target.value) || 0,
                      })
                    }
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="fl-inp"
                    value={row.unitPriceTtc}
                    onChange={(e) =>
                      updateItem(row.id, {
                        unitPriceTtc: Number(e.target.value) || 0,
                      })
                    }
                  />
                </td>
                <td className="px-3 py-2 fl-mono text-muted-foreground">
                  {formatMoney(lineItemTotalTtc(row), currency)}
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    className="fl-btn sm ghost"
                    onClick={() => removeItem(row.id)}
                    aria-label={f.removeLine}
                    title={f.removeLine}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <span className="text-muted-foreground">{f.lineItemsHint}</span>
        )}
        <p className="fl-mono font-medium">
          {f.amountTotal}: {formatMoney(total, currency)}
        </p>
      </div>
    </div>
  );
}
