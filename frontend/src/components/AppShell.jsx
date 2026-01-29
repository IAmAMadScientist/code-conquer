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
    <div className="appRoot">
      <header className="topBar" ref={headerRef}>
        <div className="topBarRow">
          <div className="topBarLeft">
            {showBack ? (
              <button className="iconBtn" aria-label="Back" onClick={goBack}>
                ‹
              </button>
            ) : null}

            <div className="topBarText">
              <div className="topBarTitleRow">
                <div className="topBarTitle">{title}</div>
              </div>
              {subtitle ? <div className="topBarSubtitle">{subtitle}</div> : null}
            </div>
          </div>

          <div className="topBarRight">
            <div className="topBarControls">
              <button
                type="button"
                className={hapticsEnabled ? "soundBtn on" : "soundBtn"}
                aria-label={hapticsEnabled ? "Haptics on" : "Haptics off"}
                title={hapticsEnabled ? "Haptics: On" : "Haptics: Off"}
                onClick={() => setHapticsEnabled((v) => !v)}
              >
                <span className="soundIcon" aria-hidden="true">
                  {hapticsEnabled ? "📳" : "🚫"}
                </span>
              </button>
              <button
                type="button"
                className={soundEnabled ? "soundBtn on" : "soundBtn"}
                aria-label={soundEnabled ? "Sound on" : "Sound off"}
                title={soundEnabled ? "Sound: On" : "Sound: Off"}
                onClick={() => setSoundEnabled((v) => !v)}
              >
                <span className="soundIcon" aria-hidden="true">
                  {soundEnabled ? "🔊" : "🔇"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {headerBadges ? <div className="topBarPills">{headerBadges}</div> : null}
      </header>

      <main className={showTabs ? "appMain hasTabs" : "appMain"}>
        <div className="screenSurface">
          <Separator />
          {children}
        </div>
      </main>

      {showTabs ? (
        <nav className="tabBar" aria-label="Primary">
          {tabs.map((t) => {
            const active = resolvedActiveTab === t.key;
            return (
              <button
                key={t.key}
                className={active ? "tabBtn active" : "tabBtn"}
                onClick={() => {
                  if (t.key === "info") {
                    setSheetOpen(true);
                    return;
                  }
                  if (t.to) nav(t.to);
                }}
              >
                <div className="tabIcon">{t.icon}</div>
                <div className="tabLabel">{t.label}</div>
              </button>
            );
          })}
        </nav>
      ) : null}

      <div className={sheetOpen ? "sheetOverlay open" : "sheetOverlay"} onClick={() => setSheetOpen(false)}>
        <div className={sheetOpen ? "sheet open" : "sheet"} onClick={(e) => e.stopPropagation()}>
          <div className="sheetHandle" />
          <div className="sheetHeader">
            <div style={{ fontWeight: 800 }}>Info</div>
            <Button variant="ghost" onClick={() => setSheetOpen(false)}>
              Close
            </Button>
          </div>
          <div className="sheetBody">
            <InfoCenter onRequestClose={() => setSheetOpen(false)} />
          </div>
        </div>
      </div>
    </div>
  );
}
