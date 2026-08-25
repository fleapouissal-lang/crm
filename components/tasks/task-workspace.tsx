"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  GitBranch,
  Link2,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
} from "lucide-react";
import type {
  Profile,
  TaskDependencyRelation,
  TaskResourceKind,
  TaskStatus,
  TaskWorkspaceData,
} from "@/types/database";
import {
  addTaskComment,
  addTaskDependency,
  addTaskResource,
  addTaskSubtask,
  toggleTaskSubtask,
} from "@/lib/actions/tasks";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "À faire",
  in_progress: "En cours",
  review: "À vérifier",
  testing: "Terminé",
};

const RELATION_LABELS: Record<TaskDependencyRelation, string> = {
  depends_on: "Dépend de",
  blocks: "Bloque",
  relates_to: "Liée à",
};

const RESOURCE_LABELS: Record<TaskResourceKind, string> = {
  link: "Lien",
  github: "GitHub",
  document: "Document",
  design: "Design",
  file: "Fichier",
};

export function TaskWorkspace({
  taskId,
  workspace,
  profiles,
  canEdit,
  status,
  onMoveToStatus,
}: {
  taskId: string;
  workspace: TaskWorkspaceData;
  profiles: Profile[];
  canEdit: boolean;
  status: TaskStatus;
  onMoveToStatus: (status: TaskStatus) => void;
}) {
  const [subtasks, setSubtasks] = useState(workspace.subtasks);
  const [dependencies, setDependencies] = useState(workspace.dependencies);
  const [resources, setResources] = useState(workspace.resources);
  const [comments, setComments] = useState(workspace.comments);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [comment, setComment] = useState("");
  const [relation, setRelation] = useState<TaskDependencyRelation>("depends_on");
  const [relatedTaskId, setRelatedTaskId] = useState("");
  const [resource, setResource] = useState<{ label: string; url: string; kind: TaskResourceKind }>({
    label: "",
    url: "",
    kind: "link",
  });
  const [busy, setBusy] = useState(false);

  const suggestedStatus: TaskStatus | null =
    status === "backlog" || status === "todo"
      ? "in_progress"
      : status === "in_progress"
        ? "review"
        : status === "review"
          ? "testing"
          : null;

  async function run<T>(action: () => Promise<{ success: true; data: T } | { success: false; error: string }>, onSuccess: (data: T) => void) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.success) {
      window.alert(result.error);
      return;
    }
    onSuccess(result.data);
  }

  const timeline = [
    ...comments.map((item) => ({
      id: `comment-${item.id}`,
      date: item.created_at,
      label: item.profile?.full_name || "Membre",
      body: item.body,
      icon: <MessageSquare className="size-4" />,
    })),
    ...workspace.activities.map((item) => ({
      id: `activity-${item.id}`,
      date: item.created_at,
      label: item.profile?.full_name || "Système",
      body: item.message,
      icon: <Activity className="size-4" />,
    })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return (
    <div className="grid gap-[18px] lg:grid-cols-[1.3fr_1fr]">
      <section className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3 className="flex items-center gap-2"><ListChecks className="size-4" /> Sous-tâches</h3>
            <div className="ch-sub">Découpez le travail et cochez chaque étape</div>
          </div>
          <span className="fl-badge">{subtasks.filter((item) => item.is_completed).length}/{subtasks.length}</span>
        </div>
        <div className="fl-pad space-y-3">
          {subtasks.length ? (
            <div className="space-y-2">
              {subtasks.map((item) => (
                <label key={item.id} className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    disabled={!canEdit || busy}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setSubtasks((current) => current.map((entry) => entry.id === item.id ? { ...entry, is_completed: checked } : entry));
                      void run(() => toggleTaskSubtask(item.id, checked), () => undefined);
                    }}
                    className="size-4 accent-[var(--brand)]"
                  />
                  <span className={cn("text-sm", item.is_completed && "text-[var(--text-dim)] line-through")}>{item.title}</span>
                </label>
              ))}
            </div>
          ) : <p className="text-sm fl-faint">Aucune sous-tâche pour le moment.</p>}
          {canEdit ? (
            <div className="flex gap-2">
              <Input className="fl-inp" value={subtaskTitle} onChange={(event) => setSubtaskTitle(event.target.value)} placeholder="Ajouter une étape…" />
              <button
                type="button"
                className="fl-btn sm primary"
                disabled={!subtaskTitle.trim() || busy}
                onClick={() => void run(() => addTaskSubtask(taskId, subtaskTitle), (item) => { setSubtasks((current) => [...current, item]); setSubtaskTitle(""); })}
              ><Plus className="size-4" /> Ajouter</button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3 className="flex items-center gap-2"><ArrowRight className="size-4" /> Étape suivante</h3>
            <div className="ch-sub">Une action claire selon l’état de la tâche</div>
          </div>
        </div>
        <div className="fl-pad space-y-3">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-sm">
            {status === "testing" ? "Documenter le résultat et clôturer la tâche." : status === "review" ? "Vérifier les critères d’acceptation et demander la validation." : "Commencer l’exécution et ajouter un premier résultat."}
          </div>
          {suggestedStatus && canEdit ? (
            <button type="button" className="fl-btn sm primary" disabled={busy} onClick={() => onMoveToStatus(suggestedStatus)}>
              Passer à « {STATUS_LABELS[suggestedStatus]} » <ArrowRight className="size-4" />
            </button>
          ) : null}
        </div>
      </section>

      <section className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3 className="flex items-center gap-2"><GitBranch className="size-4" /> Dépendances</h3>
            <div className="ch-sub">Ce qui bloque, dépend de cette tâche ou lui est lié</div>
          </div>
        </div>
        <div className="fl-pad space-y-3">
          {dependencies.length ? dependencies.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm">
              <span className="text-[var(--text-dim)]">{RELATION_LABELS[item.relation]}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{item.related_task?.title ?? item.related_task_id}</span>
              <span className="text-xs fl-faint">{item.related_task ? STATUS_LABELS[item.related_task.status] : "—"}</span>
            </div>
          )) : <p className="text-sm fl-faint">Aucune dépendance déclarée.</p>}
          {canEdit ? (
            <div className="grid gap-2 sm:grid-cols-[.8fr_1.6fr_auto]">
              <select className="fl-inp" value={relation} onChange={(event) => setRelation(event.target.value as TaskDependencyRelation)}>
                {Object.entries(RELATION_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <select className="fl-inp" value={relatedTaskId} onChange={(event) => setRelatedTaskId(event.target.value)}>
                <option value="">Choisir une tâche…</option>
                {workspace.availableTasks.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
              <button type="button" className="fl-btn sm primary" disabled={!relatedTaskId || busy} onClick={() => void run(() => addTaskDependency(taskId, relatedTaskId, relation), (item) => { setDependencies((current) => [item, ...current.filter((entry) => entry.id !== item.id)]); setRelatedTaskId(""); })}>Ajouter</button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="fl-card">
        <div className="fl-card-head">
          <div>
            <h3 className="flex items-center gap-2"><Link2 className="size-4" /> Fichiers et liens</h3>
            <div className="ch-sub">GitHub, documents, designs et autres références</div>
          </div>
        </div>
        <div className="fl-pad space-y-3">
          {resources.length ? resources.map((item) => (
            <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm hover:border-[var(--brand)]">
              {item.kind === "file" ? <Paperclip className="size-4" /> : item.kind === "github" ? <GitBranch className="size-4" /> : <ExternalLink className="size-4" />}
              <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
              <span className="text-xs fl-faint">{RESOURCE_LABELS[item.kind]}</span>
            </a>
          )) : <p className="text-sm fl-faint">Aucun lien ou fichier associé.</p>}
          {canEdit ? (
            <div className="grid gap-2 sm:grid-cols-[.8fr_1.2fr_1fr_auto]">
              <select className="fl-inp" value={resource.kind} onChange={(event) => setResource((current) => ({ ...current, kind: event.target.value as TaskResourceKind }))}>
                {Object.entries(RESOURCE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
              <Input className="fl-inp" value={resource.label} onChange={(event) => setResource((current) => ({ ...current, label: event.target.value }))} placeholder="Nom du lien" />
              <Input className="fl-inp" value={resource.url} onChange={(event) => setResource((current) => ({ ...current, url: event.target.value }))} placeholder="https://…" />
              <button type="button" className="fl-btn sm primary" disabled={!resource.label.trim() || !resource.url.trim() || busy} onClick={() => void run(() => addTaskResource(taskId, resource), (item) => { setResources((current) => [item, ...current]); setResource({ label: "", url: "", kind: "link" }); })}>Ajouter</button>
            </div>
          ) : null}
        </div>
      </section>

      <section className="fl-card lg:col-span-2">
        <div className="fl-card-head">
          <div>
            <h3 className="flex items-center gap-2"><Activity className="size-4" /> Activité et commentaires</h3>
            <div className="ch-sub">Historique des changements, commentaires et décisions</div>
          </div>
          <Clock3 className="size-4 fl-faint" />
        </div>
        <div className="fl-pad grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-3">
            <Textarea className="fl-inp min-h-[100px] resize-y" value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Ajouter un commentaire ou une décision…" disabled={!canEdit || busy} />
            {canEdit ? <button type="button" className="fl-btn sm primary" disabled={!comment.trim() || busy} onClick={() => void run(() => addTaskComment(taskId, comment), (item) => { setComments((current) => [item, ...current]); setComment(""); })}><MessageSquare className="size-4" /> Commenter</button> : null}
          </div>
          <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
            {timeline.length ? timeline.map((item) => (
              <div key={item.id} className="flex gap-3 border-b border-[var(--line)] pb-3 last:border-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--brand)]">{item.icon}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs"><strong>{item.label}</strong><span className="fl-faint">{format(new Date(item.date), "d MMM yyyy · HH:mm")}</span></div>
                  <p className="mt-1 text-sm text-[var(--text-dim)]">{item.body}</p>
                </div>
              </div>
            )) : <p className="text-sm fl-faint">Aucune activité pour le moment.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
