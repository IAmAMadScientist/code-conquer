import React, { useMemo, useState } from "react";
import { Button } from "./ui/button";

// Lightweight, mobile-friendly info center shown inside the bottom-sheet.
// It behaves like a mini menu: first you see a list, then you can open a detail page.

function SectionCard({ title, subtitle, icon, onClick }) {
  return (
    <button
      type="button"
      className="nativeItem"
      onClick={onClick}
      style={{ width: "100%", textAlign: "left" }}
    >
      <div className="nativeLeft">
        <div className="nativeAvatar" aria-hidden="true">
          {icon}
        </div>
        <div className="nativeText">
          <div className="nativeTitle">{title}</div>
          <div className="nativeSub">{subtitle}</div>
        </div>
      </div>
      <div className="nativeTrail" aria-hidden="true" style={{ fontWeight: 900, opacity: 0.8 }}>
        ›
      </div>
    </button>
  );
}

function Bullet({ children }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={{ marginTop: 6, opacity: 0.8 }}>•</div>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

export default function InfoCenter({ onRequestClose }) {
  const sections = useMemo(
    () => [
      {
        key: "how",
        title: "How to play (Boardgame)",
        icon: "🎲",
        subtitle: "Kurz erklärt: Runde, Würfeln, Forks, Specials",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>How to play</div>
            <div style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.45 }}>
              Du spielst am Tisch das Boardgame – die Webapp unterstützt Würfel, Regeln und Minigames.
            </div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  <b>Turn:</b> Würfeln → bewegen → Event (Fork / Special / Challenge).
                </Bullet>
                <Bullet>
                  <b>Fork:</b> Wenn mehrere Wege möglich sind, wählt der Spieler den Pfad.
                </Bullet>
                <Bullet>
                  <b>Challenge:</b> Minigame starten, Ergebnis zählt fürs Boardgame.
                </Bullet>
                <Bullet>
                  <b>Special Field:</b> Ziehe eine Karte (real life) und wähle sie hier im Dialog.
                </Bullet>
                <Bullet>
                  <b>Field Types:</b> Normal = nix, <b>Fork</b> = Pfad wählen, <b>Challenge</b> = Minigame,
                  <b>Special</b> = Karte ziehen, <b>Jail</b> = Zug aussetzen.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },

      {
        key: "qr",
        title: "QR Code / Join",
        icon: "🔳",
        subtitle: "Schnell beitreten: scannen oder Code eingeben",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>QR Code / Join</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  In der <b>Lobby</b> zeigt die Host-App einen QR Code.
                </Bullet>
                <Bullet>
                  Alle Spieler scannen ihn mit der Handykamera oder tippen den <b>Match Code</b> ein.
                </Bullet>
                <Bullet>
                  Falls das Scannen nicht geht: nutze den Link unter dem QR Code (oder teile ihn per Messenger).
                </Bullet>
                <Bullet>
                  Tipp: Helligkeit hochdrehen – QR Codes scannen bei dunklen Displays oft schlechter.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "stackmaze",
        title: "Stack Maze",
        icon: "🧱",
        subtitle: "Plane Moves, dann läuft der Stack (LIFO)",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Stack Maze</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  Du baust zuerst eine <b>Move-Liste</b> (Stack). Oben liegt immer der nächste Move.
                </Bullet>
                <Bullet>
                  Beim Start (<b>Run</b>) werden Moves <b>LIFO</b> ausgeführt: <i>Top executes next</i>.
                </Bullet>
                <Bullet>
                  Ziel: Sammle ⭐ und erreiche das 🏁 – ohne gegen Wände zu crashen.
                </Bullet>
                <Bullet>
                  Tipp: Plane erst den letzten Schritt, dann den davor (weil Stack rückwärts abarbeitet).
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "bst",
        title: "BST Insert",
        icon: "🌳",
        subtitle: "Tippe den korrekten Insert-Slot",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>BST Insert</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  Neue Zahl startet an der Root. <b>Kleiner</b> → links, <b>größer</b> → rechts.
                </Bullet>
                <Bullet>
                  Du wählst nicht den Pfad, sondern den <b>Slot</b>, wo das neue Node landet.
                </Bullet>
                <Bullet>
                  Bei <b>Equal</b> gilt die Regel oben rechts (z.B. Equal → RIGHT).
                </Bullet>
                <Bullet>
                  Du kannst jederzeit einfach einen anderen Slot antippen, um die Auswahl zu wechseln.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "graph",
        title: "Graph Pathfinder",
        icon: "🗺️",
        subtitle: "Finde den Pfad – Edge weights zählen",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Graph Pathfinder</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  Du bewegst dich Node für Node. Nur die <b>Kanten</b> haben Kosten (Edge Weight).
                </Bullet>
                <Bullet>
                  Ziel: Erreiche GOAL mit möglichst wenig Gesamtkosten.
                </Bullet>
                <Bullet>
                  Tipp: Nicht nur der kleinste nächste Edge zählt – manchmal lohnt ein Umweg.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: "bitjumper",
        title: "Bit Jumper",
        icon: "🕹️",
        subtitle: "Doodle Jump + Token Pattern",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Bit Jumper</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  Du springst automatisch. Steuere nur horizontal (Finger/Mouse).
                </Bullet>
                <Bullet>
                  Triff Token-Plattformen in der <b>richtigen Reihenfolge</b> (Pattern oben).
                </Bullet>
                <Bullet>
                  Falsches Token resetet Progress und gibt Penalty (Shake/Vibrate).
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },

      {
        key: "queue",
        title: "Queue Commander",
        icon: "🚦",
        subtitle: "Queue/FIFO – arbeite das Front-Element ab",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Queue Commander</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  Eine <b>Queue</b> ist FIFO: zuerst rein → zuerst raus.
                </Bullet>
                <Bullet>
                  Du darfst nur das <b>Front</b>-Element bedienen (DEQUEUE). ENQUEUE passiert hinten.
                </Bullet>
                <Bullet>
                  Ziel: richtig bedienen, ohne dass die Queue überläuft.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },

      {
        key: "stackdrop",
        title: "Stack Drop",
        icon: "📦",
        subtitle: "Stack/LIFO – plane oder reagiere schnell",
        render: () => (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Stack Drop</div>
            <div className="ui-card">
              <div className="ui-cardContent" style={{ display: "grid", gap: 10, padding: 16 }}>
                <Bullet>
                  Ein <b>Stack</b> ist LIFO: zuletzt rein → zuerst raus.
                </Bullet>
                <Bullet>
                  Behalte im Blick, was oben liegt – das ist dein nächster Output.
                </Bullet>
                <Bullet>
                  Ziel: richtige Reihenfolge treffen und Punkte sammeln.
                </Bullet>
              </div>
            </div>
          </div>
        ),
      },
    ],
    []
  );

  const [active, setActive] = useState(null);

  const current = active ? sections.find((s) => s.key === active) : null;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {!current ? (
        <>
          <div className="nativeList">
            {sections.map((s) => (
              <SectionCard
                key={s.key}
                title={s.title}
                subtitle={s.subtitle}
                icon={s.icon}
                onClick={() => setActive(s.key)}
              />
            ))}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
            <Button className="fullWidthBtn" onClick={onRequestClose}>
              Close
            </Button>
          </div>
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button variant="ghost" onClick={() => setActive(null)} style={{ borderRadius: 16 }}>
              ‹ Back
            </Button>
            <div style={{ fontWeight: 900, fontSize: 14, opacity: 0.9 }}>Info</div>
          </div>
          {current.render()}
          <div style={{ display: "grid", gap: 10, marginTop: 2 }}>
            <Button className="fullWidthBtn" onClick={onRequestClose}>
              Close
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
