import { UI_STRINGS } from "../lib/constants";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useToast } from "../components/ui/use-toast";
import { toastError, toastSuccess } from "../lib/toast-helpers";
import { createSession, joinSessionByCode, getSession, clearSession } from "../lib/session";
import { getPlayer, registerPlayer, clearPlayer } from "../lib/player";

const EMOJIS = ["🦊","🐱","🐶","🐸","🐼","🦁","🐙","🦄","🐝","🐧","🐢","🦖","👾","🤖","🧠","🔥","⭐","🍀","🍕","🎲"];

export default function Home() {
  const nav = useNavigate();
  const { toast } = useToast();

  const [session, setSession] = useState(() => getSession());
  const [player, setPlayer] = useState(() => getPlayer());

  const [joinCode, setJoinCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [icon, setIcon] = useState(player?.playerIcon || "🦊");

  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Keep local state in sync if storage changes (rare, but helps).
    setSession(getSession());
    setPlayer(getPlayer());
  }, []);

  async function onCreate() {
    setBusy(true);
    try {
      // New match => clear previous player identity
      clearPlayer();
      const s = await createSession();
      setSession(s);
      setPlayer(getPlayer());
      setJoinCode("");
      setPlayerName("");
      setIcon("🦊");
      toastSuccess(toast, UI_STRINGS.MATCH_CREATED, `Code: ${s?.sessionCode || ""}`.trim());
    } catch (e) {
      toastError(toast, e, UI_STRINGS.CREATE_MATCH_FAILED);
    } finally {
      setBusy(false);
    }
  }

  async function onJoinByCode() {
    if (!joinCode.trim()) return;
    setBusy(true);
    try {
      clearPlayer();
      const s = await joinSessionByCode(joinCode.trim().toUpperCase());
      setSession(s);
      setPlayer(getPlayer());
      toastSuccess(toast, UI_STRINGS.MATCH_JOINED, `Code: ${s?.sessionCode || joinCode.trim().toUpperCase()}`);
    } catch (e) {
      toastError(toast, e, UI_STRINGS.JOIN_MATCH_FAILED);
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProfileAndGoLobby() {
    if (!session?.sessionId) return;
    if (!playerName.trim()) return;

    setBusy(true);
    try {
      const p = await registerPlayer(session.sessionId, playerName.trim(), icon);
      setPlayer(p);
      toastSuccess(toast, UI_STRINGS.PROFILE_SAVED, `${icon} ${playerName.trim()}`);
      nav("/lobby");
    } catch (e) {
      toastError(toast, e, UI_STRINGS.SAVE_PROFILE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  function onLeave() {
    clearSession();
    clearPlayer();
    setSession(getSession());
    setPlayer(getPlayer());
    setJoinCode("");
    setPlayerName("");
    setIcon("🦊");
  }

  return (
    <AppShell
      title="Code & Conquer"
      backTo={false}
      headerBadges={
        <>
          {session?.sessionCode ? <Badge variant="secondary">Match: {session.sessionCode}</Badge> : <Badge>Not in match</Badge>}
          {player?.playerId ? <Badge variant="secondary">You: {player.playerIcon || "🙂"} {player.playerName}</Badge> : null}
        </>
      }
      rightPanel={
        <Card>
          <CardContent className="space-y-s3">
            <div>
              <div className="text-muted text-fs0 font-semibold">{UI_STRINGS.QUICK_START}</div>
              <div className="mt-s1 text-fs3 font-extrabold">Get a match running in under a minute</div>
            </div>
            <div className="space-y-s1 text-muted leading-relaxed">
              <div>1) Create a match (host) or join with a 6‑digit code</div>
              <div>2) Pick a name + emoji</div>
              <div>3) Head to the lobby and press Ready</div>
            </div>
          </CardContent>
        </Card>
      }
    >
      <Card>
        <CardContent className="space-y-s4">
        {/* Errors are shown via toast */}

        {!session?.sessionId ? (
          <>
            <div>
              <div className="text-fs3 font-extrabold">{UI_STRINGS.START_NEW_MATCH}</div>
              <div className="mt-s1 text-muted">Host the game and share the code with your friends.</div>
            </div>

            <div className="flex flex-wrap gap-s2">
              <Button variant="primary" onClick={onCreate} disabled={busy}>
                Create match
              </Button>
            </div>

            <div className="h-px w-full bg-border/60" />

            <div className="space-y-s2">
              <div className="text-muted text-fs0 font-semibold">{UI_STRINGS.OR_JOIN_BY_CODE}</div>
              <div className="flex flex-wrap gap-s2">
                <Input
                  className="min-w-0 flex-1 uppercase"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                />
                <Button variant="secondary" onClick={onJoinByCode} disabled={busy || !joinCode.trim()}>
                  Join
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-s2">
              <Badge>Active match: {session.sessionCode}</Badge>
              <Button variant="secondary" onClick={onLeave} disabled={busy}>Leave</Button>
            </div>

            {!player?.playerId ? (
              <div className="mx-auto w-full max-w-[560px] space-y-s4">
                <div>
                  <div className="text-fs3 font-extrabold">{UI_STRINGS.CREATE_PLAYER}</div>
                  <div className="mt-s1 text-muted">This name + emoji will show up in the lobby and on the board.</div>
                </div>

                <div className="flex flex-wrap gap-s2">
                  <Input
                    className="min-w-0 flex-1"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. Alex"
                  />
                  <Button variant="primary" onClick={onSaveProfileAndGoLobby} disabled={busy || !playerName.trim()}>
                    Continue
                  </Button>
                </div>

                <div className="space-y-s2">
                  <div className="text-muted text-fs0 font-semibold">{UI_STRINGS.PICK_EMOJI}</div>
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
            ) : (
              <div className="flex flex-wrap gap-s2">
                <Button variant="primary" onClick={() => nav("/lobby")}>Lobby</Button>
                <Button variant="secondary" onClick={() => nav("/play")}>Play</Button>
                <Button variant="ghost" onClick={() => nav("/leaderboard")}>Scores</Button>
              </div>
            )}
          </>
        )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
