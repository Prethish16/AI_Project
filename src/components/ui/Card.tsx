import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'amber' | 'teal' | 'coral' | 'subtle';
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  glow = false,
  className = '',
  ...props
}) => {
  const variantClasses = {
    default: 'glass-panel text-slate-100',
    amber: 'glass-panel-amber text-amber-100',
    teal: 'glass-panel-teal text-teal-100',
    coral: 'glass-panel-coral text-red-100',
    subtle: 'glass-panel-subtle text-slate-200',
  };

  const glowClass = glow ? 'shadow-[0_0_30px_rgba(245,158,11,0.2)]' : '';

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all duration-300 ${variantClasses[variant]} ${glowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3
    className={`font-display text-base md:text-lg font-bold tracking-wider text-slate-100 flex items-center gap-2 ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);
