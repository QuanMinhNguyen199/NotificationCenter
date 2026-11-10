import { MobileDisclosure } from '@/components/MobileDisclosure';
import { ChoiceSelect } from '@/components/Controls';
import { IconButton } from '@/components/IconButton';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import * as echarts from 'echarts/core';
import { MarkLineComponent } from 'echarts/components';
import { BlockEmpty, BlockError, Panel, Skel } from '../components/Blocks';
import { ProtoBadge, ProtoNote } from '../components/Proto';
import { StatusPill } from '../components/Status';
import { usePermissions } from '../demo/DemoContext';
import ReactECharts from '../lib/Chart';
import { downloadCsv } from '../lib/csv';
import { dmy, num, pct } from '../lib/format';
import { chartMotion } from '../lib/motion';
import { useBreakpoint, useReducedMotion } from '../lib/useMedia';
import { C } from '../theme';
import { fetchCityComparison, fetchOfficerPerf, type OfficerPerf, type UnitRow } from './leaderApi';
import './leader.css';
import { TopRows, TOP_N } from '../components/TopRows';
import { ChevronDown, ChevronUp } from 'lucide-react';

// Lib/Chart.tsx chỉ nạp cột và đường; màn này cần thêm đường trung bình (markLine).
echarts.use([MarkLineComponent]);

const FONT = 'Inter Variable, Inter, sans-serif';
const axisLabel = { color: C.faint, fontSize: 12, fontFamily: FONT };
/** Cột của đơn vị khác: xám đủ đậm để thấy trên nền trắng (≈3,4:1), không tranh với màu brand của đơn vị mình. */
const OTHER_BAR = '#7C8BA1';
const AS_OF = '2026-10-28';

const rate = (v: number) => pct(v * 100, 100);
const hours = (h: number | null) => (h == null ? '—' : `${h.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giờ`);

function useChartBase() {
  const reduced = useReducedMotion();
  return { ...chartMotion(reduced), textStyle: { fontFamily: FONT } };
}

function Kpi({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="hkd-kpi">
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {note && <span className="kpi__note">{note}</span>}
    </div>
  );
}

function SectionTitle({ children, badges }: { children: ReactNode; badges?: ReactNode }) {
  return <span className="leader-title"><span>{children}</span>{badges}</span>;
}

/* ---------- Chỉ số so sánh giữa các Thuế cơ sở ---------- */

type MetricKey = 'fileRate' | 'accepted' | 'okRate' | 'avgHours' | 'users';
interface Metric {
  label: string;
  /** Giá trị dùng để vẽ và sắp xếp. */
  value: (u: Pick<UnitRow, MetricKey>) => number;
  fmt: (v: number) => string;
  /** Thời gian phản hồi: thấp hơn là tốt hơn. */
  lowerBetter?: boolean;
}
const METRICS: Record<MetricKey, Metric> = {
  fileRate: { label: 'Tỷ lệ nộp tờ khai', value: (u) => u.fileRate * 100, fmt: (v) => pct(v, 100) },
  accepted: { label: 'Tờ khai tiếp nhận thành công', value: (u) => u.accepted, fmt: (v) => num(Math.round(v)) },
  okRate: { label: 'Tỷ lệ xử lý thành công', value: (u) => u.okRate * 100, fmt: (v) => pct(v, 100) },
  avgHours: { label: 'Thời gian phản hồi trung bình', value: (u) => u.avgHours, fmt: (v) => hours(v), lowerBetter: true },
  users: { label: 'Người dùng ứng dụng (HKD)', value: (u) => u.users, fmt: (v) => num(Math.round(v)) },
};
const METRIC_KEYS = Object.keys(METRICS) as MetricKey[];

/** Xếp hạng từ tốt tới kém theo chỉ số. */
function ranked(units: UnitRow[], key: MetricKey) {
  const m = METRICS[key];
  return [...units].sort((a, b) => (m.lowerBetter ? m.value(a) - m.value(b) : m.value(b) - m.value(a)));
}
const rankOf = (units: UnitRow[], key: MetricKey) => ranked(units, key).findIndex((u) => u.own) + 1;

/* ---------- Bảng sắp xếp được (thay thế cho biểu đồ với trình đọc màn hình) ---------- */

interface Col<T> {
  key: string;
  label: string;
  sort: (r: T) => number | string;
  render: (r: T) => ReactNode;
  /** Mặc định sắp giảm dần khi bấm lần đầu (số càng lớn càng đáng chú ý). */
  desc?: boolean;
}

function SortTable<T>({ rows, cols, rowKey, rowHead, rowClass, label, initial }: {
  rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; rowHead: Col<T>; rowClass?: (r: T) => string | undefined; label: string;
  initial: { key: string; dir: 'asc' | 'desc' };
}) {
  const [sort, setSort] = useState(initial);
  const all = [rowHead, ...cols];
  const active = all.find((c) => c.key === sort.key) ?? rowHead;
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
        <button type="button" className={`leader-sort${on ? ' is-on' : ''}`} onClick={() => click(c)}>
          {c.label}
          <Icon aria-hidden="true" />
        </button>
      </th>
    );
  };
  return (
    <TopRows total={sorted.length} noun="dòng">
    <div className="leader-scroll" role="region" aria-label={label} tabIndex={0}>
      <table className="mini-table leader-table">
        <caption className="sr-only">{label}. Bấm tiêu đề cột để sắp xếp.</caption>
        <thead><tr>{all.map(head)}</tr></thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} className={rowClass?.(r)}>
              <th scope="row">{rowHead.render(r)}</th>
              {cols.map((c) => <td key={c.key}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </TopRows>
  );
}

/* ---------- 1. Chỉ số chính ---------- */

type CityData = Awaited<ReturnType<typeof fetchCityComparison>>;

function KpiRow({ data, error, onRetry }: { data?: CityData; error: boolean; onRetry: () => void }) {
  if (error) return <BlockError message="Không tải được chỉ số chính." onRetry={onRetry} />;
  const own = data?.units.find((u) => u.own);
  const sk = <Skel w={80} h={28} />;
  const rank = (k: MetricKey) => (data ? `Hạng ${rankOf(data.units, k)}/${data.units.length}` : '');
  return (
    <div className="hkd-kpis" aria-busy={!data}>
      <Kpi label="Tổng tờ khai tiếp nhận" value={own ? num(own.received) : sk} note={own && `30 ngày; ${num(own.accepted)} xử lý thành công`} />
      {/* Thất bại = 100% − thành công: gộp vào một ô để không lặp số. */}
      <Kpi label="Xử lý thành công" value={own ? rate(own.okRate) : sk} note={own && data && `Thất bại ${rate(own.failRate)} · ${rank('okRate')}; TB thành phố ${rate(data.avg.okRate)}`} />
      <Kpi label="Thời gian phản hồi TB của cán bộ" value={own ? hours(own.avgHours) : sk} note={own && data && `${rank('avgHours')}; TB thành phố ${hours(data.avg.avgHours)}`} />
      <Kpi label="Người dùng ứng dụng" value={own ? num(own.users) : sk} note={own && `HKD đã đăng ký, ${pct(own.users, own.hkd)} trên ${num(own.hkd)} HKD`} />
      <Kpi label="Tỷ lệ nộp tờ khai" value={own ? rate(own.fileRate) : sk} note={own && data && `${rank('fileRate')}; TB thành phố ${rate(data.avg.fileRate)}`} />
    </div>
  );
}

/* ---------- 2. So sánh 25 Thuế cơ sở ---------- */

function RankChart({ data, metric }: { data: CityData; metric: MetricKey }) {
  const base = useChartBase();
  const mobile = useBreakpoint() === 'mobile';
  const m = METRICS[metric];
  const all = ranked(data.units, metric);
  const avg = m.value(data.avg);
  const own = all.find((u) => u.own)!;
  const ownRank = all.indexOf(own) + 1;
  // Thu gọn: 5 đơn vị đầu + đơn vị mình (nếu ngoài top 5); mở để xem đủ 25.
  const [open, setOpen] = useState(false);
  const rows = open ? all : ownRank <= TOP_N ? all.slice(0, TOP_N) : [...all.slice(0, TOP_N), own];
  const rankOfRow = (u: UnitRow) => all.indexOf(u) + 1;
  const better = m.lowerBetter ? m.value(own) <= avg : m.value(own) >= avg;
  return (
    <>
      <ReactECharts
        aria-hidden="true"
        style={{ height: rows.length * 22 + 24 }}
        opts={{ renderer: 'svg' }}
        notMerge
        option={{
          ...base,
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v: number) => m.fmt(v) },
          grid: { left: mobile ? 108 : 124, right: mobile ? 64 : 72, top: 4, bottom: 20 },
          xAxis: { type: 'value', show: false, max: (v: { max: number }) => v.max * 1.02 },
          yAxis: {
            type: 'category',
            inverse: true,
            data: rows.map((u) => `${rankOfRow(u)}. ${u.name}`),
            axisLabel: { ...axisLabel, color: C.text, formatter: (v: string) => (v.endsWith(own.name) ? `{own|${v}}` : v), rich: { own: { color: C.brandInk, fontWeight: 700, fontSize: 12 } } },
            axisTick: { show: false },
            axisLine: { show: false },
          },
          series: [{
            name: m.label,
            type: 'bar',
            barWidth: '64%',
            data: rows.map((u) => ({ value: +m.value(u).toFixed(2), itemStyle: { color: u.own ? C.brand : OTHER_BAR } })),
            label: { show: true, position: 'right', color: C.text, fontSize: 11, formatter: (e: { value: number }) => m.fmt(e.value) },
            markLine: {
              symbol: 'none',
              silent: true,
              lineStyle: { color: C.text, type: 'dashed', width: 1 },
              label: { show: true, position: 'end', color: C.text, fontSize: 11, formatter: 'TB' },
              data: [{ xAxis: +avg.toFixed(2) }],
            },
          }],
        }}
      />
      <button type="button" className="top-rows__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {open ? <>Thu gọn <ChevronUp aria-hidden="true" /></> : <>Xem đủ {all.length} đơn vị <ChevronDown aria-hidden="true" /></>}
      </button>
      <div className="chart-legend" aria-hidden="true">
        <span><i className="swatch" style={{ background: C.brand }} /> {own.name} (đơn vị mình)</span>
        <span><i className="swatch" style={{ background: OTHER_BAR }} /> Thuế cơ sở khác</span>
        <span><i className="swatch swatch--line leader-swatch-dash" /> Trung bình thành phố: {m.fmt(avg)}</span>
      </div>
      <p className="chart-note">
        <b>{own.name}</b> xếp hạng {ownRank}/{all.length} về {m.label.toLowerCase()}: {m.fmt(m.value(own))}, {better ? 'tốt hơn hoặc bằng' : 'kém hơn'} trung bình thành phố ({m.fmt(avg)}).
      </p>
    </>
  );
}

function CityCompare({ data, error, onRetry }: { data?: CityData; error: boolean; onRetry: () => void }) {
  const [metric, setMetric] = useState<MetricKey>('fileRate');
  const [showTable, setShowTable] = useState(false);
  const mobile = useBreakpoint() === 'mobile';
  const exportCsv = () => {
    if (!data) return;
    downloadCsv(`so-sanh-25-thue-co-so-${AS_OF}.csv`, [
      [`So sánh 25 Thuế cơ sở, 30 ngày đến ${dmy(AS_OF)}`, 'Dữ liệu giả lập'],
      [],
      ['Đơn vị', 'Tờ khai tiếp nhận', 'Tiếp nhận thành công', 'Tỷ lệ xử lý thành công (%)', 'Tỷ lệ nộp tờ khai (%)', 'Phản hồi TB (giờ)', 'Người dùng ứng dụng', 'Tổng HKD'],
      ...ranked(data.units, 'fileRate').map((u) => [u.name, u.received, u.accepted, +(u.okRate * 100).toFixed(1), +(u.fileRate * 100).toFixed(1), +u.avgHours.toFixed(1), u.users, u.hkd]),
    ]);
  };
  const rowHead: Col<UnitRow> = { key: 'name', label: 'Đơn vị', sort: (u) => u.id, render: (u) => <>{u.name}{u.own && <span className="leader-own-tag">Đơn vị mình</span>}</> };
  const cols: Col<UnitRow>[] = [
    { key: 'received', label: 'Tiếp nhận', sort: (u) => u.received, render: (u) => num(u.received), desc: true },
    { key: 'accepted', label: 'Thành công', sort: (u) => u.accepted, render: (u) => num(u.accepted), desc: true },
    { key: 'okRate', label: 'Tỷ lệ XL thành công', sort: (u) => u.okRate, render: (u) => rate(u.okRate), desc: true },
    { key: 'fileRate', label: 'Tỷ lệ nộp tờ khai', sort: (u) => u.fileRate, render: (u) => rate(u.fileRate), desc: true },
    { key: 'avgHours', label: 'Phản hồi TB', sort: (u) => u.avgHours, render: (u) => hours(u.avgHours) },
    { key: 'users', label: 'Người dùng', sort: (u) => u.users, render: (u) => num(u.users), desc: true },
  ];

  return (
    <section className="leader-section" aria-labelledby="leader-city">
      <div className="leader-section__head">
        <h2 id="leader-city" className="leader-section__title">
          <SectionTitle badges={<>
            <ProtoBadge kind="mock" note="Số của 24 Thuế cơ sở khác do bản mẫu sinh ra; cần API số liệu cấp thành phố" />
            <ProtoBadge kind="proposal" note="Tỷ lệ nộp tờ khai tạm tính = tờ khai đã nộp ÷ tờ khai phải nộp trong kỳ. Văn bản ghi “/ tổng tờ khai đã tiếp nhận”; cần nghiệp vụ chốt mẫu số." />
          </>}>So sánh 25 Thuế cơ sở</SectionTitle>
        </h2>
        <p className="leader-section__sub">30 ngày đến {dmy(AS_OF)}. Chọn chỉ số để xếp hạng; Thuế cơ sở A là đơn vị đang xem.</p>
      </div>
      {error ? <BlockError message="Không tải được số liệu so sánh giữa các Thuế cơ sở." onRetry={onRetry} /> : (
        <Panel
          title={METRICS[metric].label}
          sub={METRICS[metric].lowerBetter ? 'Xếp từ nhanh nhất tới chậm nhất' : 'Xếp từ cao nhất tới thấp nhất'}
          className="dashboard-card--static leader-rank"
          extra={<div className="leader-rank__tools">
            <ChoiceSelect aria-label="Chỉ số so sánh" value={metric} onValueChange={setMetric} options={METRIC_KEYS.map((k) => ({ value: k, label: METRICS[k].label }))} style={{ minWidth: mobile ? '100%' : 240 }} />
            <IconButton icon={Download} label="Xuất so sánh 25 Thuế cơ sở ra CSV" disabled={!data} onClick={exportCsv} />
          </div>}
        >
          {!data ? <Skel w="100%" h={200} /> : <>
            <RankChart data={data} metric={metric} />
            {/* Bảng số liệu (cho trình đọc màn hình và người cần số chính xác) mở tại chỗ, không hiện sẵn. */}
            <button type="button" className="top-rows__toggle" aria-expanded={showTable} aria-controls="leader-city-table" onClick={() => setShowTable((v) => !v)}>
              {showTable ? <>Ẩn bảng số liệu <ChevronUp aria-hidden="true" /></> : <>Xem dạng bảng <ChevronDown aria-hidden="true" /></>}
            </button>
            {showTable && <div id="leader-city-table" className="leader-rank__table">
              {data.units.length === 0 ? <BlockEmpty>Chưa có số liệu của các Thuế cơ sở.</BlockEmpty> : (
                <SortTable label="So sánh 25 Thuế cơ sở" rows={data.units} rowKey={(u) => u.id} rowHead={rowHead} cols={cols}
                  rowClass={(u) => (u.own ? 'leader-row--own is-pinned' : undefined)} initial={{ key: metric, dir: METRICS[metric].lowerBetter ? 'asc' : 'desc' }} />
              )}
            </div>}
          </>}
        </Panel>
      )}
    </section>
  );
}

/* ---------- 3. Hiệu quả cán bộ ---------- */

function OfficerSection() {
  const q = useQuery({ queryKey: ['leader-officers'], queryFn: fetchOfficerPerf });
  const rowHead: Col<OfficerPerf> = { key: 'name', label: 'Cán bộ', sort: (o) => o.name.split(' ').slice(-1)[0], render: (o) => o.name };
  const cols: Col<OfficerPerf>[] = [
    { key: 'team', label: 'Tổ', sort: (o) => o.teamName, render: (o) => o.teamName },
    { key: 'decl', label: 'Tờ khai xử lý', sort: (o) => o.declarations, render: (o) => num(o.declarations), desc: true },
    { key: 'req', label: 'Yêu cầu hỗ trợ', sort: (o) => o.requests, render: (o) => num(o.requests), desc: true },
    { key: 'hours', label: 'Phản hồi TB', sort: (o) => o.avgHours ?? Infinity, render: (o) => hours(o.avgHours) },
    { key: 'onTime', label: 'Đúng hạn (≤ 48 giờ)', sort: (o) => o.onTime ?? -1, render: (o) => (o.onTime == null ? '—' : rate(o.onTime)), desc: true },
  ];
  return (
    <section className="leader-section" aria-labelledby="leader-officers">
      <div className="leader-section__head">
        <h2 id="leader-officers" className="leader-section__title">
          <SectionTitle badges={<ProtoBadge kind="proposal" note="Trước khi dùng để đánh giá cán bộ, lãnh đạo cần thống nhất cách tính, ngưỡng đúng hạn (tạm 48 giờ), ai được xem và cách tính khác biệt do địa bàn. Tỷ lệ đúng hạn là số giả lập." />}>Hiệu quả cán bộ trong Thuế cơ sở A</SectionTitle>
        </h2>
        <p className="leader-section__sub">Cán bộ quản lý HKD đang hoạt động, 30 ngày đến {dmy(AS_OF)}.</p>
      </div>
      <Panel className="dashboard-card--static">
        {q.isError ? <BlockError message="Không tải được số liệu cán bộ." onRetry={() => q.refetch()} />
          : !q.data ? <Skel w="100%" h={240} />
            : q.data.length === 0 ? <BlockEmpty>Chưa có cán bộ quản lý HKD đang hoạt động.</BlockEmpty>
              : <SortTable label="Hiệu quả cán bộ" rows={q.data} rowKey={(o) => o.id} rowHead={rowHead} cols={cols} initial={{ key: 'hours', dir: 'asc' }} />}
      </Panel>
    </section>
  );
}

/* Nội dung tổng hợp trong Thống kê, hiển thị theo quyền; không có màn/tab Lãnh đạo. */

export default function LeaderStats() {
  const { role } = usePermissions();
  const city = useQuery({ queryKey: ['leader-city'], queryFn: fetchCityComparison, enabled: role === 'base' });

  if (role !== 'base') return null;

  return (
    <section className="leader-page" aria-label="Thống kê tổng hợp cơ sở">
      <h2 className="leader-section__title">Thống kê tổng hợp cơ sở</h2>
      <div className="hkd-filter">
        <span className="filters__fixed">Phạm vi: Thuế cơ sở A</span>
        <span className="hkd-filter__stamp">Số liệu đến {dmy(AS_OF)}</span>
        <StatusPill tone="neutral">Dữ liệu minh họa</StatusPill>
      </div>
      <ProtoNote kind="proposal">Tạm hiển thị cho lãnh đạo Thuế cơ sở; so sánh 25 đơn vị thường cần tài khoản cấp thành phố (chưa xác nhận).</ProtoNote>
      <KpiRow data={city.data} error={city.isError} onRetry={() => city.refetch()} />
      <MobileDisclosure label="So sánh 25 Thuế cơ sở"><CityCompare data={city.data} error={city.isError} onRetry={() => city.refetch()} /></MobileDisclosure>
      <MobileDisclosure label="Hiệu quả cán bộ"><OfficerSection /></MobileDisclosure>
    </section>
  );
}
