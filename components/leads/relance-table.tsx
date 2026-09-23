import { Clock3, MessageCircle, CheckCircle2, XCircle } from "lucide-react";

type Relance = {
  id: string;
  lead_id: string;
  sequence: number;
  status: string;
  scheduled_for: string;
  sent_at?: string | null;
  lost_at?: string | null;
  lead?: {
    title?: string | null;
    contact_name?: string | null;
    sales_project?: string | null;
  } | null;
};

const statusLabel: Record<string, string> = {
  planned: "Programmé",
  sending: "Envoi",
  sent: "Envoyé",
  replied: "Répondu",
  cancelled: "Annulé",
  failed: "Échec",
  lost: "Perdu",
};

export function RelanceTable({
  rows,
  embedded = false,
}: {
  rows: Relance[];
  embedded?: boolean;
}) {
  const content =
    rows.length === 0 ? (
      <p className="p-6 text-center text-sm fl-faint">
        Aucune relance programmée.
      </p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs fl-faint">
              <th className="px-4 py-2">Client</th>
              <th>Projet</th>
              <th>Étape</th>
              <th>État</th>
              <th>Programmée</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3 font-medium">
                  {row.lead?.contact_name || row.lead?.title || "—"}
                </td>
                <td>{row.lead?.sales_project || "—"}</td>
                <td>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--glass-hi)] px-2 py-1 text-xs">
                    <MessageCircle className="size-3" /> Relance {row.sequence}
                  </span>
                </td>
                <td>
                  <span className="inline-flex items-center gap-1 text-xs">
                    {row.status === "sent" || row.status === "replied" ? (
                      <CheckCircle2 className="size-3 text-emerald-500" />
                    ) : row.status === "cancelled" || row.status === "lost" ? (
                      <XCircle className="size-3 text-rose-500" />
                    ) : (
                      <Clock3 className="size-3 text-amber-500" />
                    )}
                    {statusLabel[row.status] || row.status}
                  </span>
                </td>
                <td className="pr-4 text-xs fl-faint">
                  {new Intl.DateTimeFormat("fr-MA", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(row.scheduled_for))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  if (embedded) {
    return (
      <section>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">Relance automatique</h2>
            <p className="text-xs fl-faint">
              Jusqu’à 3 tentatives · délais configurables dans Settings → AI Agent
            </p>
          </div>
          <MessageCircle className="size-5 text-[var(--iris)]" />
        </div>
        {content}
      </section>
    );
  }

  return (
    <section className="fl-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Relance automatique</h2>
          <p className="text-xs fl-faint">
            Jusqu’à 3 tentatives · délais configurables
          </p>
        </div>
        <MessageCircle className="size-5 text-[var(--iris)]" />
      </div>
      {content}
    </section>
  );
}
