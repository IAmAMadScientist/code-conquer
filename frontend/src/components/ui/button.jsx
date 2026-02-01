import React from "react";
import { cn } from "../../lib/utils";

export function Button({
  variant = "secondary", // "primary" | "secondary" | "ghost" | "success" | "danger"
  className = "",
  ...props
}) {
  // We now rely on the robust classes defined in ui.css for the visual theme
  const base = "ui-btn";

  const variants = {
    primary: "ui-btnPrimary",
    secondary: "ui-btnSecondary",
    ghost: "ui-btnGhost",
    // Fallback for success/danger if not explicitly defined in ui.css yet, 
    // but we can map them to primary/secondary with override classes if needed.
    // For now, let's keep them as Tailwind overrides on top of the base.
    success: "bg-emerald-600 border-emerald-500/30 text-white hover:bg-emerald-500 shadow-[0_4px_14px_rgba(16,185,129,0.4)]",
    danger: "bg-red-600 border-red-500/30 text-white hover:bg-red-500 shadow-[0_4px_14px_rgba(220,38,38,0.4)]",
  };

  return (
    <button
      className={cn(base, variants[variant] ?? variants.secondary, className)}
      {...props}
    />
  );
}
