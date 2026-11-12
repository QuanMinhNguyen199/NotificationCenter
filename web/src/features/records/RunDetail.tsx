import { Feedback, TextareaField, DialogFrame } from '@/shared/components/Controls';
import { Button } from '@/shared/ui/button';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/shared/ui/dropdown-menu';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApiError, RUN_ACTIONS, actOnRun, fetchRun, type RunAction } from '@/shared/api/mockApi';
import { BlockError, Skel } from '@/shared/components/Blocks';
import { RUN } from '@/shared/lib/status';
import { Pill } from '@/shared/components/Status';
import { useCurrentUser, usePermissions } from '@/shared/demo/useDemo';
import { dmy, hm, num } from '@/shared/lib/format';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { useHideNavWhile } from '@/shared/lib/overlay';
import type { SendRun } from '@/shared/data/types';
import { RunProgress } from './RunsPane';
import { unitName } from './listHelpers';

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
    <div className="run-confirm">
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

export function RunDetail({ id }: { id: string }) {
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
        <div className="run-head">
          <Pill map={RUN} value={r.status} />
          {actions.length > 0 && (
            <div className="run-head__actions">
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
        <div className="run-detail__progress">
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
      {bp === 'mobile' && <div className="run-detail__spacer" />}
      <ConfirmRun run={r} action={action} onClose={() => setAction(null)} onDone={() => setAction(null)} />
    </>
  );
}
