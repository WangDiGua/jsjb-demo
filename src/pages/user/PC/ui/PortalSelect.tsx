import { forwardRef, type ChangeEvent, type SelectHTMLAttributes } from 'react';
import { cn } from './cn';

export type PortalSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'size' | 'onChange' | 'value' | 'defaultValue'
> & {
  value?: string | number | readonly string[] | undefined;
  defaultValue?: string | number | readonly string[];
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  fieldSize?: 'small' | 'middle' | 'large';
};

export const PortalSelect = forwardRef<HTMLSelectElement, PortalSelectProps>(function PortalSelect(
  { className, children, value, defaultValue, onChange, fieldSize = 'middle', ...rest },
  ref,
) {
  const sizeClassName =
    fieldSize === 'small'
      ? 'min-h-[2.25rem] text-xs'
      : fieldSize === 'large'
        ? 'min-h-[2.875rem] text-[15px]'
        : 'min-h-[2.625rem] text-sm';

  return (
    <select
      ref={ref}
      value={Array.isArray(value) ? undefined : value === null ? undefined : value}
      defaultValue={Array.isArray(defaultValue) ? undefined : defaultValue === null ? undefined : defaultValue}
      onChange={onChange}
      {...rest}
      className={cn('portal-select w-full min-w-0', sizeClassName, className)}
    >
      {children}
    </select>
  );
});
