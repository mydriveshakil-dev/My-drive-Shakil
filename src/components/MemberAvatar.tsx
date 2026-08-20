import React, { useState } from 'react';

interface MemberAvatarProps {
  name?: string;
  avatar?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  shape?: 'circle' | 'square';
  className?: string;
  textClassName?: string;
  alt?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
  '2xl': 'w-24 h-24 text-2xl',
  custom: '',
};

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  name = 'User',
  avatar,
  size = 'md',
  shape = 'circle',
  className = '',
  textClassName = '',
  alt,
}) => {
  const [imageError, setImageError] = useState(false);

  const isImage =
    !imageError &&
    Boolean(
      avatar &&
        (avatar.startsWith('data:') ||
          avatar.startsWith('http://') ||
          avatar.startsWith('https://') ||
          avatar.startsWith('blob:') ||
          avatar.startsWith('/') ||
          avatar.startsWith('./') ||
          avatar.includes('.jpg') ||
          avatar.includes('.jpeg') ||
          avatar.includes('.png') ||
          avatar.includes('.webp') ||
          avatar.includes('.gif') ||
          avatar.length > 30)
    );

  const getInitials = (n: string) => {
    if (!n) return 'U';
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  const initials = avatar && avatar.length <= 4 && !avatar.startsWith('data:') ? avatar : getInitials(name);
  const dimensionClass = sizeClasses[size] || sizeClasses.md;
  const roundingClass = shape === 'square' ? 'rounded-2xl' : 'rounded-full';

  if (isImage) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 ${roundingClass} overflow-hidden shadow-xs ${
          shape === 'square' ? 'bg-transparent border-0' : 'border border-slate-300 bg-slate-100'
        } ${dimensionClass} ${className}`}
      >
        <img
          src={avatar}
          alt={alt || name}
          referrerPolicy="no-referrer"
          onError={() => setImageError(true)}
          className={`w-full h-full object-cover ${roundingClass}`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${roundingClass} font-black select-none bg-gradient-to-br from-[#07193F] to-[#0A255C] text-white shadow-xs ${
        shape === 'square' ? 'border border-white/20' : 'border border-blue-900/30'
      } ${dimensionClass} ${className}`}
      title={name}
    >
      <span className={textClassName}>{initials}</span>
    </div>
  );
};
