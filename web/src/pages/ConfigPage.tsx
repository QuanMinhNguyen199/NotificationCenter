import { MobileDisclosure } from '@/components/MobileDisclosure';
import { ViewTabs, Feedback } from '@/components/Controls';
import { Button } from '@/components/ui/button';
import { CircleCheck, Eye, History } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ApiError, saveConfig } from '../api/mockApi';
import { Skel } from '../components/Blocks';
import { DayRibbon } from '../config/DayRibbon';
import { CompareModal, HistoryOverlay, PreviewOverlay, SaveDialog, type SaveInput } from '../config/Dialogs';
import { SectionToggle, sectionsFor, UnusedGroups, type Ctx } from '../config/Forms';
import { useConfigDraft } from '../config/useConfigDraft';
import { AREAS, areaOfField, type AreaId, type FieldKey } from '../data/config';
import { usePermissions } from '../demo/DemoContext';
import { dmyhm } from '../lib/format';
import { useRoute } from '../lib/router';
import { useBreakpoint } from '../lib/useMedia';
import { useGuard } from '../shell/guard';

const readSeen = (key: string) => {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
};
const writeSeen = (key: string, v: number) => {
  try {
    localStorage.setItem(key, String(v));
  } catch {
    /* không lưu được thì chỉ giữ trong phiên */
  }
};

/** Một hàng cài đặt: tên và mô tả bên trái, điều khiển bên phải; trên mobile xếp chồng. */
function SettingRow({ title, desc, toggle, children }: { title: string; desc?: string; toggle?: ReactNode; children?: ReactNode }) {
  return (
    <section className="set-row">
      <div className="set-row__label">
        {/* Công tắc bật/tắt cả mục nằm cùng hàng tên mục; thẻ chỉ có công tắc thì không có phần thân. */}
        <div className="set-row__head">
          <h2 className="set-row__title">{title}</h2>
          {toggle}
        </div>
        {desc && <p className="set-row__desc">{desc}</p>}
      </div>
      {children && <div className="set-row__panel">{children}</div>}
    </section>
  );
}

export default function ConfigPage() {
  const bp = useBreakpoint();
  const mobile = bp === 'mobile';
  const { params, navigate } = useRoute();
  const { canEditConfig, user } = usePermissions();
  const { setGuard } = useGuard();
  const qc = useQueryClient();
  const api = useConfigDraft();
  const { draft, base, applied, latest, dirtyKeys, errors } = api;

  const area = (AREAS.find((a) => a.slug === params.get('muc')) ?? AREAS[0]).id;
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compare, setCompare] = useState(false);
  const [conflict, setConflict] = useState(false);
  // Kết quả lưu hiện ngay tại thanh lưu (nơi vừa thao tác) trong 4 giây, ngoài toast; sửa tiếp thì thay bằng trạng thái chưa lưu.
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(null), 4000);
    return () => window.clearTimeout(t);
  }, [saved]);

  const readOnly = !canEditConfig;
  const dirty = dirtyKeys.length > 0;

  useEffect(() => {
    setGuard({ dirty, discard: api.discard });
    return () => setGuard(null);
  }, [dirty, api.discard, setGuard]);

  useEffect(() => {
    if (readOnly && dirty) api.discard();
  }, [readOnly, dirty, api]);

  // Bản nháp chung cho cả bốn mục nên đổi tab không làm mất thay đổi.
  const pickArea = (id: AreaId) => {
    const a = AREAS.find((x) => x.id === id)!;
    navigate('/thiet-lap', id === 'schedule' ? {} : { muc: a.slug }, true);
  };

  const m = useMutation({
    mutationFn: (s: SaveInput) => saveConfig({ baseVersion: base!.version, values: draft!, reason: s.reason, effective: s.effective, by: user.name }),
    onSuccess: (v) => {
      api.commit(v.version, v.values);
      qc.setQueryData(['config'], (old: { current: typeof v; history: (typeof v)[] } | undefined) =>
        old ? { current: v.pending ? old.current : v, history: [v, ...old.history] } : old,
      );
      setSaving(false);
      setConflict(false);
      const msg = v.pending ? `Đã lưu phiên bản ${v.version}, chờ hiệu lực từ ${dmyhm(v.effectiveAt)}.` : `Đã lưu và áp dụng phiên bản ${v.version}.`;
      toast.success(msg);
      setSaved(msg);
    },
    onError: async (e) => {
      if (e instanceof ApiError && e.code === 'CONFLICT') {
        setSaving(false);
        await qc.invalidateQueries({ queryKey: ['config'] });
        setConflict(true);
      }
    },
  });

  const startSave = () => {
    // Trường đang ẩn vì công tắc tắt không chặn việc lưu: không nhìn thấy thì không sửa được.
    const hidden = new Set(AREAS.flatMap((a) => (ctx ? sectionsFor(a.id, ctx, () => {}) : []))
      .filter((s) => (s.toggle && !draft![s.toggle]) || (s.dependsOn && !draft![s.dependsOn]))
      .flatMap((s) => s.fields.filter((f) => f !== s.toggle)));
    const errKeys = (Object.keys(errors) as FieldKey[]).filter((k) => !hidden.has(k));
    if (errKeys.length) {
      api.setShowErrors(true);
      // Chuyển tới mục có lỗi đầu tiên rồi đưa focus vào trường đó.
      pickArea(areaOfField(errKeys[0]).id);
      setTimeout(() => document.getElementById(`cfg-${errKeys[0]}`)?.focus(), 60);
      return;
    }
    m.reset();
    setSaving(true);
  };

  const ctx: Ctx | null = draft ? { api, v: draft, readOnly } : null;
  const errCount = api.showErrors ? Object.keys(errors).length : 0;
  const pendingVersion = latest?.pending ? latest : null;

  // Nút Lịch sử sáng khi có phiên bản mới mà tài khoản này chưa mở Lịch sử để xem (kể cả bản chính mình vừa lưu).
  // Lần đầu mở màn coi như đã xem bản hiện có; mở Lịch sử thì đánh dấu đã xem.
  const seenKey = `qttb-history-seen:${user.id}`;
  const [seen, setSeen] = useState<number | null>(() => readSeen(seenKey));
  useEffect(() => setSeen(readSeen(seenKey)), [seenKey]);
  const markSeen = useCallback((version: number) => {
    setSeen(version);
    writeSeen(seenKey, version);
  }, [seenKey]);
  useEffect(() => {
    // Mốc đã xem lớn hơn bản mới nhất nghĩa là dữ liệu đã quay về bản cũ (mock nạp lại): lấy lại mốc theo bản hiện có.
    if (latest && (seen === null || seen > latest.version)) markSeen(latest.version);
  }, [latest, seen, markSeen]);
  const unseen =
    latest && seen !== null && latest.version > seen
      ? pendingVersion
        ? `Phiên bản ${pendingVersion.version} chờ hiệu lực ${dmyhm(pendingVersion.effectiveAt)}`
        : `Phiên bản ${latest.version}, ${latest.updatedBy} cập nhật ${dmyhm(latest.updatedAt)}`
      : null;
  const openHistory = () => {
    setHistory(true);
    if (latest) markSeen(latest.version);
  };

  // Badge trạng thái trên tab: Bật (xanh lá), Tắt (xám), số nhóm chưa sử dụng (xám).
  const badgeOf = (id: AreaId) => {
    const a = AREAS.find((x) => x.id === id)!;
    if (!a.flag) return <span className="pill pill--neutral cfg-tab__badge" aria-label={`${a.groups.length} loại`}>{a.groups.length}</span>;
    if (!draft) return null;
    const on = draft[a.flag];
    return <span className={`pill cfg-tab__badge pill--${on ? 'success' : 'neutral'}`}>{on ? 'Bật' : 'Tắt'}</span>;
  };

  const body = (id: AreaId) => {
    if (!ctx || !base) {
      return [0, 1].map((i) => (
        <SettingRow key={i} title="Đang tải">
          <Skel w="100%" h={96} />
        </SettingRow>
      ));
    }
    if (id === 'unused') return <UnusedGroups />;
    return (
      <>
        {id === 'schedule' && <MobileDisclosure label="Lịch vận hành và cách gửi">
        {/* Tổng quan cả lịch, không phải một tham số: trải hết chiều rộng, không cần cột nhãn. */}
        {id === 'schedule' && (
          <section className="cfg-overview">
            <h2 className="set-row__title">Một ngày vận hành</h2>
            <div className="set-row__panel">
              <DayRibbon v={ctx.v} applied={dirty ? base.values : undefined} compact={mobile} />
            </div>
          </section>
        )}
        {/* Hai cách gửi tách rõ: nhắc việc theo khung giờ, thông báo sự kiện gửi ngay (view.docx, mục Thiết lập). */}
        {id === 'schedule' && (
          <section className="cfg-overview" aria-labelledby="cfg-modes">
            <h2 className="set-row__title" id="cfg-modes">Hai cách gửi</h2>
            <dl className="send-modes">
              <div>
                <dt>Nhắc việc, gửi theo khung giờ</dt>
                <dd>Nhắc khai thuế, nhắc nộp thuế, cảnh báo doanh thu. Lập đợt sau lượt rà soát và gửi trong khung {ctx.v.sendStart}–{ctx.v.sendEnd}.</dd>
              </div>
              <div>
                <dt>Theo sự kiện, gửi ngay</dt>
                <dd>Kết quả hồ sơ, kết quả nộp thuế, kết quả chuyển tuyến. Gửi khi có sự kiện, không chờ khung giờ. Chưa có nguồn dữ liệu nên chưa có tham số thiết lập.</dd>
              </div>
            </dl>
          </section>
        )}
        </MobileDisclosure>}
        {/* Công tắc tắt: ẩn phần thân thẻ và các thẻ thuộc phạm vi của nó; giá trị vẫn giữ trong bản nháp. */}
        {sectionsFor(id, ctx, () => pickArea('schedule'))
          .filter((s) => !s.dependsOn || ctx.v[s.dependsOn])
          .map((s) => {
            const off = !!s.toggle && !ctx.v[s.toggle];
            return (
              <SettingRow key={s.key} title={s.title} desc={s.desc} toggle={s.toggle && <SectionToggle k={s.toggle} ctx={ctx} />}>
                {off ? null : s.content}
              </SettingRow>
            );
          })}
      </>
    );
  };

  return (
    <div className="cfg-page">
      <h1 className="sr-only">Thiết lập thông báo</h1>

      {conflict && latest && base && latest.version !== base.version && (
        <Feedback
          className="cfg-alert"
          severity="warning"
         
          title="Thiết lập đã được cập nhật"
          description={`${latest.updatedBy} vừa lưu phiên bản ${latest.version} lúc ${dmyhm(latest.updatedAt)}. Bản nhập của bạn vẫn được giữ, chưa ghi đè.`}
          action={
            <Button variant="outline" size="sm" onClick={() => setCompare(true)}>
              So sánh
            </Button>
          }
        />
      )}
      {errCount > 0 && <Feedback className="cfg-alert" severity="error" title={`Còn ${errCount} trường cần sửa trước khi lưu.`} />}

      <ViewTabs
        className="cfg-tabs"
        extra={
          <>
            {readOnly && (
              <button type="button" className="tab-action" onClick={() => setPreview(true)} aria-label="Xem trước">
                <Eye aria-hidden="true" />
                <span className="tab-action__text">Xem trước</span>
              </button>
            )}
            <button
              type="button"
              className={`tab-action${unseen ? ' tab-action--new' : ''}`}
              onClick={openHistory}
              aria-label={unseen ? `Lịch sử thay đổi, có thay đổi mới: ${unseen}` : 'Lịch sử thay đổi'}
              title={unseen ?? undefined}
            >
              <History aria-hidden="true" />
              <span className="tab-action__text">Lịch sử thay đổi</span>
              {unseen && <i className="tab-action__dot" aria-hidden="true" />}
            </button>
          </>
        }
        value={area}
        onValueChange={(k) => pickArea(k as AreaId)}
        items={AREAS.map((a) => {
          const hasDirty = dirtyKeys.some((k) => areaOfField(k).id === a.id);
          return {
            key: a.id,
            label: (
              <span className="cfg-tab">
                {a.name}
                {badgeOf(a.id)}
                {hasDirty && <i className="cfg-tab__dirty" aria-label="có thay đổi chưa lưu" />}
              </span>
            ),
            children: <div className="cfg-body">{body(a.id)}</div>,
          };
        })}
      />

      {!readOnly && area !== 'unused' && (
        <>
          {mobile && <div className="action-bar-spacer" aria-hidden="true" />}
          <div className="action-bar" role="region" aria-label="Lưu thiết lập">
            <span className={`action-bar__state${dirty ? ' action-bar__state--dirty' : saved ? ' action-bar__state--saved' : ''}`} aria-live="polite" key={dirty ? 'dirty' : saved ? 'saved' : 'idle'}>
              {!dirty && saved ? <CircleCheck className="size-4" aria-hidden="true" /> : <i className="action-bar__dot" aria-hidden="true" />}
              {dirty ? `Có thay đổi chưa lưu (${dirtyKeys.length})` : saved ?? 'Chưa có thay đổi'}
            </span>
            {!mobile && (
              <Button variant="outline" onClick={api.discard} disabled={!dirty}>
                Hủy thay đổi
              </Button>
            )}
            <Button variant="outline" size={mobile ? 'lg' : undefined} onClick={() => setPreview(true)}>
              Xem trước
            </Button>
            <Button size={mobile ? 'lg' : undefined} variant="default" onClick={startSave} disabled={!dirty}>
              Lưu và áp dụng
            </Button>
          </div>
          {mobile && dirty && (
            <Button variant="outline" onClick={api.discard} className="cfg-discard">
              Hủy thay đổi
            </Button>
          )}
        </>
      )}

      {draft && applied && <PreviewOverlay open={preview} onClose={() => setPreview(false)} draft={draft} applied={applied.values} dirty={dirty} />}
      {api.q.data && <HistoryOverlay open={history} onClose={() => setHistory(false)} history={api.q.data.history} />}
      {draft && base && (
        <SaveDialog
          open={saving}
          onClose={() => setSaving(false)}
          keys={dirtyKeys}
          from={base.values}
          to={draft}
          saving={m.isPending}
          error={m.error && !(m.error instanceof ApiError && m.error.code === 'CONFLICT') ? m.error.message : undefined}
          onConfirm={(s) => m.mutate(s)}
        />
      )}
      {compare && latest && base && draft && (
        <CompareModal
          open
          onClose={() => setCompare(false)}
          theirs={latest}
          mine={draft}
          base={base.values}
          onRebase={() => {
            api.rebase();
            setCompare(false);
            setConflict(false);
            toast.info(`Đã dựa trên phiên bản ${latest.version}; thay đổi của bạn vẫn giữ để lưu tiếp.`);
          }}
        />
      )}
    </div>
  );
}
