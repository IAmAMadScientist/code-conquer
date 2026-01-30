import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { joinSessionByCode, getSession } from "../lib/session";
import { getPlayer, registerPlayer } from "../lib/player";

const EMOJIS = ["🦊","🐱","🐶","🐸","🐼","🦁","🐙","🦄","🐝","🐧","🐢","🦖","👾","🤖","🧠","🔥","⭐","🍀","🍕","🎲"];

export default function Join() {
  const nav = useNavigate();
  const { code } = useParams();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const [playerName, setPlayerName] = useState("");
  const [icon, setIcon] = useState("🦊");

  const liveSession = useMemo(() => getSession(), [busy, err]);
  const livePlayer = useMemo(() => getPlayer(), [busy, err]);

  useEffect(() => {
    let cancelled = false;

    async function doJoin() {
      if (!code) return;

      const s = getSession();
      if (s?.sessionCode && s.sessionCode.toUpperCase() === code.toUpperCase()) return;

      setBusy(true);
      setErr(null);
      try {
        await joinSessionByCode(code);
        if (cancelled) return;
      } catch (e) {
        if (cancelled) return;
        setErr(e?.message || "Failed to join match");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    doJoin();
    return () => {
      cancelled = true;
    };
  }, [code]);

  async function onSetProfile() {
    const s = getSession();
    if (!s?.sessionId) return;
    if (!playerName.trim()) return;

    setBusy(true);
    setErr(null);
    try {
      await registerPlayer(s.sessionId, playerName.trim(), icon);
      setPlayerName("");
    } catch (e) {
      setErr(e?.message || "Failed to set player profile");
    } finally {
      setBusy(false);
    }
  }

  const readyToLobby = !!(liveSession?.sessionId && livePlayer?.playerId);

  return (
    <AppShell
      title="Join Match"
      subtitle="Scan → join → pick name + emoji → lobby."
      activeTab="play"
      backTo={false}
      showBrand
      headerBadges={
        <>
          <Badge>Join</Badge>
          {liveSession?.sessionCode ? <Badge variant="secondary">Match: {liveSession.sessionCode}</Badge> : null}
        </>
      }
      rightPanel={
        <div className="panel stack">
          <div>
            <div style={{ fontWeight: 850 }}>Flow</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.5 }}>
              1) Join the match by QR/code.
              <br />
              2) Pick your <strong>name</strong> and <strong>emoji</strong> once.
              <br />
              3) Go to the <strong>Lobby</strong> and press Ready.
            </div>
          </div>
          <div className="divider" />
          <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
            If this page looks like desktop on your phone, open the link in your browser (not inside an app).
          </div>
        </div>
      }
      actions={
        <div className="actionRow">
          <Button variant="primary" disabled={!readyToLobby} onClick={() => nav("/lobby")}>
            Go to Lobby
          </Button>
        </div>
      }
    >
      <div className="panel stack">
        <div className="row wrap">
          <Badge>Code: {(code || "").toUpperCase()}</Badge>
          {busy ? <span className="muted">Working…</span> : null}
          {err ? <span style={{ opacity: 0.9 }}>⚠️ {err}</span> : null}
        </div>

        {!liveSession?.sessionId ? (
          <div className="muted">Joining… (if this stays forever, the code might be invalid)</div>
        ) : livePlayer?.playerId ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <Badge variant="secondary">You are: {livePlayer.playerIcon || "🙂"} {livePlayer.playerName || "Player"}</Badge>
            </div>
          </div>
        ) : (
          <div className="stack mobileCenter" style={{ maxWidth: 520, margin: "0 auto" }}>
            <div className="muted">Pick your player name and emoji:</div>

            <div className="row wrap mobileRow">
              <div className="grow min0">
                <input
                  className="ui-input"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Alex"
                />
              </div>
              <Button variant="primary" onClick={onSetProfile} disabled={busy || !playerName.trim()}>
                Save profile
              </Button>
            </div>

            <div className="stack tight">
              <div className="kicker">Emoji</div>
              <div className="chips" style={{ justifyContent: "center" }}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setIcon(e)}
                    className={e === icon ? "emojiPick active" : "emojiPick"}
                    aria-label={`Pick ${e}`}
                    type="button"
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>Selected: {icon}</div>
            </div>
          </div>
        )}

        {!readyToLobby ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Note: you can only enter the lobby after you joined the match and saved your profile.
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
