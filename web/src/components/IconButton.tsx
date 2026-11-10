import type { ComponentProps } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip } from 'radix-ui';
import { Button } from './ui/button';

type Props = Omit<ComponentProps<typeof Button>, 'size' | 'children' | 'asChild' | 'aria-label' | 'title'> & {
  label: string;
  icon: LucideIcon;
  badge?: number;
};

/** Thao tác tiện ích: icon, tên truy cập được và tooltip khi hover/focus. */
export function IconButton({ label, icon: Icon, badge, className, loading, variant = 'outline', type = 'button', ...props }: Props) {
  return (
    <Tooltip.Provider delayDuration={300}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Button {...props} type={type} variant={variant} size="icon" loading={loading}
            aria-label={label} className={`utility-icon${className ? ` ${className}` : ''}`}>
            {!loading && <Icon aria-hidden="true" />}
            {!!badge && <span className="utility-icon__badge" aria-hidden="true">{badge}</span>}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="utility-tooltip" sideOffset={6}>
            {label}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
