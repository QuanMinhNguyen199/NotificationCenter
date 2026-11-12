import type { HTMLAttributes, ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './IconButton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { ChoiceSelect } from './Controls';
import { num } from '@/shared/lib/format';

export type DataColumns<T> = {
  key?: string; title: ReactNode; dataIndex?: keyof T; width?: number; align?: 'left' | 'right' | 'center';
  render?: (value: never, row: T) => ReactNode;
}[];

export interface PaginationState {
  current: number; pageSize: number; total: number;
  onChange: (page: number, size: number) => void;
}

export function DataTable<T>({ columns, dataSource, rowKey, rowClassName, onRow, pagination, fixed }: {
  columns: DataColumns<T>; dataSource: T[]; rowKey: keyof T; rowClassName?: string;
  onRow?: (row: T) => HTMLAttributes<HTMLTableRowElement>; pagination?: PaginationState;
  /** Cố định độ rộng cột theo `width` (table-layout: fixed): tiêu đề cột không xê dịch khi đổi trang, bộ lọc hay dữ liệu. */
  fixed?: boolean;
}) {
  return <div className={`data-table${fixed ? ' data-table--fixed' : ''}`}>
    <Table><TableHeader><TableRow>
      {columns.map((c, i) => <TableHead key={c.key ?? String(c.dataIndex ?? i)} style={{ width: c.width, textAlign: c.align }} className="h-11 font-medium text-muted-foreground">{c.title}</TableHead>)}
    </TableRow></TableHeader>{/* Đổi trang hoặc bộ lọc: dựng lại thân bảng để các dòng mới hiện dần (rows-in). */}
    <TableBody key={`${String(dataSource[0]?.[rowKey] ?? '')}:${dataSource.length}`} className="rows-in">
      {dataSource.map((row) => <TableRow key={String(row[rowKey])} {...onRow?.(row)} className={rowClassName}>
        {columns.map((c, i) => <TableCell key={c.key ?? String(c.dataIndex ?? i)} style={{ textAlign: c.align }} className="whitespace-normal py-3">
          {c.render ? c.render((c.dataIndex ? row[c.dataIndex] : undefined) as never, row) : String(c.dataIndex ? row[c.dataIndex] ?? '—' : '')}
        </TableCell>)}
      </TableRow>)}
    </TableBody></Table>
    {pagination && <TablePager {...pagination} />}
  </div>;
}

function TablePager({ current, pageSize, total, onChange }: PaginationState) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (current - 1) * pageSize + 1 : 0;
  const to = Math.min(total, current * pageSize);
  return <div className="table-pager">
    <span className="mr-auto text-muted-foreground">{num(from)}–{num(to)} trong {num(total)}</span>
    <ChoiceSelect aria-label="Số dòng mỗi trang" value={pageSize} onValueChange={(size) => onChange(1, size)} options={[10, 20, 50].map((value) => ({ value, label: `${value} / trang` }))} />
    <IconButton icon={ChevronLeft} label="Trang trước" disabled={current <= 1} onClick={() => onChange(current - 1, pageSize)} />
    <span className="num">{current} / {pages}</span>
    <IconButton icon={ChevronRight} label="Trang sau" disabled={current >= pages} onClick={() => onChange(current + 1, pageSize)} />
  </div>;
}
