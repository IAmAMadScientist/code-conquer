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
import { cn } from "../lib/utils";

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
        toastSuccess(toast, "UPLINK SECURED", `NODE: ${code.toUpperCase()}`);
        if (cancelled) return;
      } catch (e) {
        if (cancelled) return;
        toastError(toast, e, "JOIN SEQUENCE FAILED");
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    doJoin();
    return () => { cancelled = true; };
  }, [code]);

  async function onSetProfile() {
    const s = getSession();
    if (!s?.sessionId || !playerName.trim()) return;
    setBusy(true);
    try {
      await registerPlayer(s.sessionId, playerName.trim(), icon);
      toastSuccess(toast, "IDENTITY SYNCED", `${icon} ${playerName.trim()}`);
      setPlayerName("");
    } catch (e) {
      toastError(toast, e, "PROFILE SAVE FAILED");
    } finally {
      setBusy(false);
    }
  }

  const readyToLobby = !!(liveSession?.sessionId && livePlayer?.playerId);

  return (
    <AppShell title="Mission Access" showBrand backTo={false}>
      <div className="w-full max-w-md mx-auto space-y-s4 pb-8 animate-in fade-in duration-700">
        
        {/* Header Area */}
        <div className="text-center space-y-2 py-4">
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Access Point</div>
          <div className="text-3xl font-black text-white tracking-tight uppercase">Incoming Join</div>
        </div>

        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="px-3 py-1 font-black bg-indigo-500/20 border-indigo-500/30 text-indigo-300">
                NODE CODE: {(code || "").toUpperCase()}
              </Badge>
              {busy && <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />}
            </div>

            {!liveSession?.sessionId ? (
              <div className="py-8 text-center space-y-3">
                <div className="text-4xl animate-pulse">📡</div>
                <div className="text-xs font-bold text-muted uppercase tracking-widest">Establishing secure uplink...</div>
              </div>
            ) : livePlayer?.playerId ? (
              <div className="space-y-6 text-center py-4">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 mx-auto flex items-center justify-center text-4xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  {livePlayer.playerIcon || "🙂"}
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Identity Verified</div>
                  <div className="text-2xl font-black text-white uppercase">{livePlayer.playerName}</div>
                </div>
                <Button variant="primary" onClick={() => nav("/lobby")} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl uppercase tracking-widest">
                  Enter Mission Lobby
                </Button>
              </div>
            ) : (
              <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
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
                          onClick={() => setIcon(e)}
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

                <Button variant="primary" onClick={onSetProfile} disabled={busy || !playerName.trim()} className="w-full h-14 rounded-2xl font-black text-lg shadow-xl uppercase tracking-widest mt-2">
                  Sync Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="text-center pt-4">
          <p className="text-[10px] font-bold text-muted/30 uppercase tracking-[0.2em]">Secure Node Uplink Protocol v4.0</p>
        </div>
      </div>
    </AppShell>
  );
}