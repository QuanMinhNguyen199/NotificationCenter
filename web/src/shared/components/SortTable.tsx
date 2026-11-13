import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { TopRows } from './TopRows';
import { ChoiceSelect } from './Controls';
import './sort-table.css';

/* ---------- Bảng sắp xếp được (thay thế cho biểu đồ với trình đọc màn hình) ---------- */

export interface Col<T> {
  key: string;
  label: string;
  sort: (r: T) => number | string;
  render: (r: T) => ReactNode;
  /** Mặc định sắp giảm dần khi bấm lần đầu (số càng lớn càng đáng chú ý). */
  desc?: boolean;
}

export function SortTable<T>({ rows, cols, rowKey, rowHead, rowClass, label, initial, className }: {
  rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; rowHead: Col<T>; rowClass?: (r: T) => string | undefined; label: string;
  initial: { key: string; dir: 'asc' | 'desc' };
  /** Lớp thêm cho bảng (vd. độ rộng tối thiểu). */
  className?: string;
}) {
  const [sort, setSort] = useState(initial);
  const active = [rowHead, ...cols].find((c) => c.key === sort.key) ?? rowHead;
  const sorted = useMemo(() => {
    const out = [...rows].sort((a, b) => {
      const x = active.sort(a);
      const y = active.sort(b);
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'vi', { numeric: true });
      return sort.dir === 'asc' ? c : -c;
    });
    return out;
  }, [rows, active, sort.dir]);
  const click = (c: Col<T>) =>
    setSort((s) => (s.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: c.desc ? 'desc' : 'asc' }));
  const head = (c: Col<T>) => {
    const on = c.key === sort.key;
    const Icon = !on ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th scope="col" key={c.key} aria-sort={on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={`sort-btn${on ? ' is-on' : ''}`} onClick={() => click(c)}>
          {c.label}
          <Icon aria-hidden="true" />
        </button>
      </th>
    );
  };
  // Mobile: bảng hiển thị dạng thẻ nên tiêu đề cột bị ẩn; thanh này thay cho việc bấm tiêu đề cột.
  const all = [rowHead, ...cols];
  const asc = sort.dir === 'asc';
  const mobileBar = (
    <div className="sort-mobile">
      <ChoiceSelect
        aria-label="Sắp xếp theo"
        prefix="Sắp xếp:"
        value={sort.key}
        onValueChange={(k) => { const c = all.find((x) => x.key === k)!; setSort({ key: k, dir: c.desc ? 'desc' : 'asc' }); }}
        options={all.map((c) => ({ value: c.key, label: c.label }))}
        className="sort-mobile__select"
      />
      <button type="button" className="sort-mobile__dir" aria-label={asc ? 'Đang xếp tăng dần, bấm để xếp giảm dần' : 'Đang xếp giảm dần, bấm để xếp tăng dần'}
        onClick={() => setSort((x) => ({ key: x.key, dir: x.dir === 'asc' ? 'desc' : 'asc' }))}>
        {asc ? <ArrowUp aria-hidden="true" /> : <ArrowDown aria-hidden="true" />}
      </button>
    </div>
  );
  return (
    <>
    {mobileBar}
    <TopRows total={sorted.length} noun="dòng">
    <div className="sort-scroll" role="region" aria-label={label} tabIndex={0}>
      <table className={`mini-table sort-table${className ? ` ${className}` : ''}`}>
        <caption className="sr-only">{label}. Bấm tiêu đề cột để sắp xếp.</caption>
        <thead><tr>{[rowHead, ...cols].map(head)}</tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} className={rowClass?.(r)}>
              <th scope="row">{rowHead.render(r)}</th>
              {cols.map((c) => <td key={c.key} data-label={c.label}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </TopRows>
    </>
  );
}
