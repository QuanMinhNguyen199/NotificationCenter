import { hkdStatusLabel } from '@/shared/data/hkdStatus';
import { ViewTabs } from '@/shared/components/Controls';
import { useQuery } from '@tanstack/react-query';
import { appRegistered, fetchTaxpayerNotifications } from '@/shared/api/mockApi';
import { FILING_LABEL, fetchProfile } from '@/shared/api/profileApi';
import { Pill, StatusPill } from '@/shared/components/Status';
import { BlockError, Skel } from '@/shared/components/Blocks';
import { DELIVERY, PRIORITY, SEND } from '@/shared/lib/status';
import { taxpayers, OBLIGATION_CUTOFF } from '@/shared/data/mock';
import { usePermissions } from '@/shared/demo/useDemo';
import { dmy, dmyhm } from '@/shared/lib/format';
import { FEATURES } from '@/shared/lib/features';
import { Officer, OutOfScope } from './DetailParts';
import { unitName } from './listHelpers';

/* ---------- Chi tiết NNT ---------- */

export function TaxpayerDetail({ id }: { id: number }) {
  const { canSeeTaxpayer } = usePermissions();
  const t = taxpayers[id];
  const allowed = !!t && canSeeTaxpayer(id);
  const q = useQuery({ queryKey: ['tp-notifs', id], queryFn: () => fetchTaxpayerNotifications(id), enabled: allowed });
  const prof = useQuery({ queryKey: ['tp-profile', id], queryFn: () => fetchProfile(id), enabled: allowed });
  if (!allowed) return <OutOfScope />;
  return (
    <>
      <section className="ov-section">
        <dl className="kv">
          <dt>MST</dt>
          <dd>{t.mst}</dd>
          <dt>Trạng thái HKD</dt>
          <dd>{hkdStatusLabel(t.hkdStatus)}</dd>
          <dt>Đơn vị quản lý</dt>
          <dd>{unitName('A')}</dd>
          <dt>Cán bộ phụ trách</dt>
          <dd><Officer taxpayerId={id} /></dd>
          <dt>Ứng dụng iHanoi</dt>
          <dd>{appRegistered(id) ? 'Đã đăng ký' : 'Chưa đăng ký'}</dd>
          <dt>Nguồn</dt>
          <dd>Quản lý NNT, nghĩa vụ hiện hành — chốt {dmyhm(OBLIGATION_CUTOFF)}</dd>
        </dl>
      </section>
      <ViewTabs
        items={[
          {
            key: 'ob',
            label: 'Nghĩa vụ',
            children: (
              <dl className="kv">
                <dt>Hồ sơ khai còn thiếu</dt>
                <dd>{t.fileCount ? <>{t.fileCount} hồ sơ · <Pill map={PRIORITY} value={t.filePriority!} /></> : 'Không có'}</dd>
                <dt>Khoản còn phải nộp</dt>
                <dd>{t.payCount ? <>{t.payCount} khoản · <Pill map={PRIORITY} value={t.payPriority!} /></> : 'Không có'}</dd>
              </dl>
            ),
          },
          {
            key: 'hs',
            label: 'Hồ sơ',
            children: prof.isError ? (
              <BlockError message="Không tải được hồ sơ của hộ." onRetry={() => prof.refetch()} />
            ) : !prof.data ? (
              <Skel w="100%" h={80} />
            ) : (
              <>
                <p className="proto-inline chart-note">Hồ sơ đã nộp và đang làm dở</p>
                {prof.data.filings.length ? (
                  <ul className="filing-list">
                    {prof.data.filings.map((f) => (
                      <li key={f.id}>
                        <span>
                          <b>{f.form}</b>
                          <small>{f.period} · {f.submittedAt ? `nộp ${dmy(f.submittedAt)}` : 'chưa nộp'}{f.note ? ` · ${f.note}` : ''}</small>
                        </span>
                        <StatusPill tone={FILING_LABEL[f.status].tone}>{FILING_LABEL[f.status].label}</StatusPill>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="chart-note">Hộ chưa có hồ sơ trong dữ liệu đang xem.</p>
                )}
              </>
            ),
          },
          ...(!FEATURES.aiQa ? [] : [{
            key: 'ht',
            label: 'Hội thoại',
            children: prof.isError ? (
              <BlockError message="Không tải được lịch sử hội thoại." onRetry={() => prof.refetch()} />
            ) : !prof.data ? (
              <Skel w="100%" h={80} />
            ) : (
              <>
                <p className="proto-inline chart-note">Hội thoại của hộ với Geo AI trên iHanoi</p>
                {prof.data.conversation.length ? (
                  <ol className="chat-log">
                    {prof.data.conversation.map((m, i) => (
                      <li key={i} className={`chat-log__msg chat-log__msg--${m.from}`}>
                        <small>{m.from === 'hkd' ? 'Hộ kinh doanh' : m.from === 'ai' ? 'Geo AI' : 'Cán bộ'} · {dmyhm(m.at)}</small>
                        <p>{m.text}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="chart-note">Hộ chưa hỏi Geo AI trong 30 ngày.</p>
                )}
              </>
            ),
          }]),
          {
            key: 'nt',
            label: 'Thông báo đã nhận',
            children: q.isLoading ? (
              <Skel w="100%" h={80} />
            ) : q.data?.length ? (
              <ol className="timeline">
                {q.data.map((n) => (
                  <li key={n.id}>
                    <time>{dmy(n.createdAt)}</time>
                    <span>
                      {n.title}
                      <small>
                        {SEND[n.send].label} · {DELIVERY[n.delivery].label}
                      </small>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="chart-note">NNT không có thông báo trong dữ liệu đang xem.</p>
            ),
          },
        ]}
      />
    </>
  );
}
