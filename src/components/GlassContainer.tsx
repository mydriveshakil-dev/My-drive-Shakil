import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

export type GlassVariant =
  | 'default'
  | 'emerald'
  | 'amber'
  | 'pill'
  | 'card'
  | 'subtle'
  | 'modal'
  | 'dark';

export interface GlassContainerProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  variant?: GlassVariant;
  blur?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  hoverEffect?: boolean;
  glow?: boolean;
  specularBorder?: boolean;
  className?: string;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  variant = 'default',
  blur = '2xl',
  hoverEffect = false,
  glow = false,
  specularBorder = true,
  className = '',
  ...motionProps
}) => {
  const blurClasses = {
    sm: 'backdrop-blur-sm',
    md: 'backdrop-blur-md',
    lg: 'backdrop-blur-lg',
    xl: 'backdrop-blur-xl',
    '2xl': 'backdrop-blur-2xl',
    '3xl': 'backdrop-blur-3xl',
  }[blur];

  const variantStyles: Record<GlassVariant, string> = {
    default:
      'bg-white/10 text-white border border-white/30 shadow-xl backdrop-blur-2xl',
    card:
      'bg-white/10 text-white border border-white/30 shadow-2xl backdrop-blur-2xl rounded-3xl',
    emerald:
      'bg-emerald-950/35 text-white border border-emerald-400/40 shadow-2xl backdrop-blur-3xl rounded-3xl',
    amber:
      'bg-amber-950/35 text-amber-100 border border-amber-300/40 shadow-2xl backdrop-blur-3xl rounded-3xl',
    pill:
      'bg-white/15 text-white border border-white/35 shadow-md backdrop-blur-xl rounded-full',
    subtle:
      'bg-white/[0.08] text-white border border-white/20 backdrop-blur-xl shadow-xs rounded-2xl',
    modal:
      'bg-slate-950/50 text-white border border-white/35 shadow-2xl backdrop-blur-3xl rounded-3xl',
    dark:
      'bg-black/40 text-white border border-white/25 shadow-2xl backdrop-blur-2xl rounded-3xl',
  };

  const hoverClass = hoverEffect
    ? 'transition-all duration-300 hover:scale-[1.015] hover:shadow-2xl hover:bg-white/20 hover:border-white/50 cursor-pointer'
    : '';

  const glowClass = glow
    ? 'after:absolute after:inset-0 after:rounded-[inherit] after:bg-gradient-to-tr after:from-emerald-400/20 after:to-amber-400/20 after:blur-xl after:-z-10'
    : '';

  const specularClass = specularBorder ? 'glass-border-specular' : '';

  return (
    <motion.div
      className={`relative ${blurClasses} ${variantStyles[variant]} ${hoverClass} ${glowClass} ${specularClass} ${className}`}
      {...motionProps}
    >
      {/* Specular top reflection highlight line */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/70 to-transparent pointer-events-none" />

      {/* Content slot */}
      {children}
    </motion.div>
  );
};
