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
      'neu-upper text-slate-900 rounded-3xl',
    card:
      'neu-upper text-slate-900 rounded-3xl',
    emerald:
      'neu-upper text-slate-900 rounded-3xl',
    amber:
      'neu-upper text-slate-900 rounded-3xl',
    pill:
      'neu-upper-sm text-slate-900 rounded-full',
    subtle:
      'neu-upper-sm text-slate-900 rounded-2xl',
    modal:
      'neu-upper text-slate-900 rounded-3xl',
    dark:
      'bg-gradient-to-br from-[#071E55] to-[#0A297A] text-white border border-[#0F3DFF]/30 shadow-2xl shadow-blue-950/20 rounded-3xl',
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
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-300/80 to-transparent pointer-events-none" />

      {/* Content slot */}
      {children}
    </motion.div>
  );
};
