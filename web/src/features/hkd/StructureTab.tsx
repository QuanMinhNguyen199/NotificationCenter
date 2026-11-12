import { OptionGroup } from '@/shared/components/Controls';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { COMPLIANCE_LABEL, COMPLIANCE_ORDER, fetchStructure, type Compliance, type Dimension } from './hkdApi';
import { BlockError, Panel, Skel } from '@/shared/components/Blocks';
import ReactECharts from '@/shared/components/Chart';
import { num, pct } from '@/shared/lib/format';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { C } from '@/shared/theme';
import { TopRows } from '@/shared/components/TopRows';
import { axisLabel, useChartBase } from './hkdChart';
import { Kpi, KpiStrip } from '@/shared/components/Kpi';
import { ProtoBadge } from '@/shared/components/Proto';

const COMPLIANCE_COLOR: Record<Compliance, string> = { COMPLIANT: '#15803D', MISSING_FILE: C.dueSoon, IN_DEBT: C.overdue, BOTH: '#7F1D1D' };
const COMPLIANCE_INK: Record<Compliance, string> = { COMPLIANT: '#fff', MISSING_FILE: C.dueSoonInk, IN_DEBT: '#fff', BOTH: '#fff' };

/* ---------- Tab 2: Cơ cấu và tuân thủ ---------- */

const DIM_LABEL: Record<Dimension, string> = { ward: 'Địa bàn', band: 'Doanh thu năm', industry: 'Loại hình kinh doanh' };
// Nhãn ngắn cho nút chuyển để ba lựa chọn vừa một hàng ở 375px.
const DIM_SHORT: Record<Dimension, string> = { ward: 'Địa bàn', band: 'Doanh thu', industry: 'Loại hình' };

export function StructureTab({ scope, dim, setDim }: { scope: string; dim: Dimension; setDim: (d: Dimension) => void }) {
  const base = useChartBase();
  const mobile = useBreakpoint() === 'mobile';
  const q = useQuery({ queryKey: ['hkd-structure', scope, dim], queryFn: () => fetchStructure(scope, dim), placeholderData: keepPreviousData });
  if (q.isError) return <BlockError message="Không tải được cơ cấu HKD." onRetry={() => q.refetch()} />;
  const d = q.data;
  return (
    <div className={`hkd-tab${q.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={q.isPlaceholderData}>
      <KpiStrip lead label="Chỉ số tuân thủ">
        <Kpi primary label={COMPLIANCE_LABEL.COMPLIANT} value={d ? num(d.counts.COMPLIANT) : <Skel w={80} h={28} />} note={d && `${pct(d.counts.COMPLIANT, d.total)} trên ${num(d.total)} HKD`} />
        <Kpi label="Tổng HKD" value={d ? num(d.total) : <Skel w={80} h={28} />} />
        {COMPLIANCE_ORDER.filter((c) => c !== 'COMPLIANT').map((c) => (
          <Kpi key={c} label={COMPLIANCE_LABEL[c]} value={d ? num(d.counts[c]) : <Skel w={80} h={28} />} note={d && pct(d.counts[c], d.total)} tone={c === 'BOTH' ? 'danger' : undefined} />
        ))}
      </KpiStrip>
      <Panel
        title={<span className="title-with-tip">Tình trạng tuân thủ theo {DIM_LABEL[dim].toLowerCase()}<ProtoBadge note="Cách chia 4 nhóm tuân thủ, các khoảng doanh thu và danh mục loại hình kinh doanh do nhóm thiết kế đề xuất. Không dùng làm kết luận tuân thủ thực tế." /></span>}
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
            <TopRows total={d.rows.length} noun="dòng"><table className="mini-table mini-table--spaced">
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
