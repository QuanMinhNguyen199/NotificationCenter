import { ViewTabs, Feedback, TextareaField, DialogFrame } from '@/components/Controls';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, RUN_ACTIONS, actOnRun, appRegistered, failReason, fetchResponse, fetchRun, fetchTaxpayerNotifications, retryNotifications, retryOf, type RunAction, type StatsFilter } from '../api/mockApi';
import { FILING_LABEL, fetchProfile } from '../api/profileApi';
import { ProtoBadge } from '../components/Proto';
import { StatusPill } from '../components/Status';
import Overlay from '../components/Overlay';
import { BlockError, Skel } from '../components/Blocks';
import { DELIVERY, GroupTags, Pill, PRIORITY, RUN, SEND } from '../components/Status';
import { notifications, taxpayers, UNITS, OBLIGATION_CUTOFF } from '../data/mock';
import { officerOf } from '../data/org';
import { teamName, useCurrentUser, usePermissions, useStaff } from '../demo/DemoContext';
import { dm, dmy, dmyhm, duration, hm, num, pct } from '../lib/format';
import { useBreakpoint } from '../lib/useMedia';
import { useHideNavWhile } from '../shell/overlay';
import type { Notification, SendRun } from '../data/types';
import { RunProgress } from './DetailTabs';

const unitName = (id: string) => UNITS.find((u) => u.id === id)?.name ?? id;

const OutOfScope = () => <p className="chart-note">NNT này không thuộc phạm vi tài khoản của bạn.</p>;

/** Cán bộ phụ trách NNT, kèm tổ. */
function Officer({ taxpayerId }: { taxpayerId: number }) {
  const s = useStaff().find((x) => x.id === officerOf[taxpayerId]);
  return <>{s ? `${s.name} · ${teamName(s.team)}` : '—'}</>;
}

/* ---------- Nội dung minh họa của bản đẩy và nội dung đầy đủ ---------- */

export function pushText(n: Pick<Notification, 'groups' | 'title'>) {
  if (n.groups.includes('D4')) return { title: 'Doanh thu gần ngưỡng sử dụng hóa đơn', body: 'Mở iHanoi để xem doanh thu ghi nhận và việc cần chuẩn bị.' };
  if (n.groups.length > 1) return { title: 'Bạn còn hồ sơ khai và khoản thuế cần xử lý', body: 'Mở iHanoi để xem chi tiết và hạn hoàn thành.' };
  if (n.groups.includes('D1b')) return { title: 'Nhắc nộp thuế', body: 'Bạn còn khoản thuế cần nộp. Mở iHanoi để xem hạn nộp.' };
  return { title: 'Nhắc khai thuế', body: 'Bạn còn hồ sơ khai thuế cần nộp. Mở iHanoi để xem hạn nộp.' };
}

export function PushPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="push-frame" aria-label="Bản đẩy trên iHanoi">
      <div className="push-frame__bar">
        <span>09:16</span>
        <span>Thứ Tư, 28/10</span>
      </div>
      <div className="push-card">
        <span className="push-card__app">
          <i aria-hidden="true" /> iHanoi · bây giờ
        </span>
        <b>{title}</b>
        {body}
      </div>
    </div>
  );
}

function FullContent({ n }: { n: Notification }) {
  const tp = taxpayers[n.taxpayerId];
  if (n.groups.includes('D4')) {
    return (
      <div className="full-content">
        <h4>{n.title}</h4>
        <p>Kính gửi {tp.name} (MST {tp.mst}),</p>
        <p>Doanh thu ghi nhận từ đầu năm 2026 đạt 812.400.000 đồng, bằng 81,2% ngưỡng sử dụng hóa đơn 1.000.000.000 đồng.</p>
        <p>Cơ quan thuế đề nghị chuẩn bị đăng ký sử dụng hóa đơn trước khi doanh thu vượt ngưỡng.</p>
      </div>
    );
  }
  return (
    <div className="full-content">
      <h4>{n.title}</h4>
      <p>Kính gửi {tp.name} (MST {tp.mst}),</p>
      {n.groups.includes('D1a') && <p>Hồ sơ khai thuế quý III/2026 chưa được nộp. Hạn nộp: 30/10/2026.</p>}
      {n.groups.includes('D1b') && <p>Số tiền thuế còn phải nộp: 1.250.000 đồng. Hạn nộp: 30/10/2026.</p>}
      <p>Vui lòng hoàn thành trên Cổng dịch vụ công hoặc liên hệ Thuế cơ sở A để được hỗ trợ.</p>
    </div>
  );
}

/* ---------- Chi tiết thông báo ---------- */

/** [Thêm] Lý do lỗi và gửi lại một thông báo thất bại. */
function RetryOne({ id, onDone }: { id: string; onDone: () => void }) {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const n = notifications.find((x) => x.id === id)!;
  const reason = failReason(n);
  const m = useMutation({
    mutationFn: () => retryNotifications([id], user.name),
    onSuccess: () => {
      toast.success('Đã đưa thông báo vào lượt gửi kế tiếp.');
      qc.invalidateQueries();
      onDone();
    },
    onError: () => toast.error('Không gửi lại được. Thử lại sau.'),
  });
  return (
    <div className="retry-one">
      <dl className="kv">
        <dt>Lý do lỗi</dt>
        <dd>
          {reason.text} <ProtoBadge kind="mock" note="Mã lỗi đang giả lập; hệ thống gửi thật chưa trả lý do." />
        </dd>
        {reason.fix && (
          <>
            <dt>Cần làm</dt>
            <dd>{reason.fix}</dd>
          </>
        )}
      </dl>
      <div className="retry-one__actions">
        <Button disabled={!reason.retry || m.isPending} onClick={() => m.mutate()}>
          {m.isPending ? 'Đang gửi lại…' : 'Gửi lại'}
        </Button>
        <ProtoBadge kind="proposal" note="Chỉ gửi lại lỗi tạm thời; lỗi dữ liệu phải sửa trước khi gửi lại." />
        {!reason.retry && <span className="chart-note">Chưa gửi lại được vì lỗi nằm ở dữ liệu NNT.</span>}
      </div>
    </div>
  );
}

function NotificationDetail({ id }: { id: string }) {
  const { canSeeTaxpayer } = usePermissions();
  const [, bump] = useState(0);
  const n = notifications.find((x) => x.id === id);
  if (!n) return <BlockError message="Không tìm thấy thông báo." onRetry={() => location.reload()} />;
  if (!canSeeTaxpayer(n.taxpayerId)) return <OutOfScope />;
  const tp = taxpayers[n.taxpayerId];
  const delivery = n.delivery;
  const push = pushText(n);
  return (
    <>
      <section className="ov-section">
        <dl className="kv">
          <dt>Người nhận</dt>
          <dd>
            {tp.name} · MST {tp.mst}
          </dd>
          <dt>Cán bộ phụ trách</dt>
          <dd><Officer taxpayerId={n.taxpayerId} /></dd>
          <dt>Nhóm</dt>
          <dd>
            <GroupTags groups={n.groups} />
          </dd>
          <dt>Thời điểm tạo</dt>
          <dd>{dmyhm(n.createdAt)}</dd>
          <dt>Đợt gửi</dt>
          <dd className="id">{n.runId}</dd>
        </dl>
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title">Kết quả</h3>
        <dl className="kv">
          <dt>Gửi tới trung tâm</dt>
          <dd><Pill map={SEND} value={n.send} /></dd>
          <dt>Giao tới người dùng</dt>
          <dd><Pill map={DELIVERY} value={delivery} /></dd>
          {n.deliveredAt && delivery === 'DELIVERED' && (
            <>
              <dt>Thời gian phản hồi</dt>
              <dd>{duration((new Date(n.deliveredAt).getTime() - new Date(n.createdAt).getTime()) / 60_000)}</dd>
            </>
          )}
        </dl>
        {n.send === 'FAILED' && <RetryOne id={n.id} onDone={() => bump((x) => x + 1)} />}
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title">Bản đẩy</h3>
        <PushPreview {...push} />
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title">Nội dung đầy đủ</h3>
        <FullContent n={n} />
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title">Diễn biến</h3>
        <ol className="timeline">
          <li><time>{hm(n.createdAt)}</time><span>Tạo thông báo trong lượt rà soát</span></li>
          {n.processedAt && <li><time>{hm(n.processedAt)}</time><span>{SEND[n.send].label}</span></li>}
          {n.deliveredAt && delivery === 'DELIVERED' && <li><time>{hm(n.deliveredAt)}</time><span>iHanoi tiếp nhận</span></li>}
          {retryOf(n.id) && <li><time>{hm(retryOf(n.id)!.at)}</time><span>Gửi lại theo yêu cầu của {retryOf(n.id)!.by}</span></li>}
          {n.send === 'PENDING' && <li><time>—</time><span>Đang chờ tới lượt trong khung 06:00–10:00</span></li>}
        </ol>
      </section>
    </>
  );
}

/* ---------- Chi tiết NNT ---------- */

function TaxpayerDetail({ id }: { id: number }) {
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
          <dd>{t.hkdStatus}</dd>
          <dt>Đơn vị quản lý</dt>
          <dd>{unitName('A')}</dd>
          <dt>Cán bộ phụ trách</dt>
          <dd><Officer taxpayerId={id} /></dd>
          <dt>Ứng dụng iHanoi</dt>
          <dd>{appRegistered(id) ? 'Đã đăng ký' : 'Chưa đăng ký'} <ProtoBadge kind="mock" note="Trạng thái đăng ký iHanoi đang giả lập." /></dd>
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
                <p className="proto-inline chart-note">Hồ sơ đã nộp và đang làm dở <ProtoBadge kind="mock" note="Danh sách hồ sơ đang giả lập; chưa nối hệ thống quản lý hồ sơ." /></p>
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
          {
            key: 'ht',
            label: 'Hội thoại',
            children: prof.isError ? (
              <BlockError message="Không tải được lịch sử hội thoại." onRetry={() => prof.refetch()} />
            ) : !prof.data ? (
              <Skel w="100%" h={80} />
            ) : (
              <>
                <p className="proto-inline chart-note">Hội thoại của hộ với Geo AI trên iHanoi <ProtoBadge kind="mock" note="Lịch sử hội thoại đang giả lập." /></p>
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
          },
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

/* ---------- Chi tiết và điều khiển đợt ---------- */

const ACTION: Record<RunAction, { label: string; danger?: boolean; reasonRequired: boolean; verb: string }> = {
  approve: { label: 'Duyệt đợt', reasonRequired: false, verb: 'Duyệt' },
  pause: { label: 'Tạm dừng đợt này', reasonRequired: true, verb: 'Tạm dừng' },
  resume: { label: 'Tiếp tục gửi', reasonRequired: false, verb: 'Tiếp tục' },
  cancel: { label: 'Hủy đợt', danger: true, reasonRequired: true, verb: 'Hủy' },
};

function impact(r: SendRun, a: RunAction) {
  const u = unitName(r.unit);
  switch (a) {
    case 'pause':
      return `Tạm dừng ${num(r.pending)} thông báo đang chờ của ${u}. Các lượt đang gửi có thể hoàn tất.`;
    case 'cancel':
      return `Hủy ${num(r.pending)} thông báo còn chờ của ${u}. Lịch sử ${num(r.sent)} thông báo đã gửi được giữ nguyên.`;
    case 'resume':
      return `Tiếp tục gửi ${num(r.pending)} thông báo đang chờ của ${u} trong khung ${r.window}.`;
    default:
      return `Duyệt ${num(r.total)} thông báo của ${u} để gửi trong khung ${r.window}.`;
  }
}

function ConfirmRun({ run, action, onClose, onDone }: { run: SendRun; action: RunAction | null; onClose: () => void; onDone: (r: SendRun) => void }) {
  const bp = useBreakpoint();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const qc = useQueryClient();
  const user = useCurrentUser();
  const m = useMutation({
    mutationFn: () => actOnRun(run.id, action!, reason.trim(), run.status, user.name),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['runs'] });
      qc.invalidateQueries({ queryKey: ['active-run'] });
      qc.invalidateQueries({ queryKey: ['run', run.id] });
      toast.success(`${ACTION[action!].verb} đợt ${run.id} thành công.`);
      onDone(r);
      setReason('');
      setTouched(false);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.code === 'STATE_CHANGED') qc.invalidateQueries({ queryKey: ['run', run.id] });
    },
  });
  useHideNavWhile(!!action && bp === 'mobile');
  if (!action) return null;
  const a = ACTION[action];
  const invalid = a.reasonRequired && !reason.trim();

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <dl className="kv">
        <dt>Mã đợt</dt>
        <dd className="id">{run.id}</dd>
        <dt>Đơn vị</dt>
        <dd>{unitName(run.unit)}</dd>
        <dt>Bản chờ bị tác động</dt>
        <dd className="num">{num(action === 'approve' ? run.total : run.pending)}</dd>
      </dl>
      <Feedback severity={a.danger ? 'error' : 'info'} title={impact(run, action)} />
      <div className="field">
        <label className="field__label" htmlFor="run-reason">
          Lý do {a.reasonRequired ? '(bắt buộc)' : '(không bắt buộc)'}
        </label>
        <TextareaField
          id="run-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={touched && invalid}
          aria-describedby={touched && invalid ? 'run-reason-err' : undefined}
          maxLength={300}
        />
        {touched && invalid && (
          <span className="field__error" id="run-reason-err" role="alert">
            Nhập lý do để {a.verb.toLowerCase()} đợt.
          </span>
        )}
      </div>
      {m.error && <Feedback severity="warning" title={m.error.message} />}
    </div>
  );

  const footer = (
    <div className="sheet__footer">
      <Button variant="outline" size={bp === 'mobile' ? 'lg' : undefined} onClick={onClose}>
        Quay lại
      </Button>
      <Button
        size={bp === 'mobile' ? 'lg' : undefined}
        variant="default"
        data-danger={a.danger} className={a.danger ? "bg-destructive text-white hover:bg-destructive/90 active:bg-destructive/90" : undefined}
        loading={m.isPending}
        onClick={() => {
          setTouched(true);
          if (!invalid) m.mutate();
        }}
      >
        {a.label}
      </Button>
    </div>
  );

  const title = `${a.label} ${run.id}?`;
  return <DialogFrame open title={title} onClose={onClose} footer={footer} width={560}>{body}</DialogFrame>;
}

function RunDetail({ id }: { id: string }) {
  const { canOperateRuns } = usePermissions();
  const bp = useBreakpoint();
  const q = useQuery({ queryKey: ['run', id], queryFn: () => fetchRun(id) });
  const [action, setAction] = useState<RunAction | null>(null);

  if (q.isError) return <BlockError message="Không tải được chi tiết đợt gửi." onRetry={() => q.refetch()} />;
  if (!q.data) return <Skel w="100%" h={240} />;
  const r = q.data;
  const actions = canOperateRuns ? RUN_ACTIONS[r.status] : [];
  const primary = actions.filter((a) => a !== 'cancel');

  return (
    <>
      <section className="ov-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Pill map={RUN} value={r.status} />
          {actions.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              {primary.map((a) => (
                <Button key={a} variant={a === "approve" ? "default" : "outline"} onClick={() => setAction(a)}>
                  {ACTION[a].label}
                </Button>
              ))}
              {actions.includes('cancel') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline">Thao tác <ChevronDown className="size-4" aria-hidden="true" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent><DropdownMenuItem variant="destructive" onSelect={() => setAction('cancel')}>Hủy đợt…</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
        <div style={{ marginTop: 14 }}>
          <RunProgress r={r} />
        </div>
        <div className="run-figures run-figures--7">
          <div><small>Tổng thông báo</small><b>{num(r.total)}</b></div>
          <div><small>NNT</small><b>{num(r.taxpayers)}</b></div>
          <div><small>Chờ gửi</small><b>{num(r.pending)}</b></div>
          <div><small>Gửi lỗi</small><b>{num(r.failed)}</b></div>
          <div><small>Chưa rõ</small><b>{num(r.unknown)}</b></div>
          <div><small>Hết hạn</small><b>{num(r.expired)}</b></div>
          <div><small>Bỏ qua</small><b>{num(r.skipped)}</b></div>
        </div>
      </section>
      <section className="ov-section">
        <dl className="kv">
          <dt>Ngày / đơn vị</dt>
          <dd>{dmy(r.date)} · {unitName(r.unit)}</dd>
          <dt>Khung gửi</dt>
          <dd className="num">{r.window}</dd>
          <dt>Phiên bản thiết lập</dt>
          <dd>Phiên bản {r.configVersion}</dd>
          <dt>Duyệt</dt>
          <dd>{r.approvedBy}</dd>
        </dl>
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title">Diễn biến</h3>
        <ol className="timeline">
          {r.timeline.map((t, i) => (
            <li key={i}>
              <time>{dmy(t.at).slice(0, 5)} {hm(t.at)}</time>
              <span>
                {t.text}
                {t.by && <small>{t.by}</small>}
              </span>
            </li>
          ))}
        </ol>
      </section>
      {bp === 'mobile' && <div style={{ height: 8 }} />}
      <ConfirmRun run={r} action={action} onClose={() => setAction(null)} onDone={() => setAction(null)} />
    </>
  );
}

/* ---------- Thời gian phản hồi ---------- */

/** Giờ:phút gọn cho bảng, ví dụ 5:48. */
const hhmm = (min: number | null) => (min == null ? '—' : `${Math.floor(Math.round(min) / 60)}:${String(Math.round(min) % 60).padStart(2, '0')}`);

function ResponseDetail({ filter }: { filter: StatsFilter }) {
  const { scopeLabel } = usePermissions();
  const q = useQuery({ queryKey: ['response', filter], queryFn: () => fetchResponse(filter) });
  if (q.isError) return <BlockError message="Không tải được thời gian phản hồi." onRetry={() => q.refetch()} />;
  if (!q.data) return <Skel w="100%" h={240} />;
  const r = q.data;
  const scope = `${scopeLabel(filter.unit)}, ${dm(filter.from)}–${dmy(filter.to)}`;
  if (r.total == null) {
    return <p className="chart-note">Chưa có thông báo nào có mốc iHanoi tiếp nhận trong phạm vi {scope}.</p>;
  }
  const sendShare = (r.toSend! / r.total) * 100;

  return (
    <>
      <section className="ov-section">
        <p className="caption-line">{scope}. Tính trên {num(r.count)} thông báo có mốc tiếp nhận.</p>
        <div className="resp">
          <div className="resp__total">
            <small>Trung bình từ lúc tạo tới khi iHanoi tiếp nhận</small>
            <b>{duration(r.total)}</b>
          </div>
          <div className="resp__bar" role="img" aria-label={`Tạo tới gửi chiếm ${pct(r.toSend!, r.total)}, gửi tới giao chiếm ${pct(r.toDeliver!, r.total)}`}>
            <span className="resp__seg resp__seg--send" style={{ width: `${sendShare}%` }} />
            <span className="resp__seg resp__seg--deliver" style={{ width: `${100 - sendShare}%` }} />
          </div>
          <dl className="resp__legs">
            <div>
              <dt><i className="resp__dot resp__dot--send" aria-hidden="true" />Tạo → gửi</dt>
              <dd>{duration(r.toSend!)}</dd>
              <p>Gồm thời gian chờ tới khung giờ gửi và xếp lượt gửi.</p>
            </div>
            <div>
              <dt><i className="resp__dot resp__dot--deliver" aria-hidden="true" />Gửi → iHanoi tiếp nhận</dt>
              <dd>{duration(r.toDeliver!)}</dd>
              <p>Từ khi gửi tới iHanoi tới khi iHanoi xác nhận tiếp nhận. Chưa có xác nhận đã tới máy người nhận.</p>
            </div>
          </dl>
        </div>
      </section>
      <section className="ov-section">
        <h3 className="ov-section__title">Theo ngày tạo</h3>
        <table className="mini-table">
          <thead>
            <tr>
              <th scope="col">Ngày</th>
              <th scope="col">Tiếp nhận</th>
              <th scope="col">Tạo → gửi</th>
              <th scope="col">Gửi → tiếp nhận</th>
              <th scope="col">Tổng</th>
            </tr>
          </thead>
          <tbody>
            {r.byDay.map((d) => (
              <tr key={d.date}>
                <th scope="row">{dm(d.date)}</th>
                <td>{num(d.count)}</td>
                <td>{hhmm(d.toSend)}</td>
                <td>{hhmm(d.toDeliver)}</td>
                <td><b>{hhmm(d.total)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="chart-note">Đơn vị giờ:phút.</p>
      </section>
    </>
  );
}

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

