import { useState } from "react";

interface Toast {
  title: string;
  description: string;
  variant?: "default" | "success" | "destructive";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (newToast: Toast) => {
    setToasts((prevToasts) => [...prevToasts, newToast]);
    console.log(`[Toast] ${newToast.variant || "default"}: ${newToast.title} - ${newToast.description}`);
  };

  return { toast, toasts };
}