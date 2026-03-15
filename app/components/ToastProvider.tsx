"use client";

import { Toaster } from "sonner";

export default function ToastProvider() {
  return (
    <Toaster
      closeButton
      position="bottom-right"
      richColors
      theme="system"
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
    />
  );
}
