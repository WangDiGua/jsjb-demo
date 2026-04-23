import {
  Children,
  forwardRef,
  isValidElement,
  useMemo,
  type ChangeEvent,
  type OptionHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { Select } from 'antd';
import type { RefSelectProps, SelectProps } from 'antd';
import { cn } from './cn';

export type PortalSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'size' | 'defaultValue' | 'onChange' | 'value'
> & {
  value?: string | number | readonly string[] | undefined;
  defaultValue?: string | number | readonly string[];
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  /** 对应 antd Select 尺寸，避免与原生 attribute `size` 冲突 */
  fieldSize?: SelectProps['size'];
};

type OptionEl = ReactElement<OptionHTMLAttributes<HTMLOptionElement>>;

function parseOptions(children: ReactNode): { value: string; label: ReactNode; disabled?: boolean }[] {
  const out: { value: string; label: ReactNode; disabled?: boolean }[] = [];
  Children.forEach(children, (node) => {
    if (!isValidElement(node) || node.type !== 'option') return;
    const el = node as OptionEl;
    out.push({
      value: String(el.props.value ?? ''),
      label: el.props.children,
      disabled: el.props.disabled,
    });
  });
  return out;
}

function placeholderFromLabel(label: ReactNode): string | undefined {
  if (label == null) return undefined;
  if (typeof label === 'string' || typeof label === 'number') return String(label);
  return undefined;
}

export const PortalSelect = forwardRef<RefSelectProps, PortalSelectProps>(function PortalSelect(
  {
    className,
    children,
    value,
    defaultValue,
    onChange,
    disabled,
    name,
    id,
    fieldSize = 'middle',
    autoFocus,
    title,
    required,
  },
  ref,
) {
  const { selectOptions, placeholder } = useMemo(() => {
    const parsed = parseOptions(children);
    const phOpt = parsed.find((o) => o.value === '');
    const rest = phOpt ? parsed.filter((o) => o.value !== '') : parsed;
    return {
      selectOptions: rest,
      placeholder: phOpt ? placeholderFromLabel(phOpt.label) : undefined,
    };
  }, [children]);

  const resolvedValue = useMemo(() => {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) return undefined;
    return String(value);
  }, [value]);

  const resolvedDefault = useMemo(() => {
    if (defaultValue === undefined || defaultValue === null || defaultValue === '') return undefined;
    if (Array.isArray(defaultValue)) return undefined;
    return String(defaultValue);
  }, [defaultValue]);

  return (
    <Select
      ref={ref}
      id={id}
      title={title}
      disabled={disabled}
      autoFocus={autoFocus}
      aria-required={required}
      value={resolvedValue}
      defaultValue={resolvedDefault}
      options={selectOptions}
      placeholder={placeholder}
      size={fieldSize}
      allowClear={false}
      showSearch={false}
      virtual={selectOptions.length > 48}
      listHeight={320}
      popupMatchSelectWidth
      classNames={{ popup: { root: 'portal-select-dropdown' } }}
      className={cn('portal-select-antd min-w-0', className)}
      onChange={(v) => {
        const s = String(v);
        onChange?.({
          target: { value: s, name: (name ?? '') as string } as EventTarget & HTMLSelectElement,
        } as ChangeEvent<HTMLSelectElement>);
      }}
    />
  );
});
