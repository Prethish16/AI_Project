import React from 'react';

export interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  valueDisplay?: string;
}

export const Slider: React.FC<SliderProps> = ({
  label,
  valueDisplay,
  className = '',
  id,
  ...props
}) => {
  const sliderId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {(label || valueDisplay) && (
        <div className="flex items-center justify-between text-xs font-mono-hud font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label && <label htmlFor={sliderId}>{label}</label>}
          {valueDisplay && <span className="text-amber-400 font-bold">{valueDisplay}</span>}
        </div>
      )}
      <input
        type="range"
        id={sliderId}
        className={`w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none ${className}`}
        {...props}
      />
    </div>
  );
};
