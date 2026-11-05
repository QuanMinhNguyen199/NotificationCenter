import { Button } from '@/components/ui/button';
import ReactECharts from '../lib/Chart';
import { useMemo } from 'react';
import type { Summary } from '../api/mockApi';
import { Panel, Skel } from '../components/Blocks';
import { dm, dmy, num } from '../lib/format';
import { useBreakpoint, useReducedMotion } from '../lib/useMedia';
import { chartMotion } from '../lib/motion';
import { C } from '../theme';
import { useChartColorVersion } from '../dev/chartPalette';

const axisLabel = { color: C.faint, fontSize: 12, fontFamily: 'Inter Variable, Inter, sans-serif' };

/** Cột tổng phát sinh theo ngày + đường Đã gửi Noti của cùng tập ngày đó. */
export function TrendChart({ s, day, onPickDay, onShowList, emptyText }: { s?: Summary; day: string | null; onPickDay: (d: string | null) => void; onShowList: (d: string) => void; emptyText?: string }) {
  const bp = useBreakpoint();
  const reduced = useReducedMotion();
  const mobile = bp === 'mobile';
  const colors = useChartColorVersion();

  const option = useMemo(() => {
    if (!s) return null;
    const max = Math.max(...s.byDay.map((d) => d.total), 1);
    const step = max > 1500 ? 500 : max > 600 ? 250 : max > 200 ? 100 : 50;
    return {
      // Lần đầu vẽ ngắn; đổi bộ lọc thì chuyển từ số cũ sang số mới, trục và nhãn giữ chỗ. Giảm chuyển động: tắt hẳn.
      ...chartMotion(reduced),
      textStyle: { fontFamily: 'Inter Variable, Inter, sans-serif' },
      grid: { left: 48, right: 12, top: 16, bottom: 28 },
      tooltip: {
        trigger: 'axis',
        triggerOn: mobile ? 'click' : 'mousemove|click',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(225,29,72,0.05)' } },
        backgroundColor: '#fff',
        borderColor: C.border,
        textStyle: { color: C.text, fontSize: 12, fontFamily: 'Inter Variable, Inter, sans-serif' },
        formatter: (items: { dataIndex: number }[]) => {
          const d = s.byDay[items[0].dataIndex];
          return `<b>${dmy(d.date)}</b><br/>Tổng phát sinh: <b>${num(d.total)}</b><br/>Đã gửi Noti của tập này: <b>${num(d.sent)}</b>`;
        },
      },
      xAxis: {
        type: 'category',
        data: s.byDay.map((d) => dm(d.date)),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: C.control } },
        axisLabel,
      },
      yAxis: {
        type: 'value',
        interval: step,
        max: Math.ceil((max + 1) / step) * step,
        axisLabel: { ...axisLabel, formatter: (v: number) => num(v) },
        splitLine: { lineStyle: { color: C.grid } },
      },
      series: [
        {
          name: 'Tổng phát sinh',
          type: 'bar',
          barMaxWidth: 44,
          data: s.byDay.map((d) => ({
            value: d.total,
            itemStyle: { color: !day || day === d.date ? C.bar : C.barDim, borderRadius: [3, 3, 0, 0] },
          })),
          emphasis: { itemStyle: { color: C.barHover } },
        },
        {
          name: 'Đã gửi Noti',
          type: 'line',
          data: s.byDay.map((d) => d.sent),
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: false,
          lineStyle: { color: C.sent, width: 2.5 },
          itemStyle: { color: C.sent },
        },
      ],
    };
  }, [s, day, mobile, colors, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const picked = s?.byDay.find((d) => d.date === day);

  return (
    <Panel
      title="Thông báo phát sinh theo ngày"
      id="h-trend"
      extra={
        <div className="chart-legend" aria-hidden="true">
          <span><i className="swatch" style={{ background: C.bar }} /> Tổng phát sinh</span>
          <span><i className="swatch swatch--line" style={{ background: C.sent }} /> Đã gửi Noti của cùng tập</span>
        </div>
      }
    >
      {!option ? (
        <Skel w="100%" h={mobile ? 200 : 260} />
      ) : s!.total === 0 ? (
        <div style={{ height: mobile ? 200 : 220, display: 'grid', placeItems: 'center', color: C.muted }}>{emptyText ?? 'Không có thông báo phát sinh trong kỳ đã chọn.'}</div>
      ) : (
        <ReactECharts
          option={option}
          aria-hidden="true"
          style={{ height: mobile ? 200 : 220 }}
          onEvents={{
            click: (e: { dataIndex: number }) => {
              const d = s!.byDay[e.dataIndex].date;
              onPickDay(day === d ? null : d);
            },
          }}
          opts={{ renderer: 'svg' }}
        />
      )}
      {s && (
        <div className="sr-only">
        <table>
          <caption>Thông báo phát sinh và đã gửi theo ngày</caption>
          <thead><tr><th>Ngày</th><th>Tổng phát sinh</th><th>Đã gửi Noti</th></tr></thead>
          <tbody>{s.byDay.map((d) => <tr key={d.date}><td>{dmy(d.date)}</td><td>{num(d.total)}</td><td>{num(d.sent)}</td></tr>)}</tbody>
        </table>
        </div>
      )}
      {picked ? (
        <div className="day-pick" role="status">
          <span>
            Đang lọc ngày <b>{dmy(picked.date)}</b>: {num(picked.total)} phát sinh, {num(picked.sent)} đã gửi Noti.
          </span>
          <span style={{ display: 'flex', gap: 8 }}>
            {mobile && (
              <Button size="sm" onClick={() => onShowList(picked.date)}>
                Xem danh sách
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onPickDay(null)}>
              Bỏ chọn ngày
            </Button>
          </span>
        </div>
      ) : null}
    </Panel>
  );
}
