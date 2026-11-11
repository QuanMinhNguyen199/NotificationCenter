import { MobileDisclosure } from '@/components/MobileDisclosure';
import { IconButton } from '@/components/IconButton';
import { ChoiceSelect, GroupedSelect, OptionGroup, ViewTabs } from '@/components/Controls';
import { Button } from '@/components/ui/button';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  COMPLIANCE_LABEL, COMPLIANCE_ORDER, REMINDER_HINT, REMINDER_LABEL, REMINDER_ORDER, REPORT_MONTHS, REQUEST_STATUS_LABEL,
  fetchDaily, fetchDebt, fetchReminders, fetchStructure, fetchSupport, type Compliance, type Dimension, type ReminderKind, type RequestStatus,
} from '../api/hkdApi';
import { BlockError, Panel, Skel } from '../components/Blocks';
import { StatusPill } from '../components/Status';
import { usePermissions } from '../demo/DemoContext';
import ReactECharts from '../lib/Chart';
import { dm, dmy, num, pct } from '../lib/format';
import { chartMotion } from '../lib/motion';
import { fetchObligations } from '../api/mockApi';
import { ObligationChart } from '../stats/ObligationChart';
import { TaxpayersPane } from '../stats/DetailTabs';
import { DetailOverlay } from '../stats/Details';
import { filterOf, useStatsParams } from '../stats/useStatsParams';
import { useRoute } from '../lib/router';
import { useBreakpoint, useReducedMotion } from '../lib/useMedia';
import { C } from '../theme';
import { downloadCsv } from '../lib/csv';
import { AiQaTab } from '../hkd/AiQaTab';
import { TopRows } from '../components/TopRows';

const FONT = 'Inter Variable, Inter, sans-serif';
const axisLabel = { color: C.faint, fontSize: 12, fontFamily: FONT };
const COMPLIANCE_COLOR: Record<Compliance, string> = { COMPLIANT: '#15803D', MISSING_FILE: C.dueSoon, IN_DEBT: C.overdue, BOTH: '#7F1D1D' };
const COMPLIANCE_INK: Record<Compliance, string> = { COMPLIANT: '#fff', MISSING_FILE: C.dueSoonInk, IN_DEBT: '#fff', BOTH: '#fff' };
const STATUS_TONE: Record<RequestStatus, 'info' | 'warning' | 'success' | 'neutral' | 'danger'> = { NEW: 'info', PROCESSING: 'info', NEED_MORE: 'warning', RESOLVED: 'success', REJECTED: 'neutral' };

/** Tiền theo tỷ hoặc triệu đồng cho dễ đọc. */
const money = (v: number) => (v >= 1e9 ? `${(v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ` : `${num(Math.round(v / 1e6))} triệu`);
const hours = (h: number | null) => (h == null ? '—' : h >= 24 ? `${(h / 24).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ngày` : `${Math.round(h)} giờ`);

function Kpi({ label, value, note, tone }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'danger' }) {
  return (
    <div className="hkd-kpi">
      <span className="kpi__label">{label}</span>
      <span className={`kpi__value${tone === 'danger' ? ' kpi__value--failed' : ''}`}>{value}</span>
      {note && <span className="kpi__note">{note}</span>}
    </div>
  );
}

function useChartBase() {
  const reduced = useReducedMotion();
  return { ...chartMotion(reduced), textStyle: { fontFamily: FONT }, tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } } };
}


/* ---------- Tab 1: Chỉ tiêu hằng ngày ---------- */

function DailyTab({ scope }: { scope: string }) {
  const base = useChartBase();
  // So sánh theo đơn vị thuộc màn lãnh đạo; cán bộ chỉ xem số của mình.
  const { role } = usePermissions();
  const mobile = useBreakpoint() === 'mobile';
  const q = useQuery({ queryKey: ['hkd-daily', scope], queryFn: () => fetchDaily(scope), placeholderData: keepPreviousData });
  if (q.isError) return <BlockError message="Không tải được chỉ tiêu hằng ngày." onRetry={() => q.refetch()} />;
  const d = q.data;
  return (
    <div className={`hkd-tab${q.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={q.isPlaceholderData}>
      <div className="hkd-kpis">
        <Kpi label="Tờ khai tiếp nhận hôm nay" value={d ? num(d.today.received) : <Skel w={80} h={28} />} note={d && `TB 7 ngày trước: ${num(Math.round(d.avg7))}`} />
        <Kpi label="Tỷ lệ xử lý thành công" value={d ? pct(d.okRate * 100, 100) : <Skel w={80} h={28} />} note="30 ngày" />
        <Kpi label="Tỷ lệ nộp thuế theo hồ sơ" value={d ? pct(d.paidRate * 100, 100) : <Skel w={80} h={28} />} note="Hồ sơ phải nộp đã nộp, 30 ngày" />
        <Kpi label="Đăng ký app, chưa nộp tờ khai" value={d ? num(d.appMissing) : <Skel w={80} h={28} />} note={d && `Trên ${num(d.registered)} hộ đã đăng ký`} tone="danger" />
      </div>
      <div className="charts">
        <Panel title="Tờ khai theo ngày" className="dashboard-card--static">
          {!d ? <Skel w="100%" h={220} /> : (
            <ReactECharts
              aria-hidden="true"
              style={{ height: 220 }}
              opts={{ renderer: 'svg' }}
              option={{
                ...base,
                grid: { left: 40, right: 12, top: 12, bottom: 28 },
                xAxis: { type: 'category', data: d.series.map((s) => dm(s.date)), axisLabel: { ...axisLabel, interval: mobile ? 6 : 4 }, axisTick: { show: false }, axisLine: { lineStyle: { color: C.grid } } },
                yAxis: { type: 'value', axisLabel, splitLine: { lineStyle: { color: C.grid } } },
                series: [
                  { name: 'Tiếp nhận', type: 'bar', data: d.series.map((s) => s.received), itemStyle: { color: C.bar }, barMaxWidth: 14 },
                  { name: 'Xử lý thành công', type: 'line', data: d.series.map((s) => s.accepted), itemStyle: { color: C.sent }, lineStyle: { width: 2 }, symbol: 'none' },
                ],
              }}
            />
          )}
          <div className="chart-legend" aria-hidden="true">
            <span><i className="swatch" style={{ background: C.bar }} /> Tiếp nhận</span>
            <span><i className="swatch" style={{ background: C.sent }} /> Xử lý thành công</span>
          </div>
        </Panel>
        <Panel title="Đăng ký app nhưng chưa nộp tờ khai" sub="Theo tuần, 8 tuần gần nhất" className="dashboard-card--static hkd-weekly">
          {!d ? <Skel w="100%" h={220} /> : (
            <ReactECharts
              aria-hidden="true"
              style={{ height: 220 }}
              opts={{ renderer: 'svg' }}
              option={{
                ...base,
                grid: { left: 40, right: 16, top: 16, bottom: 44 },
                // Mobile chỉ ghi nhãn cách tuần; vẫn vẽ đủ 8 cột và giữ khoảng ngày đầy đủ khi chạm.
                tooltip: { ...base.tooltip, confine: true, triggerOn: mobile ? 'click' : 'mousemove|click' },
                xAxis: {
                  type: 'category', data: d.weeks.map((w) => w.label),
                  axisLabel: { ...axisLabel, interval: mobile ? 1 : 0, hideOverlap: true, lineHeight: 16, margin: 10, formatter: (v: string) => v.replace('–', '\n–') },
                  axisTick: { show: false }, axisLine: { lineStyle: { color: C.grid } },
                },
                yAxis: { type: 'value', axisLabel, splitLine: { lineStyle: { color: C.grid } } },
                series: [{ name: 'Số hộ', type: 'bar', data: d.weeks.map((w) => w.value), itemStyle: { color: C.overdue }, barMaxWidth: 22 }],
              }}
            />
          )}
        </Panel>
      </div>
      {role !== 'officer' && <Panel title="Theo đơn vị" sub="30 ngày" className="dashboard-card--static hkd-table">
        {!d ? <Skel w="100%" h={120} /> : (
          <TopRows total={d.byUnit.length} noun="đơn vị"><table className="mini-table">
            <thead><tr><th scope="col">Đơn vị</th><th scope="col">Tờ khai tiếp nhận</th><th scope="col">Xử lý thành công</th><th scope="col">Nộp thuế theo hồ sơ</th><th scope="col">Đăng ký app, chưa nộp</th></tr></thead>
            <tbody>
              {d.byUnit.map((u) => (
                <tr key={u.name}><th scope="row">{u.name}</th><td>{num(u.received)}</td><td>{pct(u.okRate * 100, 100)}</td><td>{pct(u.paidRate * 100, 100)}</td><td>{num(u.appMissing)}</td></tr>
              ))}
            </tbody>
          </table></TopRows>
        )}
      </Panel>}
    </div>
  );
}

/* ---------- Tab 2: Cơ cấu và tuân thủ ---------- */

const DIM_LABEL: Record<Dimension, string> = { ward: 'Địa bàn', band: 'Doanh thu năm', industry: 'Loại hình kinh doanh' };
// Nhãn ngắn cho nút chuyển để ba lựa chọn vừa một hàng ở 375px.
const DIM_SHORT: Record<Dimension, string> = { ward: 'Địa bàn', band: 'Doanh thu', industry: 'Loại hình' };

function StructureTab({ scope, dim, setDim }: { scope: string; dim: Dimension; setDim: (d: Dimension) => void }) {
  const base = useChartBase();
  const mobile = useBreakpoint() === 'mobile';
  const q = useQuery({ queryKey: ['hkd-structure', scope, dim], queryFn: () => fetchStructure(scope, dim), placeholderData: keepPreviousData });
  if (q.isError) return <BlockError message="Không tải được cơ cấu HKD." onRetry={() => q.refetch()} />;
  const d = q.data;
  return (
    <div className={`hkd-tab${q.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={q.isPlaceholderData}>
      <div className="hkd-kpis">
        <Kpi label="Tổng HKD" value={d ? num(d.total) : <Skel w={80} h={28} />} />
        {COMPLIANCE_ORDER.map((c) => (
          <Kpi key={c} label={COMPLIANCE_LABEL[c]} value={d ? num(d.counts[c]) : <Skel w={80} h={28} />} note={d && pct(d.counts[c], d.total)} tone={c === 'BOTH' ? 'danger' : undefined} />
        ))}
      </div>
      <Panel
        title={`Tình trạng tuân thủ theo ${DIM_LABEL[dim].toLowerCase()}`}
        className="dashboard-card--static hkd-table"
        extra={<OptionGroup aria-label="Chiều cơ cấu" value={dim} onValueChange={(v) => setDim(v as Dimension)} options={(Object.keys(DIM_LABEL) as Dimension[]).map((k) => ({ value: k, label: DIM_SHORT[k] }))} />}
      >
        {!d ? <Skel w="100%" h={260} /> : (
          <>
            <ReactECharts
              aria-hidden="true"
              style={{ height: Math.max(200, d.rows.length * 46 + 40) }}
              opts={{ renderer: 'svg' }}
              option={{
                ...base,
                grid: { left: mobile ? 110 : 170, right: 16, top: 8, bottom: 8 },
                xAxis: { type: 'value', max: 'dataMax', show: false },
                yAxis: { type: 'category', inverse: true, data: d.rows.map((r) => r.key), axisLabel: { ...axisLabel, color: C.text, width: mobile ? 100 : 160, overflow: 'truncate' }, axisTick: { show: false }, axisLine: { show: false } },
                series: COMPLIANCE_ORDER.map((c) => ({
                  name: COMPLIANCE_LABEL[c],
                  type: 'bar',
                  stack: 'hkd',
                  barWidth: '58%',
                  barMaxWidth: 28,
                  itemStyle: { color: COMPLIANCE_COLOR[c], borderColor: '#fff', borderWidth: 1 },
                  label: { show: true, color: COMPLIANCE_INK[c], fontSize: 11, fontWeight: 600, formatter: (e: { value: number; dataIndex: number }) => (e.value / Math.max(d.rows[e.dataIndex].total, 1) > (mobile ? 0.22 : 0.09) ? num(e.value) : '') },
                  data: d.rows.map((r) => r.counts[c]),
                })),
              }}
            />
            <div className="chart-legend" aria-hidden="true">
              {COMPLIANCE_ORDER.map((c) => <span key={c}><i className="swatch" style={{ background: COMPLIANCE_COLOR[c] }} /> {COMPLIANCE_LABEL[c]}</span>)}
            </div>
            <TopRows total={d.rows.length} noun="dòng"><table className="mini-table" style={{ marginTop: 12 }}>
              <thead><tr><th scope="col">{DIM_LABEL[dim]}</th><th scope="col">Tổng HKD</th>{COMPLIANCE_ORDER.map((c) => <th scope="col" key={c}>{COMPLIANCE_LABEL[c]}</th>)}</tr></thead>
              <tbody>
                {d.rows.map((r) => (
                  <tr key={r.key}><th scope="row">{r.key}</th><td>{num(r.total)}</td>{COMPLIANCE_ORDER.map((c) => <td key={c}>{num(r.counts[c])}</td>)}</tr>
                ))}
              </tbody>
            </table></TopRows>
          </>
        )}
      </Panel>
    </div>
  );
}

/* ---------- Tab 3: Nợ thuế ---------- */

function DebtTab({ scope, scopeName }: { scope: string; scopeName: string }) {
  const base = useChartBase();
  const { role } = usePermissions();
  const tables = role === 'officer' ? (['byWard'] as const) : (['byUnit', 'byWard'] as const);
  const q = useQuery({ queryKey: ['hkd-debt', scope], queryFn: () => fetchDebt(scope), placeholderData: keepPreviousData });
  if (q.isError) return <BlockError message="Không tải được số liệu nợ thuế." onRetry={() => q.refetch()} />;
  const d = q.data;
  const report = (month: string) => {
    if (!d) return;
    const t = d.trend.find((x) => x.month === month)!;
    const k = d.total ? t.amount / d.total : 0;
    downloadCsv(`bao-cao-no-thue-${month.replace('/', '-')}.csv`, [
      [`Báo cáo nợ thuế HKD tháng ${month}`, scopeName, 'Dữ liệu minh họa'],
      [],
      ['Đơn vị', 'Số HKD nợ', 'Tổng nợ (đồng)', 'Nợ quá hạn (đồng)'],
      ...d.byUnit.map((u) => [u.name, Math.round(u.hkd * (t.hkd / Math.max(d.hkd, 1))), Math.round(u.amount * k), Math.round(u.overdue * k)]),
      [],
      ['Địa bàn', 'Số HKD nợ', 'Tổng nợ (đồng)', 'Nợ quá hạn (đồng)'],
      ...d.byWard.map((u) => [u.name, Math.round(u.hkd * (t.hkd / Math.max(d.hkd, 1))), Math.round(u.amount * k), Math.round(u.overdue * k)]),
    ]);
  };
  return (
    <div className={`hkd-tab${q.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={q.isPlaceholderData}>
      <div className="hkd-kpis">
        <Kpi label="Số HKD nợ thuế" value={d ? num(d.hkd) : <Skel w={80} h={28} />} />
        <Kpi label="Tổng nợ" value={d ? money(d.total) : <Skel w={80} h={28} />} />
        <Kpi label="Nợ quá hạn" value={d ? money(d.overdue) : <Skel w={80} h={28} />} note={d && pct(d.overdue, d.total)} tone="danger" />
        <Kpi label="Nợ bình quân mỗi HKD" value={d ? money(d.avg) : <Skel w={80} h={28} />} />
      </div>
      <div className="charts">
        <Panel title="Nợ thuế theo tháng" sub="12 tháng" className="dashboard-card--static">
          {!d ? <Skel w="100%" h={240} /> : (
            <ReactECharts
              aria-hidden="true"
              style={{ height: 240 }}
              opts={{ renderer: 'svg' }}
              option={{
                ...base,
                grid: { left: 48, right: 44, top: 28, bottom: 28 },
                xAxis: { type: 'category', data: d.trend.map((t) => t.month.slice(0, 2) + '/' + t.month.slice(5)), axisLabel, axisTick: { show: false }, axisLine: { lineStyle: { color: C.grid } } },
                yAxis: [
                  { type: 'value', name: 'tỷ đồng', nameTextStyle: { color: C.faint, fontSize: 11 }, axisLabel, splitLine: { lineStyle: { color: C.grid } } },
                  { type: 'value', name: 'HKD', nameTextStyle: { color: C.faint, fontSize: 11 }, axisLabel, splitLine: { show: false } },
                ],
                series: [
                  { name: 'Tổng nợ (tỷ đồng)', type: 'bar', data: d.trend.map((t) => +(t.amount / 1e9).toFixed(2)), itemStyle: { color: C.bar }, barMaxWidth: 22 },
                  { name: 'Số HKD nợ', type: 'line', yAxisIndex: 1, data: d.trend.map((t) => t.hkd), itemStyle: { color: C.sent }, lineStyle: { width: 2 }, symbol: 'none' },
                ],
              }}
            />
          )}
          <div className="chart-legend" aria-hidden="true">
            <span><i className="swatch" style={{ background: C.bar }} /> Tổng nợ (tỷ đồng, trục trái)</span>
            <span><i className="swatch" style={{ background: C.sent }} /> Số HKD nợ (trục phải)</span>
          </div>
        </Panel>
        <Panel title="Báo cáo định kỳ" sub="Theo tháng, tải về dạng CSV" className="dashboard-card--static">
          <ul className="report-list">
            {REPORT_MONTHS.map((m) => (
              <li key={m}>
                <span>Báo cáo nợ thuế tháng {m}</span>
                <IconButton icon={Download} label={`Tải báo cáo nợ thuế tháng ${m} dạng CSV`} disabled={!d} onClick={() => report(m)} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className={tables.length === 1 ? 'charts charts--single' : 'charts'}>
        {tables.map((k) => (
          <Panel key={k} title={k === 'byUnit' ? 'Theo đơn vị' : 'Theo địa bàn'} className="dashboard-card--static hkd-table">
            {!d ? <Skel w="100%" h={120} /> : (
              <TopRows total={d[k].length} noun="dòng"><table className="mini-table">
                <thead><tr><th scope="col">{k === 'byUnit' ? 'Đơn vị' : 'Địa bàn'}</th><th scope="col">HKD nợ</th><th scope="col">Tổng nợ</th><th scope="col">Quá hạn</th></tr></thead>
                <tbody>{d[k].map((u) => <tr key={u.name}><th scope="row">{u.name}</th><td>{num(u.hkd)}</td><td>{money(u.amount)}</td><td>{money(u.overdue)}</td></tr>)}</tbody>
              </table></TopRows>
            )}
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ---------- Tab 4: Hỗ trợ HKD ---------- */

function SupportTab({ scope }: { scope: string }) {
  const q = useQuery({ queryKey: ['hkd-support', scope], queryFn: () => fetchSupport(scope), placeholderData: keepPreviousData });
  if (q.isError) return <BlockError message="Không tải được số liệu hỗ trợ HKD." onRetry={() => q.refetch()} />;
  const d = q.data;
  const statuses = Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[];
  const table = (title: string, rows: NonNullable<typeof d>['officers'], first: string) => (
    <Panel title={title} sub="30 ngày" className="dashboard-card--static hkd-table">
      {!d ? <Skel w="100%" h={140} /> : (
        <TopRows total={rows.length} noun="dòng"><table className="mini-table">
          <thead><tr><th scope="col">{first}</th><th scope="col">Tổng</th>{statuses.map((s) => <th scope="col" key={s}>{REQUEST_STATUS_LABEL[s]}</th>)}<th scope="col">Xử lý TB</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.name}><th scope="row">{r.name}</th><td>{num(r.total)}</td>{statuses.map((s) => <td key={s}>{num(r.status[s])}</td>)}<td>{hours(r.avgHours)}</td></tr>)}</tbody>
        </table></TopRows>
      )}
    </Panel>
  );
  return (
    <div className={`hkd-tab${q.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={q.isPlaceholderData}>
      <div className="hkd-kpis">
        <Kpi label="Yêu cầu tiếp nhận" value={d ? num(d.total) : <Skel w={80} h={28} />} note="30 ngày" />
        <Kpi label="Đã giải quyết" value={d ? num(d.resolved) : <Skel w={80} h={28} />} note={d && `${pct(d.resolved, d.total)}, ngoài ra ${num(d.rejected)} từ chối`} />
        <Kpi label="Đang xử lý" value={d ? num(d.open) : <Skel w={80} h={28} />} />
        <Kpi label="Chờ HKD bổ sung" value={d ? num(d.needMore) : <Skel w={80} h={28} />} tone="danger" />
        <Kpi label="Thời gian xử lý TB" value={d ? hours(d.avgHours) : <Skel w={80} h={28} />} />
      </div>
      {table('Theo cán bộ', d?.officers ?? [], 'Cán bộ')}
      {table('Theo địa bàn', d?.wards ?? [], 'Địa bàn')}
      <div className="charts">
        <Panel title="Theo loại yêu cầu" className="dashboard-card--static hkd-table">
          {!d ? <Skel w="100%" h={120} /> : (
            <TopRows total={d.types.length} noun="loại"><table className="mini-table">
              <thead><tr><th scope="col">Loại yêu cầu</th><th scope="col">Số yêu cầu</th><th scope="col">Tỷ lệ</th></tr></thead>
              <tbody>{d.types.map((t) => <tr key={t.name}><th scope="row">{t.name}</th><td>{num(t.total)}</td><td>{pct(t.total, d.total)}</td></tr>)}</tbody>
            </table></TopRows>
          )}
        </Panel>
        <Panel title="Đang chờ HKD bổ sung" className="dashboard-card--static hkd-table">
          {!d ? <Skel w="100%" h={120} /> : d.waiting.length === 0 ? <p className="chart-note">Không có yêu cầu chờ bổ sung.</p> : (
            <TopRows total={d.waiting.length} noun="yêu cầu"><table className="mini-table">
              <thead><tr><th scope="col">Mã</th><th scope="col">Ngày</th><th scope="col">Loại</th><th scope="col">Cán bộ</th><th scope="col">Trạng thái</th></tr></thead>
              <tbody>{d.waiting.map((r) => <tr key={r.id}><th scope="row" className="id">{r.id}</th><td>{dmy(r.date)}</td><td>{r.type}</td><td>{r.officerName}</td><td><StatusPill tone={STATUS_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</StatusPill></td></tr>)}</tbody>
            </table></TopRows>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ---------- Tab 5: Nhắc việc ---------- */

// Màu theo mức khẩn, dùng lại thang của biểu đồ nghĩa vụ ở màn Thống kê; ngưỡng doanh thu là thông tin, dùng xanh dương.
const REMINDER_COLOR: Record<ReminderKind, string> = { DUE_SOON: C.dueSoon, OVERDUE: C.overdue, TODO: C.inTerm, THRESHOLD: '#2563EB' };

function RemindersTab({ scope }: { scope: string }) {
  const { navigate } = useRoute();
  const { canEditConfig } = usePermissions();
  const q = useQuery({ queryKey: ['hkd-reminders', scope], queryFn: () => fetchReminders(scope), placeholderData: keepPreviousData });
  if (q.isError) return <BlockError message="Không tải được thống kê nhắc việc." onRetry={() => q.refetch()} />;
  const d = q.data;
  const off = d?.kinds.filter((k) => !k.enabled) ?? [];
  return (
    <div className={`hkd-tab hkd-reminders${q.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={q.isPlaceholderData}>
      <div className="hkd-kpis">
        {REMINDER_ORDER.map((k, i) => {
          const r = d?.kinds[i];
          return <Kpi key={k} label={`HKD ${REMINDER_LABEL[k].toLowerCase()}`} value={r ? num(r.hkd) : <Skel w={80} h={28} />} tone={k === 'OVERDUE' ? 'danger' : undefined} />;
        })}
      </div>
      {off.length > 0 && (
        <p className="hkd-off" role="status">
          {off.map((k) => REMINDER_LABEL[k.kind]).join(', ')}: đang tắt trong Thiết lập, số liệu là của thời gian còn bật.
        </p>
      )}
      <p className="workspace-note">Theo dõi HKD còn việc cần làm và kết quả sau nhắc. <button className="link-btn" onClick={() => navigate('/thong-ke')}>Xem thống kê gửi thông báo</button></p>
      <Panel title="Hiệu quả theo loại nhắc" sub="30 ngày" className="dashboard-card--static hkd-table">
        {!d ? <Skel w="100%" h={160} /> : (
          <table className="mini-table rem-table">
            <thead><tr><th scope="col">Loại nhắc</th><th scope="col">HKD đã nhắc</th><th scope="col">Hoàn thành sau nhắc</th><th scope="col">Còn phải nhắc</th></tr></thead>
            <tbody>
              {d.kinds.map((k) => (
                <tr key={k.kind}>
                  <th scope="row">
                    <span className="rem-kind"><i className="swatch" style={{ background: REMINDER_COLOR[k.kind] }} aria-hidden="true" />{REMINDER_LABEL[k.kind]}</span>
                    <span className="rem-sub">{REMINDER_HINT[k.kind]}: {k.subs.map((s) => `${s.name.toLowerCase()} ${num(s.hkd)}`).join(', ')}</span>
                  </th>
                  <td data-label="HKD đã nhắc">{num(k.reminded)}</td>
                  <td data-label="Hoàn thành sau nhắc">{k.done == null ? <span className="rem-na">Không áp dụng</span> : `${num(k.done)} (${pct(k.done, k.reminded)})`}</td>
                  <td data-label="Còn phải nhắc">{num(k.hkd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <Panel
          title="Ngưỡng doanh thu"
          sub={d && `Báo khi doanh thu từ đầu năm đạt ${d.rule.nearPct}% mốc`}
          className="dashboard-card--static hkd-table"
          extra={<Button variant="outline" onClick={() => navigate('/thiet-lap', { muc: 'canh-bao-doanh-thu' })}>{canEditConfig ? 'Sửa ngưỡng' : 'Xem thiết lập'}</Button>}
        >
          {!d ? <Skel w="100%" h={120} /> : (
            <table className="mini-table">
              <thead><tr><th scope="col">Mốc</th><th scope="col">Sắp đạt</th><th scope="col">Đã báo</th><th scope="col">Đã vượt trong năm</th></tr></thead>
              <tbody>
                {d.milestones.map((m) => (
                  <tr key={m.code}><th scope="row">{money(m.amount)}<span className="rem-sub">{m.meaning}</span></th><td data-label="Sắp đạt">{num(m.near)}</td><td data-label="Đã báo">{num(m.notified)}</td><td data-label="Đã vượt trong năm">{num(m.passed)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      {/* So sánh đơn vị chỉ có nghĩa khi có từ 2 đơn vị (cán bộ chỉ có chính mình). */}
      {(!d || d.byUnit.length > 1) && (
        <Panel title="HKD cần nhắc theo đơn vị" sub="Số HKD hiện còn việc cần làm" className="dashboard-card--static hkd-table">
          {!d ? <Skel w="100%" h={120} /> : (
            <TopRows total={d.byUnit.length} noun="đơn vị"><table className="mini-table">
              <thead><tr><th scope="col">Đơn vị</th>{REMINDER_ORDER.map((k) => <th scope="col" key={k}>{REMINDER_LABEL[k]}</th>)}</tr></thead>
              <tbody>{d.byUnit.map((u) => <tr key={u.name}><th scope="row">{u.name}</th>{REMINDER_ORDER.map((k) => <td key={k} data-label={REMINDER_LABEL[k]}>{num(u.counts[k])}</td>)}</tr>)}</tbody>
            </table></TopRows>
          )}
        </Panel>
      )}
    </div>
  );
}

function ObligationsList() {
  const { p, set, openDetail, closeDetail } = useStatsParams();
  const ob = useQuery({ queryKey: ['obligations', p.unit], queryFn: () => fetchObligations(filterOf(p)), placeholderData: keepPreviousData });
  return <>
    <p className="workspace-note">Danh sách HKD còn nghĩa vụ khai hoặc nộp thuế; lọc theo mức độ cần xử lý.</p>
    <MobileDisclosure label="Tổng quan nghĩa vụ"><ObligationChart groupNote={p.group !== 'all'} data={ob.data} error={ob.error} loading={ob.isLoading} onRetry={() => ob.refetch()} onPick={(kind, prio) => set({ kind, prio, notified: false, page: 1 })} /></MobileDisclosure>
    <TaxpayersPane p={p} set={set} open={openDetail} reset={() => set({ tq: null, notified: null, kind: null, prio: null, group: null, page: 1 })} />
    <DetailOverlay detail={p.detail} filter={filterOf(p)} onClose={closeDetail} />
  </>;
}

/* ---------- Màn chính ---------- */

const TABS = [
  { key: 'chi-tieu', label: 'Chỉ tiêu hằng ngày' },
  { key: 'co-cau', label: 'Cơ cấu và tuân thủ' },
  { key: 'no-thue', label: 'Nợ thuế' },
  { key: 'ho-tro', label: 'Hỗ trợ HKD' },
  { key: 'nhac-viec', label: 'Hiệu quả nhắc việc' },
  { key: 'danh-sach', label: 'Danh sách nghĩa vụ' },
  { key: 'hoi-dap-ai', label: 'Hỏi đáp AI' },
];

export default function HkdPage() {
  const mobile = useBreakpoint() === 'mobile';
  const { params, navigate } = useRoute();
  const { scopes, fixedScope, allowedScopes, defaultScope, scopeLabel } = usePermissions();
  const asked = params.get('unit');
  // Phạm vi trên URL chỉ được nhận khi nằm trong quyền, giống màn Thống kê.
  const scope = fixedScope ?? (asked && allowedScopes.includes(asked) ? asked : defaultScope);
  const tab = TABS.some((t) => t.key === params.get('muc')) ? params.get('muc')! : TABS[0].key;
  const dim = (['ward', 'band', 'industry'] as Dimension[]).find((x) => x === params.get('chieu')) ?? 'ward';
  const set = (patch: Record<string, string>) => navigate('/quan-ly-hkd', { unit: scope === defaultScope ? undefined : scope, muc: tab === TABS[0].key ? undefined : tab, chieu: dim === 'ward' ? undefined : dim, ...patch }, true);

  const body = (key: string) =>
    key === 'danh-sach' ? <ObligationsList /> : key === 'hoi-dap-ai' ? <AiQaTab scope={scope} /> : key === 'chi-tieu' ? <DailyTab scope={scope} />
      : key === 'co-cau' ? <StructureTab scope={scope} dim={dim} setDim={(v) => set({ chieu: v === 'ward' ? '' : v })} />
        : key === 'no-thue' ? <DebtTab scope={scope} scopeName={scopeLabel(scope)} />
          : key === 'nhac-viec' ? <RemindersTab scope={scope} />
            : <SupportTab scope={scope} />;

  const scopeControl = fixedScope ? (
    <span className="scope-text"><span className="scope-text__label">Phạm vi:</span>{scopeLabel(fixedScope)}</span>
  ) : (
    <GroupedSelect aria-label="Phạm vi" prefix="Phạm vi:" value={scope} groups={scopes} onValueChange={(u) => set({ unit: u === defaultScope ? '' : u })} style={{ minWidth: 200 }} />
  );

  return (
    <div className="hkd-page">
      <h1 className="sr-only">Quản lý hộ kinh doanh</h1>
      {mobile ? <>
        <div className="hkd-filter">{scopeControl}</div>
        <ChoiceSelect aria-label="Nội dung quản lý HKD" value={tab} options={TABS.map((t) => ({ value: t.key, label: t.label }))} onValueChange={(muc) => set({ muc })} style={{ width: '100%', marginBottom: 16 }} />
        {body(tab)}
      </> : <ViewTabs
        value={tab}
        onValueChange={(k) => set({ muc: k === TABS[0].key ? '' : k })}
        // Cả 7 tab đều lọc theo phạm vi nên phạm vi đứng cùng hàng tab, sát phải.
        extra={scopeControl}
        items={TABS.map((t) => ({ key: t.key, label: t.label, children: tab === t.key ? body(t.key) : null }))}
      />}
    </div>
  );
}
