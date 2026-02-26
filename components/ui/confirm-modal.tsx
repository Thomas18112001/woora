"use client";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 px-4">
      <div className="surface-card animate-modal-in w-full max-w-md p-5">
        <h3 className="text-lg font-bold text-woora-primary dark:text-woora-light">{title}</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn-base btn-soft text-sm">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="btn-base btn-danger text-sm">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
