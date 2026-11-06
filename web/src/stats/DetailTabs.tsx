import { ChoiceSelect, ViewTabs } from '@/components/Controls';
import { Button } from '@/components/ui/button';
import { ChevronRight, RotateCcw, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DataTable, type DataColumns } from '@/components/DataTable';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { fetchNotifications, fetchRuns, fetchTaxpayers, type DeliveryFilter, type NotificationRow, type SendFilter } from '../api/mockApi';
import { BlockEmpty, BlockError, Skel } from '../components/Blocks';
import { DELIVERY, GroupTags, Pill, PRIORITY, RUN, SEND } from '../components/Status';
import { UNITS, OBLIGATION_CUTOFF } from '../data/mock';
import { GROUPS } from '../data/config';
import { dm, dmy, dmyhm, hm, num, pct } from '../lib/format';
import { useBreakpoint } from '../lib/useMedia';
import type { Priority, RunStatus, SendRun, Taxpayer } from '../data/types';
import { filterOf, type StatsParams, type Tab } from './useStatsParams';

type SetFn = (patch: Partial<Record<keyof StatsParams, string | number | boolean | null>>) => void;

const unitName = (id: string) => UNITS.find((u) => u.id === id)?.name ?? id;

function topPriority(t: Taxpayer): Priority | null {
  const r: Priority[] = ['OVERDUE', 'DUE_SOON', 'IN_TERM'];
  return r.find((p) => p === t.filePriority || p === t.payPriority) ?? null;
}

/* ---------- Thanh công cụ ---------- */

function Search({ value, onSearch, placeholder, label }: { value: string; onSearch: (v: string) => void; placeholder: string; label: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  // Chỉ tìm khi nhấn Enter hoặc nút tìm — không gọi lại API liên tục khi đang nhập.
  return <form className="table-search" role="search" onSubmit={(e) => { e.preventDefault(); onSearch(v.trim()); }}>
    <Input aria-label={label} placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
    {v && <Button variant="ghost" size="icon" type="button" aria-label="Xóa nội dung tìm kiếm" onClick={() => { setV(''); onSearch(''); }}><X className="size-4" aria-hidden="true" /></Button>}
    <Button type="submit">Tìm</Button>
  </form>;
}

/** Đặt lại các ô lọc của danh sách; chỉ hiện khi có ô lọc khác mặc định. */
function ListReset({ show, onReset }: { show: boolean; onReset: () => void }) {
  if (!show) return null;
  return (
    <Button variant="ghost" size="icon" className="list-reset" onClick={onReset} aria-label="Đặt lại bộ lọc danh sách" title="Đặt lại bộ lọc danh sách">
      <RotateCcw aria-hidden="true" />
    </Button>
  );
}

function Chip({ children, onRemove, label }: { children: ReactNode; onRemove: () => void; label: string }) {
  return (
    <span className="chip">
      {children}
      <button type="button" aria-label={label} onClick={onRemove}>
        <X className="size-4" aria-hidden="true" />
      </button>
    </span>
  );
}

function Pager({ page, size, total, onChange, mobile }: { page: number; size: number; total: number; onChange: (page: number, size: number) => void; mobile: boolean }) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  if (mobile) {
    return (
      <div className="m-pager">
        <Button variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1, size)}>
          Trước
        </Button>
        <span className="num">
          {num(from)}–{num(to)} / {num(total)}
        </span>
        <Button variant="outline" disabled={page >= pages} onClick={() => onChange(page + 1, size)}>
          Sau
        </Button>
      </div>
    );
  }
  return null;
}

function pagination(p: StatsParams, total: number, set: SetFn) {
  return {
    current: p.page,
    pageSize: p.size,
    total,
    showSizeChanger: true,
    pageSizeOptions: [20, 50, 100],
    showTotal: (t: number, [a, b]: [number, number]) => `${num(a)}–${num(b)} trong ${num(t)}`,
    onChange: (page: number, size: number) => set({ page: size !== p.size ? 1 : page, size }),

  };
}

function useEmpty(p: StatsParams, reset: () => void): ReactNode {
  const g = p.group !== 'all' ? GROUPS.find((x) => x.id === p.group) : null;
  if (g?.unused) {
    return (
      <BlockEmpty>
        <b>{g.name}</b> chưa sử dụng nên chưa phát sinh thông báo để thống kê.
      </BlockEmpty>
    );
  }
  return (
    <BlockEmpty action={<Button variant="outline" onClick={reset}>Đặt lại bộ lọc</Button>}>Không có kết quả phù hợp với bộ lọc hiện tại.</BlockEmpty>
  );
}

function SkeletonRows({ n = 8 }: { n?: number }) {
  return (
    <div className="skel-rows" aria-busy="true" aria-label="Đang tải danh sách">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="skel-rows__row">
          <Skel w={72} />
          <Skel w={180} />
          <Skel w={90} />
          <Skel w="30%" />
          <Skel w={96} h={22} />
        </div>
      ))}
    </div>
  );
}

/* ---------- Tab Thông báo ---------- */

// Kết quả gửi (tới trung tâm) và kết quả giao (tới người dùng) là hai trạng thái riêng, lọc riêng.
const SEND_OPTIONS: { value: SendFilter; label: string }[] = [
  { value: 'all', label: 'Mọi kết quả gửi' },
  ...(Object.keys(SEND) as (keyof typeof SEND)[]).map((k) => ({ value: k, label: SEND[k].label })),
];
const DELIVERY_OPTIONS: { value: DeliveryFilter; label: string }[] = [
  { value: 'all', label: 'Mọi kết quả giao' },
  ...(Object.keys(DELIVERY) as (keyof typeof DELIVERY)[]).map((k) => ({ value: k, label: DELIVERY[k].label })),
];

function NotificationsPane({ p, set, open, reset }: { p: StatsParams; set: SetFn; open: (k: string) => void; reset: () => void }) {
  const bp = useBreakpoint();
  const q = useQuery({
    // Đổi bộ lọc hoặc trang: giữ dòng cũ làm mờ tại chỗ, không về skeleton.
    placeholderData: keepPreviousData,
    queryKey: ['notifications', filterOf(p), p.day, p.ns, p.nd, p.nq, p.page, p.size],
    queryFn: () => fetchNotifications({ ...filterOf(p), day: p.day, send: p.ns, delivery: p.nd, q: p.nq, page: p.page, size: p.size }),
  });
  const empty = useEmpty(p, reset);

  const cols: DataColumns<NotificationRow> = [
    {
      title: 'Thời điểm tạo',
      dataIndex: 'createdAt',
      width: 116,
      render: (v: string) => (
        <span className="cell-time">
          {dm(v)}/2026
          <small>{hm(v)}</small>
        </span>
      ),
    },
    {
      title: 'NNT / MST',
      key: 'tp',
      width: 220,
      render: (_, r) => (
        <span className="cell-tp">
          <span className="cell-tp__name">{r.taxpayer.name}</span>
          <span className="cell-tp__mst">{r.taxpayer.mst}</span>
        </span>
      ),
    },
    ...(bp === 'desktop' ? [{ title: 'Nhóm', key: 'g', width: 150, render: (_: unknown, r: NotificationRow) => <GroupTags groups={r.groups} /> }] : []),
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      render: (v: string, r) => (
        <>
          <span className="cell-title">{v}</span>
          {bp !== 'desktop' && <GroupTags groups={r.groups} />}
        </>
      ),
    },
    ...(bp === 'desktop'
      ? [
          { title: 'Kết quả gửi', key: 's', width: 150, render: (_: unknown, r: NotificationRow) => <Pill map={SEND} value={r.send} /> },
          { title: 'Kết quả giao', key: 'd', width: 176, render: (_: unknown, r: NotificationRow) => <Pill map={DELIVERY} value={r.delivery} /> },
        ]
      : [
          {
            title: 'Gửi / Giao',
            key: 'sd',
            width: 176,
            render: (_: unknown, r: NotificationRow) => (
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <Pill map={SEND} value={r.send} />
                <Pill map={DELIVERY} value={r.delivery} />
              </span>
            ),
          },
        ]),
    {
      title: <span className="sr-only">Thao tác</span>,
      key: 'a',
      width: 72,
      align: 'right',
      render: (_, r) => (
        <Button variant="ghost" size="icon" className="row-open" onClick={() => open(`n:${r.id}`)} aria-label={`Xem chi tiết thông báo gửi ${r.taxpayer.name}`}>
          <ChevronRight aria-hidden="true" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="detail__toolbar">
        <Search value={p.nq} onSearch={(nq) => set({ nq, page: 1 })} placeholder="Tìm theo tên hoặc MST" label="Tìm thông báo theo tên hoặc MST" />
        <ChoiceSelect aria-label="Lọc kết quả gửi" value={p.ns} options={SEND_OPTIONS} onValueChange={(ns) => set({ ns, page: 1 })} style={{ width: 190 }} />
        <ChoiceSelect aria-label="Lọc kết quả giao" value={p.nd} options={DELIVERY_OPTIONS} onValueChange={(nd) => set({ nd, page: 1 })} style={{ width: 210 }} />
        {p.day && (
          <Chip label="Bỏ lọc ngày" onRemove={() => set({ day: null, page: 1 })}>
            Ngày {dmy(p.day)}
          </Chip>
        )}
        <ListReset show={!!(p.nq || p.ns !== 'all' || p.nd !== 'all' || p.day)} onReset={() => set({ nq: null, ns: null, nd: null, day: null, page: 1 })} />
        <span className="detail__count">{q.data ? `${num(q.data.total)} thông báo` : ''}</span>
      </div>
      <div className={q.isPlaceholderData ? 'pane-results is-stale' : 'pane-results'} aria-busy={q.isPlaceholderData}>
      {q.isError ? (
        <div style={{ paddingBottom: 20 }}>
          <BlockError message="Không tải được danh sách thông báo." onRetry={() => q.refetch()} />
        </div>
      ) : !q.data ? (
        <SkeletonRows />
      ) : q.data.total === 0 ? (
        <div style={{ paddingBottom: 20 }}>{empty}</div>
      ) : bp === 'mobile' ? (
        <>
          <div className="m-list">
            {q.data.rows.map((r) => (
              <article key={r.id} className="m-card">
                <div className="m-card__top">
                  <span className="cell-tp">
                    <span className="cell-tp__name">{r.taxpayer.name}</span>
                    <span className="cell-tp__mst">MST {r.taxpayer.mst}</span>
                  </span>
                </div>
                <span className="m-card__meta">
                  <GroupTags groups={r.groups} /> <span className="num">{dmyhm(r.createdAt)}</span>
                </span>
                <p>{r.title}</p>
                <div className="m-card__row">
                  <span>Gửi</span>
                  <span><Pill map={SEND} value={r.send} /></span>
                </div>
                <div className="m-card__row">
                  <span>Giao</span>
                  <span><Pill map={DELIVERY} value={r.delivery} /></span>
                </div>
                <Button variant="outline" className="w-full" onClick={() => open(`n:${r.id}`)}>
                  Xem chi tiết
                </Button>
              </article>
            ))}
          </div>
          <Pager mobile page={p.page} size={20} total={q.data.total} onChange={(page) => set({ page })} />
        </>
      ) : (
        <DataTable<NotificationRow> rowKey="id" columns={cols} dataSource={q.data.rows} rowClassName="row-open" onRow={(r) => ({ onClick: (e) => !(e.target as HTMLElement).closest('button,a') && open(`n:${r.id}`) })} pagination={pagination(p, q.data.total, set)} />
      )}
      </div>
    </>
  );
}

/* ---------- Tab NNT ---------- */

export function TaxpayersPane({ p, set, open, reset }: { p: StatsParams; set: SetFn; open: (k: string) => void; reset: () => void }) {
  const bp = useBreakpoint();
  const q = useQuery({
    // Đổi bộ lọc hoặc trang: giữ dòng cũ làm mờ tại chỗ, không về skeleton.
    placeholderData: keepPreviousData,
    queryKey: ['taxpayers', filterOf(p), p.tq, p.notified, p.kind, p.prio, p.page, p.size],
    queryFn: () => fetchTaxpayers({ ...filterOf(p), q: p.tq, notified: p.notified, kind: p.kind, priority: p.prio, page: p.page, size: p.size }),
  });
  const empty = useEmpty(p, reset);

  const countLink = (n: number, label: string, t: Taxpayer) =>
    n ? (
      <button type="button" className="count-chip num" onClick={() => open(`t:${t.id}`)} aria-label={`${n} ${label} của ${t.name}`}>
        {n}
      </button>
    ) : (
      <span className="num cell-faint">0</span>
    );

  const cols: DataColumns<Taxpayer> = [
    {
      title: 'NNT / MST',
      key: 'tp',
      render: (_, t) => (
        <span className="cell-tp">
          <span className="cell-tp__name">{t.name}</span>
          <span className="cell-tp__mst">{t.mst}</span>
        </span>
      ),
    },
    { title: 'Trạng thái HKD', dataIndex: 'hkdStatus', width: 170 },
    { title: 'Hồ sơ khai còn thiếu', key: 'f', width: 150, align: 'right', render: (_, t) => countLink(t.fileCount, 'hồ sơ khai còn thiếu', t) },
    { title: 'Khoản còn phải nộp', key: 'p', width: 150, align: 'right', render: (_, t) => countLink(t.payCount, 'khoản còn phải nộp', t) },
    { title: 'Ưu tiên hạn', key: 'pr', width: 150, render: (_, t) => (topPriority(t) ? <Pill map={PRIORITY} value={topPriority(t)!} /> : <span className="cell-faint">—</span>) },
    ...(bp === 'desktop' ? [{ title: 'Cập nhật', key: 'u', width: 140, render: (_: unknown, t: Taxpayer) => <span className="num">{dmyhm(t.updatedAt)}</span> }] : []),
    {
      title: <span className="sr-only">Thao tác</span>,
      key: 'a',
      width: 72,
      align: 'right',
      render: (_, t) => (
        <Button variant="ghost" size="icon" className="row-open" onClick={() => open(`t:${t.id}`)} aria-label={`Xem nghĩa vụ của ${t.name}`}>
          <ChevronRight aria-hidden="true" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="detail__toolbar">
        <Search value={p.tq} onSearch={(tq) => set({ tq, page: 1 })} placeholder="Tìm theo tên hoặc MST" label="Tìm NNT theo tên hoặc MST" />
        {p.notified && (
          <Chip label="Bỏ điều kiện có thông báo trong kỳ, về nghĩa vụ hiện hành" onRemove={() => set({ notified: false, page: 1 })}>
            Có thông báo trong kỳ
          </Chip>
        )}
        <ChoiceSelect
          aria-label="Lọc loại nghĩa vụ"
          value={p.kind ?? 'all'}
          onValueChange={(v) => set({ kind: v === 'all' ? null : v, page: 1 })}
          options={[
            { value: 'all', label: 'Mọi loại nghĩa vụ' },
            { value: 'file', label: 'Khai thuế' },
            { value: 'pay', label: 'Nộp thuế' },
          ]}
          style={{ width: 180 }}
        />
        <ChoiceSelect
          aria-label="Lọc mức ưu tiên hạn"
          value={p.prio ?? 'all'}
          onValueChange={(v) => set({ prio: v === 'all' ? null : v, page: 1 })}
          options={[{ value: 'all', label: 'Mọi mức ưu tiên' }, ...(Object.keys(PRIORITY) as Priority[]).map((k) => ({ value: k, label: PRIORITY[k].label }))]}
          style={{ width: 170 }}
        />
        <ListReset show={!!(p.tq || p.kind || p.prio || p.notified)} onReset={() => set({ tq: null, kind: null, prio: null, notified: null, page: 1 })} />
        <span className="detail__count">{q.data ? `${num(q.data.total)} NNT` : ''}</span>
      </div>
      <p className="caption-line" style={{ margin: '0 0 8px' }}>
        Nghĩa vụ chốt {dmyhm(OBLIGATION_CUTOFF)}.
      </p>
      <div className={q.isPlaceholderData ? 'pane-results is-stale' : 'pane-results'} aria-busy={q.isPlaceholderData}>
      {q.isError ? (
        <div style={{ paddingBottom: 20 }}>
          <BlockError message="Không tải được danh sách NNT." onRetry={() => q.refetch()} />
        </div>
      ) : !q.data ? (
        <SkeletonRows />
      ) : q.data.total === 0 ? (
        <div style={{ paddingBottom: 20 }}>{empty}</div>
      ) : bp === 'mobile' ? (
        <>
          <div className="m-list">
            {q.data.rows.map((t) => (
              <article key={t.id} className="m-card">
                <div className="m-card__top">
                  <span className="cell-tp">
                    <span className="cell-tp__name">{t.name}</span>
                    <span className="cell-tp__mst">MST {t.mst}</span>
                  </span>
                  {topPriority(t) && <Pill map={PRIORITY} value={topPriority(t)!} />}
                </div>
                <span className="m-card__meta">{t.hkdStatus}</span>
                <div className="m-card__pair">
                  <div className="m-card__cell">
                    <small>Hồ sơ khai còn thiếu</small>
                    <b>{t.fileCount}</b>
                  </div>
                  <div className="m-card__cell">
                    <small>Khoản còn phải nộp</small>
                    <b>{t.payCount}</b>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={() => open(`t:${t.id}`)}>
                  Xem nghĩa vụ
                </Button>
              </article>
            ))}
          </div>
          <Pager mobile page={p.page} size={20} total={q.data.total} onChange={(page) => set({ page })} />
        </>
      ) : (
        <DataTable<Taxpayer> rowKey="id" columns={cols} dataSource={q.data.rows} rowClassName="row-open" onRow={(t) => ({ onClick: (e) => !(e.target as HTMLElement).closest('button,a') && open(`t:${t.id}`) })} pagination={pagination(p, q.data.total, set)} />
      )}
      </div>
    </>
  );
}

/* ---------- Tab Đợt gửi ---------- */

const RUN_OPTIONS = [{ value: 'all', label: 'Mọi trạng thái đợt' }, ...(Object.keys(RUN) as RunStatus[]).map((k) => ({ value: k, label: RUN[k].label }))];

export function RunProgress({ r }: { r: SendRun }) {
  return (
    <div className="progress">
      <div className="progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.sent} aria-label="Tiến độ đã gửi Noti">
        <div className="progress__fill" style={{ width: `${(r.sent / Math.max(r.total, 1)) * 100}%` }} />
      </div>
      <span className="progress__label">
        Đã gửi Noti {num(r.sent)}/{num(r.total)} — {pct(r.sent, r.total)}
      </span>
    </div>
  );
}

export function RunsPane({ p, set, open, reset }: { p: StatsParams; set: SetFn; open: (k: string) => void; reset: () => void }) {
  const bp = useBreakpoint();
  const q = useQuery({
    // Đổi bộ lọc hoặc trang: giữ dòng cũ làm mờ tại chỗ, không về skeleton.
    placeholderData: keepPreviousData,
    queryKey: ['runs', filterOf(p), p.rs, p.rq, p.page, p.size],
    queryFn: () => fetchRuns({ ...filterOf(p), status: p.rs, q: p.rq, page: p.page, size: p.size }),
  });
  const empty = useEmpty(p, reset);

  const cols: DataColumns<SendRun> = [
    {
      title: 'Mã đợt / ngày',
      key: 'id',
      render: (_, r) => (
        <span className="cell-tp">
          <span className="cell-tp__name id">{r.id}</span>
          <span className="cell-tp__mst">{dmy(r.date)}</span>
        </span>
      ),
    },
    ...(bp === 'desktop' ? [{ title: 'Đơn vị', key: 'u', render: (_: unknown, r: SendRun) => unitName(r.unit) }] : []),
    { title: 'Khung giờ', dataIndex: 'window', width: 120, render: (v: string) => <span className="num">{v}</span> },
    {
      title: 'Thông báo / NNT',
      key: 'n',
      align: 'right',
      width: 150,
      render: (_, r) => (
        <span className="cell-time num" style={{ alignItems: 'flex-end' }}>
          {num(r.total)}
          <small>{num(r.taxpayers)} NNT</small>
        </span>
      ),
    },
    { title: 'Đã gửi / tổng', key: 'pr', width: 240, render: (_, r) => <RunProgress r={r} /> },
    { title: 'Trạng thái', key: 's', width: 170, render: (_, r) => <Pill map={RUN} value={r.status} /> },
    {
      title: <span className="sr-only">Thao tác</span>,
      key: 'a',
      width: 72,
      align: 'right',
      render: (_, r) => (
        <Button variant="ghost" size="icon" className="row-open" onClick={() => open(`r:${r.id}`)} aria-label={`Xem đợt gửi ${r.id}`}>
          <ChevronRight aria-hidden="true" />
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="detail__toolbar">
        <Search value={p.rq} onSearch={(rq) => set({ rq, page: 1 })} placeholder="Tìm theo mã đợt" label="Tìm đợt gửi theo mã" />
        <ChoiceSelect aria-label="Lọc trạng thái đợt" value={p.rs} options={RUN_OPTIONS} onValueChange={(rs) => set({ rs, page: 1 })} style={{ width: 200 }} />
        <ListReset show={!!(p.rq || p.rs !== 'all')} onReset={() => set({ rq: null, rs: null, page: 1 })} />
        <span className="detail__count">{q.data ? `${num(q.data.total)} đợt` : ''}</span>
      </div>
      <div className={q.isPlaceholderData ? 'pane-results is-stale' : 'pane-results'} aria-busy={q.isPlaceholderData}>
      {q.isError ? (
        <div style={{ paddingBottom: 20 }}>
          <BlockError message="Không tải được danh sách đợt gửi." onRetry={() => q.refetch()} />
        </div>
      ) : !q.data ? (
        <SkeletonRows n={4} />
      ) : q.data.total === 0 ? (
        <div style={{ paddingBottom: 20 }}>{empty}</div>
      ) : bp === 'mobile' ? (
        <>
          <div className="m-list">
            {q.data.rows.map((r) => (
              <article key={r.id} className="m-card">
                <div className="m-card__top">
                  <span className="cell-tp">
                    <span className="cell-tp__name id">{r.id}</span>
                    <span className="cell-tp__mst">{dmy(r.date)}</span>
                  </span>
                  <Pill map={RUN} value={r.status} />
                </div>
                <span className="m-card__meta">
                  {unitName(r.unit)} · khung {r.window} · {num(r.total)} thông báo / {num(r.taxpayers)} NNT
                </span>
                <RunProgress r={r} />
                <Button variant="outline" className="w-full" onClick={() => open(`r:${r.id}`)}>
                  Xem đợt gửi
                </Button>
              </article>
            ))}
          </div>
          <Pager mobile page={p.page} size={20} total={q.data.total} onChange={(page) => set({ page })} />
        </>
      ) : (
        <DataTable<SendRun> rowKey="id" columns={cols} dataSource={q.data.rows} rowClassName="row-open" onRow={(r) => ({ onClick: (e) => !(e.target as HTMLElement).closest('button,a') && open(`r:${r.id}`) })} pagination={pagination(p, q.data.total, set)} />
      )}
      </div>
    </>
  );
}

/* ---------- Ba tab trong cùng màn ---------- */

export function DetailTabs({ p, set, open, reset }: { p: StatsParams; set: SetFn; open: (k: string) => void; reset: () => void }) {
  const items = [
    { key: 'notifications', label: 'Thông báo', children: <NotificationsPane p={p} set={set} open={open} reset={reset} /> },
  ];
  return (
    <section className="panel detail" id="detail" aria-label="Danh sách chi tiết">
      <ViewTabs value={p.tab} onValueChange={(tab) => set({ tab: tab as Tab, page: 1 })} items={items} />
    </section>
  );
}

