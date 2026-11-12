import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { REPORT_MONTHS, fetchDebt } from './hkdApi';
import { BlockError, Panel, Skel } from '@/shared/components/Blocks';
import { usePermissions } from '@/shared/demo/useDemo';
import ReactECharts from '@/shared/components/Chart';
import { num, pct } from '@/shared/lib/format';
import { C } from '@/shared/theme';
import { downloadXlsx } from '@/shared/lib/xlsx';
import { ExcelButton } from '@/shared/components/ExcelButton';
import { TopRows } from '@/shared/components/TopRows';
import { axisLabel, money, useChartBase } from './hkdChart';
import { SrTable } from './HkdParts';
import { Kpi, KpiStrip } from '@/shared/components/Kpi';
import { ProtoBadge } from '@/shared/components/Proto';

/* ---------- Tab 3: Nợ thuế ---------- */

export function DebtTab({ scope, scopeName }: { scope: string; scopeName: string }) {
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
    downloadXlsx(`bao-cao-no-thue-${month.replace('/', '-')}`, [
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
      <KpiStrip lead label="Chỉ số nợ thuế">
        <Kpi primary label="Tổng nợ" value={d ? money(d.total) : <Skel w={80} h={28} />} />
        <Kpi label="Số HKD nợ thuế" value={d ? num(d.hkd) : <Skel w={80} h={28} />} />
        <Kpi label="Nợ quá hạn" value={d ? money(d.overdue) : <Skel w={80} h={28} />} note={d && pct(d.overdue, d.total)} tone="danger" />
        <Kpi proposal label="Nợ bình quân mỗi HKD" info="tổng nợ chia cho số HKD đang nợ thuế trong phạm vi được chọn." value={d ? money(d.avg) : <Skel w={80} h={28} />} />
      </KpiStrip>
      <div className="charts">
        <Panel title={<span className="title-with-tip">Nợ thuế theo tháng<ProtoBadge note="Cách trình bày xu hướng 12 tháng do nhóm thiết kế chọn." /></span>} sub="12 tháng" className="dashboard-card--static">
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
          {d && <SrTable caption="Nợ thuế theo tháng" head={['Tháng', 'Tổng nợ', 'Số HKD nợ']} rows={d.trend.map((t) => [t.month.slice(0, 2) + '/' + t.month.slice(5), money(t.amount), num(t.hkd)])} />}
          <div className="chart-legend" aria-hidden="true">
            <span><i className="swatch" style={{ background: C.bar }} /> Tổng nợ (tỷ đồng, trục trái)</span>
            <span><i className="swatch" style={{ background: C.sent }} /> Số HKD nợ (trục phải)</span>
          </div>
        </Panel>
        <Panel title={<span className="title-with-tip">Báo cáo định kỳ<ProtoBadge note="Mẫu báo cáo Excel do nhóm thiết kế đề xuất, chưa theo mẫu biểu nghiệp vụ." /></span>} className="dashboard-card--static">
          <ul className="report-list">
            {REPORT_MONTHS.map((m) => (
              <li key={m}>
                <span>Báo cáo nợ thuế tháng {m}</span>
                <ExcelButton label={`Tải báo cáo nợ thuế tháng ${m} dạng Excel`} disabled={!d} onExport={() => report(m)} />
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
