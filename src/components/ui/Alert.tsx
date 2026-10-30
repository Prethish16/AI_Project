import React from 'react';
import { AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  className = '',
  action,
}) => {
  const configs = {
    info: {
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-950/30 text-cyan-200',
      titleColor: 'text-cyan-300',
      icon: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
    },
    warning: {
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/30 text-amber-200',
      titleColor: 'text-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    },
    danger: {
      border: 'border-red-500/40',
      bg: 'bg-red-950/30 text-red-200',
      titleColor: 'text-red-300',
      icon: <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />,
    },
    success: {
      border: 'border-teal-500/40',
      bg: 'bg-teal-950/30 text-teal-200',
      titleColor: 'text-teal-300',
      icon: <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />,
    },
  };

  const config = configs[variant];

  return (
    <div
      role="alert"
      className={`relative flex items-start gap-3 p-4 rounded-lg border backdrop-blur-md ${config.border} ${config.bg} ${className}`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 text-xs md:text-sm font-mono-hud leading-relaxed">
        {title && <h5 className={`font-display font-bold text-sm mb-1 ${config.titleColor}`}>{title}</h5>}
        <div>{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
