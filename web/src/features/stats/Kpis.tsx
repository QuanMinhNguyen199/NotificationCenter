import type { CSSProperties, ReactNode } from 'react';
import type { Summary } from '@/shared/api/mockApi';
import { Skel } from '@/shared/components/Blocks';
import { InfoTip } from '@/shared/components/InfoTip';
import { duration, durationParts, num, pct } from '@/shared/lib/format';
import type { StatsParams } from './useStatsParams';
import './kpis.css';

export type KpiKey = 'total' | 'sent' | 'delivered' | 'pending' | 'failed' | 'unique' | 'response';

interface Def {
  key: KpiKey;
  label: string;
  value: (s: Summary) => number | null;
  /** Mặc định hiển thị số đếm; thời gian phản hồi hiển thị giờ/phút. */
  render?: (v: number) => ReactNode;
  note: (s: Summary) => string;
  /** Giải thích cách tính, hiện trong tooltip ⓘ cạnh nhãn. */
  info?: (s: Summary) => string;
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
    note: () => '',
    // Đã gửi + Chờ gửi + Gửi thất bại chưa bằng Tổng: nêu phần còn lại để người xem không nghĩ số liệu sai.
    info: (s) => (s.other ? `Gồm ${num(s.other)} thông báo chưa rõ, hết hạn hoặc bỏ qua, nên Đã gửi + Chờ gửi + Gửi thất bại nhỏ hơn Tổng.` : ''),
    selected: () => false,
  },
  { key: 'sent', label: 'Đã gửi', value: (s) => s.sent, note: () => '', selected: (p) => p.tab === 'notifications' && p.ns === 'SENT' },
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
    note: (s) => (s.avgResponse == null ? 'Chưa có mốc tiếp nhận' : ''),
    info: () => 'Tính từ lúc tạo thông báo tới lúc NNT tiếp nhận, trung bình trên các thông báo đã tiếp nhận.',
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
  return (
    <div
      className={`stats-kpis${stale ? ' is-stale' : ''}`}
      style={{ '--kpi-n': defs.length } as CSSProperties}
      aria-busy={s === undefined || !!stale}
      role="group"
      aria-label="Chỉ số thông báo, bấm để lọc danh sách hoặc xem chi tiết"
    >
      {defs.map((d) => {
        const v = s ? d.value(s) : undefined;
        const missing = v === null || !!unused;
        const note = unused ? '' : s ? d.note(s) : '';
        const info = s && d.info ? d.info(s) : '';
        const label = labels?.[d.key] ?? d.label;
        const cut = label.lastIndexOf(' ');
        const head = cut < 0 ? '' : label.slice(0, cut + 1); // giữ dấu cách cuối
        const tail = cut < 0 ? label : label.slice(cut + 1);
        return (
          <div key={d.key} className={`stats-kpis__metric${d.selected(p) ? ' stats-kpis__metric--selected' : ''}`} data-kpi={d.key}>
            {/* Nút trong suốt phủ cả ô: bấm chỗ nào trên ô cũng lọc; icon ⓘ nằm trên lớp phủ. */}
            <button
              type="button"
              className="stats-kpis__hit"
              disabled={!!stale || s === undefined}
              aria-label={label}
              aria-pressed={d.key === 'response' ? undefined : d.selected(p)}
              aria-haspopup={d.key === 'response' ? 'dialog' : undefined}
              onClick={() => onPick(d.key, NS[d.key])}
            />
            <span className="stats-kpis__label" aria-hidden={!info || undefined}>
              {/* Chữ cuối đi liền icon ⓘ để icon không rơi xuống dòng riêng. */}
              {info ? <>{head}<span className="stats-kpis__tail">{tail}<InfoTip>{info}</InfoTip></span></> : label}
            </span>
            <span className={`stats-kpis__value${missing ? ' stats-kpis__value--missing' : ''}${d.key === 'failed' && !missing && v ? ' stats-kpis__value--danger' : ''}`}>
              {s === undefined ? <Skel w={80} h={28} /> : missing ? <span aria-label="Không có dữ liệu">—</span> : d.render ? d.render(v!) : num(v!)}
            </span>
            {note && <span className="stats-kpis__note">{note}</span>}
          </div>
        );
      })}
    </div>
  );
}
