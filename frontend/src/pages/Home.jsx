import { UI_STRINGS } from "../lib/constants";
import React, { useEffect, useState } from "react";
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
import { cn } from "../lib/utils";
import { playUiTap } from "../lib/diceSound";

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
    setSession(getSession());
    setPlayer(getPlayer());
  }, []);

  async function onCreate() {
    setBusy(true);
    try {
      clearPlayer();
      const s = await createSession();
      setSession(s);
      setPlayer(getPlayer());
      setJoinCode(""); setPlayerName(""); setIcon("🦊");
      toastSuccess(toast, "MATCH CREATED", `SEQUENCE: ${s?.sessionCode || ""}`);
    } catch (e) {
      toastError(toast, e, "MISSION INITIALIZATION FAILED");
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
      toastSuccess(toast, "UPLINK ESTABLISHED", `NODE: ${s?.sessionCode || joinCode.trim().toUpperCase()}`);
    } catch (e) {
      toastError(toast, e, "JOIN SEQUENCE FAILED");
    } finally {
      setBusy(false);
    }
  }

  async function onSaveProfileAndGoLobby() {
    if (!session?.sessionId || !playerName.trim()) return;
    setBusy(true);
    try {
      const p = await registerPlayer(session.sessionId, playerName.trim(), icon);
      setPlayer(p);
      nav("/lobby");
    } catch (e) {
      toastError(toast, e, "PROFILE SYNC FAILED");
    } finally {
      setBusy(false);
    }
  }

  function onLeave() {
    clearSession(); clearPlayer();
    setSession(getSession()); setPlayer(getPlayer());
    setJoinCode(""); setPlayerName(""); setIcon("🦊");
  }

  return (
    <AppShell title="Code & Conquer" showBrand backTo={false}>
      <div className="w-full max-w-md mx-auto space-y-s4 pb-8 animate-in fade-in duration-700">
        
        {!session?.sessionId ? (
          <div className="space-y-s4">
            {/* Header Area */}
            <div className="text-center space-y-2 py-4">
              <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Command Center</div>
              <div className="text-3xl font-black text-white tracking-tight uppercase">System Entry</div>
            </div>

            {/* Create Section */}
            <Card className="border-indigo-500/20 bg-indigo-500/5 shadow-xl shadow-indigo-500/10">
              <CardContent className="p-6 text-center space-y-4">
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-muted uppercase tracking-widest">New Match</div>
                  <div className="text-sm font-medium text-muted/80 leading-relaxed">Initialize a new mission sequence and host other users.</div>
                </div>
                <Button variant="primary" onClick={() => { playUiTap(); onCreate(); }} disabled={busy} className="w-full h-14 rounded-2xl font-black text-lg shadow-lg uppercase tracking-widest transition-all active:scale-95">
                  Initialize Mission
                </Button>
              </CardContent>
            </Card>

            <div className="flex items-center gap-4 px-2">
              <div className="h-px flex-1 bg-white/5" />
              <div className="text-[9px] font-black text-muted/40 uppercase tracking-widest">or Join Node</div>
              <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* Join Section */}
            <Card className="bg-transparent border-white/5">
              <CardContent className="p-6 space-y-4 text-center">
                <div className="flex gap-2">
                  <Input
                    className="h-14 rounded-xl border-white/10 bg-white/5 text-center uppercase font-black text-xl tracking-[0.2em] placeholder:text-muted/20 placeholder:tracking-normal placeholder:font-bold placeholder:text-sm"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="ENTER 6-CHAR CODE"
                    maxLength={6}
                  />
                  <Button variant="secondary" onClick={() => { playUiTap(); onJoinByCode(); }} disabled={busy || joinCode.trim().length < 6} className="h-14 px-6 rounded-xl font-black uppercase">
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-s4">
            {/* Active Session Info */}
            <div className="flex items-center justify-between px-1">
              <Badge variant="secondary" className="px-3 py-1 font-black bg-indigo-500/20 border-indigo-500/30 text-indigo-300">
                ACTIVE SEQUENCE: #{session.sessionCode}
              </Badge>
              <button onClick={onLeave} className="text-[10px] font-black text-muted uppercase tracking-widest hover:text-rose-400 transition-colors">Terminate</button>
            </div>

            {!player?.playerId ? (
              <div className="space-y-s4 animate-in slide-in-from-bottom-4 duration-500">
                <Card className="border-indigo-500/30 bg-indigo-500/10 shadow-2xl shadow-indigo-500/20">
                  <CardContent className="p-6 space-y-6">
                    <div className="text-center space-y-1">
                      <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Protocol Delta</div>
                      <div className="text-2xl font-black text-white uppercase">Create Profile</div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Identity Tag</div>
                        <Input
                          className="h-14 rounded-2xl border-white/10 bg-white/5 text-center font-black text-lg placeholder:text-muted/30"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          placeholder="ENTER YOUR NAME"
                          maxLength={12}
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="text-[10px] font-black text-muted uppercase tracking-widest px-1">Avatar Selection</div>
                        <div className="grid grid-cols-5 gap-2">
                          {EMOJIS.map((e) => (
                            <button
                              key={e}
                              onClick={() => { playUiTap(); setIcon(e); }}
                              className={cn(
                                "aspect-square rounded-xl border flex items-center justify-center text-xl transition-all active:scale-90",
                                e === icon ? "bg-indigo-500 border-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.4)] scale-110 z-10" : "bg-white/5 border-white/5 grayscale opacity-40 hover:grayscale-0 hover:opacity-100"
                              )}
                            >
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button variant="primary" onClick={() => { playUiTap(); onSaveProfileAndGoLobby(); }} disabled={busy || !playerName.trim()} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl uppercase tracking-widest mt-2">
                      Establish Uplink
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="border-indigo-500/20 bg-indigo-500/5">
                <CardContent className="p-8 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-500/30 mx-auto flex items-center justify-center text-4xl shadow-inner">
                    {player.playerIcon || "🙂"}
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Welcome back, Agent</div>
                    <div className="text-2xl font-black text-white uppercase tracking-tight">{player.playerName}</div>
                  </div>
                  <div className="grid gap-3 pt-2">
                    <Button variant="primary" onClick={() => nav("/lobby")} className="h-14 rounded-2xl font-black uppercase tracking-widest shadow-lg">Enter Lobby</Button>
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="secondary" onClick={() => nav("/play")} className="h-12 rounded-xl font-black text-xs uppercase tracking-widest">Mission Map</Button>
                      <Button variant="outline" onClick={() => nav("/leaderboard")} className="h-12 rounded-xl font-black text-xs uppercase tracking-widest border-white/10">Standings</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer Info */}
        <div className="text-center pt-4">
          <p className="text-[10px] font-bold text-muted/30 uppercase tracking-[0.2em]">Hybrid Boardgame Interface v4.0.0</p>
        </div>
      </div>
    </AppShell>
  );
}