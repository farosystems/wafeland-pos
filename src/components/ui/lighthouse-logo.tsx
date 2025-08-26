import React from 'react';

interface LighthouseLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  variant?: 'default' | 'white' | 'gradient';
}

export const LighthouseLogo: React.FC<LighthouseLogoProps> = ({
  size = 40,
  className = '',
  showText = false,
  variant = 'default'
}) => {
  const isWhite = variant === 'white';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo PNG directo */}
      <img 
        src="/2-removebg-preview.png" 
        alt="FA-RO Logo" 
        className="object-contain"
        style={{
          width: size,
          height: size,
          filter: isWhite ? 'brightness(0) invert(1)' : 'none',
          maxWidth: '100%',
          maxHeight: '100%'
        }}
        loading="eager"
      />
      
      {/* Texto FA-RO - solo si showText es true */}
      {showText && (
        <div className="mt-2">
          <h1 
            className="text-lg font-bold tracking-wider"
            style={{
              background: isWhite 
                ? 'linear-gradient(to right, rgba(255,255,255,0.95), rgba(255,255,255,0.8))'
                : 'linear-gradient(to right, #3b82f6, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: isWhite 
                ? '0 0 10px rgba(255,255,255,0.3)'
                : '0 0 10px rgba(59, 130, 246, 0.3)'
            }}
          >
            FA-RO
          </h1>
        </div>
      )}
    </div>
  );
};
