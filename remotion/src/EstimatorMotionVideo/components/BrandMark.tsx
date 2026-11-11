import React from "react";

export const BrandMark: React.FC<{ size?: number; className?: string }> = ({
  size = 64,
  className = "",
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="brand-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#21AB7B" />
          <stop offset="100%" stopColor="#157F5F" />
        </linearGradient>
        <filter id="mark-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <rect width="96" height="96" rx="22" fill="url(#brand-grad)" />
      <rect x="29" y="24" width="12" height="48" rx="3" fill="#ffffff" />
      <rect x="29" y="24" width="38" height="12" rx="3" fill="#ffffff" />
      <rect x="29" y="42" width="31" height="12" rx="3" fill="#ffffff" />
      <rect x="29" y="60" width="38" height="12" rx="3" fill="#ffffff" />
    </svg>
  );
};

export const BrandLockup: React.FC<{ size?: number; light?: boolean }> = ({
  size = 48,
  light = true,
}) => {
  return (
    <div className="flex items-center gap-4">
      <BrandMark size={size} />
      <div className="flex flex-col">
        <span
          className={`font-black tracking-tight leading-none ${
            light ? "text-white" : "text-emerald-950"
          }`}
          style={{ fontSize: size * 0.72 }}
        >
          Estimator
        </span>
        <span className="text-[12px] tracking-widest uppercase font-bold text-emerald-400 mt-1">
          by Monefyi
        </span>
      </div>
    </div>
  );
};

