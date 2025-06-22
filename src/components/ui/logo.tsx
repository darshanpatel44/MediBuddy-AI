import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <circle
        cx="16"
        cy="16"
        r="15"
        fill="#2563eb"
        stroke="#1d4ed8"
        strokeWidth="2"
      />

      {/* Medical cross */}
      <rect x="14" y="8" width="4" height="16" fill="white" rx="1" />
      <rect x="8" y="14" width="16" height="4" fill="white" rx="1" />

      {/* AI circuit elements */}
      <circle cx="10" cy="10" r="1.5" fill="#60a5fa" opacity="0.8" />
      <circle cx="22" cy="10" r="1.5" fill="#60a5fa" opacity="0.8" />
      <circle cx="10" cy="22" r="1.5" fill="#60a5fa" opacity="0.8" />
      <circle cx="22" cy="22" r="1.5" fill="#60a5fa" opacity="0.8" />

      {/* Connecting lines for AI theme */}
      <line
        x1="10"
        y1="10"
        x2="14"
        y2="14"
        stroke="#60a5fa"
        strokeWidth="1"
        opacity="0.6"
      />
      <line
        x1="22"
        y1="10"
        x2="18"
        y2="14"
        stroke="#60a5fa"
        strokeWidth="1"
        opacity="0.6"
      />
      <line
        x1="10"
        y1="22"
        x2="14"
        y2="18"
        stroke="#60a5fa"
        strokeWidth="1"
        opacity="0.6"
      />
      <line
        x1="22"
        y1="22"
        x2="18"
        y2="18"
        stroke="#60a5fa"
        strokeWidth="1"
        opacity="0.6"
      />
    </svg>
  );
}
