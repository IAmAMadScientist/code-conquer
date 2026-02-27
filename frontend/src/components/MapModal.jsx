import React from "react";
import { createPortal } from "react-dom";
import { Card } from "./ui/card";
import mapImg from "../assets/map.png";
import nodeMapPositions from "../assets/nodeMapPositions.json";

/**
 * Radar Map Modal Component.
 * Extracted from Play.jsx for modularity.
 */
export default function MapModal({ open, onClose, playerNodeId }) {
  if (!open) return null;

  const pos = playerNodeId ? nodeMapPositions[playerNodeId] : null;

  return createPortal((
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <style>{`
        @keyframes map-radar {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(3.5); opacity: 0; }
        }
        .map-radar-ring {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: 2px solid #f43f5e;
          pointer-events: none;
          animation: map-radar 2s infinite cubic-bezier(0.21, 0.53, 0.56, 0.8);
        }
      `}</style>
      <Card className="relative w-full max-w-4xl overflow-hidden border-indigo-500/20 bg-bg0 shadow-[0_0_50px_rgba(99,102,241,0.3)]" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 w-10 h-10 rounded-full bg-bg0/80 border border-white/10 flex items-center justify-center text-xl font-bold hover:bg-white/5 transition-colors">✕</button>
        <div className="relative">
          <img src={mapImg} alt="Board Map" className="w-full h-auto max-h-[85dvh] object-contain opacity-90" />
          {pos && (
            <>
              <div className="map-radar-ring" style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, animationDelay: '0s' }} />
              <div className="map-radar-ring" style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, animationDelay: '0.6s' }} />
              <div 
                className="absolute w-4 h-4 bg-rose-500 rounded-full shadow-[0_0_20px_#f43f5e,0_0_40px_rgba(244,63,94,0.4)] z-20" 
                style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, transform: 'translate(-50%, -50%)' }} 
              />
            </>
          )}
        </div>
      </Card>
    </div>
  ), document.body);
}
