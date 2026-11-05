import ReactECharts from '../lib/Chart';
import { useMemo } from 'react';
import type { ObligationBreakdown } from '../api/mockApi';
import { BlockError, Panel, Skel } from '../components/Blocks';
import { dmyhm, num } from '../lib/format';
import { useBreakpoint, useReducedMotion } from '../lib/useMedia';
import { chartMotion } from '../lib/motion';
import { C } from '../theme';
import { useChartColorVersion } from '../dev/chartPalette';
import type { Priority } from '../data/types';

const ORDER: { key: Priority; label: string; color: string; ink: string }[] = [
  // Getter: đọc màu lúc vẽ để bảng chỉnh màu (tạm thời) áp dụng ngay.
  { key: 'OVERDUE', label: 'Quá hạn', get color() { return C.overdue; }, ink: '#FFFFFF' },
  { key: 'DUE_SOON', label: 'Sắp hạn (0–7 ngày)', get color() { return C.dueSoon; }, get ink() { return C.dueSoonInk; } },
  { key: 'IN_TERM', label: 'Còn trong hạn', get color() { return C.inTerm; }, get ink() { return C.inTermInk; } },
];
const KINDS = [
  { key: 'file' as const, label: 'Khai thuế' },
  { key: 'pay' as const, label: 'Nộp thuế' },
];

/** NNT theo loại nghĩa vụ — mỗi NNT đếm một lần trong từng loại, theo mức ưu tiên cao nhất. */
export function ObligationChart({
  data,
  error,
  loading,
  groupNote,
  onRetry,
  onPick,
}: {
  data?: ObligationBreakdown;
  error?: Error | null;
  loading: boolean;
  groupNote: boolean;
  onRetry: () => void;
  onPick: (kind: 'file' | 'pay', prio: Priority) => void;
}) {
  const bp = useBreakpoint();
  const reduced = useReducedMotion();
  const mobile = bp === 'mobile';
  const colors = useChartColorVersion();

  const totals = data && { file: Object.values(data.file).reduce((a, b) => a + b, 0), pay: Object.values(data.pay).reduce((a, b) => a + b, 0) };
  const option = useMemo(() => {
    if (!data) return null;
    // Trục Y đảo để Khai thuế nằm trên.
    return {
      // Lần đầu vẽ ngắn; đổi bộ lọc thì chuyển từ số cũ sang số mới, trục và nhãn giữ chỗ. Giảm chuyển động: tắt hẳn.
      ...chartMotion(reduced),
      textStyle: { fontFamily: 'Inter Variable, Inter, sans-serif' },
      grid: { left: mobile ? 84 : 100, right: 16, top: 8, bottom: 8 },
      tooltip: {
        trigger: 'item',
        triggerOn: mobile ? 'click' : 'mousemove|click',
        backgroundColor: '#fff',
        borderColor: C.border,
        textStyle: { color: C.text, fontSize: 12, fontFamily: 'Inter Variable, Inter, sans-serif' },
        // Nhãn trục dùng cú pháp rich text ({name|…}); tooltip lấy tên loại từ KINDS để không lộ cú pháp đó.
        formatter: (e: { seriesName: string; dataIndex: number; value: number }) => `${KINDS[e.dataIndex].label} — ${e.seriesName}<br/><b>${num(e.value)} NNT</b>`,
      },
      // Mỗi đoạn đã ghi số và mỗi hàng đã có tổng NNT, nên bỏ thang số và vạch dọc của trục ngang.
      xAxis: {
        type: 'value',
        // Không còn thang số nên hàng dài nhất chạy hết chiều rộng; tỷ lệ giữa các hàng giữ nguyên.
        max: 'dataMax',
        axisLabel: { show: false },
        axisTick: { show: false },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: KINDS.map((k) => `{name|${k.label}}
{total|${num(totals?.[k.key] ?? 0)} NNT}`),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: {
          align: 'left',
          margin: mobile ? 76 : 92,
          fontFamily: 'Inter Variable, Inter, sans-serif',
          rich: {
            name: { color: C.text, fontSize: 13, fontWeight: 600, lineHeight: 18, fontFamily: 'Inter Variable, Inter, sans-serif' },
            total: { color: C.muted, fontSize: 12, lineHeight: 16, fontFamily: 'Inter Variable, Inter, sans-serif' },
          },
        },
      },
      series: ORDER.map((o) => ({
        name: o.label,
        type: 'bar',
        stack: 'nnt',
        // Thanh theo tỷ lệ dải hàng để không để hở lớn khi vùng vẽ cao lên.
        barWidth: '58%',
        barMaxWidth: mobile ? 32 : 44,
        itemStyle: { color: o.color, borderColor: '#fff', borderWidth: 2 },
        label: {
          show: true,
          color: o.ink,
          fontSize: 12,
          fontWeight: 600,
          textBorderWidth: 0,
          textShadowBlur: 0,
          formatter: (e: { value: number }) => (e.value / Math.max(data.file.OVERDUE + data.file.DUE_SOON + data.file.IN_TERM, 1) > 0.12 ? num(e.value) : ''),
        },
        data: KINDS.map((k) => data[k.key][o.key]),
      })),
    };
  }, [data, mobile, totals, colors, reduced]); // eslint-disable-line react-hooks/exhaustive-deps


  return (
    <Panel title="NNT theo loại nghĩa vụ" id="h-ob" className="panel--fill" sub={groupNote ? 'Không lọc theo nhóm thông báo' : undefined}>
      {error ? (
        <BlockError message="Không tải được số NNT theo nghĩa vụ." lastGood="2026-10-28T02:05" onRetry={onRetry} />
      ) : loading || !option ? (
        <Skel w="100%" h={mobile ? 150 : 170} />
      ) : (
        <ReactECharts
          option={option}
          aria-hidden="true"
          // Desktop: giãn theo chiều cao thẻ bên cạnh; mobile xếp một cột nên giữ chiều cao cố định.
          className={mobile ? undefined : 'chart-fill'}
          style={mobile ? { height: 140 } : { height: 'auto' }}
          opts={{ renderer: 'svg' }}
          onEvents={{ click: (e: { dataIndex: number; seriesIndex: number }) => onPick(KINDS[e.dataIndex].key, ORDER[e.seriesIndex].key) }}
        />
      )}
      {data && !error && (
        <>
          <div className="sr-only">
          <table>
            <caption>Số NNT theo loại nghĩa vụ và mức ưu tiên hạn, chốt {dmyhm(data.cutoff)}</caption>
            <thead>
              <tr>
                <th>Loại</th>
                {ORDER.map((o) => <th key={o.key}>{o.label}</th>)}
                <th>Tổng NNT</th>
              </tr>
            </thead>
            <tbody>
              {KINDS.map((k) => (
                <tr key={k.key}>
                  <th>{k.label}</th>
                  {ORDER.map((o) => <td key={o.key}>{num(data[k.key][o.key])}</td>)}
                  <td>{num(totals![k.key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="chart-legend" style={{ marginTop: 4 }} aria-hidden="true">
            {ORDER.map((o) => (
              <span key={o.key}>
                <i className="swatch" style={{ background: o.color }} aria-hidden="true" /> {o.label}
              </span>
            ))}
          </div>
          <p className="chart-note">
            Chốt {dmyhm(data.cutoff)}. Tổng NNT còn nghĩa vụ <b>{num(data.unique)}</b>, {num(data.both)} NNT có cả khai và nộp.
          </p>
        </>
      )}
    </Panel>
  );
}
