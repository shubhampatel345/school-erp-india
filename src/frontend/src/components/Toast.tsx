import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "success")
    return <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />;
  if (type === "error")
    return <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />;
  return <Info className="w-4 h-4 text-primary flex-shrink-0" />;
}

function Toast({
  toast,
  onDismiss,
}: { toast: ToastData; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 5000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="flex items-start gap-3 bg-card border border-border rounded-xl shadow-elevated px-4 py-3 min-w-[280px] max-w-[380px] animate-slide-up"
      data-ocid="toast"
      role="alert"
    >
      <ToastIcon type={toast.type} />
      <p className="flex-1 text-sm text-foreground">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        aria-label="Dismiss"
        data-ocid="toast.close_button"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: ToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-4 z-[9000] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
