import React from "react";
import "../ui/ui.css";

export function Badge({ className = "", children, ...props }) {
  return (
    <span className={`ui-badge ${className}`} {...props}>
      {children}
    </span>
  );
}
