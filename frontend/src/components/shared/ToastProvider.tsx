"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import { useToast } from "../../hooks/useToast";
import { ToastContainer } from "./Toast";

const ToastContext = createContext<ReturnType<typeof useToast> | null>(null);

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    // Return a no-op toast if not in provider (for graceful degradation)
    return {
      toasts: [],
      success: () => "",
      error: () => "",
      info: () => "",
      warning: () => "",
      dismiss: () => {},
    };
  }
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {mounted && <ToastContainer toasts={toast.toasts} onDismiss={toast.dismiss} />}
    </ToastContext.Provider>
  );
}

