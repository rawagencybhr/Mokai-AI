import React from 'react';

interface RawbotLogoProps {
  className?: string;
  width?: number;
  height?: number;
}

export const RawbotLogo: React.FC<RawbotLogoProps> = ({ className = "", width = 40, height = 40 }) => {
  return (
    <svg 
      width={width} 
      height={height} 
      viewBox="0 0 100 60" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0" y1="30" x2="100" y2="30">
          <stop offset="0%" stopColor="#06b6d4" /> {/* Cyan 500 */}
          <stop offset="100%" stopColor="#1e3a8a" /> {/* Blue 900 */}
        </linearGradient>
      </defs>
      
      {/* Outer Pill Shape */}
      <rect 
        x="2" 
        y="2" 
        width="96" 
        height="56" 
        rx="28" 
        stroke="url(#logoGradient)" 
        strokeWidth="6" 
        fill="white"
      />
      
      {/* Inner Pill Background (Optional fill or kept white per image) */}
      <rect 
        x="10" 
        y="10" 
        width="80" 
        height="40" 
        rx="20" 
        fill="url(#logoGradient)" 
        fillOpacity="0.1" 
      />

      {/* Three Dots */}
      <circle cx="35" cy="30" r="6" fill="url(#logoGradient)" />
      <circle cx="50" cy="30" r="6" fill="url(#logoGradient)" />
      <circle cx="65" cy="30" r="6" fill="url(#logoGradient)" />
    </svg>
  );
};