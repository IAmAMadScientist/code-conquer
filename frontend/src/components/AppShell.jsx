import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { useHapticsSetting, useSoundSetting } from "../lib/diceSound";
import InfoCenter from "./InfoCenter";
import { getSession, isSessionStarted } from "../lib/session";

/**
 * Mobile-first app shell.
 *
 * Goals:
 * - Full-screen "native app" look (no centered web card)
 * - Safe-area padding + sticky bottom tab bar
 * - Info tab opens a bottom sheet help menu
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
  children,
}) {
  const nav = useNavigate();
  const loc = useLocation();
  const headerRef = useRef(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useSoundSetting();
  const [hapticsEnabled, setHapticsEnabled] = useHapticsSetting();

  const showBack = backTo !== false && (loc?.pathname || "/") !== "/";

  // Expose current top bar height for fixed overlays (e.g., EventFeed) so they never overlap the header.
  useLayoutEffect(() => {
    try {
      const el = headerRef.current;
      if (!el) return;
      const h = Math.ceil(el.getBoundingClientRect().height || 0);
      document.documentElement.style.setProperty("--cc-topbar-h", `${h}px`);
    } catch {}
  }, [title, subtitle, headerBadges, showBack]);

  const hasSession = !!getSession()?.sessionId;
  const startedFlag = hasSession && isSessionStarted();

  const tabs = useMemo(() => {
    // Bottom tab behavior:
    // - Before the match starts, the left tab should bring you back to the Lobby.
    // - Once started, it becomes Play.
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

  // Expose topbar height so fixed overlays (e.g., EventFeed) can position below it.
  useLayoutEffect(() => {
    try {
      const el = headerRef.current;
      if (!el) return;
      const h = Math.ceil(el.getBoundingClientRect().height || 0);
      document.documentElement.style.setProperty("--cc-topbar-h", `${h}px`);
    } catch {}
  }, [title, subtitle, headerBadges, showBack]);

  return (
    <div className="min-h-[100dvh] bg-bg0 text-text flex flex-col pt-[env(safe-area-inset-top)]">
      {/* Top Bar */}
      <header
        ref={headerRef}
        className="sticky top-0 z-40 bg-bg0 backdrop-blur border-b border-border"
      >
        <div className="px-s4 pt-s3 pb-s2 flex items-start justify-between gap-s3">
          <div className="flex items-start gap-s3 min-w-0">
            {showBack ? (
              <button
                type="button"
                aria-label="Back"
                onClick={goBack}
                className="h-9 w-9 rounded-lg bg-bg1 border border-border shadow-panel flex items-center justify-center text-fs3 leading-none"
              >
                ‹
              </button>
            ) : null}

            <div className="min-w-0">
              <div className="text-fs3 font-extrabold leading-tight truncate">{title}</div>
              {subtitle ? <div className="text-fs1 text-muted leading-snug truncate">{subtitle}</div> : null}
            </div>
          </div>

          <div className="flex items-center gap-s2 shrink-0">
            <button
              type="button"
              className={
                "h-9 px-s3 rounded-lg border shadow-panel flex items-center gap-2 " +
                (hapticsEnabled ? "bg-bg1 border-border" : "bg-transparent border-border")
              }
              aria-label={hapticsEnabled ? "Haptics on" : "Haptics off"}
              title={hapticsEnabled ? "Haptics: On" : "Haptics: Off"}
              onClick={() => setHapticsEnabled((v) => !v)}
            >
              <span aria-hidden="true">{hapticsEnabled ? "📳" : "🚫"}</span>
              <span className="hidden sm:inline text-fs1 text-muted">Haptics</span>
            </button>

            <button
              type="button"
              className={
                "h-9 px-s3 rounded-lg border shadow-panel flex items-center gap-2 " +
                (soundEnabled ? "bg-bg1 border-border" : "bg-transparent border-border")
              }
              aria-label={soundEnabled ? "Sound on" : "Sound off"}
              title={soundEnabled ? "Sound: On" : "Sound: Off"}
              onClick={() => setSoundEnabled((v) => !v)}
            >
              <span aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span>
              <span className="hidden sm:inline text-fs1 text-muted">Sound</span>
            </button>
          </div>
        </div>

        {headerBadges ? <div className="px-s4 pb-s3 flex flex-wrap gap-s2">{headerBadges}</div> : null}
      </header>

      {/* Main */}
      <main className={"flex-1 min-h-0 px-s4 pb-s4 " + (showTabs ? "pb-[calc(env(safe-area-inset-bottom)+88px)]" : "pb-[calc(env(safe-area-inset-bottom)+16px)]")}
      >
        <div className="h-full bg-bg0">
          <Separator />

          <div className={"pt-s4 grid gap-s4 h-[calc(100%-1px)] " + (rightPanel ? "lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]" : "grid-cols-1")}
          >
            <section className="min-w-0">{children}</section>
            {rightPanel ? (
              <aside className="hidden lg:block min-w-0">
                <div className="sticky top-[calc(var(--cc-topbar-h,64px)+16px)]">{rightPanel}</div>
              </aside>
            ) : null}
          </div>
        </div>
      </main>

      {/* Bottom Action Bar (Mobile-first) */}
      {actions ? (
        <div
          className={
            "fixed left-0 right-0 z-30 px-s4 pt-s3 bg-bg0 backdrop-blur border-t border-border " +
            (showTabs ? "bottom-[calc(env(safe-area-inset-bottom)+64px)]" : "bottom-0")
          }
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
        >
          <div className="max-w-[980px] mx-auto flex items-center justify-between gap-s3">{actions}</div>
        </div>
      ) : null}

      {/* Bottom Tabs */}
      {showTabs ? (
        <nav
          aria-label="Primary"
          className="fixed bottom-0 left-0 right-0 z-40 bg-bg0 backdrop-blur border-t border-border"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="grid grid-cols-3 max-w-[980px] mx-auto">
            {tabs.map((t) => {
              const active = resolvedActiveTab === t.key;
              return (
                <button
                  key={t.key}
                  className={
                    "py-s3 flex flex-col items-center justify-center gap-1 text-fs1 " +
                    (active ? "text-text" : "text-muted")
                  }
                  onClick={() => {
                    if (t.key === "info") {
                      setSheetOpen(true);
                      return;
                    }
                    if (t.to) nav(t.to);
                  }}
                >
                  <div className={"text-fs3 " + (active ? "" : "opacity-80")}>{t.icon}</div>
                  <div className={active ? "font-semibold" : ""}>{t.label}</div>
                </button>
              );
            })}
          </div>
        </nav>
      ) : null}

      {/* Info Sheet */}
      <div
        className={
          "fixed inset-0 z-50 transition " +
          (sheetOpen ? "pointer-events-auto" : "pointer-events-none")
        }
        onClick={() => setSheetOpen(false)}
      >
        <div
          className={
            "absolute inset-0 bg-black/40 transition-opacity " +
            (sheetOpen ? "opacity-100" : "opacity-0")
          }
        />
        <div
          className={
            "absolute left-0 right-0 bottom-0 bg-bg1 border-t border-border rounded-t-lg shadow-panel transition-transform " +
            (sheetOpen ? "translate-y-0" : "translate-y-full")
          }
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto w-12 h-1.5 rounded-full bg-border mt-s2" />
          <div className="px-s4 py-s3 flex items-center justify-between gap-s3">
            <div className="font-extrabold">Info</div>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              Close
            </Button>
          </div>
          <div className="px-s4 pb-s4 max-h-[70dvh] overflow-auto">
            <InfoCenter onRequestClose={() => setSheetOpen(false)} />
          </div>
        </div>
      </div>
    </div>
  );
}
