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

function AutomaticSends() {
  const { p, set, openDetail, closeDetail } = useStatsParams();
  const reset = () => set({ unit: null, from: null, to: null, group: null, rs: null, rq: null, page: 1 });
  return <>
    <p className="workspace-note">Đợt nhắc do hệ thống tự tạo theo quy tắc. Duyệt, tạm dừng hoặc hủy chỉ áp dụng cho đợt đang chọn.</p>
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
  const current = asked === 'tu-dong' ? asked : asked === 'thu-vien' && canViewTemplates ? asked : 'chu-dong';
  return <>
    <h1 className="sr-only">Thông báo</h1>
    <ViewTabs value={current} onValueChange={(muc) => confirmLeave(() => navigate('/gui-thong-bao', { muc }))} items={[
      { key: 'chu-dong', label: 'Gửi chủ động', children: current === 'chu-dong' ? <><p className="workspace-note">Chọn người nhận và nội dung để gửi; theo dõi kết quả ngay tại đây.</p><SendPage /></> : null },
      { key: 'tu-dong', label: 'Đợt tự động', children: current === 'tu-dong' ? <AutomaticSends /> : null },
      ...(canViewTemplates ? [{ key: 'thu-vien', label: 'Thư viện mẫu', children: current === 'thu-vien' ? <TemplatesPage /> : null }] : []),
    ]} />
  </>;
}
