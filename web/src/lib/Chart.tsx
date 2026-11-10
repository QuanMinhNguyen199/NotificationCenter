// ECharts chỉ nạp phần cần dùng: cột, đường, lưới, tooltip, renderer SVG.
import ReactEChartsCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { useEffect, useRef, useState, type ComponentProps } from 'react';

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

export default function Chart(props: Props) {
  const { ref, ready } = useDeferredMount<HTMLDivElement>();
  if (!ready) {
    return <div ref={ref} className={props.className} style={{ height: 300, ...props.style }} aria-hidden="true" />;
  }
  return <ReactEChartsCore echarts={echarts} lazyUpdate {...props} />;
}
