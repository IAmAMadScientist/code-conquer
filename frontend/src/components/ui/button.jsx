import React from "react";
import "../ui/ui.css";

export function Button({
  variant = "secondary", // "primary" | "secondary" | "ghost" | "success" | "danger"
  className = "",
  ...props
}) {
  const v =
    variant === "primary"
      ? "ui-btn ui-btnPrimary"
      : variant === "ghost"
        ? "ui-btn ui-btnGhost"
        : variant === "success"
          ? "ui-btn ui-btnSuccess"
          : variant === "danger"
            ? "ui-btn ui-btnDanger"
            : "ui-btn";

  return <button className={`${v} ${className}`} {...props} />;
}
