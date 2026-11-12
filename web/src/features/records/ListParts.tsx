import { IconButton } from '@/shared/components/IconButton';
import { ChevronLeft, ChevronRight, RotateCcw, Search as SearchIcon, X } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { useState, type ReactNode } from 'react';
import { Skel } from '@/shared/components/Blocks';
import { num } from '@/shared/lib/format';

/* ---------- Thanh công cụ ---------- */

export function Search({ value, onSearch, placeholder, label }: { value: string; onSearch: (v: string) => void; placeholder: string; label: string }) {
  const [v, setV] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) { setPrevValue(value); setV(value); }
  // Chỉ tìm khi nhấn Enter hoặc nút tìm — không gọi lại API liên tục khi đang nhập.
  return <form className="table-search" role="search" onSubmit={(e) => { e.preventDefault(); onSearch(v.trim()); }}>
    <Input aria-label={label} placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
    {v && <IconButton variant="ghost" icon={X} label="Xóa nội dung tìm kiếm" onClick={() => { setV(''); onSearch(''); }} />}
    <IconButton type="submit" variant="default" icon={SearchIcon} label="Tìm kiếm" />
  </form>;
}

/** Đặt lại các ô lọc của danh sách; chỉ hiện khi có ô lọc khác mặc định. */
export function ListReset({ show, onReset }: { show: boolean; onReset: () => void }) {
  if (!show) return null;
  return (
    <IconButton variant="ghost" icon={RotateCcw} className="list-reset" onClick={onReset} label="Đặt lại bộ lọc danh sách" />
  );
}

export function Chip({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return (
    <span className="chip">
      {children}
      <button type="button" aria-label={label} onClick={onRemove}>
        <X className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}

export function Pager({ page, size, total, onChange, mobile }: { page: number; size: number; total: number; onChange: (page: number, size: number) => void; mobile: boolean }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  if (mobile) {
    return (
      <div className="m-pager">
        <IconButton icon={ChevronLeft} label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1, size)} />
        <span className="num">
          {num(from)}–{num(to)} / {num(total)}
        </span>
        <IconButton icon={ChevronRight} label="Trang sau" disabled={page >= pages} onClick={() => onChange(page + 1, size)} />
      </div>
    );
  }
  return null;
}

export function SkeletonRows({ n = 8 }: { n?: number }) {
  return (
    <div className="skel-rows" aria-busy="true" aria-label="Đang tải danh sách">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skel-rows__row">
          <Skel w={72} />
          <Skel w={180} />
          <Skel w={90} />
          <Skel w="30%" />
          <Skel w={96} h={22} />
        </div>
      ))}
    </div>
  );
}
