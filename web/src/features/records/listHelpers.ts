import { num } from '@/shared/lib/format';
import { UNITS } from '@/shared/data/mock';
import type { Priority, Taxpayer } from '@/shared/data/types';
import type { StatsParams } from '@/features/stats/useStatsParams';

export type SetFn = (patch: Partial<Record<keyof StatsParams, string | number | boolean | null>>) => void;

export const unitName = (id: string) => UNITS.find((u) => u.id === id)?.name ?? id;

export function topPriority(t: Taxpayer): Priority | null {
  const r: Priority[] = ['OVERDUE', 'DUE_SOON', 'IN_TERM'];
  return r.find((p) => p === t.filePriority || p === t.payPriority) ?? null;
}

export function pagination(p: StatsParams, total: number, set: SetFn) {
  return {
    current: p.page,
    pageSize: p.size,
    total,
    showSizeChanger: true,
    pageSizeOptions: [10, 20, 50],
    showTotal: (t: number, [a, b]: [number, number]) => `${num(a)}–${num(b)} trong ${num(t)}`,
    onChange: (page: number, size: number) => set({ page: size !== p.size ? 1 : page, size }),

  };
}
