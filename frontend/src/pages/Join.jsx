import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useToast } from "../components/ui/use-toast";
import { toastError, toastSuccess } from "../lib/toast-helpers";
import { joinSessionByCode, getSession } from "../lib/session";
import { getPlayer, registerPlayer } from "../lib/player";

const EMOJIS = ["🦊","🐱","🐶","🐸","🐼","🦁","🐙","🦄","🐝","🐧","🐢","🦖","👾","🤖","🧠","🔥","⭐","🍀","🍕","🎲"];

export default function Join() {
  const nav = useNavigate();
  const { code } = useParams();
  const { toast } = useToast();

  const [busy, setBusy] = useState(false);

  const [playerName, setPlayerName] = useState("");
  const [icon, setIcon] = useState("🦊");

  const liveSession = useMemo(() => getSession(), [busy]);
  const livePlayer = useMemo(() => getPlayer(), [busy]);

  useEffect(() => {
    let cancelled = false;

    async function doJoin() {
      if (!code) return;

      const s = getSession();
      if (s?.sessionCode && s.sessionCode.toUpperCase() === code.toUpperCase()) return;

      setBusy(true);
      try {
        await joinSessionByCode(code);
        toastSuccess(toast, "Joined match", `Code: ${code.toUpperCase()}`);
        if (cancelled) return;
      } catch (e) {
        if (cancelled) return;
        toastError(toast, e, "Failed to join match");
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
    try {
      await registerPlayer(s.sessionId, playerName.trim(), icon);
      toastSuccess(toast, "Profile saved", `${icon} ${playerName.trim()}`);
      setPlayerName("");
    } catch (e) {
      toastError(toast, e, "Failed to set player profile");
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
        <Card>
          <CardContent className="space-y-s4">
            <div>
              <div className="text-fs2 font-extrabold">Flow</div>
              <div className="mt-s1 text-muted leading-relaxed">
                1) Join the match by QR/code.
                <br />
                2) Pick your <strong>name</strong> and <strong>emoji</strong> once.
                <br />
                3) Go to the <strong>Lobby</strong> and press Ready.
              </div>
            </div>
            <div className="h-px w-full bg-border/60" />
            <div className="text-muted text-fs0 leading-relaxed">
              If this page looks like desktop on your phone, open the link in your browser (not inside an app).
            </div>
          </CardContent>
        </Card>
      }
      actions={
        <div className="flex w-full">
          <Button variant="primary" disabled={!readyToLobby} onClick={() => nav("/lobby")}>
            Go to Lobby
          </Button>
        </div>
      }
    >
      <Card>
        <CardContent className="space-y-s4">
        <div className="flex flex-wrap items-center gap-s2">
          <Badge>Code: {(code || "").toUpperCase()}</Badge>
          {busy ? <span className="text-muted">Working…</span> : null}
          {/* Errors are shown via toast */}
        </div>

        {!liveSession?.sessionId ? (
          <div className="text-muted">Joining… (if this stays forever, the code might be invalid)</div>
        ) : livePlayer?.playerId ? (
          <div className="grid gap-s3">
            <div className="flex flex-wrap items-center gap-s2">
              <Badge variant="secondary">You are: {livePlayer.playerIcon || "🙂"} {livePlayer.playerName || "Player"}</Badge>
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[520px] space-y-s4">
            <div className="text-muted">Pick your player name and emoji:</div>

            <div className="flex flex-wrap gap-s2">
              <Input
                className="min-w-0 flex-1"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="e.g. Alex"
              />
              <Button variant="primary" onClick={onSetProfile} disabled={busy || !playerName.trim()}>
                Save profile
              </Button>
            </div>

            <div className="space-y-s2">
              <div className="text-muted text-fs0 font-semibold">Emoji</div>
              <div className="flex flex-wrap justify-center gap-s2">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setIcon(e)}
                    className={
                      e === icon
                        ? "grid h-11 w-11 place-items-center rounded-full border border-border bg-surface2 text-[20px] shadow-panel"
                        : "grid h-11 w-11 place-items-center rounded-full border border-border bg-surface text-[20px]"
                    }
                    aria-label={`Pick ${e}`}
                    type="button"
                  >
                    {e}
                  </button>
                ))}
              </div>
              <div className="text-muted text-fs0">Selected: {icon}</div>
            </div>
          </div>
        )}

        {!readyToLobby ? (
          <div className="text-muted text-fs0">
            Note: you can only enter the lobby after you joined the match and saved your profile.
          </div>
        ) : null}
        </CardContent>
      </Card>
    </AppShell>
  );
}
