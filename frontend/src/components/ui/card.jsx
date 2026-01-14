import React from "react";
import "../ui/ui.css";

export function Card({ className = "", children, ...props }) {
  return (
    <div className={`ui-card ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }) {
  return (
    <div className={`ui-cardContent ${className}`} {...props}>
      {children}
    </div>
  );
}
