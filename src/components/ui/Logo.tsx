import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-8 h-8', size = 32 }) => {
  return (
    <img
      src="/LOGO.svg"
      alt="ARL's Hotel Logo"
      style={{ width: size, height: size }}
      className={`object-contain filter drop-shadow-[0_2px_8px_rgba(174,145,112,0.5)] hover:scale-105 transition-transform duration-300 ${className}`}
    />
  );
};
