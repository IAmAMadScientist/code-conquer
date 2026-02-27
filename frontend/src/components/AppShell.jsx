import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { playUiTap, useHapticsSetting, useSoundSetting } from "../lib/diceSound";
import InfoCenter from "./InfoCenter";
import { getSession, isSessionStarted } from "../lib/session";
import { cn } from "../lib/utils";

/**
 * Viewport App Shell.
 *
 * Structure:
 * - Root: Fixed 100dvh flex-column (no window scroll).
 * - Header: Fixed height, never scrolls.
 * - Main: Flex-1, scrollable internally.
 * - Footer: Fixed height, always visible at bottom.
 */
export default function AppShell({
  title = "Code & Conquer",
  subtitle = null,
  headerBadges = null,
  showTabs = false,
  activeTab = null,
  backTo = null,
  /** Optional secondary panel shown on desktop (e.g. instructions, QR, stats). */
  rightPanel = null,
  /** Optional action bar content (typically buttons). Renders in the bottom action bar on mobile. */
  actions = null,
  showBrand = false,
  /** WebSocket connection status from useGameSocket */
  socketStatus = null,
  children,
}) {
  const nav = useNavigate();
  const loc = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useSoundSetting();
  const [hapticsEnabled, setHapticsEnabled] = useHapticsSetting();

  const showBack = backTo !== false && (loc?.pathname || "/") !== "/";

  const hasSession = !!getSession()?.sessionId;
  const startedFlag = hasSession && isSessionStarted();

  const tabs = useMemo(() => {
    const playLabel = startedFlag ? "Play" : "Lobby";
    const playTo = startedFlag ? "/play" : "/lobby";

    return [
      { key: "play", label: playLabel, icon: "🎲", to: playTo },
      { key: "leaderboard", label: "Scores", icon: "🏆", to: "/leaderboard" },
      { key: "info", label: "Info", icon: "ℹ️", to: null },
    ];
  }, [startedFlag, hasSession]);

  const resolvedActiveTab = useMemo(() => {
    if (activeTab) return activeTab;
    const p = loc?.pathname || "";
    if (p.startsWith("/leaderboard")) return "leaderboard";
    return "play";
  }, [activeTab, loc?.pathname]);

  function goBack() {
    if (backTo) nav(backTo);
    else nav(-1);
  }

  return (
    // ROOT: Locked to viewport height, Flex Column.
    <div className="h-[100dvh] w-full flex flex-col bg-bg0 text-text overflow-hidden pt-[env(safe-area-inset-top)]">
      
      {/* HEADER: Rigid, non-scrolling */}
      <header className="flex-none z-30 bg-bg0 backdrop-blur border-b border-border">
        <div className="px-s3 py-s2 flex items-center justify-between gap-s2">
          <div className="flex items-center gap-s2 min-w-0 flex-1">
            {showBack ? (
              <button
                type="button"
                aria-label="Back"
                onClick={() => { playUiTap(); goBack(); }}
                className="h-8 w-8 rounded-lg bg-surface border border-border flex items-center justify-center text-fs2 active:scale-95 transition-transform shrink-0"
              >
                ‹
              </button>
            ) : null}

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-fs1 font-black truncate uppercase tracking-tighter shrink-0">{title}</div>
                {socketStatus && (
                  <div 
                    title={`Uplink: ${socketStatus}`}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-colors",
                      socketStatus === 'connected' ? "bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" : 
                      socketStatus === 'connecting' ? "bg-amber-500 animate-bounce" : "bg-rose-500"
                    )}
                  />
                )}
              </div>
              {subtitle && <div className="text-[10px] font-bold text-muted truncate uppercase tracking-widest leading-none mt-0.5">{subtitle}</div>}
            </div>
            
            {headerBadges && (
              <div className="flex items-center gap-s1 min-w-0 overflow-hidden ml-auto pr-2">
                {headerBadges}
              </div>
            )}
          </div>

          <OptionsDropdown
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            hapticsEnabled={hapticsEnabled}
            setHapticsEnabled={setHapticsEnabled}
          />
        </div>
      </header>

      {/* MAIN: Consumes all available space, handles own scroll */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative scroll-smooth">
        <div className="min-h-full flex flex-col">
          {/* Main Layout Grid */}
          <div className={"flex-1 p-s4 grid gap-s4 " + (rightPanel ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "grid-cols-1")}>
            
            {/* Primary Content */}
            <section className="min-w-0 flex flex-col gap-s4">
              {children}
            </section>

            {/* Desktop Side Panel */}
            {rightPanel ? (
              <aside className="hidden lg:flex flex-col gap-s4 min-w-0">
                <div className="sticky top-s4">
                  {rightPanel}
                </div>
              </aside>
            ) : null}
          </div>
        </div>
      </main>

      {/* FOOTER: Rigid, always visible */}
      {(actions || showTabs) && (
        <div className="flex-none z-40 bg-bg0/90 backdrop-blur border-t border-border pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
          
          {/* Action Bar (Buttons) */}
          {actions && (
            <div className="px-s4 py-s3 flex items-center gap-s3">
              {actions}
            </div>
          )}

          {/* Tab Bar (Navigation) */}
          {showTabs && (
            <nav className="grid grid-cols-3 max-w-md mx-auto w-full">
              {tabs.map((t) => {
                const active = resolvedActiveTab === t.key;
                return (
                  <button
                    key={t.key}
                    className="group relative h-14 flex flex-col items-center justify-center gap-1"
                    onClick={() => {
                      playUiTap();
                      if (t.key === "info") {
                        setSheetOpen(true);
                        return;
                      }
                      if (t.to) nav(t.to);
                    }}
                  >
                    {/* Active Indicator */}
                    {active && (
                      <div className="absolute top-0 w-8 h-1 bg-indigo-500 rounded-b-full shadow-[0_0_10px_rgba(99,102,241,0.6)]" />
                    )}
                    
                    <div className={"text-2xl transition-transform duration-200 " + (active ? "scale-110 -translate-y-0.5" : "group-hover:scale-105 opacity-60")}>
                      {t.icon}
                    </div>
                    <div className={"text-[10px] font-bold uppercase tracking-wider transition-colors " + (active ? "text-indigo-300" : "text-muted")}>
                      {t.label}
                    </div>
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      )}

      {/* Info Sheet Overlay */}
      <div
        className={
          "fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4 transition-all duration-300 " +
          (sheetOpen ? "pointer-events-auto visible" : "pointer-events-none invisible")
        }
      >
        {/* Backdrop */}
        <div
          className={"absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 " + (sheetOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setSheetOpen(false)}
        />
        
        {/* Sheet Content */}
        <div
          className={
            "relative w-full max-w-md bg-bg1 border-x border-t sm:border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85dvh] transition-transform duration-300 " +
            (sheetOpen ? "translate-y-0 scale-100" : "translate-y-full sm:translate-y-10 sm:scale-95")
          }
        >
          {/* Handle for mobile feel */}
          <div className="w-12 h-1.5 bg-border rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />
          
          <div className="px-5 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
            <div className="font-black text-lg tracking-tight">Mission Data</div>
            <Button variant="ghost" size="sm" onClick={() => setSheetOpen(false)} className="h-8 w-8 p-0 rounded-full">✕</Button>
          </div>
          
          <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
            <InfoCenter onRequestClose={() => setSheetOpen(false)} />
          </div>
        </div>
      </div>

    </div>
  );
}

function OptionsDropdown({ soundEnabled, setSoundEnabled, hapticsEnabled, setHapticsEnabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;
    function clickOut(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={
          "h-9 w-9 rounded-lg border flex items-center justify-center transition-colors " +
          (open ? "bg-surface border-indigo-500/50 text-indigo-200" : "bg-transparent border-transparent text-muted hover:bg-white/5")
        }
        aria-label="Options"
        title="Options"
      >
        <span className="text-xl">⚙️</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-[#0b1026] shadow-2xl p-1.5 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
          <div className="px-2 py-1.5 text-xs font-bold text-muted uppercase tracking-wider">Settings</div>
          
          <button
            onClick={() => { playUiTap(); setSoundEnabled(!soundEnabled); }}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-fs1 font-medium">Sound</span>
            <span className="text-lg">{soundEnabled ? "🔊" : "🔇"}</span>
          </button>

          <button
            onClick={() => { playUiTap(); setHapticsEnabled(!hapticsEnabled); }}
            className="flex items-center justify-between w-full px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
          >
            <span className="text-fs1 font-medium">Haptics</span>
            <span className="text-lg">{hapticsEnabled ? "📓" : "🚫"}</span>
          </button>
        </div>
      )}
    </div>
  );
}