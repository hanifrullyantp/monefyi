import React from "react";
import { MessageSquare, AlertTriangle } from "lucide-react";

export interface ChatBubble3DProps {
  sender: string;
  message: string;
  time?: string;
  isZonk?: boolean;
  scale?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  translateZ?: number;
  className?: string;
}

export const ChatBubble3D: React.FC<ChatBubble3DProps> = ({
  sender,
  message,
  time = "10:14",
  isZonk = false,
  scale = 1,
  rotX = 0,
  rotY = 0,
  rotZ = 0,
  translateZ = 0,
  className = "",
}) => {
  return (
    <div
      style={{
        transform: `scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) translateZ(${translateZ}px)`,
        transformStyle: "preserve-3d",
      }}
      className={`relative w-72 rounded-2xl p-3.5 backdrop-blur-xl select-none transition-all duration-300 ${
        isZonk
          ? "bg-red-950/85 border-2 border-red-500 shadow-[0_20px_40px_rgba(239,68,68,0.4)] text-white"
          : "bg-[#0A261C]/85 border-2 border-emerald-500/60 shadow-[0_20px_40px_rgba(16,185,129,0.3)] text-white"
      } ${className}`}
    >
      {/* 3D Bubble Thickness / Depth Behind */}
      <div
        style={{
          transform: "translateZ(-8px)",
        }}
        className={`absolute inset-0 rounded-2xl ${
          isZonk ? "bg-red-950 border border-red-700" : "bg-[#061811] border border-emerald-700"
        }`}
      />

      {/* Bubble Content */}
      <div className="relative z-10 flex items-start gap-2.5">
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
            isZonk ? "bg-red-600 text-white" : "bg-[#25D366] text-white"
          }`}
        >
          {isZonk ? (
            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <MessageSquare className="w-4 h-4 fill-white stroke-[2]" />
          )}
        </div>

        <div className="flex-1 text-left">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-black text-emerald-300">{sender}</span>
            <span className="text-[9px] text-slate-400">{time}</span>
          </div>
          <p className="text-xs font-bold text-white mt-0.5 leading-snug">{message}</p>
        </div>
      </div>

      {/* Zonk Stamp Overlay */}
      {isZonk && (
        <div
          style={{
            transform: "translateZ(14px) rotate(-10deg)",
          }}
          className="absolute -top-3 -right-3 bg-red-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-2xl border-2 border-white animate-bounce"
        >
          ZONK! ❌
        </div>
      )}
    </div>
  );
};

