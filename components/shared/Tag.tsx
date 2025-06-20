
import React from 'react';

interface TagProps {
  text: string;
  colorClasses: string; // e.g., 'bg-blue-500 text-white'
  onClick?: () => void;
  className?: string;
}

export const Tag: React.FC<TagProps> = ({ text, colorClasses, onClick, className }) => {
  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClasses} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className || ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {text}
    </span>
  );
};
