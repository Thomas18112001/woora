"use client";

import { useEffect } from "react";

export type ToastItem = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

export function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: number) => void }) {
  useEffect(() => {
    if (items.length === 0) return;
    const timers = items.map((item) => window.setTimeout(() => onDismiss(item.id), 3500));
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [items, onDismiss]);

  return (
    <div className="fixed right-4 top-4 z-[70] space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`animate-modal-in min-w-[260px] rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur-sm ${
            item.type === "success"
              ? "border-emerald-300 bg-emerald-50/95 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-200"
              : item.type === "error"
                ? "border-red-300 bg-red-50/95 text-red-800 dark:border-red-700 dark:bg-red-950/45 dark:text-red-200"
                : "border-woora-light bg-white/95 text-woora-primary dark:border-slate-700 dark:bg-slate-900/95 dark:text-woora-light"
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
