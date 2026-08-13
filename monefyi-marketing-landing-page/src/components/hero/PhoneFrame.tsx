import React from 'react';
import { cn } from '../../lib/cn';

interface PhoneFrameProps {
  children: React.ReactNode;
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function PhoneFrame({ children, className, onMouseEnter, onMouseLeave }: PhoneFrameProps): React.ReactElement {
  return (
    <div
      className={cn('relative', className)}
      style={{
        width: 280,
        height: 580,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Phone body */}
      <div
        className="absolute inset-0 rounded-[2.5rem] overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          border: '6px solid #334155',
          boxShadow: '0 30px 80px -20px rgba(16,185,129,0.4), inset 0 0 30px rgba(0,0,0,0.3)',
        }}
      >
        {/* Screen area */}
        <div
          className="absolute overflow-hidden bg-slate-950"
          style={{
            inset: 0,
            borderRadius: '2rem',
          }}
        >
          {children}
        </div>

        {/* Notch */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
          style={{
            width: 120,
            height: 28,
            background: '#1e293b',
            borderBottomLeftRadius: '1rem',
            borderBottomRightRadius: '1rem',
          }}
        >
          {/* Speaker */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-600 rounded-full"
            style={{ width: 40, height: 4 }}
          />
          {/* Camera */}
          <div
            className="absolute bg-slate-600 rounded-full"
            style={{ width: 8, height: 8, right: 16, top: '50%', marginTop: -4 }}
          />
        </div>

        {/* Home indicator */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full"
          style={{ width: 100, height: 4, background: 'rgba(100,116,139,0.5)' }}
        />
      </div>
    </div>
  );
}
