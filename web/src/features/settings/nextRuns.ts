import type { ConfigValues } from '@/shared/data/config';
import { toMinutes } from '@/shared/lib/format';
import { DEMO_NOW } from '@/shared/lib/demoClock';

/** Ba lần chạy tiếp theo tính từ thời điểm demo 28/10/2026 09:15, giờ Việt Nam. */
export function nextRuns(v: ConfigValues, now = DEMO_NOW) {
  if (!v.autoScan) return [];
  const nowMin = toMinutes(now.slice(11, 16));
  const start = new Date(`${now.slice(0, 10)}T00:00:00`);
  const first = toMinutes(v.scanTime) > nowMin ? 0 : 1;
  return [0, 1, 2].map((i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + first + i);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} lúc ${v.scanTime}`;
  });
}
