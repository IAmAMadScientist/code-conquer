import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import "./styles/globals.css";
// Phase 1 Tailwind migration: keep legacy UI styles to avoid breaking.
// We'll migrate these classes to Tailwind in later phases.
import "./components/ui/ui.css";


createRoot(document.getElementById('root')).render(
  // NOTE: React 18 StrictMode intentionally double-invokes effects in development.
  // Our turn-based backend locks a turn when a challenge is fetched; a duplicate
  // fetch during the StrictMode dev double-invocation causes HTTP 423 (Locked).
  // Removing StrictMode here avoids triggering a second fetch and matches
  // production behavior.
  <App />,
)
