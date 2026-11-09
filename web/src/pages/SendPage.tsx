import { ChoiceSelect, DialogFrame, Feedback, OptionGroup, TextareaField } from '@/components/Controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, Plus, Search, X } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AUTO_VARS, varLabel, cancelSend, channelName, createSend, fetchChannels, fetchSend, fetchSendRecipients, fetchSends, fetchTemplates, GROUPS,
  noIhanoi, publishedOf, reasonText, resolveAudience, scopeTaxpayers, varsOf,
  type Attempt, type AudienceKind, type ChannelId, type DeliveryState, type RecipientFilter, type SendView,
} from '../api/notifyApi';
import Overlay from '../components/Overlay';
import { BlockEmpty, BlockError, Skel } from '../components/Blocks';
import { StatusPill, type Tone } from '../components/Status';
import { taxpayers } from '../data/mock';
import { TEAMS } from '../data/org';
import { teamName, usePermissions } from '../demo/DemoContext';
import { dmyhm, num } from '../lib/format';
import { useRoute } from '../lib/router';
import { useBreakpoint } from '../lib/useMedia';
import { useGuard } from '../shell/guard';
import { AnimatePresence, motion } from 'motion/react';
import { DUR, tween } from '../lib/motion';
import { PushPreview } from '../stats/Details';
import { CHANNEL_STATUS } from './ChannelsPage';
import { BODY_MAX, TITLE_MAX } from './TemplatesPage';

export const STATE: Record<DeliveryState, { label: string; tone: Tone }> = {
  READY: { label: 'Chờ gửi', tone: 'neutral' },
  SENDING: { label: 'Đang gửi', tone: 'info' },
  RETRY_WAIT: { label: 'Chờ thử lại', tone: 'warning' },
  ACCEPTED: { label: 'Đã tiếp nhận', tone: 'success' },
  DELIVERED: { label: 'Đã vào hộp thư', tone: 'success' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
  UNKNOWN: { label: 'Chưa rõ', tone: 'warning' },
  SKIPPED: { label: 'Bỏ qua', tone: 'neutral' },
  CANCELED: { label: 'Đã hủy', tone: 'neutral' },
};
/** Kết quả của từng lần thử gửi (khác trạng thái cuối của kênh). */
const OUTCOME: Record<Attempt['outcome'], { label: string; tone: Tone }> = {
  DELIVERED: { label: 'Đã lưu vào hộp thư', tone: 'success' },
  ACCEPTED: { label: 'iHanoi tiếp nhận', tone: 'success' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
  UNKNOWN: { label: 'Chưa rõ kết quả', tone: 'warning' },
};
const SEND_STATUS: Record<SendView['status'], { label: string; tone: Tone }> = {
  SENDING: { label: 'Đang gửi', tone: 'info' },
  DONE: { label: 'Đã xong', tone: 'success' },
  CANCELED: { label: 'Đã hủy phần còn lại', tone: 'neutral' },
};
const BATCH = 100;

/** Điền biến theo một NNT cụ thể. */
const fill = (text: string, id: number | undefined, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => (k === 'ten_nnt' && id !== undefined ? taxpayers[id].name : k === 'mst' && id !== undefined ? taxpayers[id].mst : values[k] || `[${varLabel(k)}]`));

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

function SendDetail({ id, onClose }: { id: string; onClose: () => void }) {
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
              <h3 className="ov-section__title" style={{ margin: 0 }}>Người nhận</h3>
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
                        <motion.div key="detail" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1, transitionEnd: { overflow: 'visible' } }} exit={{ height: 0, opacity: 0, overflow: 'hidden' }} style={{ overflow: 'hidden' }} transition={tween(DUR.state)}>
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
                        </motion.div>
                      )}
                      </AnimatePresence>
                    </li>
                  ))}
                </ul>
                <div className="table-pager">
                  <span className="mr-auto text-muted-foreground num">{num(rq.data.total)} người nhận</span>
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button>
                  <span className="num">{page}/{pages}</span>
                  <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Sau</Button>
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

/* ---------- Soạn lần gửi ---------- */

function Composer({ onDone, onBack }: { onDone: (id: string) => void; onBack: () => void }) {
  const { user, sendTeam, canFreeText } = usePermissions();
  const { params } = useRoute();
  const bp = useBreakpoint();
  const qc = useQueryClient();
  const chq = useQuery({ queryKey: ['channels'], queryFn: fetchChannels });
  const tq = useQuery({ queryKey: ['templates'], queryFn: fetchTemplates });
  const [kind, setKind] = useState<AudienceKind>('group');
  const [group, setGroup] = useState(GROUPS[0].id);
  const [team, setTeam] = useState(sendTeam ?? TEAMS[0].id);
  const [picked, setPicked] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [chans, setChans] = useState<ChannelId[]>(['IN_APP', 'IHANOI']);
  const [mode, setMode] = useState<'template' | 'free'>('template');
  const [tplId, setTplId] = useState(params.get('modele') ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [free, setFree] = useState({ title: '', body: '' });
  const [confirm, setConfirm] = useState(false);
  const [shown, setShown] = useState(false);
  const [key] = useState(() => `${user.id}-${Date.now()}`);
  // Đã nhập dở thì hỏi trước khi rời (nút quay lại, đổi màn trên sidebar, đóng tab).
  const { setGuard, confirmLeave } = useGuard();
  const dirty = picked.length > 0 || Object.values(values).some((v) => v.trim()) || !!free.title.trim() || !!free.body.trim();
  useEffect(() => {
    setGuard({ dirty, discard: () => {} });
    return () => setGuard(null);
  }, [dirty, setGuard]);
  const leave = () => confirmLeave(onBack);

  const scope = useMemo(() => scopeTaxpayers(sendTeam), [sendTeam]);
  const ids = useMemo(() => resolveAudience(kind, kind === 'pick' ? picked.map(String) : kind === 'team' ? team : group, sendTeam), [kind, picked, team, group, sendTeam]);
  const published = (tq.data ?? []).filter((t) => publishedOf(t));
  const tpl = published.find((t) => t.id === tplId) ?? published[0];
  const tv = tpl && publishedOf(tpl);
  const title = mode === 'template' ? tv?.title ?? '' : free.title;
  const body = mode === 'template' ? tv?.body ?? '' : free.body;
  const manualVars = varsOf(`${title} ${body}`).filter((v) => !(v in AUTO_VARS));
  const results = search.trim().length >= 2
    ? scope.filter((id) => !picked.includes(id) && (taxpayers[id].name.toLowerCase().includes(search.trim().toLowerCase()) || taxpayers[id].mst.includes(search.trim()))).slice(0, 8)
    : [];
  const usable = (chq.data ?? []).filter((c) => c.status === 'ACTIVE' || c.status === 'PAUSED');
  const selected = chans.filter((c) => usable.some((u) => u.id === c));

  const errors = [
    !ids.length && 'Chưa có người nhận trong phạm vi được phép.',
    !selected.length && 'Chọn ít nhất một kênh.',
    !title.trim() && 'Nội dung chưa có tiêu đề.',
    !body.trim() && 'Nội dung chưa có phần thân.',
    mode === 'free' && (free.title.length > TITLE_MAX || free.body.length > BODY_MAX) && 'Nội dung vượt độ dài cho phép.',
    manualVars.some((v) => !values[v]?.trim()) && `Điền giá trị cho ${manualVars.filter((v) => !values[v]?.trim()).map(varLabel).join(', ')}.`,
  ].filter(Boolean) as string[];

  const audienceLabel = kind === 'pick' ? `${picked.length} NNT được chọn` : kind === 'team' ? `Cả ${teamName(team)}` : `Nhóm: ${GROUPS.find((g) => g.id === group)!.name}${sendTeam ? ` · ${teamName(sendTeam)}` : ''}`;
  const skipped = selected.includes('IHANOI') ? ids.filter(noIhanoi).length : 0;
  // Nội dung lưu cho lần gửi: điền biến người gửi nhập, giữ {ten_nnt}/{mst} để điền theo từng NNT lúc gửi.
  const fillManual = (text: string) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in AUTO_VARS ? m : values[k] || m));

  const m = useMutation({
    mutationFn: () => createSend({
      ids, team: sendTeam, audienceLabel, channels: selected,
      contentLabel: mode === 'template' ? `${tpl!.name} · v${tv!.version}` : 'Tự soạn',
      freeText: mode === 'free', title: fillManual(title), body: fillManual(body), idempotencyKey: key,
    }, user.name),
    onSuccess: (s) => (qc.invalidateQueries({ queryKey: ['sends'] }), toast.success(`Đã tạo lần gửi ${s.id} cho ${num(s.total)} NNT.`), onDone(s.id)),
  });

  const toggle = (c: ChannelId) => setChans(chans.includes(c) ? chans.filter((x) => x !== c) : [...chans, c]);
  const size = bp === 'mobile' ? 'lg' : undefined;

  return (
    <div className="acct-page">
      <header className="sub-head">
        <Button variant="outline" size="icon" onClick={leave} aria-label="Quay lại danh sách lần gửi" title="Quay lại danh sách lần gửi">
          <ArrowLeft aria-hidden="true" />
        </Button>
        <div>
          
          <h1 className="sub-head__title">Tạo lần gửi</h1>
        </div>
      </header>
      <div className="compose">
        <div className="compose__form">
          <section className="set-row__panel">
            <h2 className="set-row__title">1. Người nhận</h2>
            <OptionGroup aria-label="Cách chọn người nhận" value={kind} onValueChange={(v) => setKind(v as AudienceKind)} block={bp === 'mobile'}
              options={[{ value: 'group', label: 'Theo nhóm' }, { value: 'team', label: 'Cả tổ' }, { value: 'pick', label: 'Chọn từng NNT' }]} />
            {kind === 'group' && (
              <div className="field">
                <label className="field__label" htmlFor="aud-group">Nhóm NNT{sendTeam ? ` trong ${teamName(sendTeam)}` : ''}</label>
                <ChoiceSelect id="aud-group" value={group} onValueChange={setGroup} options={GROUPS.map((g) => ({ value: g.id, label: g.name }))} style={{ width: '100%' }} />
              </div>
            )}
            {kind === 'team' && (
              <div className="field">
                <label className="field__label" htmlFor="aud-team">Tổ</label>
                <ChoiceSelect id="aud-team" value={team} onValueChange={setTeam} options={TEAMS.filter((t) => !sendTeam || t.id === sendTeam).map((t) => ({ value: t.id, label: t.name }))} style={{ width: '100%' }} />
              </div>
            )}
            {kind === 'pick' && (
              <div className="field">
                <label className="field__label" htmlFor="aud-search">Tìm theo tên hoặc MST</label>
                <label className="acct-search" style={{ width: '100%' }}>
                  <Search className="size-4" aria-hidden="true" />
                  <Input id="aud-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nhập ít nhất 2 ký tự" />
                </label>
                {results.length > 0 && (
                  <ul className="pick-results">
                    {results.map((id) => (
                      <li key={id}><button type="button" onClick={() => (setPicked([...picked, id]), setSearch(''))}><Plus className="size-4" aria-hidden="true" />{taxpayers[id].name}<span className="num"> · {taxpayers[id].mst}</span></button></li>
                    ))}
                  </ul>
                )}
                {picked.length > 0 && (
                  <div className="chips">
                    {picked.map((id) => (
                      <span key={id} className="chip">{taxpayers[id].name}<button type="button" aria-label={`Bỏ ${taxpayers[id].name}`} onClick={() => setPicked(picked.filter((x) => x !== id))}><X /></button></span>
                    ))}
                  </div>
                )}
              </div>
            )}
            <p className="compose__count"><b className="num">{num(ids.length)}</b> NNT nhận{ids.length > BATCH ? `, gửi theo ${Math.ceil(ids.length / BATCH)} lô ${BATCH} NNT` : ''}</p>
          </section>

          <section className="set-row__panel">
            <h2 className="set-row__title">2. Kênh</h2>
            {!chq.data ? <Skel w="100%" h={80} /> : (
              <div className="ch-pick">
                {chq.data.map((c) => {
                  const off = c.status === 'NOT_CONNECTED' || c.status === 'DISABLED_EMERGENCY';
                  return (
                    <label key={c.id} className={`ch-pick__item${off ? ' ch-pick__item--off' : ''}`}>
                      <input type="checkbox" checked={!off && chans.includes(c.id)} disabled={off} onChange={() => toggle(c.id)} />
                      <span>
                        <b>{c.name}</b>
                        {(off || c.status === 'PAUSED') && <small>{off ? CHANNEL_STATUS[c.status].label : 'Đang tạm dừng: tin chờ tới khi mở lại'}</small>}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </section>

          <section className="set-row__panel">
            <h2 className="set-row__title">3. Nội dung</h2>
            {canFreeText && (
              <OptionGroup aria-label="Nguồn nội dung" value={mode} onValueChange={(v) => setMode(v as 'template' | 'free')} options={[{ value: 'template', label: 'Theo mẫu tin' }, { value: 'free', label: 'Tự soạn' }]} />
            )}
            {mode === 'template' ? (
              !tq.data ? <Skel w="100%" h={60} /> : published.length === 0 ? <BlockEmpty>Chưa có mẫu tin đã xuất bản.</BlockEmpty> : (
                <div className="field">
                  <label className="field__label" htmlFor="tpl-pick">Mẫu tin</label>
                  <ChoiceSelect id="tpl-pick" value={tpl!.id} onValueChange={setTplId} options={published.map((t) => ({ value: t.id, label: `${t.name} (v${publishedOf(t)!.version})` }))} style={{ width: '100%' }} />
                </div>
              )
            ) : (
              <>
                <div className="field">
                  <label className="field__label" htmlFor="free-title">Tiêu đề <span className="field__count">{free.title.length}/{TITLE_MAX}</span></label>
                  <Input id="free-title" value={free.title} maxLength={TITLE_MAX + 20} onChange={(e) => setFree({ ...free, title: e.target.value })} />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="free-body">Nội dung <span className="field__count">{free.body.length}/{BODY_MAX}</span></label>
                  <TextareaField id="free-body" rows={4} value={free.body} onChange={(e) => setFree({ ...free, body: e.target.value })} />
                  <div className="tpl-vars">
                    {Object.entries(AUTO_VARS).map(([k, l]) => (
                      <button key={k} type="button" className="tab-action" onClick={() => setFree({ ...free, body: `${free.body}{${k}}` })}>Chèn {l.charAt(0).toLowerCase() + l.slice(1)}</button>
                    ))}
                  </div>
                  
                </div>
              </>
            )}
            {manualVars.map((v) => (
              <div className="field" key={v}>
                <label className="field__label" htmlFor={`var-${v}`}>{varLabel(v)}</label>
                <Input id={`var-${v}`} value={values[v] ?? ''} onChange={(e) => setValues({ ...values, [v]: e.target.value })} />
              </div>
            ))}
          </section>
        </div>

        <aside className="compose__preview">
          <p className="field__label">Xem trước với {ids[0] !== undefined ? taxpayers[ids[0]].name : 'NNT đầu danh sách'}</p>
          <PushPreview title={fill(title, ids[0], values) || 'Tiêu đề'} body={fill(body, ids[0], values) || 'Nội dung thông báo'} />
        </aside>
      </div>

      {shown && errors.length > 0 && <Feedback className="cfg-alert" severity="error" title={errors[0]} />}
      <div className="action-bar" role="region" aria-label="Gửi thông báo">
        <span className="action-bar__state"><b className="num">{num(ids.length)}</b>&nbsp;NNT · {selected.length} kênh</span>
        <Button variant="outline" size={size} onClick={leave}>Hủy</Button>
        <Button size={size} onClick={() => (setShown(true), !errors.length && setConfirm(true))}>Xem trước và gửi</Button>
      </div>

      {confirm && (
        <DialogFrame open width={600} onClose={() => setConfirm(false)} title={`Gửi tới ${num(ids.length)} NNT?`} footer={
          <div className="sheet__footer">
            <Button variant="outline" size={size} onClick={() => setConfirm(false)}>Quay lại sửa</Button>
            <Button size={size} loading={m.isPending} onClick={() => m.mutate()}>Gửi {num(ids.length)} thông báo</Button>
          </div>
        }>
          <div className="acct-form">
            <dl className="kv">
              <dt>Người nhận</dt><dd>{audienceLabel}</dd>
              {selected.map((c) => (
                <Fragment key={c}><dt>{channelName(c)}</dt><dd>
                  Sẽ gửi <b className="num">{num(ids.length - (c === 'IHANOI' ? skipped : 0))}</b>
                  {c === 'IHANOI' && skipped > 0 && <>, bỏ qua <b className="num">{num(skipped)}</b> ({reasonText('NO_ENDPOINT')})</>}
                  {chq.data?.find((x) => x.id === c)?.status === 'PAUSED' && ' · kênh đang tạm dừng, tin chờ tới khi mở lại'}
                </dd></Fragment>
              ))}
              {ids.length > BATCH && (<><dt>Chia lô</dt><dd>{Math.ceil(ids.length / BATCH)} lô, mỗi lô tối đa {BATCH} NNT</dd></>)}
            </dl>
            <PushPreview title={fill(title, ids[0], values)} body={fill(body, ids[0], values)} />
            <Feedback severity="info" title="Sau khi gửi, tin đã vào hộp thư hoặc iHanoi đã tiếp nhận không thu hồi được. Có thể hủy phần chưa gửi ở màn theo dõi." />
            {m.error && <Feedback severity="warning" title={m.error.message} />}
          </div>
        </DialogFrame>
      )}
    </div>
  );
}

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
      <h1 className="sr-only">Gửi thông báo</h1>
      <div className="page-toolbar">
        <span />
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
                  <span className="tpl-row__purpose">
                    <span className="id">{s.id}</span> · {s.createdBy}, {dmyhm(s.createdAt)} · {s.audienceLabel} · <span className="num">{num(s.total)}</span> NNT · {s.channels.map(channelName).join(', ')}
                  </span>
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
