// ECharts chỉ nạp phần cần dùng: cột, đường, lưới, tooltip, renderer SVG.
import ReactEChartsCore from 'echarts-for-react/esm/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import type { ComponentProps } from 'react';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, SVGRenderer]);

type Props = Omit<ComponentProps<typeof ReactEChartsCore>, 'echarts'>;

export default function Chart(props: Props) {
  return <ReactEChartsCore echarts={echarts} {...props} />;
}
