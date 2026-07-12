import React from 'react';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  iconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', iconOnly = false, ...props }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`} {...props}>
      <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] border border-white/10 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
        <span className="text-white font-extrabold text-lg tracking-tight font-sans">AF</span>
        {/* Subtle inner ring */}
        <div className="absolute inset-0.5 rounded-full border border-white/10" />
      </div>
      {!iconOnly && (
        <div className="flex flex-col text-left">
          <span className="text-white font-extrabold text-lg leading-none tracking-tight font-sans bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            AssetFlow
          </span>
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">
            Enterprise Asset Management
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
