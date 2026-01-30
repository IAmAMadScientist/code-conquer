import React from "react";
import { cn } from "../../lib/utils";

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface shadow-panel",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }) {
  return (
    <div className={cn("p-s5", className)} {...props}>
      {children}
    </div>
  );
}
