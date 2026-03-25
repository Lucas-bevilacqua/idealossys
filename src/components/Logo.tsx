import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'footer' | 'minimal';
  interactive?: boolean;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  variant = 'default', 
  interactive = false,
  onClick 
}) => {
  const sizes = {
    sm: 'scale-[0.6]',
    md: 'scale-[0.8]',
    lg: 'scale-100',
    xl: 'scale-125'
  };

  if (variant === 'minimal') {
    return (
      <div className={`relative ${sizes[size]} flex items-center justify-center`}>
        <span className="text-accent font-black text-xl tracking-tighter">I/O</span>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div
        className={`flex items-center gap-2 ${sizes[size]} ${interactive ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <span className="text-main font-heading font-black text-2xl tracking-tight uppercase leading-none">
          Ideal <span className="font-light italic">OS</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${sizes[size]} ${interactive ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <h1 className="text-main font-heading font-black text-4xl tracking-tighter uppercase leading-none">
        Ideal <span className="font-light italic">OS</span>
      </h1>
    </div>
  );
}; 
