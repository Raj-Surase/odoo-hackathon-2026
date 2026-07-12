import React from 'react';
import { useTheme } from 'next-themes';
import logoBlack from '../../assets/wordmark-transparent-black.png';
import logoWhite from '../../assets/wordmark-transparent-white.png';

interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  alt?: string;
}

export const Logo: React.FC<LogoProps> = ({ className, alt = "DhaagaOS", ...props }) => {
  const { resolvedTheme } = useTheme();
  // Default to white logo since the app is dark theme by default
  const logoSrc = resolvedTheme === 'light' ? logoBlack : logoWhite;

  return (
    <img
      src={logoSrc}
      alt={alt}
      className={className}
      {...props}
    />
  );
};

export default Logo;
