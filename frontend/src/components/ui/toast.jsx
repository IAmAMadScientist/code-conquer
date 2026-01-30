import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cn } from "../../lib/utils";

export const ToastViewport = React.forwardRef(function ToastViewport({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed z-[9999] flex max-h-screen w-full flex-col gap-2 p-4",
        "top-0 items-center",
        "sm:top-0 sm:right-0 sm:w-[420px] sm:items-end",
        className
      )}
      {...props}
    />
  );
});

export const ToastRoot = React.forwardRef(function ToastRoot({ className, variant = "default", ...props }, ref) {
  const variantClass =
    variant === "success"
      ? "border-l-4 border-l-emerald-500"
      : variant === "info"
        ? "border-l-4 border-l-sky-500"
        : variant === "destructive"
          ? "border-l-4 border-l-rose-500"
          : "";
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        "group pointer-events-auto relative w-full overflow-hidden rounded-lg border border-border",
        "bg-surface shadow-panel",
        "px-4 py-3",
        variantClass,
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2",
        className
      )}
      {...props}
    />
  );
});

export const ToastTitle = React.forwardRef(function ToastTitle({ className, ...props }, ref) {
  return <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />;
});

export const ToastDescription = React.forwardRef(function ToastDescription({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Description
      ref={ref}
      className={cn("mt-1 text-xs text-muted", className)}
      {...props}
    />
  );
});

export const ToastClose = React.forwardRef(function ToastClose({ className, ...props }, ref) {
  return (
    <ToastPrimitives.Close
      ref={ref}
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-muted opacity-0 transition",
        "group-hover:opacity-100 focus:opacity-100 focus:outline-none",
        className
      )}
      {...props}
    >
      ✕
    </ToastPrimitives.Close>
  );
});

export const ToastProviderPrimitive = ToastPrimitives.Provider;