import * as React from "react";

// A tiny toast store (shadcn-like), implemented without external state libs.

const ToastContext = React.createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]); // {id, title, description, ...}

  const dismiss = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback((t) => {
    const id = crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    const next = { id, duration: 2400, ...t };
    setToasts((prev) => [...prev, next]);
    if (next.duration && next.duration > 0) {
      window.setTimeout(() => dismiss(id), next.duration);
    }
    return { id, dismiss: () => dismiss(id) };
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, toasts, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => ({ id: "", dismiss: () => {} }),
      toasts: [],
      dismiss: () => {},
    };
  }
  return ctx;
}
