// ECharts chỉ nạp phần cần dùng: cột, đường, lưới, tooltip, renderer SVG.
import ReactEChartsCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { C } from '../theme';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, SVGRenderer]);

type Props = Omit<ComponentProps<typeof ReactEChartsCore>, 'echarts'>;

/*
 * Khởi tạo biểu đồ trễ để giữ khung hình mượt lúc mở màn (đo 10/11/2026: màn Lãnh đạo khựng 306ms ở CPU chậm 4x,
 * phần lớn do ECharts vẽ nhiều biểu đồ trong cùng một tác vụ).
 * - Chỉ vẽ khi biểu đồ sắp vào khung nhìn (IntersectionObserver, nới 200px).
 * - Mỗi lần chỉ vẽ một biểu đồ, vào lúc trình duyệt rảnh: nhiều biểu đồ tách thành nhiều tác vụ ngắn thay vì một tác vụ dài.
 * - Ô giữ chỗ cùng chiều cao nên bố cục không nhảy.
 */
const queue: (() => void)[] = [];
let draining = false;
const idle = (cb: () => void) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(cb, { timeout: 180 }) : globalThis.setTimeout(cb, 16);

function drain() {
  if (draining) return;
  const next = queue.shift();
  if (!next) return;
  draining = true;
  idle(() => {
    next();
    // Chờ một khung vẽ xong rồi mới tới biểu đồ kế tiếp.
    requestAnimationFrame(() => {
      draining = false;
      drain();
    });
  });
}

function useDeferredMount<T extends Element>() {
  const ref = useRef<T>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || ready) return;
    let queued = false;
    let cancelled = false;
    const enqueue = () => {
      if (queued) return;
      queued = true;
      queue.push(() => !cancelled && setReady(true));
      drain();
    };
    if (!('IntersectionObserver' in window)) {
      enqueue();
      return () => void (cancelled = true);
    }
    const io = new IntersectionObserver((es) => es.some((e) => e.isIntersecting) && (io.disconnect(), enqueue()), { rootMargin: '200px 0px' });
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, [ready]);
  return { ref, ready };
}

/*
 * Màu hover thống nhất cho mọi biểu đồ (11/11/2026): mặc định của ECharts làm cột nhạt hoặc ngả xám khi rê chuột
 * và phủ dải xám lên cột đang chỉ. Ở đây:
 * - Dải chỉ theo trục dùng tint đỏ rất nhạt thay cho xám.
 * - Cột đang rê đậm hơn một bậc cùng sắc (cột tint nhạt dùng barHover đã chốt), không làm mờ các cột khác.
 * - Đường giữ nguyên độ dày khi rê.
 * Series nào đã khai báo emphasis riêng thì giữ nguyên.
 */
const POINTER_SHADOW = 'rgba(213, 0, 50, 0.06)';
function darken(hex: string, k = 0.14) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = (v: number) => Math.round(v * (1 - k)).toString(16).padStart(2, '0');
  return `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`;
}
const hoverOf = (c: unknown) => (typeof c !== 'string' ? undefined : c.toUpperCase() === C.bar.toUpperCase() ? C.barHover : darken(c));
type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
function withHover(option: Obj | undefined): Obj | undefined {
  if (!option) return option;
  const tip = option.tooltip as Obj | undefined;
  const ap = tip?.axisPointer as Obj | undefined;
  const tooltip = ap?.type === 'shadow' && !ap.shadowStyle ? { ...tip, axisPointer: { ...ap, shadowStyle: { color: POINTER_SHADOW } } } : tip;
  const list = Array.isArray(option.series) ? option.series : option.series ? [option.series] : [];
  const series = list.map((s: Obj) => {
    if (s.emphasis) return s;
    if (s.type === 'line') return { ...s, emphasis: { scale: false, lineStyle: { width: s.lineStyle?.width ?? 2 } } };
    if (s.type !== 'bar') return s;
    const data = Array.isArray(s.data)
      ? s.data.map((d: unknown) => {
          const dc = (d as Obj | null)?.itemStyle?.color;
          return dc ? { ...(d as Obj), emphasis: { itemStyle: { color: hoverOf(dc) } } } : d;
        })
      : s.data;
    const base = hoverOf(s.itemStyle?.color);
    return { ...s, data, emphasis: { focus: 'none', itemStyle: base ? { color: base } : {} } };
  });
  return { ...option, ...(tooltip ? { tooltip } : {}), series };
}

export default function Chart(props: Props) {
  const { ref, ready } = useDeferredMount<HTMLDivElement>();
  const option = useMemo(() => withHover(props.option), [props.option]);
  if (!ready) {
    return <div ref={ref} className={props.className} style={{ height: 300, ...props.style }} aria-hidden="true" />;
  }
  return <ReactEChartsCore echarts={echarts} lazyUpdate {...props} option={option} />;
}
