"use client";

import Link from "next/link";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ToastItem, ToastStack } from "@/components/ui/toast";

type Project = {
  id: string;
  name: string;
  clientName: string | null;
  status: "ACTIVE" | "ARCHIVED" | "COMPLETED";
  tags: string[];
  _count: { tasks: number; timeEntries: number };
};

function statusLabel(status: Project["status"]) {
  if (status === "ACTIVE") return "Actif";
  if (status === "ARCHIVED") return "Archivé";
  return "Terminé";
}

function nextToastId() {
  return Date.now() + Math.floor(Math.random() * 999);
}

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Project["status"]>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "tasks" | "entries">("name");
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const pushToast = useCallback((type: ToastItem["type"], message: string) => {
    setToasts((prev) => [...prev, { id: nextToastId(), type, message }]);
  }, []);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clientName: clientName || null, tags })
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error ?? "Impossible de créer le projet");
        return;
      }
      const project = (await res.json()) as Omit<Project, "_count">;
      setProjects((prev) => [{ ...project, _count: { tasks: 0, timeEntries: 0 } }, ...prev]);
      setName("");
      setClientName("");
      setTagsInput("");
      pushToast("success", "Projet créé avec succès.");
    } finally {
      setLoading(false);
    }
  }

  async function startTimer(projectId: string) {
    try {
      const res = await fetch("/api/timer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
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

  async function deleteProject(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      pushToast("error", json.error ?? "Impossible de supprimer le projet.");
      return;
    }
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    pushToast("success", "Projet supprimé.");
  }

  const filteredProjects = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const subset = projects.filter((project) => {
      const matchQuery =
        lowered.length === 0 ||
        project.name.toLowerCase().includes(lowered) ||
        (project.clientName ?? "").toLowerCase().includes(lowered) ||
        project.tags.some((tag) => tag.toLowerCase().includes(lowered));
      const matchStatus = statusFilter === "ALL" || project.status === statusFilter;
      return matchQuery && matchStatus;
    });

    return [...subset].sort((a, b) => {
      if (sortBy === "tasks") return b._count.tasks - a._count.tasks;
      if (sortBy === "entries") return b._count.timeEntries - a._count.timeEntries;
      return a.name.localeCompare(b.name, "fr");
    });
  }, [projects, query, statusFilter, sortBy]);

  return (
    <div className="space-y-6 fade-in">
      <ToastStack items={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <form onSubmit={createProject} className="surface-card grid gap-3 p-4 md:grid-cols-4">
        <input
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nom du projet"
          className="input-woora"
        />
        <input
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
          placeholder="Nom du client (optionnel)"
          className="input-woora"
        />
        <input
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          placeholder="Tags (ex: dev, urgent)"
          className="input-woora"
        />
        <button disabled={loading} className="btn-base btn-primary">
          {loading ? "Création..." : "Créer le projet"}
        </button>
        {error ? <p className="text-sm text-red-600 md:col-span-4">{error}</p> : null}
      </form>

      <section className="surface-card grid gap-3 p-4 md:grid-cols-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher un projet, client ou tag"
          className="input-woora"
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          className="input-woora"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="ACTIVE">Actif</option>
          <option value="ARCHIVED">Archivé</option>
          <option value="COMPLETED">Terminé</option>
        </select>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
          className="input-woora"
        >
          <option value="name">Tri: Nom</option>
          <option value="tasks">Tri: Nb tâches</option>
          <option value="entries">Tri: Nb entrées</option>
        </select>
      </section>

      <div className="grid gap-3">
        {filteredProjects.map((project) => (
          <div key={project.id} className="surface-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">{project.name}</h2>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {project.clientName || "Pas de client"} | {statusLabel(project.status)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {project._count.tasks} tâches | {project._count.timeEntries} entrées
                </p>
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
              <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                <button onClick={() => startTimer(project.id)} className="btn-base btn-secondary text-sm">
                  Démarrer
                </button>
                <Link href={`/projects/${project.id}`} className="btn-base btn-primary text-sm">
                  Ouvrir
                </Link>
                <button onClick={() => setProjectToDelete(project)} className="btn-base btn-danger text-sm">
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
        {filteredProjects.length === 0 ? (
          <div className="surface-card border-dashed p-8 text-center text-sm text-slate-500 dark:text-slate-300">
            Aucun projet ne correspond aux filtres.
          </div>
        ) : null}
      </div>

      <ConfirmModal
        open={Boolean(projectToDelete)}
        title="Supprimer le projet"
        description={`Confirmez la suppression du projet « ${projectToDelete?.name ?? ""} ».`}
        cancelLabel="Annuler"
        confirmLabel="Supprimer"
        onCancel={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) {
            void deleteProject(projectToDelete.id);
            setProjectToDelete(null);
          }
        }}
      />
    </div>
  );
}
