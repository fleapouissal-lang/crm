"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Eye, Pencil, Trash2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useDict } from "@/components/shared/i18n-provider";
import { RowActionsMenu, type RowActionItem } from "@/components/shared/row-actions-menu";
import { CellMain, StatLine, FlDelta } from "@/components/fusion/primitives";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ClientDetailDialog } from "@/components/clients/client-detail-dialog";
import {
  STATUS_BADGE_CLASS,
  formatClientValue,
  matchesMarketTab,
  type ClientMarketTab,
  type ClientRecord,
  type ClientStatusKey,
} from "@/lib/clients/types";
import { loadClients, saveClients } from "@/lib/clients/storage";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_FILTER_KEYS: ClientStatusKey[] = [
  "active",
  "partner",
  "pending",
  "bidStage",
  "pilot",
  "prospect",
];

function ClientRowActions({
  client,
  onView,
  onEdit,
  onDelete,
}: {
  client: ClientRecord;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const dict = useDict();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const actions: RowActionItem[] = [
    {
      label: dict.common.viewDetails,
      icon: <Eye className="size-4" />,
      onClick: onView,
    },
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
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dict.clients.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {dict.clients.deleteDescription.replace("{name}", client.name)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>
              {dict.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                startTransition(() => {
                  onDelete();
                  setDeleteOpen(false);
                });
              }}
            >
              {pending ? dict.common.working : dict.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ClientsPageClient() {
  const dict = useDict();
  const f = dict.fusion;
  const l = f.labels;
  const c = f.clients;
  const cl = dict.clients;

  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [marketTab, setMarketTab] = useState<ClientMarketTab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatusKey | "all">("all");

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeClient, setActiveClient] = useState<ClientRecord | null>(null);

  useEffect(() => {
    setClients(loadClients());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: ClientRecord[]) => {
    setClients(next);
    saveClients(next);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((client) => {
      if (!matchesMarketTab(client, marketTab)) return false;
      if (statusFilter !== "all" && client.statusKey !== statusFilter) return false;
      if (!q) return true;
      return (
        client.name.toLowerCase().includes(q) ||
        client.subtitle.toLowerCase().includes(q) ||
        client.contact.toLowerCase().includes(q) ||
        client.location.toLowerCase().includes(q) ||
        client.engagement.toLowerCase().includes(q)
      );
    });
  }, [clients, marketTab, search, statusFilter]);

  const kpis = useMemo(() => {
    const activeRetainers = clients.filter((x) => x.statusKey === "active").length;
    const withValue = clients.filter((x) => x.valueAmount != null);
    const avg =
      withValue.length > 0
        ? Math.round(
            withValue.reduce((sum, x) => sum + (x.valueAmount ?? 0), 0) /
              withValue.length /
              1000
          )
        : 0;
    return {
      total: String(clients.length),
      retainers: String(activeRetainers),
      avgK: avg > 0 ? String(avg) : "—",
    };
  }, [clients]);

  const hasActiveFilters = search.trim() !== "" || statusFilter !== "all";

  function openCreate() {
    setActiveClient(null);
    setFormOpen(true);
  }

  function openEdit(client: ClientRecord) {
    setActiveClient(client);
    setFormOpen(true);
  }

  function openView(client: ClientRecord) {
    setActiveClient(client);
    setDetailOpen(true);
  }

  function handleSave(record: ClientRecord) {
    const exists = clients.some((x) => x.id === record.id);
    const next = exists
      ? clients.map((x) => (x.id === record.id ? record : x))
      : [record, ...clients];
    persist(next);
    toast.success(exists ? cl.updatedClient : cl.createdClient);
  }

  function handleDelete(id: string) {
    persist(clients.filter((x) => x.id !== id));
    toast.success(cl.deletedClient);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
  }

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-xl bg-[var(--glass-hi)]" />;
  }

  return (
    <div className="space-y-[18px]">
      <div className="grid g-4">
        {[
          { label: c.totalAccounts, value: kpis.total, foot: l.across3Markets },
          {
            label: c.activeRetainers,
            value: kpis.retainers,
            delta: clients.length > 4 ? "1" : undefined,
            foot: l.thisQuarter,
          },
          {
            label: c.avgAccountValue,
            value: kpis.avgK,
            unit: kpis.avgK !== "—" ? "K" : undefined,
            foot: l.annualized,
          },
          { label: c.retention, value: "92%", foot: l.rolling12Months },
        ].map((k) => (
          <div key={k.label} className="fl-card fl-pad">
            <div className="k-label">{k.label}</div>
            <StatLine value={k.value} unit={k.unit} />
            <div className="k-foot mt-2">
              {k.delta ? <FlDelta up>{k.delta}</FlDelta> : null}
              {k.foot}
            </div>
          </div>
        ))}
      </div>

      <div className="fl-card fl-clients-card">
        <div className="fl-clients-toolbar">
          <h2 className="fl-clients-toolbar__title">{c.directory}</h2>
          <div className="fl-clients-toolbar__row">
            <div className="fl-seg shrink-0">
              {(
                [
                  ["all", l.all],
                  ["gulf", l.gulf],
                  ["morocco", l.morocco],
                ] as const
              ).map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  className={cn(marketTab === tab && "on")}
                  onClick={() => setMarketTab(tab)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="fl-clients-search-wrap">
              <Search strokeWidth={2} />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={cl.searchPlaceholder}
                className="fl-clients-search"
              />
            </div>

            <div className="fl-clients-status">
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter((v as ClientStatusKey | "all") ?? "all")
                }
              >
                <SelectTrigger className="fl-select-trigger w-full">
                  <SelectValue placeholder={cl.filterStatus} />
                </SelectTrigger>
                <SelectContent className="fl-select-panel" align="end">
                  <SelectItem value="all">{cl.allStatuses}</SelectItem>
                  {STATUS_FILTER_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {f.badges[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {hasActiveFilters ? (
              <button
                type="button"
                className="fl-btn sm ghost shrink-0"
                onClick={clearFilters}
                title={cl.clearFilters}
              >
                <X className="size-3.5" strokeWidth={2} />
                <span className="hidden sm:inline">{cl.clearFilters}</span>
              </button>
            ) : null}

            <button
              type="button"
              className="fl-btn primary sm shrink-0"
              onClick={openCreate}
            >
              <Plus strokeWidth={2} />
              <span className="hidden sm:inline">{l.addClient}</span>
            </button>
          </div>
        </div>

        <div className="fl-tbl-wrap">
          <table className="fl-tbl fl-tbl-clients">
            <colgroup>
              <col style={{ width: "24%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "16%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "3.25rem" }} />
            </colgroup>
            <thead>
              <tr>
                <th>{l.account}</th>
                <th>{dict.common.contact}</th>
                <th>{l.market}</th>
                <th>{l.engagement}</th>
                <th className="col-num">{l.lifetimeValue}</th>
                <th>{dict.common.status}</th>
                <th className="col-actions" aria-label={dict.common.moreActions} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center fl-faint text-sm">
                    {cl.noClientsFound}
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <CellMain
                        initials={client.initials}
                        gradient={client.gradient}
                        title={client.name}
                        sub={client.subtitle}
                      />
                    </td>
                    <td className="col-contact fl-muted">{client.contact}</td>
                    <td className="col-market">
                      <span className="flag">{client.marketCode}</span>{" "}
                      {client.location}
                    </td>
                    <td className="col-engagement fl-muted">{client.engagement}</td>
                    <td className="col-num fl-mono">{formatClientValue(client)}</td>
                    <td className="col-status">
                      <span
                        className={`fl-badge ${STATUS_BADGE_CLASS[client.statusKey] ?? "b-blue"}`}
                      >
                        {f.badges[client.statusKey]}
                      </span>
                    </td>
                    <td className="col-actions">
                      <ClientRowActions
                        client={client}
                        onView={() => openView(client)}
                        onEdit={() => openEdit(client)}
                        onDelete={() => handleDelete(client.id)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ClientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        client={activeClient}
        onSave={handleSave}
      />

      <ClientDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        client={activeClient}
        onEdit={() => activeClient && openEdit(activeClient)}
      />
    </div>
  );
}
