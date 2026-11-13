import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { vi } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/shared/ui/toggle-group';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Textarea } from '@/shared/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Calendar } from '@/shared/ui/calendar';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { useHideNavWhile } from '@/shared/lib/overlay';
import { DEMO_TODAY } from '@/shared/lib/demoClock';

export function ChoiceSelect<T extends string | number>({ value, onValueChange, options, prefix, className, ...props }: {
  value: T; onValueChange: (value: T) => void; options: { value: T; label: ReactNode }[];
  prefix?: string; className?: string; 'aria-label'?: string; disabled?: boolean; id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean;
}) {
  return <Select value={String(value)} onValueChange={(v) => {
    const option = options.find((o) => String(o.value) === v);
    if (option) onValueChange(option.value);
  }} disabled={props.disabled}>
    <SelectTrigger id={props.id} aria-label={props['aria-label']} aria-invalid={props['aria-invalid']} aria-describedby={props['aria-describedby']} className={`choice-select bg-card${className ? ` ${className}` : ''}`}>
      {prefix && <span className="shrink-0">{prefix}</span>}<SelectValue />
    </SelectTrigger>
    <SelectContent>{options.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
  </Select>;
}

/** Select có nhóm tiêu đề (ví dụ phạm vi: toàn cơ sở, từng tổ và cán bộ trong tổ). */
export function GroupedSelect({ value, onValueChange, groups, prefix, className, ...props }: {
  value: string; onValueChange: (value: string) => void; groups: { label: string | null; items: { value: string; label: string }[] }[];
  prefix?: string; className?: string; 'aria-label'?: string;
}) {
  return <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger aria-label={props['aria-label']} className={`choice-select bg-card${className ? ` ${className}` : ''}`}>
      {prefix && <span className="shrink-0">{prefix}</span>}<SelectValue />
    </SelectTrigger>
    <SelectContent>{groups.map((g, i) => <SelectGroup key={g.label ?? i}>
      {i > 0 && <SelectSeparator />}
      {g.label && <SelectLabel>{g.label}</SelectLabel>}
      {g.items.map((o) => <SelectItem key={o.value} value={o.value} className={g.label && o.value !== g.items[0].value ? 'select-child' : undefined}>{o.label}</SelectItem>)}
    </SelectGroup>)}</SelectContent>
  </Select>;
}

export function TimeSelect({ value, onValueChange, label, id, ...props }: {
  value: string; onValueChange: (value: string) => void; label: string; id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string;
}) {
  const [hour, minute] = value.split(':');
  const options = (count: number, step = 1) => Array.from({ length: count }, (_, n) => { const value = String(n * step).padStart(2, '0'); return { value, label: value }; });
  return <div className="time-select">
    <ChoiceSelect id={id} value={hour} onValueChange={(h) => onValueChange(`${h}:${minute}`)} options={options(24)} aria-label={`${label}, giờ (24 giờ)`} {...props} />
    <span aria-hidden="true">:</span>
    <ChoiceSelect value={minute} onValueChange={(m) => onValueChange(`${hour}:${m}`)} options={options(12, 5)} aria-label={`${label}, phút`} {...props} />
  </div>;
}

export function DateTimeField({ value, onValueChange, invalid, describedBy }: {
  value: string; onValueChange: (value: string) => void; invalid?: boolean; describedBy?: string;
}) {
  const [open, setOpen] = useState(false);
  const [day, time = '00:00'] = value.split('T');
  const date = new Date(`${day}T00:00:00`);
  return <div className="date-time-field">
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild>
      <Button variant="outline" aria-label={`Ngày hiệu lực: ${date.toLocaleDateString('vi-VN')}`} aria-invalid={invalid} aria-describedby={describedBy}>{date.toLocaleDateString('vi-VN')}</Button>
    </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
      <Calendar mode="single" locale={vi} selected={date} defaultMonth={date} disabled={{ before: new Date(`${DEMO_TODAY}T00:00:00`) }} onSelect={(d) => {
        if (d) { const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; onValueChange(`${date}T${time}`); setOpen(false); }
      }} />
    </PopoverContent></Popover>
    <TimeSelect value={time} onValueChange={(t) => onValueChange(`${day}T${t}`)} label="Giờ hiệu lực" aria-invalid={invalid} aria-describedby={describedBy} />
  </div>;
}

/** Segmented control: một rãnh nền, các mục rộng bằng nhau, mục đang chọn nền trắng. block = phủ hết chiều ngang. */
export function OptionGroup<T extends string>({ value, onValueChange, options, block, ...props }: {
  value: T; onValueChange: (value: T) => void; options: { value: T; label: ReactNode }[]; 'aria-label'?: string; block?: boolean;
}) {
  return <ToggleGroup type="single" spacing={0} value={value} onValueChange={(v) => v && onValueChange(v as T)} aria-label={props['aria-label']} className={`segmented${block ? ' segmented--block' : ''}`}>
    {options.map((o) => <ToggleGroupItem key={o.value} value={o.value} className="segmented__item">{o.label}</ToggleGroupItem>)}
  </ToggleGroup>;
}

export function ViewTabs({ value, onValueChange, items, className, extra, label = 'Chọn nội dung' }: {
  value?: string; onValueChange?: (value: string) => void;
  items: { key: string; label: ReactNode; children: ReactNode }[]; className?: string;
  /** Thao tác đặt cùng hàng với tab, sát phải. */
  extra?: ReactNode;
  /** Tên của ô chọn thay cho tab trên mobile. */
  label?: string;
}) {
  // Mobile: hơn 3 tab không vừa 375px → đổi thành ô chọn, tránh cuộn ngang (giống màn Quản lý HKD).
  const compact = useBreakpoint() === 'mobile' && items.length > 3;
  // Gạch chân tab đang chọn: một thanh duy nhất trong danh sách tab, đo vị trí tab đang chọn một lần rồi trượt bằng CSS transform.
  // Trước đây dùng layoutId của motion: mỗi lần đổi tab/đổi màn phải đo lại layout nhiều phần tử, gây khựng (đo 10/11/2026).
  const [own, setOwn] = useState(items[0]?.key);
  const current = value ?? own;
  const listRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  useLayoutEffect(() => {
    const list = listRef.current;
    const bar = barRef.current;
    if (!list || !bar) return;
    const place = () => {
      const tab = list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
      if (!tab) return void (bar.style.opacity = '0');
      // Lần đặt đầu không trượt từ vị trí 0.
      if (!placed.current) bar.style.transition = 'none';
      bar.style.opacity = '1';
      // Thanh rộng gốc 100px; vị trí và độ rộng đều qua transform để chuyển động chạy trên compositor.
      bar.style.transform = `translateX(${tab.offsetLeft}px) scaleX(${tab.offsetWidth / 100})`;
      if (!placed.current) {
        placed.current = true;
        requestAnimationFrame(() => (bar.style.transition = ''));
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [current, items.length]);
  const pick = (v: string) => { setOwn(v); onValueChange?.(v); };
  if (compact) {
    return <div className={`view-tabs--select${className ? ` ${className}` : ''}`}>
      <div className="view-tabs__select-bar">
        <ChoiceSelect aria-label={label} value={current} onValueChange={pick} options={items.map((i) => ({ value: i.key, label: i.label }))} className="choice-select--full" />
        {extra && <div className="view-tabs__extra">{extra}</div>}
      </div>
      {items.find((i) => i.key === current)?.children}
    </div>;
  }
  return <Tabs value={value} defaultValue={items[0]?.key} onValueChange={(v) => { setOwn(v); onValueChange?.(v); }} className={className}>
    <div className="view-tabs__bar">
      <div className="view-tabs__scroll"><TabsList ref={listRef} variant="line" className="view-tabs__list">
        {items.map((item) => <TabsTrigger key={item.key} value={item.key} className="view-tabs__trigger">
          {item.label}
        </TabsTrigger>)}
        <span ref={barRef} className="view-tabs__ind" aria-hidden="true" />
      </TabsList></div>
      {extra && <div className="view-tabs__extra">{extra}</div>}
    </div>
    {items.map((item) => <TabsContent key={item.key} value={item.key}>{item.children}</TabsContent>)}
  </Tabs>;
}

export function Feedback({ severity = 'info', title, description, action, className }: {
  severity?: 'info' | 'success' | 'warning' | 'error'; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string;
}) {
  const Icon = severity === 'warning' || severity === 'error' ? TriangleAlert : severity === 'success' ? CircleCheck : Info;
  const ink = severity === 'error' ? 'var(--danger)' : severity === 'warning' ? 'var(--warning)' : severity === 'success' ? 'var(--success)' : 'var(--text-muted)';
  // feedback-in: hiện dần một lần khi cảnh báo mới xuất hiện, không nhấp nháy hay lặp.
  return <Alert role={severity === 'info' || severity === 'success' ? 'status' : 'alert'} className={`feedback-in${className ? ` ${className}` : ''}`}>
    <Icon style={{ color: ink }} aria-hidden="true" />
    <AlertTitle>{title}</AlertTitle>
    {(description || action) && <AlertDescription>{description}{action && <div className="mt-2">{action}</div>}</AlertDescription>}
  </Alert>;
}

export function TextareaField(props: ComponentProps<typeof Textarea>) {
  return <div className="min-w-0"><Textarea {...props} />{props.maxLength && <p className="mt-1 text-right text-xs text-muted-foreground" aria-live="off">{String(props.value ?? '').length} / {props.maxLength}</p>}</div>;
}

export function BottomSheet({ open, onClose, title, footer, children }: { open: boolean; onClose: () => void; title: ReactNode; footer?: ReactNode; children: ReactNode }) {
  useHideNavWhile(open);
  const returnTo = useRef<HTMLElement | null>(null);
  return <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
    <SheetContent side="bottom" aria-describedby={undefined} className="sheet max-h-[90dvh] gap-0 rounded-t-xl p-0"
      onOpenAutoFocus={() => { returnTo.current = document.activeElement as HTMLElement | null; }}
      onCloseAutoFocus={(event) => {
        if (returnTo.current?.isConnected && returnTo.current !== document.body) {
          event.preventDefault();
          returnTo.current.focus();
        }
      }}>
      <SheetHeader className="border-b pr-14"><SheetTitle>{title}</SheetTitle></SheetHeader>
      <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      {footer && <SheetFooter className="border-t p-4">{footer}</SheetFooter>}
    </SheetContent>
  </Sheet>;
}

export function DialogFrame({ open, onClose, title, footer, width = 640, children }: { open: boolean; onClose: () => void; title: ReactNode; footer?: ReactNode; width?: number; children: ReactNode }) {
  const mobile = useBreakpoint() === 'mobile';
  if (mobile) return <BottomSheet open={open} onClose={onClose} title={title} footer={footer}>{children}</BottomSheet>;
  return <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
    <DialogContent aria-describedby={undefined} className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-lg p-0 sm:max-w-none" style={{ width, maxWidth: 'calc(100vw - 32px)' }}>
      <DialogHeader className="border-b px-6 py-4 pr-14"><DialogTitle>{title}</DialogTitle></DialogHeader>
      <div className="min-h-0 overflow-y-auto px-6 py-4">{children}</div>
      {footer && <DialogFooter className="m-0 rounded-none border-t bg-card px-6 py-3">{footer}</DialogFooter>}
    </DialogContent>
  </Dialog>;
}

export function DateRangeField({ from, to, latest, onValueChange }: { from: string; to: string; latest: string; onValueChange: (from: string, to: string) => void }) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const date = (s: string) => new Date(`${s}T00:00:00`);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return <Popover open={open} onOpenChange={(v) => { setOpen(v); if(v) setRange({ from: date(from), to: date(to) }); }}>
    <PopoverTrigger asChild><Button variant="outline" aria-label={`Từ ngày ${date(from).toLocaleDateString('vi-VN')} đến ngày ${date(to).toLocaleDateString('vi-VN')}`} className="bg-card">{date(from).toLocaleDateString('vi-VN')} – {date(to).toLocaleDateString('vi-VN')}</Button></PopoverTrigger>
    <PopoverContent align="start" className="w-auto p-0">
      <Calendar mode="range" locale={vi} selected={range} defaultMonth={date(from)} disabled={{ after: date(latest) }} onSelect={setRange} />
      <div className="flex justify-end border-t p-2"><Button disabled={!range?.from || !range.to} onClick={() => { if(range?.from && range.to) { onValueChange(iso(range.from), iso(range.to)); setOpen(false); } }}>Chọn khoảng ngày</Button></div>
    </PopoverContent>
  </Popover>;
}
