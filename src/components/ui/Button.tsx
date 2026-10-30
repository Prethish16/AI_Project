import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'amber' | 'teal' | 'coral' | 'slate' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'amber',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-mono-hud font-semibold uppercase tracking-wider transition-all duration-200 select-none cursor-pointer focus:outline-none focus-visible:ring-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 rounded gap-1.5',
    md: 'text-xs md:text-sm px-4 py-2 rounded-md gap-2',
    lg: 'text-sm md:text-base px-5 py-2.5 rounded-lg gap-2.5',
  };

  const variantStyles = {
    amber:
      'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 hover:border-amber-400 hover:text-amber-200 shadow-[0_0_15px_-3px_rgba(245,158,11,0.25)] focus-visible:ring-amber-400',
    teal:
      'bg-teal-500/20 text-teal-300 border border-teal-500/40 hover:bg-teal-500/30 hover:border-teal-400 hover:text-teal-200 shadow-[0_0_15px_-3px_rgba(20,184,166,0.25)] focus-visible:ring-teal-400',
    coral:
      'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 hover:border-red-400 hover:text-red-200 shadow-[0_0_15px_-3px_rgba(239,68,68,0.25)] focus-visible:ring-red-400',
    slate:
      'bg-slate-800/60 text-slate-200 border border-slate-700/60 hover:bg-slate-800 hover:border-slate-600 hover:text-white shadow-[0_4px_12px_rgba(0,0,0,0.3)] focus-visible:ring-slate-400',
    ghost:
      'bg-transparent text-slate-300 hover:bg-white/5 hover:text-white border border-transparent focus-visible:ring-slate-400',
    outline:
      'bg-transparent text-slate-300 border border-slate-600/60 hover:border-slate-400 hover:text-white focus-visible:ring-slate-400',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};
