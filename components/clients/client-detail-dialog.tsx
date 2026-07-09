"use client";

import { Pencil } from "lucide-react";
import { useDict } from "@/components/shared/i18n-provider";
import {
  STATUS_BADGE_CLASS,
  formatClientValue,
  type ClientRecord,
} from "@/lib/clients/types";
import { CellMain } from "@/components/fusion/primitives";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ClientDetailDialog({
  open,
  onOpenChange,
  client,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRecord | null;
  onEdit: () => void;
}) {
  const dict = useDict();
  const f = dict.fusion;
  if (!client) return null;

  const badgeClass = STATUS_BADGE_CLASS[client.statusKey] ?? "b-blue";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fl-dialog-content ring-0 sm:max-w-md">
        <DialogHeader className="fl-dialog-header">
          <DialogTitle>{dict.common.viewDetails}</DialogTitle>
        </DialogHeader>
        <div className="fl-dialog-body space-y-4">
          <CellMain
            initials={client.initials}
            gradient={client.gradient}
            title={client.name}
            sub={client.subtitle}
          />
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{dict.common.contact}</dt>
              <dd className="text-right font-medium">{client.contact || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{f.labels.market}</dt>
              <dd className="text-right font-medium">
                <span className="flag">{client.marketCode}</span> {client.location}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{f.labels.engagement}</dt>
              <dd className="text-right font-medium">{client.engagement || "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{f.labels.lifetimeValue}</dt>
              <dd className="fl-mono text-right font-medium">
                {formatClientValue(client)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{dict.common.status}</dt>
              <dd>
                <span className={`fl-badge ${badgeClass}`}>
                  {f.badges[client.statusKey]}
                </span>
              </dd>
            </div>
          </dl>
        </div>
        <DialogFooter className="fl-dialog-footer">
          <button
            type="button"
            className="fl-btn sm"
            onClick={() => onOpenChange(false)}
          >
            {dict.common.cancel}
          </button>
          <button
            type="button"
            className="fl-btn primary sm"
            onClick={() => {
              onOpenChange(false);
              onEdit();
            }}
          >
            <Pencil className="size-4" strokeWidth={2} />
            {dict.common.edit}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
