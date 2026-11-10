import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BlockEmpty, BlockError, Skel } from '../components/Blocks';
import { Feedback, ViewTabs } from '../components/Controls';
import Overlay from '../components/Overlay';
import { PRIORITY, Pill, StatusPill, type Tone } from '../components/Status';
import { taxpayers } from '../data/mock';
import { officerOf } from '../data/org';
import type { Role, Staff } from '../data/types';
import { teamName, usePermissions, useStaff } from '../demo/DemoContext';
import { dm, dmyhm, duration, hm } from '../lib/format';
import { useRoute } from '../lib/router';
import {
  KIND_LABEL, KIND_SHORT, NOW_ISO, RoutingError, STATUS_LABEL, claimCase, completeCase, fetchCase, minutesBetween, replyCase,
  type CaseStatus, type RoutingCase,
} from './routingApi';
import { dueInfo, useRoutingScope } from './useRouting';
import './routing.css';

export const STATUS_TONE: Record<CaseStatus, Tone> = { NEW: 'info', IN_PROGRESS: 'warning', ANSWERED: 'success', DONE: 'neutral' };

type Flash = { severity: 'success' | 'error'; title: string; description?: string } | null;

export default function CaseDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  // Phản hồi sau thao tác gắn với mã ca, nên mở ca khác không còn thấy phản hồi cũ.
  const [flashOf, setFlashOf] = useState<{ id: string; f: Flash } | null>(null);
  const flash = flashOf && flashOf.id === id ? flashOf.f : null;
  const setFlash = (f: Flash) => {
    if (id) setFlashOf({ id, f });
  };
  const q = useQuery({ queryKey: ['routing', 'case', id], queryFn: () => fetchCase(id!), enabled: !!id, retry: (n, e) => !(e instanceof RoutingError) && n < 2 });
  const tp = q.data ? taxpayers[q.data.taxpayerId] : undefined;
  const { user, role } = usePermissions();
  const scope = useRoutingScope();
  const rights = q.data ? caseRights(q.data, user, role, scope) : null;
  const hasActions = !!rights && (rights.canClaim || rights.canComplete);
  return (
    <Overlay open={!!id} onClose={onClose} width={680} title={q.data && tp ? `${KIND_SHORT[q.data.kind]}: ${tp.name}` : 'Chi tiết ca chuyển tuyến'} footer={q.data && hasActions ? <Actions c={q.data} setFlash={setFlash} /> : undefined}>
      {q.isError ? (
        q.error instanceof RoutingError && q.error.code === 'NOT_FOUND' ? (
          <BlockEmpty>Không tìm thấy ca {id}. Ca có thể đã bị xóa hoặc đường dẫn sai.</BlockEmpty>
        ) : (
          <BlockError message="Không tải được chi tiết ca." onRetry={() => q.refetch()} />
        )
      ) : !q.data ? (
        <div className="rt-detail-skel" aria-hidden="true">
          <Skel w="60%" h={18} />
          <Skel w="100%" h={96} />
          <Skel w="100%" h={180} />
        </div>
      ) : (
        <Body key={q.data.id} c={q.data} flash={flash} setFlash={setFlash} />
      )}
    </Overlay>
  );
}

/* ---------- Quyền thao tác ---------- */

function useCaseRights(c: RoutingCase) {
  const { user, role } = usePermissions();
  return caseRights(c, user, role, useRoutingScope());
}

function caseRights(c: RoutingCase, user: Staff, role: Role, scope: string) {
  const visible = scope === 'ALL' || scope === c.team;
  const sameTeam = user.active && role !== 'base' && user.team === c.team;
  const mine = c.claimedBy === user.id;
  return {
    visible,
    canClaim: visible && sameTeam && c.status === 'NEW',
    canReply: visible && mine && (c.status === 'IN_PROGRESS' || c.status === 'ANSWERED'),
    canComplete: visible && mine && (c.status === 'IN_PROGRESS' || c.status === 'ANSWERED'),
    mine,
    role,
    userId: user.id,
  };
}

function useCaseMutations(c: RoutingCase, setFlash: (f: Flash) => void) {
  const qc = useQueryClient();
  const { userId } = useCaseRights(c);
  const refresh = () => qc.invalidateQueries({ queryKey: ['routing'] });
  const fail = (e: unknown) => {
    setFlash({ severity: 'error', title: e instanceof RoutingError ? e.message : 'Không thực hiện được thao tác. Thử lại sau ít phút.' });
    refresh();
  };
  const claim = useMutation({
    mutationFn: () => claimCase(c.id, userId),
    onSuccess: () => {
      setFlash({ severity: 'success', title: 'Bạn đã nhận ca này', description: 'Ca chuyển sang Đang xử lý. Hạn trả lời không đổi.' });
      refresh();
    },
    onError: fail,
  });
  const complete = useMutation({
    mutationFn: () => completeCase(c.id, userId),
    onSuccess: () => {
      setFlash({ severity: 'success', title: 'Đã đánh dấu hoàn tất', description: 'Ca chuyển sang mục Hoàn tất.' });
      refresh();
    },
    onError: fail,
  });
  return { claim, complete, refresh, fail };
}

function Actions({ c, setFlash }: { c: RoutingCase; setFlash: (f: Flash) => void }) {
  const r = useCaseRights(c);
  const { claim, complete } = useCaseMutations(c, setFlash);
  if (!r.canClaim && !r.canComplete) return null;
  return (
    <div className="rt-actions">
      {r.canClaim && (
        <Button onClick={() => claim.mutate()} disabled={claim.isPending}>
          {claim.isPending ? 'Đang nhận ca…' : 'Nhận ca'}
        </Button>
      )}
      {r.canComplete && (
        <Button variant="outline" onClick={() => complete.mutate()} disabled={complete.isPending}>
          {complete.isPending ? 'Đang cập nhật…' : 'Đánh dấu hoàn tất'}
        </Button>
      )}
    </div>
  );
}

/* ---------- Thân chi tiết ---------- */

function Body({ c, flash, setFlash }: { c: RoutingCase; flash: Flash; setFlash: (f: Flash) => void }) {
  const r = useCaseRights(c);
  const staff = useStaff();
  const { navigate } = useRoute();
  const tp = taxpayers[c.taxpayerId];
  const name = (id?: string) => staff.find((s) => s.id === id)?.name ?? '';
  const due = dueInfo(c);

  if (!r.visible) {
    return <BlockEmpty>Ca này thuộc hàng chung của {teamName(c.team)}, ngoài phạm vi tài khoản của bạn.</BlockEmpty>;
  }

  const handlerNote =
    c.status === 'NEW'
      ? r.role === 'base'
        ? `Ca đang chờ trong hàng chung của ${teamName(c.team)}. Cán bộ trong tổ nhận và trả lời ca.`
        : r.canClaim
          ? 'Ca chưa có người nhận. Bấm Nhận ca để xử lý; người khác trong tổ sẽ thấy bạn đang xử lý.'
          : null
      : c.status !== 'DONE' && !r.mine
        ? `Ca đang do ${name(c.claimedBy)} xử lý. Chỉ người nhận ca mới trả lời và đánh dấu hoàn tất được.`
        : null;

  const missing = c.draft?.fields.filter((f) => f.value == null).length ?? 0;

  return (
    <>
      {flash && (
        <Feedback
          className="rt-flash"
          severity={flash.severity}
          title={flash.title}
          description={flash.description}
        />
      )}
      <section className="ov-section">
        <div className="rt-due-line">
          <StatusPill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</StatusPill>
          {c.status !== 'DONE' || c.answeredAt ? <StatusPill tone={due.tone}>{due.text}</StatusPill> : null}
        </div>
        <dl className="kv">
          <dt>Loại ca</dt>
          <dd>{KIND_LABEL[c.kind]}</dd>
          <dt>Nội dung</dt>
          <dd>{c.topic}</dd>
          <dt>Lý do Geo AI chuyển</dt>
          <dd>{c.reason}</dd>
          <dt>Chuyển lúc</dt>
          <dd>{dmyhm(c.createdAt)}</dd>
          <dt>Hạn trả lời</dt>
          <dd>{dmyhm(c.dueAt)}</dd>
          <dt>Hàng chung</dt>
          <dd>{teamName(c.team)}</dd>
          <dt>Người xử lý</dt>
          <dd>{c.claimedBy ? `${name(c.claimedBy)}, nhận lúc ${hm(c.claimedAt!)} ${dm(c.claimedAt!)}` : 'Chưa có người nhận'}</dd>
          {c.answeredAt && (
            <>
              <dt>Thời gian xử lý</dt>
              <dd>{duration(minutesBetween(c.createdAt, c.answeredAt))} từ lúc chuyển tới lúc trả lời</dd>
            </>
          )}
          <dt>Mã ca</dt>
          <dd className="id">{c.id}</dd>
        </dl>
        {handlerNote && <p className="rt-handler-note">{handlerNote}</p>}
      </section>

      <section className="ov-section">
        <ViewTabs
          items={[
            { key: 'chat', label: `Hội thoại (${c.chat.length})`, children: <Chat c={c} name={name} /> },
            {
              key: 'draft',
              label: c.draft ? `Dữ liệu đang làm dở${missing ? ` (${missing} mục trống)` : ''}` : 'Dữ liệu đang làm dở',
              children: c.draft ? (
                <div className="rt-tabpad">
                  <p className="rt-draft-head">
                    <b>{c.draft.form}</b>
                    <span>Kỳ {c.draft.period}. Geo AI lưu phần hộ đã nhập tới lúc chuyển ca.</span>
                  </p>
                  <dl className="kv">
                    {c.draft.fields.map((f) => (
                      <Fragment key={f.label}>
                        <dt>{f.label}</dt>
                        <dd>{f.value ?? <span className="rt-missing">Chưa điền</span>}</dd>
                      </Fragment>
                    ))}
                  </dl>
                </div>
              ) : (
                <p className="rt-tabpad chart-note">Hộ chưa nhập dữ liệu khai nào trong hội thoại này.</p>
              ),
            },
            {
              key: 'profile',
              label: 'Hồ sơ hộ',
              children: (
                <div className="rt-tabpad">
                  <dl className="kv">
                    <dt>Tên</dt>
                    <dd>{tp.name}</dd>
                    <dt>MST</dt>
                    <dd>{tp.mst}</dd>
                    <dt>Trạng thái HKD</dt>
                    <dd>{tp.hkdStatus}</dd>
                    <dt>Cán bộ phụ trách</dt>
                    <dd>{name(officerOf[tp.id]) || '—'}</dd>
                    <dt>Hồ sơ khai còn thiếu</dt>
                    <dd>{tp.fileCount ? <span className="rt-inline">{tp.fileCount} hồ sơ <Pill map={PRIORITY} value={tp.filePriority!} /></span> : 'Không có'}</dd>
                    <dt>Khoản còn phải nộp</dt>
                    <dd>{tp.payCount ? <span className="rt-inline">{tp.payCount} khoản <Pill map={PRIORITY} value={tp.payPriority!} /></span> : 'Không có'}</dd>
                  </dl>
                  <Button variant="outline" className="rt-open-hkd" onClick={() => navigate('/quan-ly-hkd', { muc: 'danh-sach', detail: `t:${tp.id}` })}>
                    Mở hồ sơ trong Quản lý HKD
                  </Button>
                </div>
              ),
            },
          ]}
        />
      </section>

      {r.canReply && <ReplyBox c={c} setFlash={setFlash} />}

      <section className="ov-section">
        <h3 className="ov-section__title">Diễn biến</h3>
        <ol className="timeline">
          {c.events.map((e, i) => (
            <li key={i}>
              <time dateTime={e.at}>{hm(e.at)} {dm(e.at)}</time>
              <span>
                {e.text}
                {e.by && <small>{e.by}</small>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function Chat({ c, name }: { c: RoutingCase; name: (id?: string) => string }) {
  const tp = taxpayers[c.taxpayerId];
  return (
    <ol className="rt-chat rt-tabpad" aria-label="Lịch sử hội thoại giữa hộ, Geo AI và cán bộ">
      {c.chat.map((m, i) => (
        <li key={i} className={`rt-msg rt-msg--${m.from}`}>
          <span className="rt-msg__who">
            {m.from === 'household' ? tp.name : m.from === 'ai' ? 'Geo AI' : `Cán bộ ${name(m.by)}`}, {hm(m.at)} {dm(m.at)}
          </span>
          <p>{m.text}</p>
          {m.from === 'ai' && m.at === c.createdAt && <span className="rt-handoff">Geo AI chuyển ca tới cán bộ</span>}
        </li>
      ))}
    </ol>
  );
}

function ReplyBox({ c, setFlash }: { c: RoutingCase; setFlash: (f: Flash) => void }) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const { user } = usePermissions();
  const fieldId = useId();
  const reply = useMutation({
    mutationFn: () => replyCase(c.id, user.id, text),
    onSuccess: () => {
      setText('');
      setFlash({
        severity: 'success',
        title: 'Đã gửi trả lời cho hộ',
        description: `Đã báo kết quả cho hộ qua iHanoi lúc ${hm(NOW_ISO)}. Bấm Đánh dấu hoàn tất khi không cần trao đổi thêm.`,
      });
      qc.invalidateQueries({ queryKey: ['routing'] });
    },
    onError: (e) => setError(e instanceof RoutingError ? e.message : 'Chưa gửi được trả lời. Nội dung vẫn còn trong ô, hãy thử lại.'),
  });
  const submit = () => {
    if (text.trim().length < 10) {
      setError('Nhập ít nhất 10 ký tự để hộ hiểu được hướng dẫn.');
      return;
    }
    setError(null);
    reply.mutate();
  };
  return (
    <section className="ov-section rt-reply">
      <h3 className="ov-section__title">
        <label htmlFor={fieldId}>{c.status === 'ANSWERED' ? 'Gửi thêm trả lời cho hộ' : 'Trả lời hộ'}</label>
      </h3>
      <Textarea
        id={fieldId}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError(null);
        }}
        maxLength={1000}
        rows={4}
        placeholder="Hướng dẫn cụ thể cho trường hợp của hộ"
        aria-invalid={!!error}
        aria-describedby={`${fieldId}-help${error ? ` ${fieldId}-err` : ''}`}
      />
      <div className="rt-reply__meta">
        <span id={`${fieldId}-help`}>Hộ nhận trả lời trong ứng dụng iHanoi, kèm thông báo đẩy.</span>
        <span aria-live="off">{text.length} / 1000</span>
      </div>
      {error && (
        <p id={`${fieldId}-err`} className="rt-error" role="alert">
          {error}
        </p>
      )}
      <div className="rt-reply__actions">
        <Button onClick={submit} disabled={reply.isPending}>
          {reply.isPending ? 'Đang gửi…' : 'Gửi trả lời'}
        </Button>
      </div>
    </section>
  );
}
