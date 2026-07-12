import React from 'react';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  iconOnly?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ className = '', iconOnly = false, ...props }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`} {...props}>
      <img
        src="/logo.png"
        alt="AssetFlow Logo"
        className="w-10 h-10 object-contain rounded-md"
      />
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
