import { DialogFrame, DateTimeField, OptionGroup, ViewTabs, Feedback, TextareaField } from '@/shared/components/Controls';
import { Label } from '@/shared/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/radio-group';
import { Button } from '@/shared/ui/button';
import { DEMO_NOW } from '@/shared/lib/demoClock';
import { useState } from 'react';
import Overlay from '@/shared/components/Overlay';
import { StatusPill } from '@/shared/components/Status';
import { AREAS, FIELD_META, formatValue, type ConfigValues, type ConfigVersion, type FieldKey } from '@/shared/data/config';
import { dmyhm } from '@/shared/lib/format';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { useHideNavWhile } from '@/shared/lib/overlay';
import { PushPreview } from '@/features/records/PushPreview';
import { DayRibbon } from './DayRibbon';
import { nextRuns } from './nextRuns';

/* ---------- Xem trước ---------- */

const SAMPLE: Record<'D1a' | 'D1b' | 'D4', { push: { title: string; body: string }; full: (v: ConfigValues) => string[] }> = {
  D1a: {
    push: { title: 'Nhắc khai thuế', body: 'Bạn còn hồ sơ khai thuế cần nộp. Mở iHanoi để xem hạn nộp.' },
    full: (v) => [
      'Kính gửi Hộ kinh doanh An Bình (MST 9990000001),',
      `Hồ sơ khai thuế quý III/2026 chưa được nộp. Hạn nộp 30/10/2026 — còn ${v.daysBefore} ngày trở xuống nên được nhắc từ hôm nay.`,
      'Vui lòng hoàn thành trên Cổng dịch vụ công hoặc liên hệ Thuế cơ sở A.',
    ],
  },
  D1b: {
    push: { title: 'Nhắc nộp thuế', body: 'Bạn còn khoản thuế cần nộp. Mở iHanoi để xem hạn nộp.' },
    full: (v) => [
      'Kính gửi Nguyễn Minh Phương (MST 9990000002),',
      `Số tiền thuế còn phải nộp: 1.250.000 đồng. Hạn nộp 30/10/2026; nhắc bắt đầu trước hạn ${v.daysBefore} ngày và tiếp tục hằng ngày khi quá hạn.`,
    ],
  },
  D4: {
    push: { title: 'Doanh thu gần ngưỡng sử dụng hóa đơn', body: 'Mở iHanoi để xem doanh thu ghi nhận và việc cần chuẩn bị.' },
    full: (v) => [
      'Kính gửi Trần Văn Hòa (MST 9990000003),',
      `Doanh thu ghi nhận từ đầu năm đạt ${v.nearThresholdPct + 1}% ngưỡng sử dụng hóa đơn 1.000.000.000 đồng (ngưỡng nhắc: ${v.nearThresholdPct}%).`,
      'Cơ quan thuế đề nghị chuẩn bị đăng ký sử dụng hóa đơn trước khi vượt ngưỡng.',
    ],
  },
};

export function PreviewOverlay({ open, onClose, draft, applied, dirty }: { open: boolean; onClose: () => void; draft: ConfigValues; applied: ConfigValues; dirty: boolean }) {
  const [sample, setSample] = useState<'D1a' | 'D1b' | 'D4'>('D1a');
  const runs = nextRuns(draft);
  return (
    <Overlay
      open={open}
      onClose={onClose}
      width={560}
      title={
        <span className="preview-title">
          Xem trước
          <span className="preview-label">
            Bản xem trước — chưa áp dụng
          </span>
        </span>
      }
    >
      <p className="chart-note chart-note--lead">
        {dirty ? 'Tính từ bản đang sửa, chưa áp dụng.' : 'Đang hiển thị thiết lập đang áp dụng.'}
      </p>
      <ViewTabs
        items={[
          {
            key: 'schedule',
            label: 'Lịch chạy',
            children: (
              <>
                <DayRibbon v={draft} applied={applied} compact />
                <div className="ov-section ov-section--spaced">
                  <h3 className="ov-section__title">Các lần rà soát gần nhất</h3>
                  {runs.length ? (
                    <ul className="next-runs">{runs.map((r) => <li key={r}>{r}</li>)}</ul>
                  ) : (
                    <p className="chart-note">Quét tự động đang tắt — không có lượt tự chạy.</p>
                  )}
                </div>
                <div className="ov-section">
                  <h3 className="ov-section__title">Đợt gửi kế tiếp</h3>
                  <dl className="kv">
                    <dt>Khung gửi</dt>
                    <dd>{draft.sendStart}–{draft.sendEnd} (giờ Việt Nam)</dd>
                    <dt>Duyệt đợt bất thường</dt>
                    <dd>{draft.holdAbnormal ? `Giữ khi tăng trên ${draft.growthFactor} lần` : 'Không giữ'}</dd>
                    <dt>Đợt đang chạy</dt>
                    <dd>Giữ thiết lập đã ghi nhận (phiên bản 12)</dd>
                  </dl>
                </div>
              </>
            ),
          },
          {
            key: 'content',
            label: 'Nội dung',
            children: (
              <>
                <OptionGroup
                  value={sample}
                  onValueChange={(v) => setSample(v as 'D1a' | 'D1b' | 'D4')}
                  options={[
                    { value: 'D1a', label: 'Khai thuế' },
                    { value: 'D1b', label: 'Nộp thuế' },
                    { value: 'D4', label: 'Doanh thu' },
                  ]}
                />
                <div className="ov-section ov-section--spaced">
                  <h3 className="ov-section__title">Bản đẩy</h3>
                  <PushPreview {...SAMPLE[sample].push} />
                </div>
                <div className="ov-section">
                  <h3 className="ov-section__title">Nội dung đầy đủ</h3>
                  <div className="full-content">
                    {SAMPLE[sample].full(draft).map((t, i) => (
                      <p key={i}>{t}</p>
                    ))}
                  </div>
                  
                </div>
              </>
            ),
          },
        ]}
      />
    </Overlay>
  );
}

/* ---------- Xác nhận lưu ---------- */

function affectedGroups(keys: FieldKey[]) {
  const ids = new Set(keys.flatMap((k) => FIELD_META[k].group));
  return AREAS.filter((a) => a.groups.some((g) => ids.has(g))).map((a) => a.name);
}

export interface SaveInput {
  reason: string;
  effective: 'now' | string;
}

export function SaveDialog({
  open,
  onClose,
  keys,
  from,
  to,
  saving,
  error,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  keys: FieldKey[];
  from: ConfigValues;
  to: ConfigValues;
  saving: boolean;
  error?: string;
  onConfirm: (v: SaveInput) => void;
}) {
  const bp = useBreakpoint();
  const mobile = bp === 'mobile';
  const [mode, setMode] = useState<'now' | 'at'>('now');
  const [at, setAt] = useState<string | null>('2026-10-29T00:00');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  useHideNavWhile(open && mobile);

  const reasonErr = touched && !reason.trim() ? 'Nhập lý do thay đổi.' : '';
  const atErr = touched && mode === 'at' && (!at || at <= DEMO_NOW) ? 'Chọn thời điểm sau hiện tại.' : '';

  const submit = () => {
    setTouched(true);
    if (!reason.trim() || (mode === 'at' && (!at || at <= DEMO_NOW))) return;
    onConfirm({ reason: reason.trim(), effective: mode === 'now' ? 'now' : at! });
  };

  const changes = mobile ? (
    <div className="diff-cards">
      {keys.map((k) => (
        <div key={k} className="diff-card">
          <span className="diff-card__label">{FIELD_META[k].label}</span>
          <span className="diff-old">{formatValue(k, from[k])}</span>
          <span aria-hidden="true">→</span>
          <span className="diff-new">{formatValue(k, to[k])}</span>
        </div>
      ))}
    </div>
  ) : (
    <table className="diff-table">
      <thead>
        <tr>
          <th>Trường</th>
          <th>Đang áp dụng</th>
          <th>Giá trị mới</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => (
          <tr key={k}>
            <td>{FIELD_META[k].label}</td>
            <td className="diff-old">{formatValue(k, from[k])}</td>
            <td className="diff-new">{formatValue(k, to[k])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const body = (
    <div className="save-body">
      <div>
        <p className="field__label save-body__summary">
          {keys.length} thay đổi · ảnh hưởng: {affectedGroups(keys).join(', ')}
        </p>
        {changes}
      </div>
      <div className="field">
        <span className="field__label" id="eff-label">Thời điểm hiệu lực</span>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'now' | 'at')} aria-labelledby="eff-label" className="radio-stack">
          <div className="flex min-h-9 items-center gap-2"><RadioGroupItem value="now" id="eff-now" /><Label htmlFor="eff-now">Áp dụng ngay cho các đợt mới</Label></div>
          <div className="flex min-h-9 items-center gap-2"><RadioGroupItem value="at" id="eff-at" /><Label htmlFor="eff-at">Từ ngày, giờ chỉ định</Label></div>
        </RadioGroup>
        {mode === 'at' && (
          <DateTimeField value={at ?? '2026-10-29T00:00'} onValueChange={(value) => setAt(value)} invalid={!!atErr} describedBy={atErr ? 'effective-error' : undefined} />
        )}
        {atErr && <span className="field__error" id="effective-error" role="alert">{atErr}</span>}
      </div>
      <div className="field">
        <label className="field__label" htmlFor="save-reason">
          Lý do thay đổi (bắt buộc)
        </label>
        <TextareaField id="save-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={!!reasonErr} aria-describedby={reasonErr ? 'save-reason-err' : undefined} />
        {reasonErr && <span className="field__error" id="save-reason-err" role="alert">{reasonErr}</span>}
      </div>
      <Feedback
        severity="info"
       
        title="Phạm vi: Toàn hệ thống. Đợt đã tạo hoặc đang chạy giữ thiết lập đã ghi nhận; thay đổi chỉ áp cho các đợt mới."
      />
      {error && <Feedback severity="error" title={error} />}
    </div>
  );

  const footer = (
    <div className="sheet__footer">
      <Button variant="outline" size={mobile ? 'lg' : undefined} onClick={onClose}>
        Hủy
      </Button>
      <Button size={mobile ? 'lg' : undefined} variant="default" loading={saving} onClick={submit}>
        Lưu và áp dụng
      </Button>
    </div>
  );

  return <DialogFrame open={open} onClose={onClose} title="Xác nhận lưu thiết lập" footer={footer} width={640}>{body}</DialogFrame>;
}

/* ---------- Lịch sử thay đổi ---------- */

export function HistoryOverlay({ open, onClose, history }: { open: boolean; onClose: () => void; history: ConfigVersion[] }) {
  return (
    <Overlay open={open} onClose={onClose} title="Lịch sử thay đổi" width={560}>
      {history.map((h, i) => (
        <article key={h.version} className="history-item">
          <div className="history-item__head">
            <b>Phiên bản {h.version}</b>
            {h.pending ? (
              <StatusPill tone="warning">Chờ hiệu lực từ {dmyhm(h.effectiveAt)}</StatusPill>
            ) : i === history.findIndex((x) => !x.pending) ? (
              <StatusPill tone="success">Đang áp dụng</StatusPill>
            ) : (
              <StatusPill tone="neutral">Đã thay thế</StatusPill>
            )}
          </div>
          <p className="history-item__meta">
            {h.updatedBy} · {dmyhm(h.updatedAt)} · hiệu lực {dmyhm(h.effectiveAt)}
          </p>
          <p className="history-item__reason">{h.reason}</p>
          {h.changes.length > 0 && (
            <table className="diff-table diff-table--spaced">
              <thead>
                <tr>
                  <th>Trường</th>
                  <th>Trước</th>
                  <th>Sau</th>
                </tr>
              </thead>
              <tbody>
                {h.changes.map((c) => (
                  <tr key={c.key}>
                    <td>{FIELD_META[c.key].label}</td>
                    <td className="diff-old">{c.from}</td>
                    <td className="diff-new">{c.to}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      ))}
    </Overlay>
  );
}

/* ---------- So sánh khi xung đột ---------- */

export function CompareModal({ open, onClose, theirs, mine, base, onRebase }: { open: boolean; onClose: () => void; theirs: ConfigVersion; mine: ConfigValues; base: ConfigValues; onRebase: () => void }) {
  const keys = (Object.keys(mine) as FieldKey[]).filter((k) => theirs.values[k] !== base[k] || mine[k] !== base[k]);
  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      title={`So sánh với phiên bản ${theirs.version}`}
      width={680}
      footer={
        <div className="sheet__footer">
          <Button variant="outline" onClick={onClose}>Đóng</Button>
          <Button variant="default" onClick={onRebase}>
            Dựa trên phiên bản {theirs.version}, giữ thay đổi của tôi
          </Button>
        </div>
      }
    >
      <p className="chart-note chart-note--flush">
        {theirs.updatedBy} lưu lúc {dmyhm(theirs.updatedAt)}: “{theirs.reason}”
      </p>
      <table className="diff-table">
        <thead>
          <tr>
            <th>Trường</th>
            <th>Bạn bắt đầu từ</th>
            <th>Phiên bản {theirs.version}</th>
            <th>Bản của bạn</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <td>{FIELD_META[k].label}</td>
              <td>{formatValue(k, base[k])}</td>
              <td className={theirs.values[k] !== base[k] ? 'diff-new' : undefined}>{formatValue(k, theirs.values[k])}</td>
              <td className={mine[k] !== base[k] ? 'diff-new' : undefined}>{formatValue(k, mine[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DialogFrame>
  );
}
