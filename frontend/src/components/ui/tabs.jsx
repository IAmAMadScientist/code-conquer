import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md border border-border bg-surface p-1",
        className
      )}
      {...props}
    />
  );
});

export const TabsTrigger = React.forwardRef(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium",
        "text-muted data-[state=active]:text-text data-[state=active]:bg-surface2",
        "focus:outline-none focus:ring-2 focus:ring-border",
        className
      )}
      {...props}
    />
  );
});

export const TabsContent = React.forwardRef(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn("mt-2 ring-offset-bg0 focus:outline-none focus:ring-2 focus:ring-border", className)}
      {...props}
    />
  );
});
