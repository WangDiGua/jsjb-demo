import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

export type PortalIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const PortalIconButton = forwardRef<HTMLButtonElement, PortalIconButtonProps>(
  function PortalIconButton({ className, type = 'button', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'inline-flex items-center justify-center rounded-full p-2 text-on-surface-variant ring-1 ring-transparent transition-colors hover:bg-secondary/10 hover:text-primary hover:ring-secondary/20',
          className,
        )}
        {...rest}
      />
    );
  },
);
