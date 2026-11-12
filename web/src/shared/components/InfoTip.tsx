import { useRef, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Tooltip } from 'radix-ui';

/**
 * Nút nhỏ mở tooltip giải thích. Chuột: mở khi rê vào, đóng khi rời (không cần bấm).
 * Bàn phím: mở khi focus, Esc để đóng. Màn cảm ứng không có hover nên chạm để mở/đóng.
 */
export function HoverTip({ label, className, trigger, children }: {
  /** Tên đọc cho trình đọc màn hình. */
  label: string; className: string; trigger: ReactNode; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const touch = useRef(false);
  return (
    <Tooltip.Provider delayDuration={120} skipDelayDuration={0}>
      <Tooltip.Root open={open} onOpenChange={setOpen}>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            className={className}
            aria-label={label}
            onPointerDown={(e) => {
              touch.current = e.pointerType === 'touch';
              // Chạm: tự bật/tắt, bỏ qua xử lý mặc định của Radix (vốn đóng tooltip khi bấm).
              if (touch.current) { e.preventDefault(); setOpen((o) => !o); }
            }}
            onClick={(e) => { if (touch.current) e.preventDefault(); }}
          >
            {trigger}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="info-tip__content" side="top" align="start" sideOffset={6} collisionPadding={12}>
            {children}
            <Tooltip.Arrow className="info-tip__arrow" width={10} height={5} />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

/** Icon ⓘ cạnh tiêu đề, giải thích cách tính. */
export function InfoTip({ label = 'Cách tính', children }: { label?: string; children: ReactNode }) {
  return <HoverTip label={label} className="info-tip" trigger={<Info aria-hidden="true" />}>{children}</HoverTip>;
}
