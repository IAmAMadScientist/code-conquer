import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-surface px-3",
        "text-sm outline-none",
        "placeholder:text-muted",
        "focus:ring-2 focus:ring-border",
        "disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
});