import React from "react";
import { cn } from "../../lib/utils";

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={cn("ui-card", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }) {
  return (
    <div className={cn("ui-cardContent", className)} {...props}>
      {children}
    </div>
  );
}
