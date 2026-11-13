import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchDaily } from './hkdApi';
import { BlockError, Panel, Skel } from '@/shared/components/Blocks';
import { usePermissions } from '@/shared/demo/useDemo';
import ReactECharts from '@/shared/components/Chart';
import { dm, num, pct } from '@/shared/lib/format';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { C } from '@/shared/theme';
import { axisLabel, useChartBase } from './hkdChart';
import { SrTable } from './HkdParts';
import { SortTable } from '@/shared/components/SortTable';
import { Kpi, KpiStrip } from '@/shared/components/Kpi';

/* ---------- Tab 1: Chỉ tiêu hằng ngày ---------- */

export function DailyTab({ scope }: { scope: string }) {
  const base = useChartBase();
  // So sánh theo đơn vị thuộc màn lãnh đạo; cán bộ chỉ xem số của mình.
  const { role } = usePermissions();
  const mobile = useBreakpoint() === 'mobile';
  const q = useQuery({ queryKey: ['hkd-daily', scope], queryFn: () => fetchDaily(scope), placeholderData: keepPreviousData });
  if (q.isError) return <BlockError message="Không tải được chỉ tiêu hằng ngày." onRetry={() => q.refetch()} />;
  const d = q.data;
  return (
    <div className={`hkd-tab${q.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={q.isPlaceholderData}>
      <KpiStrip label="Chỉ số trong ngày">
        <Kpi proposal info="So sánh với trung bình 7 ngày trước là cách đọc do nhóm thiết kế chọn." label="Tờ khai tiếp nhận hôm nay" value={d ? num(d.today.received) : <Skel w={80} h={28} />} note={d && `Trung bình 7 ngày trước: ${num(Math.round(d.avg7))}`} />
        <Kpi proposal info="Kỳ 30 ngày và công thức tỷ lệ xử lý thành công là diễn giải của nhóm thiết kế." label="Tỷ lệ xử lý thành công" value={d ? pct(d.okRate * 100, 100) : <Skel w={80} h={28} />} note="30 ngày" />
        <Kpi proposal info="Công thức: hồ sơ phải nộp đã nộp trên hồ sơ phải nộp, kỳ 30 ngày. Là diễn giải của nhóm thiết kế." label="Tỷ lệ nộp thuế theo hồ sơ" value={d ? pct(d.paidRate * 100, 100) : <Skel w={80} h={28} />} note="Hồ sơ đã nộp, 30 ngày gần nhất" />
        <Kpi label="Số HKD sử dụng app, chưa nộp tờ khai" value={d ? num(d.appMissing) : <Skel w={80} h={28} />} note={d && `Trên ${num(d.registered)} hộ sử dụng app`} tone="danger" />
      </KpiStrip>
      <div className="charts charts--even">
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
          {d && <SrTable caption="Tờ khai theo ngày" head={['Ngày', 'Tiếp nhận', 'Xử lý thành công']} rows={d.series.map((x) => [dm(x.date), num(x.received), num(x.accepted)])} />}
          <div className="chart-legend" aria-hidden="true">
            <span><i className="swatch" style={{ background: C.bar }} /> Tiếp nhận</span>
            <span><i className="swatch" style={{ background: C.sent }} /> Xử lý thành công</span>
          </div>
        </Panel>
        <Panel title="Số HKD sử dụng app, chưa nộp tờ khai" className="dashboard-card--static hkd-weekly">
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
          {d && <SrTable caption="Số HKD sử dụng app, chưa nộp tờ khai, theo tuần" head={['Tuần', 'Số hộ']} rows={d.weeks.map((w) => [w.label, num(w.value)])} />}
        </Panel>
      </div>
      {role !== 'officer' && <Panel title="Theo đơn vị" className="dashboard-card--static hkd-table">
        {!d ? <Skel w="100%" h={120} /> : (
          <SortTable
            label="Chỉ tiêu theo đơn vị"
            rows={d.byUnit}
            rowKey={(u) => u.name}
            rowHead={{ key: 'name', label: 'Đơn vị', sort: (u) => u.name, render: (u) => u.name }}
            cols={[
              { key: 'received', label: 'Tờ khai tiếp nhận', sort: (u) => u.received, render: (u) => num(u.received), desc: true },
              { key: 'ok', label: 'Xử lý thành công', sort: (u) => u.okRate, render: (u) => pct(u.okRate * 100, 100), desc: true },
              { key: 'paid', label: 'Nộp thuế theo hồ sơ', sort: (u) => u.paidRate, render: (u) => pct(u.paidRate * 100, 100), desc: true },
              { key: 'app', label: 'Sử dụng app, chưa nộp', sort: (u) => u.appMissing, render: (u) => num(u.appMissing), desc: true },
            ]}
            initial={{ key: 'name', dir: 'asc' }}
            className="sort-table--fluid"
          />
        )}
      </Panel>}
    </div>
  );
}
