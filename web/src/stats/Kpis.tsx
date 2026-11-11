import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Summary } from '../api/mockApi';
import { Skel } from '../components/Blocks';
import { duration, durationParts, num, pct } from '../lib/format';
import type { StatsParams } from './useStatsParams';

export type KpiKey = 'total' | 'sent' | 'delivered' | 'pending' | 'failed' | 'unique' | 'response';

interface Def {
  key: KpiKey;
  label: string;
  value: (s: Summary) => number | null;
  /** Mặc định hiển thị số đếm; thời gian phản hồi hiển thị giờ/phút. */
  render?: (v: number) => ReactNode;
  note: (s: Summary) => string;
  selected: (p: StatsParams) => boolean;
}

const Duration = ({ min }: { min: number }) => (
  <span aria-label={duration(min)}>
    {durationParts(min).map((d, i) => (
      <span key={i}>
        {i > 0 && ' '}
        {d.value}
        <small className="kpi__unit"> {d.unit}</small>
      </span>
    ))}
  </span>
);


const DEFS: Def[] = [
  {
    key: 'total',
    label: 'Tổng thông báo',
    value: (s) => s.total,
    // Đã gửi + Chờ gửi + Gửi thất bại chưa bằng Tổng: nêu phần còn lại để các ô cộng khớp.
    note: (s) => (s.other ? `Gồm ${num(s.other)} chưa rõ, hết hạn hoặc bỏ qua` : ''),
    selected: () => false,
  },
  { key: 'sent', label: 'Đã gửi', value: (s) => s.sent, note: (s) => (s.total ? `${pct(s.sent, s.total)} tổng số` : ''), selected: (p) => p.tab === 'notifications' && p.ns === 'SENT' },
  {
    key: 'delivered',
    label: 'Đã tiếp nhận',
    value: (s) => s.delivered,
    note: (s) => (s.delivered == null ? 'Chưa có dữ liệu tiếp nhận' : s.sent ? `${pct(s.delivered, s.sent)} số đã gửi` : ''),
    selected: (p) => p.tab === 'notifications' && p.nd === 'DELIVERED',
  },
  { key: 'pending', label: 'Chờ gửi', value: (s) => s.pending, note: () => '', selected: (p) => p.tab === 'notifications' && p.ns === 'PENDING' },
  { key: 'failed', label: 'Gửi thất bại', value: (s) => s.failed, note: () => '', selected: (p) => p.tab === 'notifications' && p.ns === 'FAILED' },
  { key: 'unique', label: 'NNT duy nhất', value: (s) => s.uniqueTaxpayers, note: () => '', selected: (p) => p.tab === 'taxpayers' && p.notified },
  {
    key: 'response',
    label: 'Thời gian phản hồi trung bình',
    value: (s) => s.avgResponse,
    render: (v) => <Duration min={v} />,
    note: (s) => (s.avgResponse == null ? 'Chưa có mốc tiếp nhận' : 'Tạo → tiếp nhận'),
    selected: (p) => p.detail === 'x:response',
  },
];

const NS: Partial<Record<KpiKey, { ns: StatsParams['ns']; nd: StatsParams['nd'] }>> = {
  total: { ns: 'all', nd: 'all' },
  sent: { ns: 'SENT', nd: 'all' },
  delivered: { ns: 'all', nd: 'DELIVERED' },
  pending: { ns: 'PENDING', nd: 'all' },
  failed: { ns: 'FAILED', nd: 'all' },
};

export function Kpis({ s, p, onPick, unused, stale, keys, labels }: {
  s?: Summary; p: StatsParams; stale?: boolean; onPick: (k: KpiKey, f?: { ns: StatsParams['ns']; nd: StatsParams['nd'] }) => void; unused?: string;
  /** Chỉ hiện các ô này (mặc định cả 7). */
  keys?: KpiKey[];
  /** Đổi nhãn theo màn, ví dụ phân biệt với "thời gian phản hồi của cán bộ" trên màn lãnh đạo. */
  labels?: Partial<Record<KpiKey, string>>;
}) {
  const defs = keys ? DEFS.filter((d) => keys.includes(d.key)) : DEFS;
  // Mobile: ô phụ ẩn sau nút "Xem thêm"; chỉ áp dụng khi màn đang hiện đủ 7 ô.
  const secondary: KpiKey[] = defs.length === DEFS.length ? ['delivered', 'unique', 'response'] : [];
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`kpis${expanded ? ' kpis--expanded' : ''}${defs.length !== DEFS.length ? ` kpis--${defs.length}` : ''}${stale ? ' is-stale' : ''}`} aria-busy={stale} role="group" aria-label="Chỉ số thông báo, bấm để lọc danh sách hoặc xem chi tiết">
      {defs.map((d) => {
        const v = s ? d.value(s) : undefined;
        const sel = d.selected(p);
        return (
          <button
            key={d.key}
            type="button"
            className={`kpi${sel ? ' kpi--selected' : ''}${d.key === 'total' ? ' kpi--lead' : ''}${secondary.includes(d.key) ? ' kpi--secondary' : ''}`}
            aria-pressed={d.key === 'response' ? undefined : sel}
            aria-haspopup={d.key === 'response' ? 'dialog' : undefined}
            onClick={() => onPick(d.key, NS[d.key])}
          >
            <span className="kpi__label">{labels?.[d.key] ?? d.label}</span>
            {s === undefined ? (
              <>
                <Skel w={96} h={30} />
                <Skel w={120} h={12} />
              </>
            ) : v === null || unused ? (
              <>
                <span className="kpi__value kpi__value--missing" aria-label="Không có dữ liệu">—</span>
                <span className="kpi__note">{unused ? '' : d.note(s)}</span>
              </>
            ) : (
              <>
                <span className={`kpi__value kpi__value--${d.key}`}>{d.render ? d.render(v!) : num(v!)}</span>
                <span className="kpi__note">{d.note(s)}</span>
              </>
            )}
          </button>
        );
      })}
      {secondary.length > 0 && (
        <button type="button" className="kpis__more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Thu gọn chỉ số' : `Xem thêm ${secondary.length} chỉ số`}<ChevronDown aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
