import React from "react";
import { cn } from "../../lib/utils";

export function Badge({ className = "", children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-surface2 px-s3 py-[2px] text-fs0 text-muted",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
