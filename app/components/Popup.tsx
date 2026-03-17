"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { FiX } from "react-icons/fi";
import Button from "./Button";

export type PopupProps = {
  children: ReactNode;
  onClose: () => void;
};

export default function Popup({ children, onClose }: PopupProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center"
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
        <Button
          aria-label="Close popup"
          className="absolute right-4 top-4"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <FiX size={18} />
        </Button>
        {children}
      </div>
    </div>,
    portalTarget,
  );
}
