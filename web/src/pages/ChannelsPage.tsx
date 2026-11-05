import { DialogFrame, Feedback, TextareaField } from '@/components/Controls';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { fetchChannels, setChannelStatus, type Capability, type Channel, type ChannelStatus } from '../api/notifyApi';
import { BlockEmpty, BlockError, Skel } from '../components/Blocks';
import { StatusPill, type Tone } from '../components/Status';
import { usePermissions } from '../demo/DemoContext';
import { dmyhm } from '../lib/format';
import { useBreakpoint } from '../lib/useMedia';

export const CHANNEL_STATUS: Record<ChannelStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Đang hoạt động', tone: 'success' },
  PAUSED: { label: 'Tạm dừng', tone: 'warning' },
  DISABLED_EMERGENCY: { label: 'Ngắt khẩn cấp', tone: 'danger' },
  NOT_CONNECTED: { label: 'Chưa kết nối', tone: 'neutral' },
};
const CAP: Record<Capability, string> = { VERIFIED: 'Có, đã xác minh', UNVERIFIED: 'Chưa xác minh', NONE: '—' };

type Action = { to: ChannelStatus; label: string; danger?: boolean; impact: string; reasonRequired: boolean };

/** Thao tác được phép từ trạng thái hiện tại, kèm hệ quả nói rõ trước khi xác nhận. */
function actionsFor(c: Channel): Action[] {
  const emergency: Action = { to: 'DISABLED_EMERGENCY', label: 'Ngắt khẩn cấp', danger: true, reasonRequired: true, impact: `Chặn mọi lần gửi mới và thử lại qua ${c.name}. Tin đang chờ bị hủy, không tự chuyển sang kênh khác. Tin ${c.name} đã tiếp nhận không thu hồi được.` };
  if (c.status === 'ACTIVE') return [{ to: 'PAUSED', label: 'Tạm dừng', reasonRequired: true, impact: `Tin đang chờ giữ nguyên trong hàng đợi tới khi mở lại hoặc hết hạn; lần gửi mới qua ${c.name} cũng chờ.` }, emergency];
  if (c.status === 'PAUSED') return [{ to: 'ACTIVE', label: 'Mở lại', reasonRequired: false, impact: 'Tin đang chờ tiếp tục gửi theo thứ tự.' }, emergency];
  if (c.status === 'DISABLED_EMERGENCY') return [{ to: 'ACTIVE', label: 'Bỏ ngắt khẩn cấp', reasonRequired: true, impact: 'Chỉ các lần gửi mới đi qua kênh này. Tin đã bị hủy lúc ngắt không được gửi lại.' }];
  return [];
}

function ConfirmStatus({ channel, action, onClose }: { channel: Channel; action: Action; onClose: () => void }) {
  const { user } = usePermissions();
  const bp = useBreakpoint();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const invalid = action.reasonRequired && !reason.trim();
  const m = useMutation({
    mutationFn: () => setChannelStatus(channel.id, action.to, reason.trim(), user.name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['channels'] });
      qc.invalidateQueries({ queryKey: ['sends'] });
      qc.invalidateQueries({ queryKey: ['send'] });
      toast.success(`${channel.name}: ${CHANNEL_STATUS[action.to].label.toLowerCase()}.`);
      onClose();
    },
  });
  const size = bp === 'mobile' ? 'lg' : undefined;
  return (
    <DialogFrame
      open
      onClose={onClose}
      width={520}
      title={`${action.label}: ${channel.name}?`}
      footer={
        <div className="sheet__footer">
          <Button variant="outline" size={size} onClick={onClose}>Quay lại</Button>
          <Button
            size={size}
            className={action.danger ? 'bg-destructive text-white hover:bg-destructive/90' : undefined}
            loading={m.isPending}
            onClick={() => (setTouched(true), !invalid && m.mutate())}
          >
            {action.label}
          </Button>
        </div>
      }
    >
      <div className="acct-form">
        <Feedback severity={action.danger ? 'error' : 'info'} title={action.impact} />
        <div className="field">
          <label className="field__label" htmlFor="ch-reason">Lý do {action.reasonRequired ? '(bắt buộc)' : '(không bắt buộc)'}</label>
          <TextareaField id="ch-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={touched && invalid} />
          {touched && invalid && <span className="field__error" role="alert">Nhập lý do để {action.label.toLowerCase()}.</span>}
        </div>
        {m.error && <Feedback severity="warning" title={m.error.message} />}
      </div>
    </DialogFrame>
  );
}

export default function ChannelsPage() {
  const { canViewChannels, canManageChannels } = usePermissions();
  const q = useQuery({ queryKey: ['channels'], queryFn: fetchChannels, enabled: canViewChannels });
  const [pending, setPending] = useState<{ channel: Channel; action: Action } | null>(null);

  if (!canViewChannels) return <BlockEmpty>Màn Kênh gửi chỉ dành cho lãnh đạo cơ sở và lãnh đạo tổ.</BlockEmpty>;

  return (
    <div className="acct-page">
      <h1 className="sr-only">Kênh gửi</h1>
      {q.isError ? (
        <BlockError message="Không tải được danh sách kênh." onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <div className="ch-grid">{[0, 1, 2, 3].map((i) => <Skel key={i} w="100%" h={180} />)}</div>
      ) : (
        <div className="ch-grid">
          {q.data.map((c) => (
            <section key={c.id} className="ch-card" aria-labelledby={`ch-${c.id}`}>
              <header className="ch-card__head">
                <h2 className="ch-card__title" id={`ch-${c.id}`}>{c.name}</h2>
                <StatusPill tone={CHANNEL_STATUS[c.status].tone}>{CHANNEL_STATUS[c.status].label}</StatusPill>
              </header>
              <p className="ch-card__desc">{c.desc}</p>
              <dl className="kv ch-card__caps">
                <dt>Xác nhận đã tới máy</dt>
                <dd>{CAP[c.receipt]}</dd>
                <dt>Thử lại an toàn khi hết giờ chờ</dt>
                <dd>{CAP[c.retrySafe]}</dd>
              </dl>
              {c.history[0] && (
                <p className="chart-note">
                  {CHANNEL_STATUS[c.history[0].to].label} bởi {c.history[0].by}, {dmyhm(c.history[0].at)}
                  {c.history[0].reason ? `: ${c.history[0].reason}` : ''}
                </p>
              )}
              {canManageChannels && actionsFor(c).length > 0 && (
                <div className="ch-card__actions">
                  {actionsFor(c).map((a) => (
                    <Button key={a.to} variant="outline" size="sm" className={a.danger ? 'text-destructive' : undefined} onClick={() => setPending({ channel: c, action: a })}>
                      {a.label}
                    </Button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      {pending && <ConfirmStatus channel={pending.channel} action={pending.action} onClose={() => setPending(null)} />}
    </div>
  );
}
