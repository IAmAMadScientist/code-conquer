import * as React from "react";
import { ToastProviderPrimitive, ToastRoot, ToastTitle, ToastDescription, ToastClose, ToastViewport } from "./toast";
import { useToast } from "./use-toast";
import { CheckCircle2, Info, AlertTriangle } from "lucide-react";

function VariantIcon({ variant }) {
  const cls = "h-4 w-4";
  if (variant === "success") return <CheckCircle2 className={cls} />;
  if (variant === "destructive") return <AlertTriangle className={cls} />;
  return <Info className={cls} />;
}

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProviderPrimitive swipeDirection="up">
      {toasts.map((t) => (
        <ToastRoot
          key={t.id}
          variant={t.variant || "default"}
          open={true}
          onOpenChange={(open) => {
            if (!open) dismiss(t.id);
          }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-text">
              <VariantIcon variant={t.variant} />
            </div>
            <div className="min-w-0 flex-1">
              {t.title ? <ToastTitle>{t.title}</ToastTitle> : null}
              {t.description ? <ToastDescription>{t.description}</ToastDescription> : null}
            </div>
          </div>
          <ToastClose />
        </ToastRoot>
      ))}
      <ToastViewport />
    </ToastProviderPrimitive>
  );
}
