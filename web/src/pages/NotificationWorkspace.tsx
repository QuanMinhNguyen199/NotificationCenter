import { ViewTabs } from '@/components/Controls';
import { usePermissions } from '../demo/DemoContext';
import { useRoute } from '../lib/router';
import { useGuard } from '../shell/guard';
import { FilterBar } from '../stats/FilterBar';
import { RunsPane } from '../stats/DetailTabs';
import { DetailOverlay } from '../stats/Details';
import { filterOf, useStatsParams } from '../stats/useStatsParams';
import SendPage from './SendPage';
import TemplatesPage from './TemplatesPage';
import { NotificationCalendar } from '../notify/NotificationCalendar';
import { NotificationTypes } from '../notify/NotificationTypes';
import { SendEffectiveness } from '../notify/SendEffectiveness';

function AutomaticSends() {
  const { p, set, openDetail, closeDetail } = useStatsParams();
  const reset = () => set({ unit: null, from: null, to: null, group: null, rs: null, rq: null, page: 1 });
  return <>
    <FilterBar p={p} apply={(d) => set({ ...d, page: 1 })} />
    <RunsPane p={p} set={set} open={openDetail} reset={reset} />
    <DetailOverlay detail={p.detail} filter={filterOf(p)} onClose={closeDetail} />
  </>;
}

export default function NotificationWorkspace() {
  const { params, navigate } = useRoute();
  const { canViewTemplates, canSend } = usePermissions();
  const { confirmLeave } = useGuard();
  // Form gửi giữ toàn bộ không gian; có chặn rời khi đang soạn.
  if (params.get('tao') === '1' && canSend) return <SendPage />;
  const asked = params.get('muc');
  const current = asked === 'tu-dong' || asked === 'lich' || asked === 'loai' || asked === 'hieu-qua' ? asked : asked === 'thu-vien' && canViewTemplates ? asked : 'chu-dong';
  return <>
    <h1 className="sr-only">Thông báo</h1>
    <ViewTabs value={current} onValueChange={(muc) => confirmLeave(() => navigate('/gui-thong-bao', { muc }))} items={[
      { key: 'chu-dong', label: canSend ? 'Gửi chủ động' : 'Lịch sử gửi', children: current === 'chu-dong' ? <SendPage /> : null },
      { key: 'tu-dong', label: 'Đợt tự động', children: current === 'tu-dong' ? <AutomaticSends /> : null },
      { key: 'lich', label: 'Lịch thông báo', children: current === 'lich' ? <NotificationCalendar /> : null },
      { key: 'loai', label: 'Loại thông báo', children: current === 'loai' ? <NotificationTypes /> : null },
      { key: 'hieu-qua', label: 'Hiệu quả gửi', children: current === 'hieu-qua' ? <SendEffectiveness /> : null },
      ...(canViewTemplates ? [{ key: 'thu-vien', label: 'Thư viện mẫu', children: current === 'thu-vien' ? <TemplatesPage /> : null }] : []),
    ]} />
  </>;
}
