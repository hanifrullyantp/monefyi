import React from "react";
import { useCurrentFrame } from "remotion";

export interface CharacterProps {
  pose?: "measuring" | "scratch_head" | "panicking" | "exhausted" | "confident";
  scale?: number;
  className?: string;
}

export const FacelessVendor: React.FC<CharacterProps> = ({
  pose = "confident",
  scale = 1,
  className = "",
}) => {
  const frame = useCurrentFrame();
  const breathe = Math.sin(frame / 15) * 3;
  const bobbing = Math.cos(frame / 20) * 2;

  // Solid, high-contrast, bulletproof palette (no fragile gradient IDs)
  const SKIN_BASE = "#FCD5B5";
  const SKIN_SHADOW = "#E5AA82";
  const HELMET_BASE = "#F59E0B"; // Rich safety amber/yellow
  const HELMET_HIGHLIGHT = "#FDE68A";
  const HELMET_SHADOW = "#D97706";
  const VEST_BASE = "#10B981"; // Vibrant Emerald Green
  const VEST_SHADOW = "#047857";
  const VEST_STRIP = "#A7F3D0"; // Bright mint reflector
  const SHIRT_BASE = "#334155"; // Visible slate gray
  const PANTS_BASE = "#1E293B"; // Dark slate
  const BOOTS_BASE = "#92400E"; // Amber-brown boots

  return (
    <div
      style={{
        transform: `scale(${scale}) translateY(${bobbing}px)`,
        transformOrigin: "bottom center",
      }}
      className={`relative inline-block ${className}`}
    >
      <svg
        width="240"
        height="340"
        viewBox="0 0 240 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
      >
        {/* Soft Ground Shadow */}
        <ellipse cx="120" cy="325" rx="75" ry="12" fill="rgba(0,0,0,0.4)" />

        {/* Legs / Work Pants */}
        <path d="M85 220 L78 315 L106 315 L108 220 Z" fill={PANTS_BASE} />
        <path d="M132 220 L134 315 L162 315 L155 220 Z" fill="#0F172A" />

        {/* Work Boots */}
        <rect x="74" y="310" width="34" height="18" rx="6" fill={BOOTS_BASE} />
        <rect x="132" y="310" width="34" height="18" rx="6" fill={BOOTS_BASE} />
        <rect x="72" y="322" width="38" height="6" rx="2" fill="#451A03" />
        <rect x="130" y="322" width="38" height="6" rx="2" fill="#451A03" />

        {/* Torso & Head (Breathing group) */}
        <g style={{ transform: `translateY(${breathe}px)` }}>
          {/* Work Shirt */}
          <path
            d="M65 125 C65 105, 175 105, 175 125 L180 225 C180 230, 60 230, 60 225 Z"
            fill={SHIRT_BASE}
          />

          {/* Estimator High-Vis Green Work Vest */}
          <path d="M66 128 L96 128 L100 226 L64 226 Z" fill={VEST_BASE} />
          <path d="M174 128 L144 128 L140 226 L176 226 Z" fill={VEST_SHADOW} />

          {/* Vest Reflective Strips */}
          <rect x="68" y="160" width="28" height="10" rx="3" fill={VEST_STRIP} />
          <rect x="144" y="160" width="28" height="10" rx="3" fill={VEST_STRIP} />
          <rect x="66" y="195" width="32" height="8" rx="2" fill={VEST_STRIP} />
          <rect x="142" y="195" width="32" height="8" rx="2" fill={VEST_STRIP} />

          {/* Estimator Mini Badge on Chest */}
          <rect x="72" y="136" width="16" height="16" rx="4" fill="#065F46" />
          <path d="M76 141 L84 141 M76 144 L82 144 M76 147 L84 147" stroke="#34D399" strokeWidth="2" strokeLinecap="round" />

          {/* Neck */}
          <rect x="106" y="90" width="28" height="26" rx="5" fill={SKIN_BASE} />
          <path d="M106 102 C114 110, 126 110, 134 102 L134 116 L106 116 Z" fill={SKIN_SHADOW} />

          {/* Faceless Head */}
          <path
            d="M88 55 C88 28, 152 28, 152 55 C152 92, 142 108, 120 108 C98 108, 88 92, 88 55 Z"
            fill={SKIN_BASE}
          />
          {/* Subtle Jaw Shadow */}
          <path d="M100 96 C110 106, 130 106, 140 96 C134 105, 106 105, 100 96 Z" fill={SKIN_SHADOW} />

          {/* Ears */}
          <circle cx="88" cy="62" r="8" fill={SKIN_SHADOW} />
          <circle cx="152" cy="62" r="8" fill={SKIN_SHADOW} />

          {/* Hair base visible at temples */}
          <path d="M92 46 C98 42, 142 42, 148 46 L150 60 C146 54, 94 54, 90 60 Z" fill="#1C1917" />

          {/* Contractor Safety Helmet */}
          {/* Helmet Base Dome */}
          <path
            d="M74 46 C74 14, 166 14, 166 46 C176 48, 176 55, 166 55 L74 55 C64 55, 64 48, 74 46 Z"
            fill={HELMET_BASE}
          />
          {/* Helmet Top Ridge / Cap */}
          <path d="M112 15 C112 13, 128 13, 128 15 L126 46 L114 46 Z" fill={HELMET_HIGHLIGHT} />
          <path d="M78 45 C102 36, 138 36, 162 45" stroke={HELMET_HIGHLIGHT} strokeWidth="3" strokeLinecap="round" />
          <path d="M74 52 L166 52 L166 56 L74 56 Z" fill={HELMET_SHADOW} />

          {/* Pose 1: Scratch Head (Confused / Missing Item) */}
          {pose === "scratch_head" && (
            <g>
              {/* Left arm scratching helmet in confusion */}
              <path
                d="M66 132 L40 76 L76 38"
                stroke={SKIN_BASE}
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M66 132 L56 100"
                stroke={SHIRT_BASE}
                strokeWidth="18"
                strokeLinecap="round"
              />
              <circle cx="76" cy="38" r="10" fill={SKIN_SHADOW} />

              {/* Big Animated Red Question Mark */}
              <g transform="translate(28, 6)">
                <circle cx="12" cy="12" r="14" fill="#EF4444" />
                <text x="12" y="19" fontSize="20" fontWeight="900" fill="#FFFFFF" textAnchor="middle">
                  ?
                </text>
              </g>

              {/* Right arm holding survey paper */}
              <path
                d="M174 132 L196 175 L180 205"
                stroke={SKIN_BASE}
                strokeWidth="16"
                strokeLinecap="round"
              />
              <path
                d="M174 132 L185 155"
                stroke={SHIRT_BASE}
                strokeWidth="18"
                strokeLinecap="round"
              />
              {/* Survey Sheet in hand */}
              <g transform="translate(170, 185) rotate(14)">
                <rect x="0" y="0" width="38" height="52" rx="5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2" />
                <rect x="6" y="8" width="26" height="4" rx="2" fill="#059669" />
                <rect x="6" y="16" width="22" height="3" rx="1.5" fill="#64748B" />
                <rect x="6" y="23" width="18" height="3" rx="1.5" fill="#64748B" />
                {/* Red crossed missing item */}
                <rect x="6" y="30" width="24" height="4" rx="2" fill="#EF4444" />
                <line x1="6" y1="38" x2="30" y2="38" stroke="#EF4444" strokeWidth="2" strokeDasharray="2,2" />
              </g>
            </g>
          )}

          {/* Pose 2: Panicking / Clueless */}
          {pose === "panicking" && (
            <g>
              {/* Both hands holding sides of helmet */}
              <path
                d="M66 135 L32 98 L72 52"
                stroke={SKIN_BASE}
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M174 135 L208 98 L168 52"
                stroke={SKIN_BASE}
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="72" cy="52" r="10" fill={SKIN_SHADOW} />
              <circle cx="168" cy="52" r="10" fill={SKIN_SHADOW} />

              {/* Blue sweat drops */}
              <path d="M42 45 C42 40, 48 30, 48 30 C48 30, 54 40, 54 45 C54 48, 49 51, 42 45 Z" fill="#38BDF8" />
              <path d="M192 45 C192 40, 198 30, 198 30 C198 30, 204 40, 204 45 C204 48, 199 51, 192 45 Z" fill="#38BDF8" />
            </g>
          )}

          {/* Pose 3: Exhausted / Kerja Bakti */}
          {pose === "exhausted" && (
            <g>
              {/* Drooping arms holding heavy iron pipe */}
              <path
                d="M66 135 L52 205 L48 245"
                stroke={SKIN_BASE}
                strokeWidth="16"
                strokeLinecap="round"
              />
              <path
                d="M174 135 L188 205 L192 245"
                stroke={SKIN_BASE}
                strokeWidth="16"
                strokeLinecap="round"
              />
              {/* Heavy iron pipe across body */}
              <rect x="30" y="240" width="180" height="14" rx="4" fill="#64748B" stroke="#334155" strokeWidth="2" />
              <text x="120" y="38" fontSize="24" textAnchor="middle">
                🥵
              </text>
            </g>
          )}

          {/* Pose 4: Confident & Victorious (Estimator User) */}
          {(pose === "confident" || pose === "measuring") && (
            <g>
              {/* Left hand on hip */}
              <path
                d="M66 135 L38 178 L60 200"
                stroke={SKIN_BASE}
                strokeWidth="16"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="60" cy="200" r="10" fill={SKIN_SHADOW} />

              {/* Right arm proudly holding smartphone */}
              <path
                d="M174 135 L202 165 L188 195"
                stroke={SKIN_BASE}
                strokeWidth="16"
                strokeLinecap="round"
              />
              <circle cx="188" cy="195" r="10" fill={SKIN_SHADOW} />

              {/* Smartphone in hand with glowing screen */}
              <g transform="translate(182, 160) rotate(-6)">
                <rect x="0" y="0" width="38" height="60" rx="8" fill="#0F172A" stroke="#22C55E" strokeWidth="2.5" />
                <rect x="3" y="5" width="32" height="50" rx="4" fill="#157F5F" />
                <circle cx="19" cy="30" r="8" fill="#A7F3D0" />
                <path d="M15 30 L18 33 L24 27" stroke="#065F46" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </g>

              {/* Thumbs up badge */}
              <g transform="translate(20, 150)">
                <circle cx="14" cy="14" r="16" fill="#10B981" />
                <text x="14" y="20" fontSize="16" textAnchor="middle" fill="#FFFFFF">
                  👍
                </text>
              </g>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};

export const FacelessCustomer: React.FC<{
  pose?: "inquiring" | "skeptical" | "bargaining" | "pleased";
  scale?: number;
  className?: string;
}> = ({ pose = "skeptical", scale = 1, className = "" }) => {
  const frame = useCurrentFrame();
  const breathe = Math.sin((frame + 10) / 15) * 3;
  const bobbing = Math.cos((frame + 5) / 20) * 2;

  // Solid, high-contrast palette
  const CUST_SKIN = "#FCD5B5";
  const CUST_SKIN_SHADOW = "#E5AA82";
  const COAT_BASE = "#2563EB"; // Vibrant Royal Blue Coat
  const COAT_SHADOW = "#1D4ED8";
  const SHIRT_BASE = "#FFFFFF"; // Clean white collared shirt
  const PANTS_BASE = "#475569"; // Slate chinos
  const SHOES_BASE = "#1E293B"; // Dark shoes
  const HAIR_BASE = "#3F2618"; // Rich brown styled hair

  return (
    <div
      style={{
        transform: `scale(${scale}) translateY(${bobbing}px)`,
        transformOrigin: "bottom center",
      }}
      className={`relative inline-block ${className}`}
    >
      <svg
        width="240"
        height="340"
        viewBox="0 0 240 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
      >
        {/* Ground shadow */}
        <ellipse cx="120" cy="325" rx="70" ry="12" fill="rgba(0,0,0,0.4)" />

        {/* Chinos / Pants */}
        <path d="M85 220 L80 315 L106 315 L108 220 Z" fill={PANTS_BASE} />
        <path d="M132 220 L134 315 L160 315 L155 220 Z" fill="#334155" />

        {/* Shoes */}
        <rect x="76" y="310" width="32" height="16" rx="6" fill={SHOES_BASE} />
        <rect x="132" y="310" width="32" height="16" rx="6" fill={SHOES_BASE} />

        {/* Torso & Head */}
        <g style={{ transform: `translateY(${breathe}px)` }}>
          {/* Inner Collared Shirt */}
          <path
            d="M70 125 C70 105, 170 105, 170 125 L175 225 C175 230, 65 230, 65 225 Z"
            fill={SHIRT_BASE}
          />

          {/* Blue Smart Coat */}
          <path d="M68 128 L98 128 L104 226 L66 226 Z" fill={COAT_BASE} />
          <path d="M172 128 L142 128 L136 226 L174 226 Z" fill={COAT_SHADOW} />

          {/* Neck */}
          <rect x="106" y="90" width="28" height="26" rx="5" fill={CUST_SKIN} />
          <path d="M106 102 C114 110, 126 110, 134 102 L134 116 L106 116 Z" fill={CUST_SKIN_SHADOW} />

          {/* Faceless Head */}
          <path
            d="M88 55 C88 28, 152 28, 152 55 C152 92, 142 108, 120 108 C98 108, 88 92, 88 55 Z"
            fill={CUST_SKIN}
          />
          {/* Ears */}
          <circle cx="88" cy="62" r="8" fill={CUST_SKIN_SHADOW} />
          <circle cx="152" cy="62" r="8" fill={CUST_SKIN_SHADOW} />

          {/* Stylish Modern Hair */}
          <path
            d="M84 50 C84 20, 156 20, 156 46 C158 58, 148 60, 148 60 C148 45, 98 40, 92 52 C88 56, 84 54, 84 50 Z"
            fill={HAIR_BASE}
          />
          <path d="M90 36 C105 22, 145 22, 152 36" stroke="#5C3821" strokeWidth="4" strokeLinecap="round" />

          {/* Poses */}
          {pose === "skeptical" && (
            <g>
              {/* Crossed arms (demanding explanation) */}
              <path
                d="M68 135 L96 182 L155 182"
                stroke={COAT_BASE}
                strokeWidth="16"
                strokeLinecap="round"
              />
              <path
                d="M172 135 L144 172 L85 172"
                stroke={COAT_SHADOW}
                strokeWidth="16"
                strokeLinecap="round"
              />
              <circle cx="155" cy="182" r="9" fill={CUST_SKIN} />
              <circle cx="85" cy="172" r="9" fill={CUST_SKIN} />

              {/* Question bubble */}
              <g transform="translate(155, 10)">
                <circle cx="14" cy="14" r="16" fill="#EF4444" />
                <text x="14" y="21" fontSize="18" fontWeight="900" fill="#FFFFFF" textAnchor="middle">
                  ?!
                </text>
              </g>
            </g>
          )}

          {pose === "bargaining" && (
            <g>
              {/* Right hand pressing down for discount */}
              <path
                d="M68 135 L34 165 L18 152"
                stroke={COAT_BASE}
                strokeWidth="16"
                strokeLinecap="round"
              />
              <circle cx="18" cy="152" r="10" fill={CUST_SKIN} />

              {/* Left hand on hip */}
              <path
                d="M172 135 L196 172 L180 192"
                stroke={COAT_SHADOW}
                strokeWidth="16"
                strokeLinecap="round"
              />
              <circle cx="180" cy="192" r="9" fill={CUST_SKIN} />

              {/* Discount icon badge */}
              <g transform="translate(0, 110)">
                <circle cx="14" cy="14" r="16" fill="#F59E0B" />
                <text x="14" y="20" fontSize="16" textAnchor="middle" fill="#FFFFFF">
                  📉
                </text>
              </g>
            </g>
          )}

          {pose === "pleased" && (
            <g>
              {/* Thumbs up approval */}
              <path
                d="M68 135 L42 165 L30 148"
                stroke={COAT_BASE}
                strokeWidth="16"
                strokeLinecap="round"
              />
              <circle cx="30" cy="148" r="10" fill={CUST_SKIN} />

              <path
                d="M172 135 L198 165 L210 148"
                stroke={COAT_SHADOW}
                strokeWidth="16"
                strokeLinecap="round"
              />
              <circle cx="210" cy="148" r="10" fill={CUST_SKIN} />

              {/* Verified handshake badge */}
              <g transform="translate(180, 20)">
                <circle cx="14" cy="14" r="16" fill="#10B981" />
                <text x="14" y="20" fontSize="16" textAnchor="middle" fill="#FFFFFF">
                  🤝
                </text>
              </g>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
