import React from 'react';
import logoImg from '../../assets/logo.png';

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = "w-9 h-9 object-contain", 
  alt = "الوكالة موتورز" 
}) => {
  return (
    <img 
      src={logoImg} 
      alt={alt} 
      className={className}
      onError={(e) => {
        // Fallback gracefully if image fails to render
        (e.target as HTMLElement).style.display = 'none';
      }}
    />
  );
};
