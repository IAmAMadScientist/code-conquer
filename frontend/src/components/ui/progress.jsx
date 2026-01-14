import React from "react";
import "../ui/ui.css";

export function Progress({ value = 0 }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="ui-progress" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className="ui-progressBar" style={{ width: `${v}%` }} />
    </div>
  );
}
