import { MobileDisclosure } from '@/components/MobileDisclosure';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { BlockEmpty, BlockError, Skel } from '../components/Blocks';
import { ChoiceSelect, ViewTabs } from '../components/Controls';
import { ProtoNote } from '../components/Proto';
import { StatusPill } from '../components/Status';
import { taxpayers } from '../data/mock';
import { teamName, useStaff } from '../demo/DemoContext';
import { dm, dmyhm, duration, hm, num, pct } from '../lib/format';
import { useRoute, type RoutePath } from '../lib/router';
import { useBreakpoint } from '../lib/useMedia';
import CaseDetail from './CaseDetail';
import { KIND_SHORT, STATUS_LABEL, STATUS_ORDER, isOverdue, type CaseKind, type CaseStatus, type RoutingCase, type RoutingSummary } from './routingApi';
import { ago, dueInfo, useCases, useRoutingScope } from './useRouting';
import './routing.css';
import { TopRows } from '../components/TopRows';

// Đường dẫn của màn; ép kiểu để chạy được cả trước khi router khai báo '/chuyen-tuyen'.
const PATH = '/chuyen-tuyen' as RoutePath;

const STATUS_SLUG: Record<CaseStatus, string> = { NEW: 'moi', IN_PROGRESS: 'dang-xu-ly', ANSWERED: 'da-tra-loi', DONE: 'hoan-tat' };
const KIND_SLUG: Record<CaseKind, string> = { QUESTION: 'cau-hoi', DECLARATION: 'to-khai' };
type KindFilter = 'all' | CaseKind;
const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'Mọi loại ca' },
  { value: 'QUESTION', label: 'Câu hỏi ngoài phạm vi Geo AI' },
  { value: 'DECLARATION', label: 'Tờ khai chuyển đến' },
];

const EMPTY: Record<CaseStatus, string> = {
  NEW: 'Không có ca mới trong hàng chung. Ca Geo AI chuyển tới sẽ hiện ở đây.',
  IN_PROGRESS: 'Không có ca đang xử lý.',
  ANSWERED: 'Không có ca đã trả lời đang chờ đánh dấu hoàn tất.',
  DONE: 'Chưa có ca hoàn tất trong 7 ngày qua.',
};

export default function RoutingPage() {
  const { params, navigate } = useRoute();
  const scope = useRoutingScope();
  const bp = useBreakpoint();
  const q = useCases();

  const status = STATUS_ORDER.find((s) => STATUS_SLUG[s] === params.get('tt')) ?? 'NEW';
  const kind: KindFilter = (Object.keys(KIND_SLUG) as CaseKind[]).find((k) => KIND_SLUG[k] === params.get('loai')) ?? 'all';
  const openId = params.get('ca');

  const set = (patch: { tt?: CaseStatus; loai?: KindFilter; ca?: string | null }) => {
    const tt = patch.tt ?? status;
    const loai = patch.loai ?? kind;
    const ca = patch.ca === undefined ? openId : patch.ca;
    navigate(PATH, { tt: tt === 'NEW' ? undefined : STATUS_SLUG[tt], loai: loai === 'all' ? undefined : KIND_SLUG[loai], ca: ca ?? undefined }, true);
  };

  const counts = useMemo(() => {
    const m: Record<CaseStatus, number> = { NEW: 0, IN_PROGRESS: 0, ANSWERED: 0, DONE: 0 };
    q.data?.cases.forEach((c) => (kind === 'all' || c.kind === kind) && m[c.status]++);
    return m;
  }, [q.data, kind]);

  const kindSelect = (
    <ChoiceSelect<KindFilter> aria-label="Lọc theo loại ca" value={kind} options={KIND_OPTIONS} onValueChange={(loai) => set({ loai })} style={{ width: bp === 'mobile' ? '100%' : 260 }} />
  );

  return (
    <div className="rt-page">
      <h1 className="sr-only">Chuyển tuyến</h1>
      <div className="hkd-filter">
        <span className="scope-text">{scope === 'ALL' ? <><span className="scope-text__label">Phạm vi:</span>Toàn cơ sở</> : <><span className="scope-text__label">Hàng chung:</span>{teamName(scope)}</>}</span>
      </div>

      <MobileDisclosure label="Chỉ số xử lý chuyển tuyến"><Kpis s={q.data?.summary} /></MobileDisclosure>

      <section className="rt-inbox" aria-labelledby="rt-inbox-title">
        <div className="rt-inbox__head">
          <h2 id="rt-inbox-title" className="rt-inbox__title">Hộp việc</h2>
          <MobileDisclosure label="Cách nhận và xử lý ca"><ProtoNote kind="proposal">
            Hạn trả lời là 1 ngày làm việc kể từ lúc Geo AI chuyển ca. Ca vào hàng chung của tổ; cán bộ bấm <b>Nhận ca</b> để xử lý.
          </ProtoNote></MobileDisclosure>
        </div>
        {bp === 'mobile' && <div className="rt-toolbar">{kindSelect}</div>}
        <ViewTabs
          value={status}
          onValueChange={(v) => set({ tt: v as CaseStatus })}
          extra={bp === 'mobile' ? undefined : kindSelect}
          items={STATUS_ORDER.map((s) => ({
            key: s,
            label: (
              <>
                {STATUS_LABEL[s]}
                <span className="rt-count" aria-label={`${counts[s]} ca`}>{q.data ? num(counts[s]) : '–'}</span>
              </>
            ),
            children:
              s !== status ? null : q.isError ? (
                <div className="rt-pane">
                  <BlockError message="Không tải được hộp việc chuyển tuyến." onRetry={() => q.refetch()} />
                </div>
              ) : !q.data ? (
                <ListSkeleton />
              ) : (
                <CaseList
                  cases={q.data.cases.filter((c) => c.status === s && (kind === 'all' || c.kind === kind))}
                  status={s}
                  kind={kind}
                  openId={openId}
                  showTeam={scope === 'ALL'}
                  onOpen={(id) => set({ ca: id })}
                  onClearKind={() => set({ loai: 'all' })}
                />
              ),
          }))}
        />
      </section>

      <CaseDetail id={openId} onClose={() => set({ ca: null })} />
    </div>
  );
}

/* ---------- Chỉ số ---------- */

function Kpi({ label, value, note }: { label: string; value: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="hkd-kpi">
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {note && <span className="kpi__note">{note}</span>}
    </div>
  );
}

function Kpis({ s }: { s?: RoutingSummary }) {
  const loading = <Skel w={80} h={28} />;
  return (
    <div className="hkd-kpis rt-kpis" role="group" aria-label="Chỉ số chuyển tuyến">
      <Kpi
        label="Ca chờ xử lý"
        value={s ? num(s.waiting) : loading}
        note={s ? (s.overdue ? <span className="rt-kpi-alert">{num(s.overdue)} ca quá hạn</span> : 'Không có ca quá hạn') : undefined}
      />
      <Kpi
        label="Thời gian xử lý trung bình"
        value={s ? (s.avgHandleMin == null ? '—' : duration(s.avgHandleMin)) : loading}
        note={s ? `Từ lúc chuyển tới lúc trả lời, ${num(s.handledCount)} ca trong 7 ngày` : undefined}
      />
      <Kpi
        label="Tỷ lệ chuyển tuyến"
        value={s ? pct(s.casesWeek, s.conversationsWeek) : loading}
        note={s ? `${num(s.casesWeek)} ca trên ${num(s.conversationsWeek)} hội thoại Geo AI, 7 ngày` : undefined}
      />
    </div>
  );
}

/* ---------- Danh sách ---------- */

function ListSkeleton() {
  return (
    <ul className="rt-list" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <li key={i} className="rt-row rt-row--skel">
          <span className="rt-row__main">
            <Skel w="70%" h={16} />
            <Skel w="40%" h={12} />
          </span>
          <span className="rt-row__meta"><Skel w={110} h={12} /></span>
          <span className="rt-row__due"><Skel w={70} h={20} /></span>
        </li>
      ))}
    </ul>
  );
}

function sortCases(list: RoutingCase[], status: CaseStatus) {
  // Chưa trả lời: gần hạn nhất lên đầu. Đã trả lời/hoàn tất: mới nhất lên đầu.
  if (status === 'NEW' || status === 'IN_PROGRESS') return [...list].sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1));
  const key = (c: RoutingCase) => c.doneAt ?? c.answeredAt ?? c.createdAt;
  return [...list].sort((a, b) => (key(a) < key(b) ? 1 : -1));
}

function CaseList({ cases, status, kind, openId, showTeam, onOpen, onClearKind }: {
  cases: RoutingCase[]; status: CaseStatus; kind: KindFilter; openId: string | null; showTeam: boolean;
  onOpen: (id: string) => void; onClearKind: () => void;
}) {
  const staff = useStaff();
  const name = (id?: string) => staff.find((s) => s.id === id)?.name ?? '';
  const rows = sortCases(cases, status);
  const overdue = rows.filter((c) => isOverdue(c)).length;

  if (!rows.length) {
    return (
      <div className="rt-pane">
        {kind !== 'all' ? (
          <BlockEmpty action={<Button variant="outline" size="sm" onClick={onClearKind}>Xem mọi loại ca</Button>}>
            Không có ca loại “{KIND_SHORT[kind]}” ở mục {STATUS_LABEL[status]}.
          </BlockEmpty>
        ) : (
          <BlockEmpty>{EMPTY[status]}</BlockEmpty>
        )}
      </div>
    );
  }

  // Điều đúng với mọi dòng nói một lần ở đầu danh sách; từng dòng chỉ ghi phần khác biệt.
  const summary =
    status === 'NEW'
      ? `${num(rows.length)} ca chưa có người nhận${overdue ? `, ${num(overdue)} ca đã quá hạn` : ''}. Sắp xếp theo hạn trả lời gần nhất.`
      : status === 'IN_PROGRESS'
        ? `${num(rows.length)} ca đang xử lý${overdue ? `, ${num(overdue)} ca đã quá hạn` : ''}. Sắp xếp theo hạn trả lời gần nhất.`
        : status === 'ANSWERED'
          ? `${num(rows.length)} ca đã báo kết quả cho hộ qua iHanoi, chờ đánh dấu hoàn tất.`
          : `${num(rows.length)} ca hoàn tất, mới nhất ở đầu.`;

  return (
    <div className="rt-pane">
      <p className="rt-summary">{summary}</p>
      <TopRows total={rows.length} noun="ca">
      <ul className="rt-list">
        {rows.map((c) => {
          const tp = taxpayers[c.taxpayerId];
          const due = dueInfo(c);
          const when = status === 'DONE' ? c.doneAt! : status === 'ANSWERED' ? c.answeredAt! : c.createdAt;
          const whenLabel = status === 'DONE' ? 'Hoàn tất' : status === 'ANSWERED' ? 'Trả lời' : 'Chuyển';
          return (
            <li key={c.id}>
              <button type="button" className="rt-row" aria-current={openId === c.id ? 'true' : undefined} onClick={() => onOpen(c.id)}>
                <span className="rt-row__main">
                  <span className="rt-row__line">
                    <span className={`pill rt-kind rt-kind--${c.kind === 'QUESTION' ? 'question' : 'declaration'}`}>{KIND_SHORT[c.kind]}</span>
                    <span className="rt-row__topic">{c.topic}</span>
                  </span>
                  <span className="rt-row__tp">
                    {tp.name}, MST {tp.mst}
                  </span>
                </span>
                <span className="rt-row__meta">
                  <span title={dmyhm(when)}>
                    {whenLabel} {status === 'NEW' || status === 'IN_PROGRESS' ? ago(when).toLowerCase() : `${hm(when)} ${dm(when)}`}
                  </span>
                  {status !== 'NEW' && c.claimedBy && <span>{name(c.claimedBy)}</span>}
                  {showTeam && <span>{teamName(c.team)}</span>}
                </span>
                <span className="rt-row__due" title={`Hạn trả lời ${dmyhm(c.dueAt)}`}>
                  {due.overdue || due.tone === 'warning' ? <StatusPill tone={due.tone}>{due.text}</StatusPill> : <span className="rt-due-text">{due.text}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      </TopRows>
    </div>
  );
}
