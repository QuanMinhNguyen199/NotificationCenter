// Biểu đồ nạp ECharts theo nhu cầu: thư viện (~400 kB) tách thành chunk riêng, tải song song sau khi màn đã hiện,
// thay vì nằm chung chunk với màn. Trong lúc tải, ô giữ chỗ cùng chiều cao nên bố cục không nhảy.
import { lazy, Suspense, type ComponentProps } from 'react';

const ChartCore = lazy(() => import('./ChartCore'));

type Props = ComponentProps<typeof ChartCore>;

export default function Chart(props: Props) {
  const hold = <div className={props.className} style={{ height: 300, ...props.style }} aria-hidden="true" />;
  return (
    <Suspense fallback={hold}>
      <ChartCore {...props} />
    </Suspense>
  );
}
