"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ToastItem, ToastStack } from "@/components/ui/toast";

type Attachment = {
  id: string;
  filename: string;
  sizeBytes: number;
  createdAt: string | Date;
};

type ProjectDetail = {
  id: string;
  name: string;
  clientName: string | null;
  status: string;
  hourlyRate: number | null;
  tags: string[];
  attachments: Attachment[];
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: "TODO" | "IN_PROGRESS" | "DONE";
    priority: string;
    tags: string[];
    estimateMinutes: number | null;
    createdAt: string | Date;
    attachments: Attachment[];
  }>;
  timeEntries: Array<{
    id: string;
    startAt: string | Date;
    endAt: string | Date | null;
    durationSeconds: number;
    note: string | null;
    task: { id: string; title: string } | null;
  }>;
};

function nextToastId() {
  return Date.now() + Math.floor(Math.random() * 999);
}

const euro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function projectStatusLabel(status: string) {
  if (status === "ACTIVE") return "Actif";
  if (status === "ARCHIVED") return "Archivé";
  if (status === "COMPLETED") return "Terminé";
  return status;
}

function taskStatusLabel(status: string) {
  if (status === "TODO") return "À faire";
  if (status === "IN_PROGRESS") return "En cours";
  if (status === "DONE") return "Terminé";
  return status;
}

function priorityLabel(priority: string) {
  if (priority === "LOW") return "Basse";
  if (priority === "MEDIUM") return "Moyenne";
  if (priority === "HIGH") return "Haute";
  return priority;
}

export function ProjectDetailClient({ project }: { project: ProjectDetail }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(project.tasks);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskTagsInput, setTaskTagsInput] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"created" | "priority" | "status">("created");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [entries, setEntries] = useState(project.timeEntries);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryForm, setEntryForm] = useState({ startAt: "", endAt: "", note: "" });
  const [entrySaving, setEntrySaving] = useState(false);
  const [entryError, setEntryError] = useState("");
  const [uploading, setUploading] = useState(false);

  const totalLogged = useMemo(() => entries.reduce((acc, item) => acc + item.durationSeconds, 0), [entries]);

  const revenue = useMemo(() => {
    const rate = project.hourlyRate ?? 0;
    const hours = entries.reduce((acc, entry) => acc + entry.durationSeconds, 0) / 3600;
    return hours * rate;
  }, [entries, project.hourlyRate]);

  const filteredTasks = useMemo(() => {
    const lowered = query.toLowerCase().trim();
    const found = tasks.filter(
      (task) =>
        lowered.length === 0 ||
        task.title.toLowerCase().includes(lowered) ||
        task.tags.some((tag) => tag.toLowerCase().includes(lowered))
    );
    return [...found].sort((a, b) => {
      if (sort === "priority") return a.priority.localeCompare(b.priority);
      if (sort === "status") return a.status.localeCompare(b.status);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tasks, query, sort]);

  function pushToast(type: ToastItem["type"], message: string) {
    setToasts((prev) => [...prev, { id: nextToastId(), type, message }]);
  }

  async function createTask(event: FormEvent) {
    event.preventDefault();
    setError("");
    const tags = taskTagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, title, description: description || null, tags })
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error ?? "Impossible de créer la tâche");
      return;
    }
    const task = (await res.json()) as ProjectDetail["tasks"][number];
    setTasks((prev) => [{ ...task, attachments: [] }, ...prev]);
    setTitle("");
    setDescription("");
    setTaskTagsInput("");
    pushToast("success", "Tâche créée.");
  }

  async function start(projectId: string, taskId?: string) {
    try {
      const res = await fetch("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, taskId: taskId ?? null })
      });
      if (res.status === 409) {
        pushToast("error", "Un minuteur actif existe déjà.");
        return;
      }
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        pushToast("error", json.error ?? "Impossible de démarrer le minuteur.");
        return;
      }
      window.dispatchEvent(new Event("woora:timer-sync"));
      pushToast("success", "Minuteur démarré.");
      router.refresh();
    } catch {
      pushToast("error", "Connexion au serveur impossible.");
    }
  }

  async function removeTask(taskId: string) {
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    if (!res.ok) {
      pushToast("error", "Impossible de supprimer la tâche.");
      return;
    }
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    pushToast("success", "Tâche supprimée.");
  }

  async function updateTaskStatus(taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE") {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (!res.ok) {
      pushToast("error", "Impossible de mettre à jour la tâche.");
      return;
    }
    const updated = (await res.json()) as ProjectDetail["tasks"][number];
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? { ...task, ...updated } : task)));
  }

  async function uploadAttachment(file: File, taskId?: string) {
    setUploading(true);
    const formData = new FormData();
    formData.set("projectId", project.id);
    formData.set("file", file);
    if (taskId) formData.set("taskId", taskId);

    const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
    setUploading(false);

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      pushToast("error", json.error ?? "Échec de l'upload.");
      return;
    }

    pushToast("success", "Pièce jointe ajoutée.");
    router.refresh();
  }

  async function openEditEntry(entry: ProjectDetail["timeEntries"][number]) {
    setEditingEntryId(entry.id);
    setEntryError("");
    setEntryForm({
      startAt: toLocalInputValue(entry.startAt),
      endAt: entry.endAt ? toLocalInputValue(entry.endAt) : "",
      note: entry.note ?? ""
    });
  }

  async function saveEntry(entryId: string) {
    if (!entryForm.startAt) {
      setEntryError("La date de début est requise.");
      return;
    }
    if (entryForm.endAt && new Date(entryForm.endAt) < new Date(entryForm.startAt)) {
      setEntryError("La date de fin doit être postérieure à la date de début.");
      return;
    }

    setEntrySaving(true);
    setEntryError("");
    const res = await fetch(`/api/time-entries/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: new Date(entryForm.startAt).toISOString(),
        endAt: entryForm.endAt ? new Date(entryForm.endAt).toISOString() : null,
        note: entryForm.note
      })
    });

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      const message = json.error ?? "Impossible de modifier l'entrée de temps.";
      setEntryError(message);
      pushToast("error", message);
      setEntrySaving(false);
      return;
    }

    const updated = (await res.json()) as ProjectDetail["timeEntries"][number];
    setEntries((prev) => prev.map((entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)));
    setEditingEntryId(null);
    setEntrySaving(false);
    pushToast("success", "Entrée de temps mise à jour.");
  }

  return (
    <div className="space-y-6 fade-in">
      <ToastStack items={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <section className="surface-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {project.clientName || "Pas de client"} | {projectStatusLabel(project.status)}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Temps suivi : {(totalLogged / 3600).toFixed(2)} h</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Revenus estimés : {euro.format(revenue)}</p>
            {project.tags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {project.tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button onClick={() => start(project.id)} className="btn-base btn-secondary">
              Démarrer
            </button>
          </div>
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Pièces jointes projet</h2>
          <label className="btn-base btn-primary cursor-pointer text-sm">
            {uploading ? "Upload..." : "Ajouter un fichier"}
            <input
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAttachment(file);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
        <div className="space-y-2">
          {project.attachments.map((attachment) => (
            <a
              key={attachment.id}
              href={`/api/attachments/${attachment.id}`}
              target="_blank"
              className="surface-soft interactive-row flex items-center justify-between p-3 text-sm"
            >
              <span>{attachment.filename}</span>
              <span className="text-slate-500 dark:text-slate-400">{Math.round(attachment.sizeBytes / 1024)} Ko</span>
            </a>
          ))}
          {project.attachments.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Aucune pièce jointe.</p>
          ) : null}
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">Tâches</h2>
        <form onSubmit={createTask} className="mb-4 grid gap-3 md:grid-cols-4">
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Titre de la tâche"
            className="input-woora"
          />
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description"
            className="input-woora"
          />
          <input
            value={taskTagsInput}
            onChange={(event) => setTaskTagsInput(event.target.value)}
            placeholder="Tags (séparés par virgule)"
            className="input-woora"
          />
          <button className="btn-base btn-soft">Ajouter une tâche</button>
        </form>
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}

        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une tâche"
            className="input-woora"
          />
          <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="input-woora">
            <option value="created">Tri: plus récentes</option>
            <option value="priority">Tri: priorité</option>
            <option value="status">Tri: statut</option>
          </select>
        </div>

        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div key={task.id} className="surface-soft interactive-row p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {taskStatusLabel(task.status)} | {priorityLabel(task.priority)}
                  </p>
                  {task.tags.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {task.tags.map((tag) => (
                        <span key={tag} className="tag-pill">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                  <button
                    onClick={() =>
                      updateTaskStatus(
                        task.id,
                        task.status === "TODO" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "DONE" : "TODO"
                      )
                    }
                    className="btn-base btn-soft text-sm"
                  >
                    Statut suivant
                  </button>
                  <button onClick={() => start(project.id, task.id)} className="btn-base btn-secondary text-sm">
                    Démarrer
                  </button>
                  <label className="btn-base btn-soft cursor-pointer text-sm">
                    Fichier
                    <input
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadAttachment(file, task.id);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button onClick={() => setDeleteTaskId(task.id)} className="btn-base btn-danger text-sm">
                    Supprimer
                  </button>
                </div>
              </div>

              {task.attachments.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {task.attachments.map((attachment) => (
                    <a
                      key={attachment.id}
                      href={`/api/attachments/${attachment.id}`}
                      target="_blank"
                      className="block text-xs font-medium text-woora-primary underline decoration-2 underline-offset-2 dark:text-woora-light"
                    >
                      {attachment.filename}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
          {filteredTasks.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Aucune tâche pour le moment.</p> : null}
        </div>
      </section>

      <section className="surface-card p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">Entrées de temps récentes</h2>
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="surface-soft interactive-row p-3 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span>
                  {entry.task?.title || "Projet"} | {new Date(entry.startAt).toLocaleString("fr-FR")}
                </span>
                <span className="font-medium">
                  {entry.endAt ? `${(entry.durationSeconds / 3600).toFixed(2)} h` : "En cours"}
                </span>
              </div>
              {entry.note ? <p className="mt-1 text-slate-500 dark:text-slate-400">{entry.note}</p> : null}
              <div className="mt-2">
                <button onClick={() => void openEditEntry(entry)} className="btn-base btn-soft text-xs">
                  Modifier manuellement
                </button>
              </div>
            </div>
          ))}
          {entries.length === 0 ? <p className="text-sm text-slate-500 dark:text-slate-400">Aucune entrée pour le moment.</p> : null}
        </div>
      </section>

      <ConfirmModal
        open={Boolean(deleteTaskId)}
        title="Supprimer la tâche"
        description="Cette action supprimera définitivement la tâche et ses liens."
        cancelLabel="Annuler"
        confirmLabel="Supprimer"
        onCancel={() => setDeleteTaskId(null)}
        onConfirm={() => {
          if (deleteTaskId) {
            void removeTask(deleteTaskId);
            setDeleteTaskId(null);
          }
        }}
      />

      {editingEntryId ? (
        <div className="fixed inset-0 z-[79] flex items-center justify-center bg-black/35 px-4">
          <div className="surface-card animate-modal-in w-full max-w-lg p-5">
            <h3 className="text-xl font-bold">Édition manuelle</h3>
            <div className="mt-4 grid gap-3">
              <label className="text-sm">
                Début
                <input
                  type="datetime-local"
                  value={entryForm.startAt}
                  onChange={(event) => setEntryForm((prev) => ({ ...prev, startAt: event.target.value }))}
                  className="input-woora mt-1"
                />
              </label>
              <label className="text-sm">
                Fin
                <input
                  type="datetime-local"
                  value={entryForm.endAt}
                  onChange={(event) => setEntryForm((prev) => ({ ...prev, endAt: event.target.value }))}
                  className="input-woora mt-1"
                />
              </label>
              <label className="text-sm">
                Note
                <textarea
                  value={entryForm.note}
                  onChange={(event) => setEntryForm((prev) => ({ ...prev, note: event.target.value }))}
                  className="input-woora mt-1"
                  rows={3}
                />
              </label>
              {entryError ? <p className="text-sm text-red-600">{entryError}</p> : null}
              <div className="mt-2 flex justify-end gap-2">
                <button onClick={() => setEditingEntryId(null)} className="btn-base btn-soft text-sm">
                  Annuler
                </button>
                <button
                  onClick={() => void saveEntry(editingEntryId)}
                  disabled={entrySaving}
                  className="btn-base btn-primary text-sm"
                >
                  {entrySaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function toLocalInputValue(value: string | Date) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}
