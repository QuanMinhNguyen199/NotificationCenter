import { IconButton } from '@/shared/components/IconButton';
import { DialogFrame, Feedback, OptionGroup, TextareaField } from '@/shared/components/Controls';
import { Button } from '@/shared/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { cancelSend, channelName, fetchSend, fetchSendRecipients, reasonText, type DeliveryState, type RecipientFilter, type SendView } from './notifyApi';
import Overlay from '@/shared/components/Overlay';
import { BlockEmpty, BlockError, Skel } from '@/shared/components/Blocks';
import { StatusPill } from '@/shared/components/Status';
import { usePermissions } from '@/shared/demo/useDemo';
import { dmyhm, num } from '@/shared/lib/format';
import { AnimatePresence, m as M } from 'motion/react';
import { DUR, tween } from '@/shared/lib/motion';
import { STATE } from './deliveryLabels';
import { OUTCOME, SEND_STATUS } from './sendShared';

/** Thanh tiến độ một kênh: tiếp nhận / thất bại / chưa rõ / bỏ qua, phần còn lại đang chờ. */
function ChannelProgress({ c }: { c: SendView['perChannel'][number] }) {
  const n = (s: DeliveryState) => c.counts[s] ?? 0;
  const ok = n('ACCEPTED') + n('DELIVERED');
  const parts = [
    { k: 'ok', v: ok, label: c.channel === 'IN_APP' ? 'Đã vào hộp thư' : 'Đã tiếp nhận' },
    { k: 'fail', v: n('FAILED'), label: 'Thất bại' },
    { k: 'unknown', v: n('UNKNOWN'), label: 'Chưa rõ' },
    { k: 'skip', v: n('SKIPPED') + n('CANCELED'), label: 'Bỏ qua, đã hủy' },
  ];
  const waiting = c.total - c.done;
  return (
    <div className="send-prog">
      <div className="send-prog__head">
        <b>{channelName(c.channel)}</b>
        <span className="num">{num(c.done)}/{num(c.total)} xong</span>
      </div>
      <div className="send-prog__bar" role="img" aria-label={`${channelName(c.channel)}: ${parts.map((p) => `${p.label} ${p.v}`).join(', ')}, còn chờ ${waiting}`}>
        {parts.map((p) => p.v > 0 && <span key={p.k} className={`send-prog__seg send-prog__seg--${p.k}`} style={{ width: `${(p.v / c.total) * 100}%` }} />)}
      </div>
      <ul className="send-prog__legend">
        {parts.map((p) => (
          <li key={p.k}><i className={`send-prog__dot send-prog__seg--${p.k}`} aria-hidden="true" />{p.label} <b className="num">{num(p.v)}</b></li>
        ))}
        {waiting > 0 && <li>Còn chờ <b className="num">{num(waiting)}</b></li>}
        {n('RETRY_WAIT') > 0 && <li>Chờ thử lại <b className="num">{num(n('RETRY_WAIT'))}</b></li>}
      </ul>
    </div>
  );
}

/* ---------- Chi tiết một lần gửi ---------- */

export function SendDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { canSend, user } = usePermissions();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['send', id], queryFn: () => fetchSend(id), refetchInterval: (s) => (s.state.data?.status === 'SENDING' ? 1500 : false) });
  const [filter, setFilter] = useState<RecipientFilter>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<number | null>(null);
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState('');
  const sending = q.data?.status === 'SENDING';
  const rq = useQuery({
    queryKey: ['send-recipients', id, filter, page],
    queryFn: () => fetchSendRecipients(id, filter, page),
    refetchInterval: sending ? 1500 : false,
  });
  const m = useMutation({
    mutationFn: () => cancelSend(id, reason.trim(), user.name),
    onSuccess: () => (qc.invalidateQueries({ queryKey: ['send', id] }), qc.invalidateQueries({ queryKey: ['sends'] }), toast.success('Đã hủy phần chưa gửi.'), setCancel(false)),
  });
  const s = q.data;
  const pages = rq.data ? Math.max(1, Math.ceil(rq.data.total / 20)) : 1;

  return (
    <Overlay open onClose={onClose} title={`Lần gửi ${id}`} width={760}>
      {q.isError ? (
        <BlockError message="Không tải được lần gửi." onRetry={() => q.refetch()} />
      ) : !s ? (
        <Skel w="100%" h={240} />
      ) : (
        <>
          <section className="ov-section">
            <div className="send-head">
              <StatusPill tone={SEND_STATUS[s.status].tone}>{SEND_STATUS[s.status].label}</StatusPill>
              {sending && canSend && <Button variant="outline" size="sm" className="text-destructive" onClick={() => setCancel(true)}>Hủy phần chưa gửi</Button>}
            </div>
            <dl className="kv">
              <dt>Người gửi</dt><dd>{s.createdBy}, {dmyhm(s.createdAt)}</dd>
              <dt>Người nhận</dt><dd>{s.audienceLabel} · <span className="num">{num(s.total)}</span> NNT</dd>
              <dt>Nội dung</dt><dd>{s.contentLabel}</dd>
              {s.canceled && (<><dt>Đã hủy</dt><dd>{s.canceled.by}, {dmyhm(s.canceled.at)}: {s.canceled.reason}</dd></>)}
            </dl>
          </section>
          <section className="ov-section">
            <h3 className="ov-section__title">Tiến độ theo kênh</h3>
            <div className="send-progs">{s.perChannel.map((c) => <ChannelProgress key={c.channel} c={c} />)}</div>
            {s.channels.includes('IHANOI') && <p className="chart-note">iHanoi chưa xác nhận tin đã tới máy người nhận; tin "chưa rõ" không tự gửi lại.</p>}
          </section>
          <section className="ov-section">
            <div className="send-head">
              <h3 className="ov-section__title ov-section__title--flush">Người nhận</h3>
              <OptionGroup aria-label="Lọc người nhận" value={filter} onValueChange={(v) => (setFilter(v), setPage(1))} options={[{ value: 'all', label: 'Tất cả' }, { value: 'problem', label: 'Có vấn đề' }]} />
            </div>
            {!rq.data ? (
              <Skel w="100%" h={160} />
            ) : rq.data.total === 0 ? (
              <BlockEmpty>Không có người nhận nào gặp vấn đề.</BlockEmpty>
            ) : (
              <>
                <ul className="rcpt-list">
                  {rq.data.rows.map((r) => (
                    <li key={r.taxpayerId} className={`rcpt${open === r.taxpayerId ? ' rcpt--open' : ''}`}>
                      <button type="button" className="rcpt__row" aria-expanded={open === r.taxpayerId} onClick={() => setOpen(open === r.taxpayerId ? null : r.taxpayerId)}>
                        <span className="cell-tp"><span className="cell-tp__name">{r.name}</span><span className="cell-tp__mst">{r.mst}</span></span>
                        <span className="rcpt__states">
                          {r.deliveries.map((d) => (
                            <span key={d.channel} className="rcpt__state">
                              <small>{d.channel === 'IN_APP' ? 'Hộp thư' : channelName(d.channel).replace('Thông báo đẩy ', '')}</small>
                              <StatusPill tone={STATE[d.state].tone}>{STATE[d.state].label}</StatusPill>
                            </span>
                          ))}
                        </span>
                        <ChevronRight className={`rcpt__chev${open === r.taxpayerId ? ' rcpt__chev--open' : ''}`} aria-hidden="true" />
                      </button>
                      {/* Bung/thu bằng chiều cao; chỉ cắt nội dung trong lúc chuyển động để chữ không bị cắt khi đã mở. */}
                      <AnimatePresence initial={false}>
                      {open === r.taxpayerId && (
                        <M.div key="detail" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }} style={{ overflow: 'hidden' }} transition={tween(DUR.state)}>
                        {/* Mỗi kênh một khối xếp dọc: tên kênh → lý do (nếu có, tô theo mức) → từng lần thử trên một dòng. */}
                        <div className="rcpt__detail">
                          {r.deliveries.map((d) => (
                            <section key={d.channel} className="dlv" aria-label={channelName(d.channel)}>
                              <h4 className="dlv__channel">{channelName(d.channel)}</h4>
                              {d.reason && <p className={`dlv__reason dlv__reason--${STATE[d.state].tone}`}>{reasonText(d.reason)}</p>}
                              {d.attempts.length ? (
                                <ol className="dlv__attempts">
                                  {d.attempts.map((a) => {
                                    const o = OUTCOME[a.outcome];
                                    // Lý do của lần thử chỉ ghi khi khác lý do chung của kênh (vd. lần 1 lỗi kết nối, lần 2 thành công).
                                    const why = a.code && a.code !== d.reason ? reasonText(a.code) : '';
                                    return (
                                      <li key={a.no} className="dlv__attempt">
                                        <span className="dlv__no">Lần {a.no}</span>
                                        <span className="dlv__outcome">
                                          <span className={`dlv__dot dlv__dot--${o.tone}`} aria-hidden="true" />
                                          {o.label}
                                          {why && <span className="dlv__why">{why}</span>}
                                        </span>
                                        <span className="dlv__meta">
                                          <time>{a.at.slice(11)}</time> · <span className="num">{num(a.latencyMs)} ms</span>
                                          {a.code && <code className="dlv__code">{a.code}</code>}
                                        </span>
                                      </li>
                                    );
                                  })}
                                </ol>
                              ) : (
                                <p className="dlv__empty">Chưa có lần thử gửi.</p>
                              )}
                            </section>
                          ))}
                        </div>
                        </M.div>
                      )}
                      </AnimatePresence>
                    </li>
                  ))}
                </ul>
                <div className="table-pager">
                  <span className="mr-auto text-muted-foreground num">{num(rq.data.total)} người nhận</span>
                  <IconButton icon={ChevronLeft} label="Trang người nhận trước" disabled={page <= 1} onClick={() => setPage(page - 1)} />
                  <span className="num">{page}/{pages}</span>
                  <IconButton icon={ChevronRight} label="Trang người nhận sau" disabled={page >= pages} onClick={() => setPage(page + 1)} />
                </div>
              </>
            )}
          </section>
        </>
      )}
      {cancel && (
        <DialogFrame open width={520} onClose={() => setCancel(false)} title="Hủy phần chưa gửi?" footer={
          <div className="sheet__footer">
            <Button variant="outline" onClick={() => setCancel(false)}>Quay lại</Button>
            <Button className="bg-destructive text-white hover:bg-destructive/90" disabled={!reason.trim()} loading={m.isPending} onClick={() => m.mutate()}>Hủy phần chưa gửi</Button>
          </div>
        }>
          <div className="acct-form">
            <Feedback severity="error" title="Tin đang chờ sẽ không được gửi. Tin đã vào hộp thư hoặc iHanoi đã tiếp nhận không thu hồi được." />
            <div className="field">
              <label className="field__label" htmlFor="cancel-reason">Lý do (bắt buộc)</label>
              <TextareaField id="cancel-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            {m.error && <Feedback severity="warning" title={m.error.message} />}
          </div>
        </DialogFrame>
      )}
    </Overlay>
  );
}
