import { Button } from '@/shared/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { channelName, fetchSends, type SendView } from './notifyApi';
import { BlockEmpty, BlockError, Skel } from '@/shared/components/Blocks';
import { StatusPill } from '@/shared/components/Status';
import { usePermissions } from '@/shared/demo/useDemo';
import { dmyhm, num } from '@/shared/lib/format';
import { useRoute } from '@/shared/lib/router';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { SEND_STATUS } from './sendShared';
import { SendDetail } from './SendDetail';
import { Composer } from './SendComposer';

/* ---------- Danh sách lần gửi ---------- */

export default function SendPage() {
  const { params, navigate } = useRoute();
  const { role, user, canSend } = usePermissions();
  const bp = useBreakpoint();
  const composing = params.get('tao') === '1' && canSend;
  const detail = params.get('lan');
  const q = useQuery({
    queryKey: ['sends', role, user.id, user.team],
    queryFn: () => fetchSends(role, user.id, user.team),
    refetchInterval: (s) => (s.state.data?.some((x) => x.status === 'SENDING') ? 2000 : false),
    enabled: !composing,
  });

  if (composing) return <Composer onBack={() => navigate('/gui-thong-bao')} onDone={(id) => navigate('/gui-thong-bao', { lan: id })} />;

  const openDetail = (id: string) => navigate('/gui-thong-bao', { lan: id });
  const progress = (s: SendView) => {
    const done = s.perChannel.reduce((a, c) => a + c.done, 0);
    const total = s.perChannel.reduce((a, c) => a + c.total, 0);
    return total ? done / total : 1;
  };

  return (
    <div className="acct-page">
      <h2 className="sr-only">Gửi chủ động</h2>
      <div className="page-toolbar">
        {canSend && <Button onClick={() => navigate('/gui-thong-bao', { tao: '1' })}><Plus aria-hidden="true" /> Tạo lần gửi</Button>}
      </div>
      {q.isError ? (
        <BlockError message="Không tải được các lần gửi." onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <Skel w="100%" h={220} />
      ) : q.data.length === 0 ? (
        <BlockEmpty action={canSend ? <Button variant="outline" onClick={() => navigate('/gui-thong-bao', { tao: '1' })}>Tạo lần gửi</Button> : undefined}>Chưa có lần gửi chủ động nào.</BlockEmpty>
      ) : (
        <ul className="tpl-list">
          {q.data.map((s) => (
            <li key={s.id}>
              <button type="button" className="tpl-row send-row" onClick={() => openDetail(s.id)}>
                <span className="tpl-row__main">
                  <span className="tpl-row__name">{s.title}</span>
                  {bp === 'mobile' ? (
                    // Điện thoại: chỉ giữ thời điểm và quy mô; người tạo, nhóm nhận, kênh xem trong chi tiết.
                    <span className="tpl-row__purpose num">{dmyhm(s.createdAt)} · {num(s.total)} NNT</span>
                  ) : (
                    <span className="tpl-row__purpose">
                      <span className="id">{s.id}</span> · {s.createdBy}, {dmyhm(s.createdAt)} · {s.audienceLabel} · <span className="num">{num(s.total)}</span> NNT · {s.channels.map(channelName).join(', ')}
                    </span>
                  )}
                </span>
                <span className="tpl-row__meta">
                  {s.status === 'SENDING' && bp !== 'mobile' && <span className="mini-prog" aria-hidden="true"><span style={{ width: `${progress(s) * 100}%` }} /></span>}
                  <StatusPill tone={SEND_STATUS[s.status].tone}>{SEND_STATUS[s.status].label}</StatusPill>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {detail && <SendDetail id={detail} onClose={() => navigate('/gui-thong-bao')} />}
    </div>
  );
}
