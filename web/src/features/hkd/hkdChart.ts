import { num } from '@/shared/lib/format';
import { chartMotion } from '@/shared/lib/motion';
import { useReducedMotion } from '@/shared/lib/useMedia';
import { C } from '@/shared/theme';

const FONT = 'Inter Variable, Inter, sans-serif';
export const axisLabel = { color: C.faint, fontSize: 12, fontFamily: FONT };

/** Tiền theo tỷ hoặc triệu đồng cho dễ đọc. */
export const money = (v: number) => (v >= 1e9 ? `${(v / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ` : `${num(Math.round(v / 1e6))} triệu`);
export const hours = (h: number | null) => (h == null ? '—' : h >= 24 ? `${(h / 24).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} ngày` : `${Math.round(h)} giờ`);

export function useChartBase() {
  const reduced = useReducedMotion();
  return { ...chartMotion(reduced), textStyle: { fontFamily: FONT }, tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } } };
}
