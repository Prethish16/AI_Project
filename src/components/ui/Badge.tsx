import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'amber' | 'teal' | 'coral' | 'gold' | 'slate' | 'outline';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'amber',
  dot = false,
  className = '',
  ...props
}) => {
  const variantStyles = {
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    teal: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    coral: 'bg-red-500/15 text-red-300 border-red-500/30',
    gold: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.2)]',
    slate: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    outline: 'bg-transparent text-slate-300 border-slate-600/50',
  };

  const dotColors = {
    amber: 'bg-amber-400',
    teal: 'bg-teal-400',
    coral: 'bg-red-400',
    gold: 'bg-yellow-400',
    slate: 'bg-slate-400',
    outline: 'bg-slate-300',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono-hud font-semibold uppercase tracking-wider border ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} animate-pulse`} />}
      {children}
    </span>
  );
};
