import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";

/**
 * Mobile-first app shell.
 *
 * Goals:
 * - Full-screen "native app" look (no centered web card)
 * - Safe-area padding + sticky bottom tab bar
 * - Optional rightPanel rendered as a bottom sheet ("Info")
 */
export default function AppShell({
  title = "Code & Conquer",
  subtitle = null,
  headerBadges = null,
  rightPanel = null,
  showTabs = false,
  activeTab = null,
  backTo = null,
  children,
}) {
  const nav = useNavigate();
  const loc = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const showBack = backTo !== false && (loc?.pathname || "/") !== "/";

  const tabs = useMemo(
    () => [
      { key: "play", label: "Play", icon: "🎲", to: "/play" },
      { key: "leaderboard", label: "Scores", icon: "🏆", to: "/leaderboard" },
    ],
    []
  );

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
    <div className="appRoot">
      <header className="topBar">
        <div className="topBarRow">
          <div className="topBarLeft">
            <button
              className="iconBtn"
              aria-label="Back"
              onClick={goBack}
              style={{ visibility: showBack ? "visible" : "hidden" }}
            >
              ‹
            </button>
          </div>

          <div className="topBarCenter">
            <div className="topBarTitleRow">
              <div className="topBarTitle">{title}</div>
              {rightPanel ? (
                <button className="iconBtn" aria-label="Info" onClick={() => setSheetOpen(true)}>
                  ⓘ
                </button>
              ) : null}
            </div>
            {subtitle ? <div className="topBarSubtitle">{subtitle}</div> : null}
          </div>

          <div className="topBarRight">
            {headerBadges ? (
              <div className="badgeRow">
                {headerBadges}
              </div>
            ) : (
              <Badge variant="secondary">CC</Badge>
            )}
          </div>
        </div>
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
                onClick={() => nav(t.to)}
              >
                <div className="tabIcon">{t.icon}</div>
                <div className="tabLabel">{t.label}</div>
              </button>
            );
          })}
        </nav>
      ) : null}

      {rightPanel ? (
        <div className={sheetOpen ? "sheetOverlay open" : "sheetOverlay"} onClick={() => setSheetOpen(false)}>
          <div className={sheetOpen ? "sheet open" : "sheet"} onClick={(e) => e.stopPropagation()}>
            <div className="sheetHandle" />
            <div className="sheetHeader">
              <div style={{ fontWeight: 800 }}>Info</div>
              <Button variant="ghost" onClick={() => setSheetOpen(false)}>
                Close
              </Button>
            </div>
            <div className="sheetBody">{rightPanel}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
