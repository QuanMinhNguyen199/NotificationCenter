import { DialogFrame, Feedback, TextareaField } from '@/components/Controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AUTO_VARS, varLabel, draftOf, fetchTemplates, publishDraft, publishedOf, saveDraft, type Template } from '../api/notifyApi';
import Overlay from '../components/Overlay';
import { BlockEmpty, BlockError, Skel } from '../components/Blocks';
import { StatusPill } from '../components/Status';
import { usePermissions } from '../demo/DemoContext';
import { dmyhm } from '../lib/format';
import { useRoute } from '../lib/router';
import { PushPreview } from '../stats/Details';

export const TITLE_MAX = 65;
export const BODY_MAX = 240;

/** Điền biến minh họa để xem trước: biến tự điền lấy từ một NNT mẫu, biến khác hiện tên biến. */
export function fillSample(text: string, values: Record<string, string> = {}) {
  const sample: Record<string, string> = { ten_nnt: 'Hộ kinh doanh An Bình', mst: '9990000001', ...values };
  return text.replace(/\{(\w+)\}/g, (_, k: string) => sample[k] || `[${varLabel(k)}]`);
}

function Editor({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const { user, canEditTemplates } = usePermissions();
  const qc = useQueryClient();
  const base = template ? draftOf(template) ?? publishedOf(template) : null;
  const [form, setForm] = useState({ name: template?.name ?? '', purpose: template?.purpose ?? '', title: base?.title ?? '', body: base?.body ?? '' });
  const [publishing, setPublishing] = useState(false);
  const [reason, setReason] = useState('');
  const readOnly = !canEditTemplates;
  const errors = {
    name: !form.name.trim() ? 'Nhập tên mẫu.' : '',
    title: !form.title.trim() ? 'Nhập tiêu đề.' : form.title.length > TITLE_MAX ? `Tối đa ${TITLE_MAX} ký tự.` : '',
    body: !form.body.trim() ? 'Nhập nội dung.' : form.body.length > BODY_MAX ? `Tối đa ${BODY_MAX} ký tự.` : '',
  };
  const invalid = Object.values(errors).some(Boolean);
  const [shown, setShown] = useState(false);
  const changed = !base || form.title !== base.title || form.body !== base.body || form.name !== template?.name || form.purpose !== template?.purpose;
  const draft = template && draftOf(template);

  const save = useMutation({
    mutationFn: () => saveDraft({ id: template?.id, ...form }, user.name),
    onSuccess: () => (qc.invalidateQueries({ queryKey: ['templates'] }), toast.success('Đã lưu bản nháp.'), onClose()),
  });
  const publish = useMutation({
    mutationFn: async () => {
      const t = changed ? await saveDraft({ id: template?.id, ...form }, user.name) : template!;
      return publishDraft(t.id, reason.trim(), user.name);
    },
    onSuccess: (t) => (qc.invalidateQueries({ queryKey: ['templates'] }), toast.success(`Đã xuất bản ${t.name}, phiên bản ${publishedOf(t)!.version}.`), onClose()),
  });
  const insert = (v: string) => setForm({ ...form, body: `${form.body}{${v}}` });

  const footer = readOnly ? undefined : (
    <div className="sheet__footer">
      <Button variant="outline" onClick={onClose}>Đóng</Button>
      <Button variant="outline" disabled={!changed} loading={save.isPending} onClick={() => (setShown(true), !invalid && save.mutate())}>Lưu nháp</Button>
      <Button disabled={!changed && !draft} onClick={() => (setShown(true), !invalid && setPublishing(true))}>Xuất bản</Button>
    </div>
  );

  return (
    <Overlay open onClose={onClose} title={template ? template.name : 'Mẫu tin mới'} width={720} footer={footer}>
      <div className="tpl-edit">
        <div className="acct-form">
          {readOnly && <Feedback severity="info" title="Chỉ lãnh đạo cơ sở soạn và xuất bản mẫu tin." />}
          <div className="field">
            <label className="field__label" htmlFor="tpl-name">Tên mẫu</label>
            <Input id="tpl-name" value={form.name} disabled={readOnly} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={shown && !!errors.name} />
            {shown && errors.name && <span className="field__error">{errors.name}</span>}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="tpl-purpose">Dùng để</label>
            <Input id="tpl-purpose" value={form.purpose} disabled={readOnly} onChange={(e) => setForm({ ...form, purpose: e.target.value })} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="tpl-title">Tiêu đề <span className="field__count">{form.title.length}/{TITLE_MAX}</span></label>
            <Input id="tpl-title" value={form.title} disabled={readOnly} onChange={(e) => setForm({ ...form, title: e.target.value })} aria-invalid={shown && !!errors.title} />
            {shown && errors.title && <span className="field__error">{errors.title}</span>}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="tpl-body">Nội dung <span className="field__count">{form.body.length}/{BODY_MAX}</span></label>
            <TextareaField id="tpl-body" rows={4} value={form.body} disabled={readOnly} onChange={(e) => setForm({ ...form, body: e.target.value })} aria-invalid={shown && !!errors.body} />
            {shown && errors.body && <span className="field__error">{errors.body}</span>}
            {!readOnly && (
              <div className="tpl-vars">
                {Object.keys(AUTO_VARS).map((k) => (
                  <button key={k} type="button" className="tab-action" onClick={() => insert(k)}>Chèn {AUTO_VARS[k].charAt(0).toLowerCase() + AUTO_VARS[k].slice(1)}</button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="tpl-edit__preview">
          <p className="field__label">Xem trước trên iHanoi</p>
          <PushPreview title={fillSample(form.title) || 'Tiêu đề'} body={fillSample(form.body) || 'Nội dung thông báo'} />
          {template && (
            <>
              <p className="field__label" style={{ marginTop: 20 }}>Phiên bản</p>
              <ol className="timeline">
                {template.versions.map((v) => (
                  <li key={`${v.version}-${v.status}`}>
                    <time>v{v.version}</time>
                    <span>
                      {v.status === 'DRAFT' ? 'Bản nháp' : v === publishedOf(template) ? 'Đang dùng' : 'Đã xuất bản'}
                      <small>{v.by}, {dmyhm(v.at)}{v.reason ? `: ${v.reason}` : ''}</small>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
      {publishing && (
        <DialogFrame
          open
          width={520}
          onClose={() => setPublishing(false)}
          title="Xuất bản mẫu tin?"
          footer={
            <div className="sheet__footer">
              <Button variant="outline" onClick={() => setPublishing(false)}>Quay lại</Button>
              <Button loading={publish.isPending} disabled={!reason.trim()} onClick={() => publish.mutate()}>Xuất bản</Button>
            </div>
          }
        >
          <div className="acct-form">
            <Feedback severity="info" title="Lần gửi mới dùng phiên bản này. Lần gửi đã tạo giữ nội dung cũ; phiên bản đã xuất bản không sửa được." />
            <div className="field">
              <label className="field__label" htmlFor="tpl-reason">Lý do thay đổi (bắt buộc)</label>
              <TextareaField id="tpl-reason" rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
        </DialogFrame>
      )}
    </Overlay>
  );
}

export default function TemplatesPage() {
  const { canViewTemplates, canEditTemplates, canSend } = usePermissions();
  const { navigate } = useRoute();
  const q = useQuery({ queryKey: ['templates'], queryFn: fetchTemplates, enabled: canViewTemplates });
  const [open, setOpen] = useState<Template | 'new' | null>(null);

  if (!canViewTemplates) return <BlockEmpty>Màn Mẫu tin chỉ dành cho lãnh đạo cơ sở và lãnh đạo tổ.</BlockEmpty>;

  return (
    <div className="acct-page">
      <h1 className="sr-only">Mẫu tin</h1>
      <div className="page-toolbar">
        <p className="workspace-note">Soạn nội dung dùng lại. Xuất bản mẫu để chọn khi gửi; xuất bản chưa gửi tới NNT.</p>
        {canEditTemplates && (
          <Button onClick={() => setOpen('new')}>
            <Plus aria-hidden="true" /> Mẫu tin mới
          </Button>
        )}
      </div>
      {q.isError ? (
        <BlockError message="Không tải được danh sách mẫu tin." onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <Skel w="100%" h={200} />
      ) : q.data.length === 0 ? (
        <BlockEmpty>Chưa có mẫu tin nào.</BlockEmpty>
      ) : (
        <ul className="tpl-list">
          {q.data.map((t) => {
            const pub = publishedOf(t);
            const draft = draftOf(t);
            return (
              <li key={t.id}>
                <button type="button" className="tpl-row" onClick={() => setOpen(t)}>
                  <span className="tpl-row__main">
                    <span className="tpl-row__name">{t.name}</span>
                    <span className="tpl-row__purpose">{t.purpose}</span>
                  </span>
                  <span className="tpl-row__meta">
                    {pub ? <StatusPill tone="success">Đang dùng v{pub.version}</StatusPill> : <StatusPill tone="neutral">Chưa xuất bản</StatusPill>}
                    {draft && <StatusPill tone="warning">Có bản nháp</StatusPill>}
                  </span>
                </button>
                {pub && canSend && <Button variant="outline" className="tpl-use" onClick={() => navigate('/gui-thong-bao', { tao: '1', modele: t.id })}>Dùng mẫu để gửi</Button>}
              </li>
            );
          })}
        </ul>
      )}
      {open && <Editor template={open === 'new' ? null : open} onClose={() => setOpen(null)} />}
    </div>
  );
}
