import { MobileDisclosure } from '@/shared/components/MobileDisclosure';
import { ChoiceSelect } from '@/shared/components/Controls';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactNode } from 'react';
import { SortTable, type Col } from '@/shared/components/SortTable';
import { BlockEmpty, BlockError, Panel, Skel } from '@/shared/components/Blocks';
import { ProtoBadge } from '@/shared/components/Proto';
import { usePermissions } from '@/shared/demo/useDemo';
import { downloadXlsx } from '@/shared/lib/xlsx';
import { ExcelButton } from '@/shared/components/ExcelButton';
import { dmy, num, pct } from '@/shared/lib/format';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { CITY_UNITS, OWN_UNIT, unitName, fetchCityComparison, fetchOfficerPerf, type OfficerPerf, type UnitRow } from './leaderApi';
import './leader.css';
import { TOP_N } from '@/shared/components/TopRows';
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, ChevronUp } from 'lucide-react';
import { DEMO_TODAY } from '@/shared/lib/demoClock';
import { Kpi, KpiStrip } from '@/shared/components/Kpi';

const AS_OF = DEMO_TODAY;
/** Ngày đầu kỳ 30 ngày (tính cả ngày cuối). */
const PERIOD_FROM = (() => { const d = new Date(`${AS_OF}T00:00:00`); d.setDate(d.getDate() - 29); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();

const rate = (v: number) => pct(v * 100, 100);
const hours = (h: number | null) => (h == null ? '—' : `${h.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giờ`);

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

/* ---------- 1. Chỉ số chính ---------- */

type CityData = Awaited<ReturnType<typeof fetchCityComparison>>;

function KpiRow({ data, error, onRetry }: { data?: CityData; error: boolean; onRetry: () => void }) {
  if (error) return <BlockError message="Không tải được chỉ số chính." onRetry={onRetry} />;
  const own = data?.units.find((u) => u.own);
  const sk = <Skel w={80} h={28} />;
  const rank = (k: MetricKey) => (data ? `Hạng ${rankOf(data.units, k)}/${data.units.length}` : '');
  return (
    <KpiStrip busy={!data} label="Chỉ số chính của đơn vị">
      <Kpi label="Tỷ lệ nộp tờ khai" value={own ? rate(own.fileRate) : sk} note={own && data && `${rank('fileRate')}; trung bình thành phố ${rate(data.avg.fileRate)}`} />
      <Kpi label="Tổng tờ khai tiếp nhận" value={own ? num(own.received) : sk} note={own && `${num(own.accepted)} xử lý thành công`} />
      {/* Thất bại = 100% − thành công: gộp vào một ô để không lặp số. */}
      <Kpi label="Xử lý thành công" value={own ? rate(own.okRate) : sk} note={own && data && `Thất bại ${rate(own.failRate)} · ${rank('okRate')}; trung bình thành phố ${rate(data.avg.okRate)}`} />
      <Kpi label="Thời gian phản hồi trung bình của cán bộ" value={own ? hours(own.avgHours) : sk} note={own && data && `${rank('avgHours')}; trung bình thành phố ${hours(data.avg.avgHours)}`} />
      <Kpi label="Người dùng ứng dụng" value={own ? num(own.users) : sk} note={own && `HKD đã đăng ký, ${pct(own.users, own.hkd)} trên ${num(own.hkd)} HKD`} />
    </KpiStrip>
  );
}

/* ---------- 2. So sánh 25 Thuế cơ sở ---------- */

function RankChart({ data, metric, tableToggle }: { data: CityData; metric: MetricKey; tableToggle: ReactNode }) {
  const m = METRICS[metric];
  const all = ranked(data.units, metric);
  const avg = m.value(data.avg);
  const own = all.find((u) => u.own)!;
  const ownRank = all.indexOf(own) + 1;
  // Thu gọn: 5 đơn vị đầu + đơn vị mình (nếu ngoài top 5); mở để xem đủ 25.
  const [open, setOpen] = useState(false);
  const collapsed = !open && ownRank > TOP_N;
  const rows = open ? all : collapsed ? [...all.slice(0, TOP_N), own] : all.slice(0, TOP_N);
  const hidden = collapsed ? ownRank - TOP_N - 1 : 0;
  // Trục bắt đầu từ 0 để độ dài thanh phản ánh đúng tỷ lệ giữa các đơn vị.
  const max = Math.max(avg, ...all.map(m.value)) || 1;
  const at = (v: number) => `${(v / max) * 100}%`;
  const row = (u: UnitRow) => (
    <li key={u.id} className={`rank__row${u.own ? ' is-own' : ''}`}>
      <span className="rank__pos">{all.indexOf(u) + 1}</span>
      <span className="rank__name">{u.name}{u.own && <span className="sr-only"> (đang xem)</span>}</span>
      <span className="rank__track" aria-hidden="true">
        <span className="rank__bar" style={{ width: at(m.value(u)) }} />
        <span className="rank__avg" style={{ left: at(avg) }} />
      </span>
      <span className="rank__val">{m.fmt(m.value(u))}</span>
    </li>
  );
  return (
    <>
      <div className="rank">
        <div className="rank__head" aria-hidden="true">
          <span className="rank__track">
            <span className="rank__avg-label" style={{ left: at(avg) }}>Trung bình {m.fmt(avg)}</span>
          </span>
          <span className="rank__dir" title={m.lowerBetter ? 'Xếp từ nhanh nhất tới chậm nhất' : 'Xếp từ cao nhất tới thấp nhất'}>
            {m.lowerBetter ? <ArrowUpNarrowWide /> : <ArrowDownWideNarrow />}
          </span>
        </div>
        <ol className="rank__list" aria-label={`Xếp hạng ${all.length} Thuế cơ sở theo ${m.label.toLowerCase()}; trung bình thành phố ${m.fmt(avg)}`}>
          {rows.slice(0, TOP_N).map(row)}
          {hidden > 0 && (
            <li className="rank__gap">
              <span className="rank__track"><span className="rank__avg" style={{ left: at(avg) }} /></span>
              <span className="rank__gap-text">{hidden} đơn vị ở giữa</span>
            </li>
          )}
          {rows.slice(TOP_N).map(row)}
        </ol>
      </div>
      <div className="rank__toggles">
        <button type="button" className="top-rows__toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? <>Thu gọn <ChevronUp aria-hidden="true" /></> : <>Xem đủ {all.length} đơn vị <ChevronDown aria-hidden="true" /></>}
        </button>
        {tableToggle}
      </div>
    </>
  );
}

function CityCompare({ data, error, onRetry }: { data?: CityData; error: boolean; onRetry: () => void }) {
  const [metric, setMetric] = useState<MetricKey>('fileRate');
  const [showTable, setShowTable] = useState(false);
  const mobile = useBreakpoint() === 'mobile';
  const exportCsv = () => {
    if (!data) return;
    downloadXlsx(`so-sanh-25-thue-co-so-${AS_OF}`, [
      [`So sánh 25 Thuế cơ sở, ${dmy(PERIOD_FROM)} – ${dmy(AS_OF)}`, 'Dữ liệu giả lập'],
      [],
      ['Đơn vị', 'Tờ khai tiếp nhận', 'Tiếp nhận thành công', 'Tỷ lệ xử lý thành công (%)', 'Tỷ lệ nộp tờ khai (%)', 'Phản hồi TB (giờ)', 'Người dùng ứng dụng', 'Tổng HKD'],
      ...ranked(data.units, 'fileRate').map((u) => [u.name, u.received, u.accepted, +(u.okRate * 100).toFixed(1), +(u.fileRate * 100).toFixed(1), +u.avgHours.toFixed(1), u.users, u.hkd]),
    ]);
  };
  const rowHead: Col<UnitRow> = { key: 'name', label: 'Đơn vị', sort: (u) => u.id, render: (u) => <>{u.name}{u.own && <span className="leader-own-tag">Đang xem</span>}</> };
  const cols: Col<UnitRow>[] = [
    { key: 'received', label: 'Tiếp nhận', sort: (u) => u.received, render: (u) => num(u.received), desc: true },
    { key: 'accepted', label: 'Thành công', sort: (u) => u.accepted, render: (u) => num(u.accepted), desc: true },
    { key: 'okRate', label: 'Tỷ lệ XL thành công', sort: (u) => u.okRate, render: (u) => rate(u.okRate), desc: true },
    { key: 'fileRate', label: 'Tỷ lệ nộp tờ khai', sort: (u) => u.fileRate, render: (u) => rate(u.fileRate), desc: true },
    { key: 'avgHours', label: 'Phản hồi trung bình', sort: (u) => u.avgHours, render: (u) => hours(u.avgHours) },
    { key: 'users', label: 'Người dùng', sort: (u) => u.users, render: (u) => num(u.users), desc: true },
  ];

  return (
    <section className="leader-section" aria-labelledby="leader-city">
      <div className="leader-section__head">
        <h3 id="leader-city" className="leader-section__title">
          <SectionTitle badges={<>
            <ProtoBadge note="Tỷ lệ nộp tờ khai tạm tính = tờ khai đã nộp ÷ tờ khai phải nộp trong kỳ. Văn bản ghi “/ tổng tờ khai đã tiếp nhận”; cần nghiệp vụ chốt mẫu số. Tạm cho phép xem cả 25 Thuế cơ sở; giới hạn phạm vi theo quyền sẽ bổ sung sau." />
          </>}>So sánh 25 Thuế cơ sở</SectionTitle>
        </h3>
      </div>
      {error ? <BlockError message="Không tải được số liệu so sánh giữa các Thuế cơ sở." onRetry={onRetry} /> : (
        <Panel
          title={METRICS[metric].label}
          className="dashboard-card--static leader-rank"
          extra={<div className="leader-rank__tools">
            <ChoiceSelect aria-label="Chỉ số so sánh" value={metric} onValueChange={setMetric} options={METRIC_KEYS.map((k) => ({ value: k, label: METRICS[k].label }))} className={mobile ? 'leader-metric-select leader-metric-select--block' : 'leader-metric-select'} />
            <ExcelButton label="Xuất so sánh 25 Thuế cơ sở ra Excel" disabled={!data} onExport={exportCsv} />
          </div>}
        >
          {!data ? <Skel w="100%" h={200} /> : <>
            {/* Bảng đủ các chỉ số, mở tại chỗ, không hiện sẵn. */}
            <RankChart data={data} metric={metric} tableToggle={
              <button type="button" className="top-rows__toggle" aria-expanded={showTable} aria-controls="leader-city-table" onClick={() => setShowTable((v) => !v)}>
                {showTable ? <>Ẩn bảng số liệu <ChevronUp aria-hidden="true" /></> : <>Xem dạng bảng <ChevronDown aria-hidden="true" /></>}
              </button>} />
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

function OfficerSection({ unit }: { unit: string }) {
  const q = useQuery({ queryKey: ['leader-officers'], queryFn: fetchOfficerPerf, enabled: unit === OWN_UNIT });
  const rowHead: Col<OfficerPerf> = { key: 'name', label: 'Cán bộ', sort: (o) => o.name.split(' ').slice(-1)[0], render: (o) => o.name };
  const cols: Col<OfficerPerf>[] = [
    { key: 'team', label: 'Tổ', sort: (o) => o.teamName, render: (o) => o.teamName },
    { key: 'decl', label: 'Tờ khai xử lý', sort: (o) => o.declarations, render: (o) => num(o.declarations), desc: true },
    { key: 'req', label: 'Yêu cầu hỗ trợ', sort: (o) => o.requests, render: (o) => num(o.requests), desc: true },
    { key: 'hours', label: 'Phản hồi trung bình', sort: (o) => o.avgHours ?? Infinity, render: (o) => hours(o.avgHours) },
    { key: 'onTime', label: 'Đúng hạn (≤ 48 giờ)', sort: (o) => o.onTime ?? -1, render: (o) => (o.onTime == null ? '—' : rate(o.onTime)), desc: true },
  ];
  return (
    <section className="leader-section" aria-labelledby="leader-officers">
      <div className="leader-section__head">
        <h3 id="leader-officers" className="leader-section__title">
          <SectionTitle badges={<ProtoBadge note="Trước khi dùng để đánh giá cán bộ, lãnh đạo cần thống nhất cách tính, ngưỡng đúng hạn (tạm 48 giờ), ai được xem và cách tính khác biệt do địa bàn. Tỷ lệ đúng hạn là số giả lập." />}>Hiệu quả cán bộ trong {unitName(unit)}</SectionTitle>
        </h3>
      </div>
      <Panel className="dashboard-card--static">
        {unit !== OWN_UNIT ? <BlockEmpty>Chưa có dữ liệu cán bộ của {unitName(unit)} trong bản mẫu.</BlockEmpty>
          : q.isError ? <BlockError message="Không tải được số liệu cán bộ." onRetry={() => q.refetch()} />
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
  // Tạm mở đủ 25 cơ sở theo yêu cầu; giới hạn phạm vi sẽ bổ sung sau.
  const [unit, setUnit] = useState(OWN_UNIT);
  const city = useQuery({ queryKey: ['leader-city'], queryFn: fetchCityComparison, enabled: role === 'base' });
  const data = useMemo(() => city.data && ({
    ...city.data,
    // Trong view này, own đánh dấu cơ sở đang xem để KPI và xếp hạng đồng bộ.
    units: city.data.units.map((u) => ({ ...u, own: u.id === unit })),
  }), [city.data, unit]);

  if (role !== 'base') return null;

  return (
    <section className="leader-page" aria-label="Kết quả cơ sở">
      {/* Phạm vi kết quả cơ sở độc lập với bộ lọc thống kê thông báo bên dưới. */}
      <div className="leader-section__head">
        <h2 className="leader-section__title">Kết quả cơ sở</h2>
        <ChoiceSelect aria-label="Phạm vi kết quả cơ sở" prefix="Phạm vi:" value={unit} onValueChange={setUnit} options={CITY_UNITS} className="leader-scope-select" />
        <span className="scope-text"><span className="scope-text__label">Kỳ:</span>{dmy(PERIOD_FROM)} – {dmy(AS_OF)} (30 ngày)</span>
      </div>
      <KpiRow data={data} error={city.isError} onRetry={() => city.refetch()} />
      <MobileDisclosure label="So sánh 25 Thuế cơ sở"><CityCompare data={data} error={city.isError} onRetry={() => city.refetch()} /></MobileDisclosure>
      <MobileDisclosure label="Hiệu quả cán bộ"><OfficerSection unit={unit} /></MobileDisclosure>
    </section>
  );
}
