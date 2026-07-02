import * as React from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "md",
}) => {
  const titleId = React.useId();
  const bodyId = React.useId();

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let maxWClass = "max-w-md";
  switch (maxWidth) {
    case "sm":
      maxWClass = "max-w-sm";
      break;
    case "md":
      maxWClass = "max-w-md";
      break;
    case "lg":
      maxWClass = "max-w-lg";
      break;
    case "xl":
      maxWClass = "max-w-xl";
      break;
    case "2xl":
      maxWClass = "max-w-2xl";
      break;
    case "3xl":
      maxWClass = "max-w-3xl";
      break;
    case "4xl":
      maxWClass = "max-w-4xl";
      break;
    case "5xl":
      maxWClass = "max-w-5xl";
      break;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog Content */}
      <div
        className={`relative z-10 w-full ${maxWClass} transform overflow-hidden rounded-lg bg-card border border-border text-card-foreground shadow-2xl transition-all flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 id={titleId} className="text-lg font-semibold leading-6">{title}</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4.5 w-4.5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Body */}
        <div id={bodyId} className="flex-1 overflow-y-auto p-6 text-sm text-muted-foreground">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border bg-muted/30 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
