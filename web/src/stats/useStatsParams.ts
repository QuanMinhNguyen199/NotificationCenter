import { useCallback, useMemo, useRef } from 'react';
import { useRoute } from '../lib/router';
import { PERIOD } from '../data/mock';
import { usePermissions } from '../demo/DemoContext';
import type { GroupCode, Priority, RunStatus } from '../data/types';
import type { DeliveryFilter, SendFilter, StatsFilter } from '../api/mockApi';

export type Tab = 'notifications' | 'taxpayers' | 'runs';
export const TODAY = PERIOD.to;

export interface StatsParams extends StatsFilter {
  tab: Tab;
  page: number;
  size: number;
  day: string | null;
  ns: SendFilter;
  nd: DeliveryFilter;
  nq: string;
  tq: string;
  notified: boolean;
  kind: 'file' | 'pay' | null;
  prio: Priority | null;
  rs: 'all' | RunStatus;
  rq: string;
  detail: string | null;
}

// Bộ lọc, tab, trang nằm trên URL; không đưa thông tin người nhận nhạy cảm hay nội dung form chưa lưu vào URL.
export function useStatsParams() {
  const { params, navigate } = useRoute();
  const { fixedScope, defaultScope: defaultUnit, allowedScopes } = usePermissions();
  const pushedDetail = useRef(false);
  // Phạm vi trên URL chỉ được nhận khi nằm trong quyền; sửa link không mở rộng được phạm vi xem.
  const asked = params.get('unit');
  const unit = fixedScope ?? (asked && allowedScopes.includes(asked) ? asked : defaultUnit);

  const p: StatsParams = useMemo(
    () => ({
      unit,
      from: params.get('from') ?? PERIOD.from,
      to: params.get('to') ?? PERIOD.to,
      group: (params.get('group') as GroupCode) ?? 'all',
      tab: (params.get('tab') as Tab) ?? 'notifications',
      page: Number(params.get('page') ?? 1),
      size: Number(params.get('size') ?? 20),
      day: params.get('day'),
      // Link cũ dùng ns=DELIVERED trước khi tách lọc gửi/giao: chuyển sang bộ lọc giao.
      ns: params.get('ns') === 'DELIVERED' ? 'all' : ((params.get('ns') as SendFilter) ?? 'all'),
      nd: params.get('ns') === 'DELIVERED' ? 'DELIVERED' : ((params.get('nd') as DeliveryFilter) ?? 'all'),
      nq: params.get('nq') ?? '',
      tq: params.get('tq') ?? '',
      notified: params.get('notified') === '1',
      kind: (params.get('kind') as 'file' | 'pay') ?? null,
      prio: (params.get('prio') as Priority) ?? null,
      rs: (params.get('rs') as RunStatus) ?? 'all',
      rq: params.get('rq') ?? '',
      detail: params.get('detail'),
    }),
    [params, unit],
  );

  const set = useCallback(
    (patch: Partial<Record<keyof StatsParams, string | number | boolean | null>>, opts: { push?: boolean } = {}) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => {
        const defaults: Record<string, string> = { unit: defaultUnit, from: PERIOD.from, to: PERIOD.to, group: 'all', tab: 'notifications', page: '1', size: '20', ns: 'all', nd: 'all', rs: 'all' };
        const s = v === true ? '1' : v === false || v == null ? '' : String(v);
        if (!s || defaults[k] === s) next.delete(k);
        else next.set(k, s);
      });
      navigate('/thong-ke', next, !opts.push);
    },
    [params, navigate, defaultUnit],
  );

  const openDetail = useCallback(
    (key: string) => {
      pushedDetail.current = true;
      set({ detail: key }, { push: true });
    },
    [set],
  );

  const closeDetail = useCallback(() => {
    if (pushedDetail.current) {
      pushedDetail.current = false;
      history.back();
    } else set({ detail: null });
  }, [set]);

  return { p, set, openDetail, closeDetail };
}

export function filterOf(p: StatsParams): StatsFilter {
  return { unit: p.unit, from: p.from, to: p.to, group: p.group };
}
