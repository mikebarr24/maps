"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import Button from "./Button";

export type PopupProps = {
  children: ReactNode;
  onClose: () => void;
  title?: ReactNode;
};

export default function Popup({ children, onClose, title }: PopupProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const portalTarget = typeof document === "undefined" ? null : document.body;

  useEffect(() => {
    if (!portalTarget) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [portalTarget]);

  useEffect(() => {
    panelRef.current?.focus();
  }, [portalTarget]);

  useEffect(() => {
    if (!portalTarget) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, portalTarget]);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-2000 flex items-center justify-center px-4 sm:px-0"
      role="dialog"
      aria-modal="true"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-overlay backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-lg focus:outline-none"
      >
        <div
          className={`flex items-start gap-4 ${
            title ? "justify-between" : "justify-end"
          }`}
        >
          {title ? <div className="min-w-0 flex-1">{title}</div> : null}
          <Button
            aria-label="Close popup"
            className="shrink-0 shadow-sm"
            onClick={onClose}
            size="icon"
            variant="secondary"
          >
            <FiX aria-hidden="true" size={18} />
          </Button>
        </div>
        <div className={title ? "mt-3" : undefined}>{children}</div>
      </div>
    </div>,
    portalTarget,
  );
}
