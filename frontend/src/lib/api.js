// Central API base used across the frontend.
//
// Deployment: keep it relative so it works behind an HTTPS reverse proxy.
// Dev: Vite proxies /api -> http://localhost:8080 (see vite.config.js).

export const API_BASE = (import.meta.env?.VITE_API_BASE || "/api").replace(/\/$/, "");
