import { ChevronDown, ChevronUp } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { num } from '@/shared/lib/format';

/**
 * Danh sách hoặc bảng dài: mặc định chỉ hiện `limit` dòng đầu, nút "Xem tất cả N" mở phần còn lại tại chỗ.
 * Ẩn bằng CSS (.top-rows.is-collapsed …:nth-child(n+limit+1)) nên không phải sửa từng vòng lặp render.
 * Dòng có class `is-pinned` (ví dụ đơn vị của mình) luôn hiện kể cả khi thu gọn.
 */
export const TOP_N = 5;

export function TopRows({ total, limit = TOP_N, noun = 'dòng', children, className }: {
  total: number;
  limit?: 5 | 7;
  noun?: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const collapsible = total > limit;
  return (
    <div className={`top-rows top-rows--${limit}${collapsible && !open ? ' is-collapsed' : ''}${className ? ` ${className}` : ''}`} id={id}>
      {children}
      {collapsible && (
        <button type="button" className="top-rows__toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
          {open ? <>Thu gọn <ChevronUp aria-hidden="true" /></> : <>Xem tất cả {num(total)} {noun} <ChevronDown aria-hidden="true" /></>}
        </button>
      )}
    </div>
  );
}
