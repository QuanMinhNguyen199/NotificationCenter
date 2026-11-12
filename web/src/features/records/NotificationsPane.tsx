import { ListToolbar } from '@/shared/components/ListToolbar';
import { ChoiceSelect } from '@/shared/components/Controls';
import { Button } from '@/shared/ui/button';
import { ChevronRight, Send } from 'lucide-react';
import { toast } from 'sonner';
import { ProtoBadge } from '@/shared/components/Proto';
import { downloadXlsx } from '@/shared/lib/xlsx';
import { ExcelButton } from '@/shared/components/ExcelButton';
import { useCurrentUser } from '@/shared/demo/useDemo';
import { DataTable, type DataColumns } from '@/shared/components/DataTable';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { failReason, fetchNotifications, fetchRetryableIds, retryNotifications, type DeliveryFilter, type NotificationQuery, type NotificationRow, type SendFilter } from '@/shared/api/mockApi';
import { BlockError } from '@/shared/components/Blocks';
import { DELIVERY, SEND } from '@/shared/lib/status';
import { GroupTags, Pill } from '@/shared/components/Status';
import { dmy, dmyhm, hm, num } from '@/shared/lib/format';
import { useBreakpoint } from '@/shared/lib/useMedia';
import { filterOf, type StatsParams } from '@/features/stats/useStatsParams';
import { Chip, ListReset, Pager, Search, SkeletonRows } from './ListParts';
import { useEmpty } from './listEmpty';
import { pagination, type SetFn } from './listHelpers';

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

export function NotificationsPane({ p, set, open, reset }: { p: StatsParams; set: SetFn; open: (k: string) => void; reset: () => void }) {
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
      width: 112,
      render: (v: string) => (
        <span className="cell-time">
          {dmy(v)}
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
    ...(bp === 'desktop' ? [{ title: 'Nhóm', key: 'g', width: 120, render: (_: unknown, r: NotificationRow) => <GroupTags groups={r.groups} /> }] : []),
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
          { title: 'Kết quả gửi', key: 's', width: 120, render: (_: unknown, r: NotificationRow) => <Pill map={SEND} value={r.send} /> },
          { title: 'Kết quả giao', key: 'd', width: 140, render: (_: unknown, r: NotificationRow) => <Pill map={DELIVERY} value={r.delivery} /> },
        ]
      : [
          {
            title: 'Gửi / Giao',
            key: 'sd',
            width: 176,
            render: (_: unknown, r: NotificationRow) => (
              <span className="cell-pills">
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
        filters={<><ChoiceSelect aria-label="Lọc kết quả gửi" value={p.ns} options={SEND_OPTIONS} onValueChange={(ns) => set({ ns, page: 1 })} className="choice-select--w190" />
        <ChoiceSelect aria-label="Lọc kết quả giao" value={p.nd} options={DELIVERY_OPTIONS} onValueChange={(nd) => set({ nd, page: 1 })} className="choice-select--w210" />
        {p.day && (
          <Chip label="Bỏ lọc ngày" onRemove={() => set({ day: null, page: 1 })}>
            Ngày {dmy(p.day)}
          </Chip>
        )}
        <ListReset show={!!(p.nq || p.ns !== 'all' || p.nd !== 'all' || p.day)} onReset={() => set({ nq: null, ns: null, nd: null, day: null, page: 1 })} /></>}
        count={<span className="detail__count">{q.data ? `${num(q.data.total)} thông báo` : ''}</span>}
        activeCount={[p.ns !== 'all', p.nd !== 'all', !!p.day].filter(Boolean).length}
        actions={<ExcelButton className="export-btn" disabled={!q.data?.total} label="Xuất danh sách thông báo ra Excel" onExport={() => exportNotifications(query)} />}
      />
      {p.ns === 'FAILED' && <RetryBar query={query} />}
      <div className={q.isPlaceholderData ? 'pane-results is-stale' : 'pane-results'} aria-busy={q.isPlaceholderData}>
      {q.isError ? (
        <div className="pane-results__state">
          <BlockError message="Không tải được danh sách thông báo." onRetry={() => q.refetch()} />
        </div>
      ) : !q.data ? (
        <SkeletonRows />
      ) : q.data.total === 0 ? (
        <div className="pane-results__state">{empty}</div>
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
        <DataTable<NotificationRow> fixed rowKey="id" columns={cols} dataSource={q.data.rows} rowClassName="row-open" onRow={(r) => ({ onClick: (e) => !(e.target as HTMLElement).closest('button,a') && open(`n:${r.id}`) })} pagination={pagination(p, q.data.total, set)} />
      )}
      </div>
    </>
  );
}

/* ---------- [Thêm] Xuất tệp, gửi lại (view.docx mục 1) ---------- */

async function exportNotifications(qy: NotificationQuery) {
  const all = await fetchNotifications(qy);
  downloadXlsx(`thong-bao_${qy.from}_${qy.to}`, [
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
        <ProtoBadge note="Chỉ gửi lại lỗi tạm thời; lỗi dữ liệu phải sửa trước. Cán bộ gửi lại cho NNT mình phụ trách." />
      </span>
      <Button disabled={!n || m.isPending} onClick={() => m.mutate()}>
        <Send aria-hidden="true" /> {m.isPending ? 'Đang gửi lại…' : n ? `Gửi lại ${num(n)}` : 'Gửi lại'}
      </Button>
    </div>
  );
}
