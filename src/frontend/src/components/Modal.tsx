import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  ocid?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "md",
  ocid,
}: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
  };

  return (
    <dialog
      open
      className="fixed inset-0 m-0 bg-black/50 w-screen h-screen max-w-none max-h-none flex items-center justify-center z-[100] p-4 border-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      data-ocid={ocid ? `${ocid}.dialog` : undefined}
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        className={`bg-card border border-border rounded-2xl shadow-elevated w-full ${widths[maxWidth]} animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="document"
      >
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2
              id="modal-title"
              className="font-display font-semibold text-foreground"
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
              data-ocid={ocid ? `${ocid}.close_button` : "modal.close_button"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
