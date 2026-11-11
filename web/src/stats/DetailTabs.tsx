import { ListToolbar } from '@/components/ListToolbar';
import { IconButton } from '@/components/IconButton';
import { ChoiceSelect, ViewTabs } from '@/components/Controls';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, RotateCcw, Search as SearchIcon, Send, X } from 'lucide-react';
import { toast } from 'sonner';
import { ProtoBadge } from '@/components/Proto';
import { downloadCsv } from '../lib/csv';
import { useCurrentUser } from '../demo/DemoContext';
import { Input } from '@/components/ui/input';
import { DataTable, type DataColumns } from '@/components/DataTable';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { appRegistered, failReason, fetchNotifications, fetchRetryableIds, fetchRuns, fetchTaxpayers, retryNotifications, type DeliveryFilter, type NotificationQuery, type NotificationRow, type SendFilter, type TaxpayerQuery } from '../api/mockApi';
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
    {v && <IconButton variant="ghost" icon={X} label="Xóa nội dung tìm kiếm" onClick={() => { setV(''); onSearch(''); }} />}
    <IconButton type="submit" variant="default" icon={SearchIcon} label="Tìm kiếm" />
  </form>;
}

/** Đặt lại các ô lọc của danh sách; chỉ hiện khi có ô lọc khác mặc định. */
function ListReset({ show, onReset }: { show: boolean; onReset: () => void }) {
  if (!show) return null;
  return (
    <IconButton variant="ghost" icon={RotateCcw} className="list-reset" onClick={onReset} label="Đặt lại bộ lọc danh sách" />
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
        <IconButton icon={ChevronLeft} label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1, size)} />
        <span className="num">
          {num(from)}–{num(to)} / {num(total)}
        </span>
        <IconButton icon={ChevronRight} label="Trang sau" disabled={page >= pages} onClick={() => onChange(page + 1, size)} />
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
    pageSizeOptions: [10, 20, 50],
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
  const query: NotificationQuery = { ...filterOf(p), day: p.day, send: p.ns, delivery: p.nd, q: p.nq, page: 1, size: 1e6 };

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
      <ListToolbar
        search={<Search value={p.nq} onSearch={(nq) => set({ nq, page: 1 })} placeholder="Tìm theo tên hoặc MST" label="Tìm thông báo theo tên hoặc MST" />}
        filters={<><ChoiceSelect aria-label="Lọc kết quả gửi" value={p.ns} options={SEND_OPTIONS} onValueChange={(ns) => set({ ns, page: 1 })} style={{ width: 190 }} />
        <ChoiceSelect aria-label="Lọc kết quả giao" value={p.nd} options={DELIVERY_OPTIONS} onValueChange={(nd) => set({ nd, page: 1 })} style={{ width: 210 }} />
        {p.day && (
          <Chip label="Bỏ lọc ngày" onRemove={() => set({ day: null, page: 1 })}>
            Ngày {dmy(p.day)}
          </Chip>
        )}
        <ListReset show={!!(p.nq || p.ns !== 'all' || p.nd !== 'all' || p.day)} onReset={() => set({ nq: null, ns: null, nd: null, day: null, page: 1 })} /></>}
        count={<span className="detail__count">{q.data ? `${num(q.data.total)} thông báo` : ''}</span>}
        activeCount={[p.ns !== 'all', p.nd !== 'all', !!p.day].filter(Boolean).length}
        actions={<ExportButton disabled={!q.data?.total} label="Xuất danh sách thông báo ra CSV" onExport={() => exportNotifications(query)} />}
      />
      {p.ns === 'FAILED' && <RetryBar query={query} />}
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
              <article key={r.id} className="m-card m-card--link">
                <div className="m-card__top">
                  <span className="cell-tp">
                    <button type="button" className="m-card__link cell-tp__name" onClick={() => open(`n:${r.id}`)}>{r.taxpayer.name}</button>
                    <span className="cell-tp__mst">MST {r.taxpayer.mst}</span>
                  </span>
                  <ChevronRight className="m-card__chev" aria-hidden="true" />
                </div>
                <p className="m-card__text">{r.title}</p>
                {/* Một trạng thái mới nhất: chưa gửi Noti thì nói trạng thái gửi, đã gửi thì nói kết quả tiếp nhận. */}
                <div className="m-card__foot">
                  {r.delivery === 'NA' ? <Pill map={SEND} value={r.send} /> : <Pill map={DELIVERY} value={r.delivery} />}
                  <span className="num">{dmyhm(r.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
          <Pager mobile page={p.page} size={p.size} total={q.data.total} onChange={(page) => set({ page })} />
        </>
      ) : (
        <DataTable<NotificationRow> rowKey="id" columns={cols} dataSource={q.data.rows} rowClassName="row-open" onRow={(r) => ({ onClick: (e) => !(e.target as HTMLElement).closest('button,a') && open(`n:${r.id}`) })} pagination={pagination(p, q.data.total, set)} />
      )}
      </div>
    </>
  );
}

/* ---------- [Thêm] Xuất tệp, gửi lại (view.docx mục 1) ---------- */

export function ExportButton({ onExport, disabled, label }: { onExport: () => Promise<void>; disabled?: boolean; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <IconButton
      icon={Download}
      className="export-btn"
      disabled={disabled}
      loading={busy}
      label={busy ? 'Đang xuất tệp…' : label}
      onClick={async () => {
        setBusy(true);
        try {
          await onExport();
        } catch {
          toast.error('Không xuất được tệp. Thử lại sau.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}

async function exportNotifications(qy: NotificationQuery) {
  const all = await fetchNotifications(qy);
  downloadCsv(`thong-bao_${qy.from}_${qy.to}.csv`, [
    ['Mã', 'Thời điểm tạo', 'NNT', 'MST', 'Nhóm', 'Tiêu đề', 'Kết quả gửi', 'Kết quả giao', 'Lý do lỗi (giả lập)', 'Đợt gửi'],
    ...all.rows.map((r) => [r.id, dmyhm(r.createdAt), r.taxpayer.name, r.taxpayer.mst, r.groups.join(' + '), r.title, SEND[r.send].label, DELIVERY[r.delivery].label, r.send === 'FAILED' ? failReason(r).text : '', r.runId]),
  ]);
}

/** Gửi lại hàng loạt khi đang lọc "Gửi thất bại": chỉ lỗi tạm thời. */
function RetryBar({ query }: { query: NotificationQuery }) {
  const qc = useQueryClient();
  const user = useCurrentUser();
  const ids = useQuery({ queryKey: ['retryable', query], queryFn: () => fetchRetryableIds(query) });
  const m = useMutation({
    mutationFn: () => retryNotifications(ids.data ?? [], user.name),
    onSuccess: (r) => {
      toast.success(`Đã đưa ${num(r.ok)} thông báo vào lượt gửi kế tiếp.`);
      qc.invalidateQueries();
    },
    onError: () => toast.error('Không gửi lại được. Thử lại sau.'),
  });
  const n = ids.data?.length ?? 0;
  return (
    <div className="retry-bar" role="region" aria-label="Gửi lại thông báo thất bại">
      <p>
        {ids.isLoading ? 'Đang đếm thông báo gửi lại được…' : n ? <><b className="num">{num(n)}</b> thông báo lỗi tạm thời có thể gửi lại. Lỗi do chưa đăng ký iHanoi hoặc sai MST cần sửa dữ liệu trước.</> : 'Không còn thông báo gửi lại được: các lỗi còn lại cần sửa dữ liệu trước.'}
      </p>
      <span className="retry-bar__tags">
        <ProtoBadge kind="mock" note="Lý do lỗi đang giả lập; hệ thống gửi thật chưa trả mã lỗi." />
        <ProtoBadge kind="proposal" note="Chỉ gửi lại lỗi tạm thời; lỗi dữ liệu phải sửa trước. Cán bộ gửi lại cho NNT mình phụ trách." />
      </span>
      <Button disabled={!n || m.isPending} onClick={() => m.mutate()}>
        <Send aria-hidden="true" /> {m.isPending ? 'Đang gửi lại…' : n ? `Gửi lại ${num(n)}` : 'Gửi lại'}
      </Button>
    </div>
  );
}

/* ---------- Tab NNT ---------- */

export function TaxpayersPane({ p, set, open, reset }: { p: StatsParams; set: SetFn; open: (k: string) => void; reset: () => void }) {
  const bp = useBreakpoint();
  const q = useQuery({
    // Đổi bộ lọc hoặc trang: giữ dòng cũ làm mờ tại chỗ, không về skeleton.
    placeholderData: keepPreviousData,
    queryKey: ['taxpayers', filterOf(p), p.tq, p.notified, p.kind, p.prio, p.app, p.page, p.size],
    queryFn: () => fetchTaxpayers({ ...filterOf(p), q: p.tq, notified: p.notified, kind: p.kind, priority: p.prio, app: p.app, page: p.page, size: p.size }),
  });
  const tpQuery: TaxpayerQuery = { ...filterOf(p), q: p.tq, notified: p.notified, kind: p.kind, priority: p.prio, app: p.app, page: 1, size: 1e6 };
  const exportTaxpayers = async () => {
    const all = await fetchTaxpayers(tpQuery);
    downloadCsv(`ho-kinh-doanh_${p.unit}.csv`, [
      ['NNT', 'MST', 'Trạng thái HKD', 'Hồ sơ khai còn thiếu', 'Ưu tiên khai', 'Khoản còn phải nộp', 'Ưu tiên nộp', 'Đăng ký iHanoi (giả lập)', 'Cập nhật'],
      ...all.rows.map((t) => [t.name, t.mst, t.hkdStatus, t.fileCount, t.filePriority ? PRIORITY[t.filePriority].label : '', t.payCount, t.payPriority ? PRIORITY[t.payPriority].label : '', appRegistered(t.id) ? 'Có' : 'Chưa', dmyhm(t.updatedAt)]),
    ]);
  };
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
      <ListToolbar
        search={<Search value={p.tq} onSearch={(tq) => set({ tq, page: 1 })} placeholder="Tìm theo tên hoặc MST" label="Tìm NNT theo tên hoặc MST" />}
        filters={<>{p.notified && (
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
        <ChoiceSelect
          aria-label="Lọc theo đăng ký ứng dụng"
          value={p.app ? 'missing' : 'all'}
          onValueChange={(v) => set({ app: v === 'missing', page: 1 })}
          options={[
            { value: 'all', label: 'Mọi trạng thái app' },
            { value: 'missing', label: 'Đăng ký app, chưa nộp' },
          ]}
          style={{ width: 200 }}
        />
        <ListReset show={!!(p.tq || p.kind || p.prio || p.notified || p.app)} onReset={() => set({ tq: null, kind: null, prio: null, notified: null, app: null, page: 1 })} /></>}
        count={<span className="detail__count">{q.data ? `${num(q.data.total)} NNT` : ''}</span>}
        activeCount={[!!p.kind, !!p.prio, !!p.notified, !!p.app].filter(Boolean).length}
        actions={<ExportButton disabled={!q.data?.total} label="Xuất danh sách hộ ra CSV" onExport={exportTaxpayers} />}
      />
      {p.app && (
        <p className="caption-line proto-inline">
          Hộ đã đăng ký ứng dụng iHanoi nhưng còn hồ sơ khai chưa nộp.
          <ProtoBadge kind="mock" note="Trạng thái đăng ký iHanoi chưa có trong dữ liệu NNT; đang giả lập." />
        </p>
      )}
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
              <article key={t.id} className="m-card m-card--link">
                <div className="m-card__top">
                  <span className="cell-tp">
                    <button type="button" className="m-card__link cell-tp__name" onClick={() => open(`t:${t.id}`)}>{t.name}</button>
                    {/* Đa số HKD đang hoạt động: chỉ gắn nhãn hộ tạm ngừng. */}
                    <span className="cell-tp__mst">MST {t.mst}{t.hkdStatus !== 'Đang hoạt động' && ` · ${t.hkdStatus}`}</span>
                  </span>
                  <ChevronRight className="m-card__chev" aria-hidden="true" />
                </div>
                <div className="m-card__foot">
                  <span className="num">{[t.fileCount && `${t.fileCount} hồ sơ thiếu`, t.payCount && `${t.payCount} khoản phải nộp`].filter(Boolean).join(' · ') || 'Không còn việc'}</span>
                  {topPriority(t) && <Pill map={PRIORITY} value={topPriority(t)!} />}
                </div>
              </article>
            ))}
          </div>
          <Pager mobile page={p.page} size={p.size} total={q.data.total} onChange={(page) => set({ page })} />
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
      {/* Đợt tự động lập chung cho cả cơ sở: nói một lần thay vì lặp cột Đơn vị ở mọi dòng. */}
      <p className="runs-scope">
        Đợt tự động được lập chung cho toàn {unitName(UNITS[0].id)}.
        {p.unit !== 'ALL' && ' Số thông báo và NNT trong đợt gồm cả NNT ngoài phạm vi đang xem.'}
      </p>
      <ListToolbar
        search={<Search value={p.rq} onSearch={(rq) => set({ rq, page: 1 })} placeholder="Tìm theo mã đợt" label="Tìm đợt gửi theo mã" />}
        filters={<><ChoiceSelect aria-label="Lọc trạng thái đợt" value={p.rs} options={RUN_OPTIONS} onValueChange={(rs) => set({ rs, page: 1 })} style={{ width: 200 }} />
        <ListReset show={!!(p.rq || p.rs !== 'all')} onReset={() => set({ rq: null, rs: null, page: 1 })} /></>}
        count={<span className="detail__count">{q.data ? `${num(q.data.total)} đợt` : ''}</span>}
        activeCount={p.rs !== 'all' ? 1 : 0}
      />
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
              <article key={r.id} className="m-card m-card--link">
                <div className="m-card__top">
                  <span className="cell-tp">
                    <button type="button" className="m-card__link cell-tp__name id" onClick={() => open(`r:${r.id}`)}>{r.id}</button>
                    <span className="cell-tp__mst">{dmy(r.date)}</span>
                  </span>
                  <Pill map={RUN} value={r.status} />
                  <ChevronRight className="m-card__chev" aria-hidden="true" />
                </div>
                <RunProgress r={r} />
              </article>
            ))}
          </div>
          <Pager mobile page={p.page} size={p.size} total={q.data.total} onChange={(page) => set({ page })} />
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

