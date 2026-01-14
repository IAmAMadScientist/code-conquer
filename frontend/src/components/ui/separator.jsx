import React from "react";
import "../ui/ui.css";

export function Separator({ className = "" }) {
  return <hr className={`ui-sep ${className}`} />;
}
