import { ViewTabs } from '@/shared/components/Controls';
import type { StatsParams, Tab } from '@/features/stats/useStatsParams';
import { NotificationsPane } from './NotificationsPane';
import type { SetFn } from './listHelpers';

/* ---------- Ba tab trong cùng màn ---------- */

export function DetailTabs({ p, set, open, reset }: { p: StatsParams; set: SetFn; open: (k: string) => void; reset: () => void }) {
  const items = [
    { key: 'notifications', label: 'Thông báo', children: <NotificationsPane p={p} set={set} open={open} reset={reset} /> },
  ];
  return (
    <section className="panel detail" id="detail" aria-label="Danh sách chi tiết">
      <ViewTabs value={p.tab} onValueChange={(tab) => set({ tab: tab as Tab, page: 1 })} items={items} />
    </section>
  );
}
