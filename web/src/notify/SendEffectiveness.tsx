import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { BlockEmpty, BlockError, Panel, Skel } from '@/components/Blocks';
import { ProtoBadge, ProtoNote } from '@/components/Proto';
import { StatusPill } from '@/components/Status';
import { INITIAL_CONFIG } from '../data/config';
import { usePermissions } from '../demo/DemoContext';
import ReactECharts from '../lib/Chart';
import { dm, dmy, num } from '../lib/format';
import { chartMotion } from '../lib/motion';
import { useBreakpoint, useReducedMotion } from '../lib/useMedia';
import { C } from '../theme';
import { TARGETS, fetchEffectiveness, type EffectDay, type Effectiveness } from './notifyPlanApi';
import './notify.css';
import { DEMO_TODAY } from '../lib/demoClock';

const FONT = 'Inter Variable, Inter, sans-serif';
const axisLabel = { color: C.faint, fontSize: 12, fontFamily: FONT };
const pctFmt = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const p1 = (v: number) => `${pctFmt.format(v)}%`;
const rate = (a: number, b: number) => (b ? (a / b) * 100 : 0);

interface Metric {
  key: 'onTime' | 'matched';
  title: string;
  target: number;
  /** Mục tiêu "≥" (đạt khi bằng) hay ">" (phải vượt). */
  strict: boolean;
  value: (d: Effectiveness | EffectDay) => number;
  base: (d: Effectiveness | EffectDay) => number;
  part: (d: Effectiveness | EffectDay) => number;
  counts: string;
  definition: string;
  yMin: number;
}

const METRICS: Metric[] = [
  {
    key: 'onTime', title: 'Tỷ lệ gửi đúng thời điểm', target: TARGETS.onTime, strict: false, yMin: 90,
    value: (d) => rate(d.onTime, d.sent), base: (d) => d.sent, part: (d) => d.onTime, counts: 'thông báo gửi đúng khung',
    definition: `Thông báo được gửi trong khung ${INITIAL_CONFIG.sendStart}–${INITIAL_CONFIG.sendEnd} của đúng ngày dự kiến, trên tổng thông báo đã gửi. Gửi sau khung hoặc dời sang ngày khác tính là không đúng thời điểm.`,
  },
  {
    key: 'matched', title: 'Tỷ lệ hộ được nhắc đúng hồ sơ', target: TARGETS.matched, strict: true, yMin: 60,
    value: (d) => rate(d.matched, d.checked), base: (d) => d.checked, part: (d) => d.matched, counts: 'lượt nhắc đúng hồ sơ',
    definition: 'Hồ sơ hoặc khoản thuế được nhắc vẫn còn tồn đọng tại thời điểm gửi (chưa nộp hồ sơ, chưa nộp tiền), trên tổng lượt nhắc hạn và quá hạn. Nhắc hồ sơ đã nộp tính là không đúng.',
  },
];

const met = (m: Metric, v: number) => (m.strict ? v > m.target : v >= m.target);
const targetText = (m: Metric) => `${m.strict ? '>' : '≥'} ${m.target}%`;

export function SendEffectiveness() {
  const { user, role, canSeeTaxpayer, scopeLabel, fixedScope, defaultScope } = usePermissions();
  const scopeKey = `${role}:${user.team ?? ''}:${user.id}`;
  const q = useQuery({
    queryKey: ['notify-effect', scopeKey],
    queryFn: () => fetchEffectiveness(role === 'base' ? 'ALL' : scopeKey, canSeeTaxpayer),
    placeholderData: keepPreviousData,
  });
  const d = q.data;
  const scope = scopeLabel(fixedScope ?? defaultScope);

  const head = (
    <div className="nt-eff-head">
      <h2 className="nt-title">Hiệu quả gửi 30 ngày <ProtoBadge kind="mock" note="số liệu hiệu quả gửi do bản mock tạo ra" /></h2>
      <p className="panel__sub">{d ? `${dmy(d.from)} – ${dmy(d.to)}, ${scope}.` : `30 ngày tới ${dmy(DEMO_TODAY)}, ${scope}.`}</p>
    </div>
  );

  if (q.isError) return <div className="nt-eff">{head}<BlockError message="Không tải được số liệu hiệu quả gửi." onRetry={() => q.refetch()} /></div>;
  if (d && d.sent === 0) return <div className="nt-eff">{head}<BlockEmpty>Chưa có thông báo nào được gửi trong phạm vi này trong 30 ngày qua.</BlockEmpty></div>;

  return (
    <div className={`nt-eff${q.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={!d || q.isPlaceholderData}>
      {head}
      <div className="hkd-kpis">
        {METRICS.map((m) => {
          const v = d ? m.value(d) : 0;
          const ok = met(m, v);
          return (
            <div key={m.key} className="hkd-kpi">
              <span className="kpi__label">{m.title}</span>
              <span className="kpi__value">{d ? p1(v) : <Skel w={90} h={28} />}</span>
              <span className="nt-kpi__target">
                Mục tiêu {targetText(m)}
                {d && <StatusPill tone={ok ? 'success' : 'danger'}>{ok ? 'Đạt' : m.target - v < 0.05 ? 'Chưa đạt, cần vượt mục tiêu' : `Chưa đạt, thấp hơn ${pctFmt.format(m.target - v)} điểm`}</StatusPill>}
              </span>
              <span className="kpi__note">{d ? `${num(m.part(d))} / ${num(m.base(d))} ${m.counts}` : <Skel w={140} h={14} />}</span>
            </div>
          );
        })}
      </div>
      <div className="charts nt-eff-charts">
        {METRICS.map((m) => <TrendPanel key={m.key} m={m} d={d} />)}
      </div>
    </div>
  );
}

function TrendPanel({ m, d }: { m: Metric; d?: Effectiveness }) {
  const reduced = useReducedMotion();
  const mobile = useBreakpoint() === 'mobile';
  const values = d?.days.map((x) => +m.value(x).toFixed(1)) ?? [];
  const miss = d ? d.days.filter((x) => !met(m, m.value(x))) : [];
  const low = d ? d.days.reduce((a, b) => (m.value(b) < m.value(a) ? b : a)) : null;
  const yMin = Math.min(m.yMin, Math.floor(Math.min(...(values.length ? values : [m.yMin])) - 1));
  return (
    <Panel title={m.title} sub="Theo ngày" className="dashboard-card--static">
      {!d ? <Skel w="100%" h={220} /> : (
        <>
          <ReactECharts
            aria-hidden="true"
            style={{ height: 220 }}
            opts={{ renderer: 'svg' }}
            option={{
              ...chartMotion(reduced),
              textStyle: { fontFamily: FONT },
              tooltip: { trigger: 'axis', valueFormatter: (v: number) => p1(v) },
              grid: { left: 44, right: 12, top: 12, bottom: 28 },
              xAxis: { type: 'category', data: d.days.map((x) => dm(x.date)), axisLabel: { ...axisLabel, interval: mobile ? 6 : 4 }, axisTick: { show: false }, axisLine: { lineStyle: { color: C.grid } } },
              yAxis: { type: 'value', min: yMin, max: 100, axisLabel: { ...axisLabel, formatter: (v: number) => `${v}%` }, splitLine: { lineStyle: { color: C.grid } } },
              series: [
                { name: m.title, type: 'line', data: values, itemStyle: { color: C.sent }, lineStyle: { width: 2 }, symbol: 'circle', symbolSize: 4, showSymbol: false },
                { name: 'Mục tiêu', type: 'line', data: d.days.map(() => m.target), itemStyle: { color: C.muted }, lineStyle: { width: 1.5, type: 'dashed' }, symbol: 'none' },
              ],
            }}
          />
          <div className="chart-legend" aria-hidden="true">
            <span><i className="swatch swatch--line" style={{ background: C.sent }} /> Tỷ lệ trong ngày</span>
            <span><i className="swatch swatch--line nt-dash" /> Mục tiêu {targetText(m)}</span>
          </div>
          <p className="nt-chart-summary">
            {miss.length === 0 ? 'Cả 30 ngày đều đạt mục tiêu.' : `${miss.length}/30 ngày chưa đạt mục tiêu.`}
            {low && ` Thấp nhất ${p1(m.value(low))} ngày ${dm(low.date)}.`}
          </p>
        </>
      )}
      <ProtoNote kind="proposal"><b>Cách tính:</b> {m.definition}</ProtoNote>
    </Panel>
  );
}
