import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-mono-hud font-semibold uppercase tracking-wider text-slate-400 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute left-3 text-slate-500 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-slate-950/70 text-slate-100 placeholder-slate-500 font-mono-hud text-xs md:text-sm px-3.5 py-2.5 rounded-md border border-slate-700/60 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/50 transition-all duration-200 ${
            icon ? 'pl-9' : ''
          } ${error ? 'border-red-500/80 focus:border-red-400' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 font-mono-hud text-[11px] text-red-400">{error}</p>
      )}
    </div>
  );
};
