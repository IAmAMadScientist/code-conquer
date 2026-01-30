import React from "react";
import { cn } from "../../lib/utils";

export function Button({
  variant = "secondary", // "primary" | "secondary" | "ghost" | "success" | "danger"
  className = "",
  ...props
}) {
  const base =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-s4 py-s3 text-fs1 font-medium " +
    "transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-border";

  const variants = {
    primary: "bg-text text-bg0 hover:opacity-90",
    secondary: "bg-surface2 text-text border border-border hover:bg-surface",
    ghost: "bg-transparent text-text hover:bg-surface2",
    success: "bg-emerald-600 text-white hover:bg-emerald-500",
    danger: "bg-red-600 text-white hover:bg-red-500",
  };

  return (
    <button
      className={cn(base, variants[variant] ?? variants.secondary, className)}
      {...props}
    />
  );
}
