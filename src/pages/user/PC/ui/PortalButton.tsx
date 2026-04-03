import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

export type PortalButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg' | 'hero';
  fullWidth?: boolean;
};

const variantClass: Record<NonNullable<PortalButtonProps['variant']>, string> = {
  primary:
    'rounded-xl bg-primary font-bold text-white shadow-lg shadow-primary/30 transition-all hover:shadow-primary/40 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none',
  secondary:
    'rounded-xl border border-outline-variant bg-surface-container-lowest font-bold text-on-surface transition-all hover:bg-surface active:scale-[0.99] disabled:opacity-50',
  outline:
    'rounded-xl border border-outline-variant/40 bg-surface-container-lowest/90 font-semibold text-on-surface transition-all hover:border-primary/35 hover:bg-primary/5 active:scale-[0.99] disabled:opacity-50',
  ghost:
    'rounded-xl font-semibold text-on-surface-variant transition-colors hover:bg-on-surface/5 active:bg-on-surface/10 disabled:opacity-50',
  link: 'inline-flex items-center justify-center gap-2 rounded-lg font-bold text-primary underline-offset-4 transition-colors hover:text-primary/85 hover:underline disabled:opacity-50',
  danger:
    'rounded-xl font-bold text-red-600 transition-colors hover:bg-red-50 active:bg-red-100 disabled:opacity-50',
  dark:
    'rounded-xl bg-on-surface font-bold text-white shadow-md transition-all hover:bg-on-surface/90 active:scale-[0.99] disabled:opacity-50',
};

const sizeClass: Record<NonNullable<PortalButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-sm',
  hero: 'px-8 py-4 text-base',
};

export const PortalButton = forwardRef<HTMLButtonElement, PortalButtonProps>(function PortalButton(
  { variant = 'primary', size = 'md', fullWidth, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2',
        variantClass[variant],
        variant !== 'link' && sizeClass[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    />
  );
});
