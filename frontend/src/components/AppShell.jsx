import React from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import "./ui/ui.css";

export default function AppShell({
  title = "Code & Conquer",
  subtitle = "Hybrid coding challenges + minigames",
  rightPanel = null,
  headerBadges = null,
  children,
}) {
  return (
    <div className="containerShell">
      <div className="maxW gridShell">
        <Card>
          <CardContent>
            <div className="appHeader" style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div className="appBrand" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    height: 40,
                    width: 40,
                    borderRadius: 18,
                    display: "grid",
                    placeItems: "center",
                    background: "rgba(79,70,229,0.15)",
                    border: "1px solid rgba(129,140,248,0.35)",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 13,
                  }}
                >
                  CC
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 650, letterSpacing: "-0.02em" }}>
                    {title}{" "}
                    <Badge style={{ marginLeft: 8 }}>
                      UI · Slate
                    </Badge>
                  </div>
                  <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                    {subtitle}
                  </div>
                </div>
              </div>

              <div className="appBadges" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {headerBadges}
              </div>
            </div>

            <Separator />

            {children}
          </CardContent>
        </Card>

        <Card className="sideCard">
          <CardContent>
            {rightPanel ? rightPanel : (
              <div className="panel">
                <div style={{ fontSize: 16, fontWeight: 650 }}>Controls</div>
                <div className="muted" style={{ fontSize: 14, marginTop: 10 }}>
                  Use the buttons to navigate. StackMaze is playable like a category.
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
