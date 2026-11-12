import type { StatsFilter } from '@/shared/api/mockApi';
import Overlay from '@/shared/components/Overlay';
import { taxpayers } from '@/shared/data/mock';
import { usePermissions } from '@/shared/demo/useDemo';
import { NotificationDetail } from './NotificationDetail';
import { TaxpayerDetail } from './TaxpayerDetail';
import { RunDetail } from './RunDetail';
import { ResponseDetail } from './ResponseDetail';

/* ---------- Điều phối overlay theo tham số URL ---------- */

export function DetailOverlay({ detail, filter, onClose }: { detail: string | null; filter: StatsFilter; onClose: () => void }) {
  const { canSeeTaxpayer } = usePermissions();
  const [kind, id] = detail ? [detail.slice(0, 1), detail.slice(2)] : [null, null];
  const title =
    kind === 'n' ? 'Chi tiết thông báo' : kind === 't' ? (taxpayers[Number(id)] && canSeeTaxpayer(Number(id)) ? taxpayers[Number(id)].name : 'NNT') : kind === 'r' ? `Đợt gửi ${id}` : kind === 'x' ? 'Thời gian phản hồi' : '';
  return (
    <Overlay open={!!detail} onClose={onClose} title={title} width={640}>
      {kind === 'n' && id && <NotificationDetail id={id} />}
      {kind === 't' && id && <TaxpayerDetail id={Number(id)} />}
      {kind === 'r' && id && <RunDetail id={id} />}
      {kind === 'x' && <ResponseDetail filter={filter} />}
    </Overlay>
  );
}
