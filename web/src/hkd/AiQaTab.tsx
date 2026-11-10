import { ListToolbar } from '@/components/ListToolbar';
import { MobileDisclosure } from '@/components/MobileDisclosure';
import { IconButton } from '@/components/IconButton';
import { useMemo, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChoiceSelect } from '@/components/Controls';
import { BlockEmpty, BlockError, Skel } from '../components/Blocks';
import { StatusPill } from '../components/Status';
import { ProtoBadge, ProtoNote } from '../components/Proto';
import { RATING_LABEL, fetchQa, rateQa, type QaItem, type QaRating } from '../api/profileApi';
import { officerOf, TEAMS } from '../data/org';
import { taxpayers } from '../data/mock';
import { useCurrentUser, useStaff } from '../demo/DemoContext';
import { downloadCsv } from '../lib/csv';
import { dmyhm, num, pct } from '../lib/format';

const RATING_TONE: Record<QaRating, 'success' | 'danger' | 'warning'> = { OK: 'success', WRONG: 'danger', INCOMPLETE: 'warning' };
const PAGE = 10;

/** NNT trong phạm vi xem; null = toàn cơ sở. */
function useScopeIds(scope: string) {
  const staff = useStaff();
  return useMemo(() => {
    if (scope === 'ALL') return null;
    const owners = new Set(TEAMS.some((t) => t.id === scope) ? staff.filter((s) => s.team === scope).map((s) => s.id) : [scope]);
    const ids = new Set<number>();
    officerOf.forEach((o, id) => owners.has(o) && ids.add(id));
    return ids;
  }, [scope, staff]);
}

/** [Thêm] Lịch sử hỏi đáp AI: xem, xuất, đánh giá câu trả lời (view.docx mục 2 và mục Chung). */
export function AiQaTab({ scope }: { scope: string }) {
  const ids = useScopeIds(scope);
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  const [rating, setRating] = useState<'all' | 'unrated' | QaRating>('all');
  const [escalated, setEscalated] = useState(false);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const query = { ids, q: term, rating, escalated, page, size: PAGE };
  const res = useQuery({ queryKey: ['ai-qa', scope, term, rating, escalated, page], queryFn: () => fetchQa(query), placeholderData: keepPreviousData });
  const d = res.data;
  const pages = d ? Math.max(1, Math.ceil(d.total / PAGE)) : 1;

  const exportCsv = () => {
    if (!d) return;
    downloadCsv(`hoi-dap-ai_${scope}.csv`, [
      ['Mã', 'Thời điểm', 'NNT', 'MST', 'Chủ đề', 'Câu hỏi', 'Trả lời của AI', 'Chuyển cán bộ', 'Đánh giá', 'Ghi chú đánh giá'],
      ...d.all.map((x) => {
        const t = taxpayers[x.taxpayerId];
        return [x.id, dmyhm(x.askedAt), t.name, t.mst, x.topic, x.question, x.answer, x.escalated ? 'Có' : 'Không', x.rating ? RATING_LABEL[x.rating] : 'Chưa đánh giá', x.ratingNote ?? ''];
      }),
    ]);
  };

  return (
    <div className={`hkd-tab${res.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={res.isPlaceholderData}>
      <ProtoNote kind="mock">Câu hỏi, câu trả lời và đánh giá đều là dữ liệu giả lập; hệ thống thật chưa lưu lịch sử hỏi đáp Geo AI.</ProtoNote>
      <MobileDisclosure label="Tổng quan hỏi đáp AI"><div className="hkd-kpis">
        <div className="hkd-kpi">
          <span className="kpi__label">Câu hỏi 30 ngày</span>
          <span className="kpi__value">{d ? num(d.stats.total) : <Skel w={80} h={28} />}</span>
        </div>
        <div className="hkd-kpi">
          <span className="kpi__label">Chuyển cán bộ</span>
          <span className="kpi__value">{d ? num(d.stats.escalated) : <Skel w={80} h={28} />}</span>
          {d && <span className="kpi__note">{pct(d.stats.escalated, d.stats.total)} số câu hỏi</span>}
        </div>
        <div className="hkd-kpi">
          <span className="kpi__label">Bị đánh dấu sai</span>
          <span className="kpi__value kpi__value--failed">{d ? num(d.stats.wrong) : <Skel w={80} h={28} />}</span>
          {d && <span className="kpi__note">Trên {num(d.stats.rated)} câu đã đánh giá</span>}
        </div>
        <div className="hkd-kpi">
          <span className="kpi__label">Chưa đủ</span>
          <span className="kpi__value">{d ? num(d.stats.incomplete) : <Skel w={80} h={28} />}</span>
        </div>
      </div></MobileDisclosure>

      <section className="panel detail" aria-label="Lịch sử hỏi đáp AI">
        <ListToolbar search={<form className="table-search" role="search" onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); setPage(1); }}>
            <Input aria-label="Tìm theo tên, MST hoặc nội dung câu hỏi" placeholder="Tìm tên, MST, câu hỏi" value={q} onChange={(e) => setQ(e.target.value)} />
            <IconButton type="submit" variant="default" icon={Search} label="Tìm câu hỏi AI" />
          </form>} filters={<><ChoiceSelect
            aria-label="Lọc theo đánh giá"
            value={rating}
            onValueChange={(v) => { setRating(v as typeof rating); setPage(1); }}
            options={[
              { value: 'all', label: 'Mọi đánh giá' },
              { value: 'unrated', label: 'Chưa đánh giá' },
              { value: 'WRONG', label: 'Sai' },
              { value: 'INCOMPLETE', label: 'Chưa đủ' },
              { value: 'OK', label: 'Đúng' },
            ]}
            style={{ width: 170 }}
          />
          <label className="qa-check">
            <input type="checkbox" checked={escalated} onChange={(e) => { setEscalated(e.target.checked); setPage(1); }} />
            Chỉ câu đã chuyển cán bộ
          </label></>} count={<span className="detail__count">{d ? `${num(d.total)} câu hỏi` : ''}</span>} actions={<IconButton icon={Download} label="Xuất lịch sử hỏi đáp AI ra CSV" className="export-btn" disabled={!d?.total} onClick={exportCsv} />} activeCount={Number(rating !== 'all') + Number(escalated)} />

        {res.isError ? (
          <BlockError message="Không tải được lịch sử hỏi đáp." onRetry={() => res.refetch()} />
        ) : !d ? (
          <Skel w="100%" h={240} />
        ) : d.total === 0 ? (
          <BlockEmpty>Không có câu hỏi phù hợp với bộ lọc.</BlockEmpty>
        ) : (
          <>
            <ul className="qa-list">
              {d.rows.map((x) => (
                <li key={x.id} className="qa-item">
                  <div className="qa-item__head">
                    <span className="cell-tp">
                      <span className="cell-tp__name">{x.taxpayer.name}</span>
                      <span className="cell-tp__mst">MST {x.taxpayer.mst} · {dmyhm(x.askedAt)} · {x.topic}</span>
                    </span>
                    <span className="qa-item__tags">
                      {x.escalated && <StatusPill tone="info">Đã chuyển cán bộ</StatusPill>}
                      {x.rating ? <StatusPill tone={RATING_TONE[x.rating]}>{RATING_LABEL[x.rating]}</StatusPill> : <StatusPill tone="neutral">Chưa đánh giá</StatusPill>}
                    </span>
                  </div>
                  <p className="qa-item__q"><b>Hỏi:</b> {x.question}</p>
                  <p className="qa-item__a"><b>Geo AI:</b> {x.answer}</p>
                  {x.ratingNote && <p className="chart-note">Ghi chú đánh giá: {x.ratingNote}</p>}
                  {open === x.id ? (
                    <RateForm item={x} onClose={() => setOpen(null)} />
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setOpen(x.id)} aria-label={`Đánh giá câu trả lời cho ${x.taxpayer.name}`}>
                      {x.rating ? 'Sửa đánh giá' : 'Đánh giá câu trả lời'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="m-pager">
              <IconButton icon={ChevronLeft} label="Trang trước" disabled={page <= 1} onClick={() => setPage(page - 1)} />
              <span className="num">Trang {num(page)} / {num(pages)}</span>
              <IconButton icon={ChevronRight} label="Trang sau" disabled={page >= pages} onClick={() => setPage(page + 1)} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function RateForm({ item, onClose }: { item: QaItem; onClose: () => void }) {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const [rating, setRating] = useState<QaRating>(item.rating ?? 'WRONG');
  const [note, setNote] = useState(item.ratingNote ?? '');
  const needNote = rating !== 'OK' && !note.trim();
  const m = useMutation({
    mutationFn: () => rateQa(item.id, rating, note.trim(), user.name),
    onSuccess: () => {
      toast.success('Đã lưu đánh giá câu trả lời.');
      qc.invalidateQueries({ queryKey: ['ai-qa'] });
      onClose();
    },
    onError: () => toast.error('Không lưu được đánh giá. Thử lại sau.'),
  });
  return (
    <form className="qa-rate" onSubmit={(e) => { e.preventDefault(); if (!needNote) m.mutate(); }}>
      <fieldset>
        <legend>Câu trả lời của Geo AI</legend>
        {(['WRONG', 'INCOMPLETE', 'OK'] as QaRating[]).map((r) => (
          <label key={r} className="qa-check">
            <input type="radio" name={`rate-${item.id}`} value={r} checked={rating === r} onChange={() => setRating(r)} />
            {RATING_LABEL[r]}
          </label>
        ))}
      </fieldset>
      <label className="qa-rate__note">
        <span>Ghi chú {rating === 'OK' ? '(không bắt buộc)' : '(bắt buộc: nêu chỗ sai hoặc còn thiếu)'}</span>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} aria-invalid={needNote || undefined} />
      </label>
      <div className="qa-rate__actions">
        <Button type="submit" disabled={needNote || m.isPending}>{m.isPending ? 'Đang lưu…' : 'Lưu đánh giá'}</Button>
        <Button type="button" variant="ghost" onClick={onClose}>Hủy</Button>
        <ProtoBadge kind="proposal" note="Đánh dấu Sai hoặc Chưa đủ phải kèm ghi chú để nhóm AI sửa câu trả lời mẫu." />
      </div>
    </form>
  );
}
