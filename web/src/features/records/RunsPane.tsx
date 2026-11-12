import { ListToolbar } from '@/shared/components/ListToolbar';
import { ChoiceSelect } from '@/shared/components/Controls';
import { Button } from '@/shared/ui/button';
import { ChevronRight } from 'lucide-react';
import { DataTable, type DataColumns } from '@/shared/components/DataTable';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchRuns } from '@/shared/api/mockApi';
import { BlockError } from '@/shared/components/Blocks';
import { RUN } from '@/shared/lib/status';
import { Pill } from '@/shared/components/Status';
import { UNITS } from '@/shared/data/mock';
import { dmy, num, pct } from '@/shared/lib/format';
import { useBreakpoint } from '@/shared/lib/useMedia';
import type { RunStatus, SendRun } from '@/shared/data/types';
import { filterOf, type StatsParams } from '@/features/stats/useStatsParams';
import { ListReset, Pager, Search, SkeletonRows } from './ListParts';
import { useEmpty } from './listEmpty';
import { pagination, unitName, type SetFn } from './listHelpers';

/* ---------- Tab Đợt gửi ---------- */

const RUN_OPTIONS = [{ value: 'all', label: 'Mọi trạng thái đợt' }, ...(Object.keys(RUN) as RunStatus[]).map((k) => ({ value: k, label: RUN[k].label }))];

export function RunProgress({ r }: { r: SendRun }) {
  return (
    <div className="progress">
      <div className="progress__track" role="progressbar" aria-valuemin={0} aria-valuemax={r.total} aria-valuenow={r.sent} aria-label="Tiến độ đã gửi">
        <div className="progress__fill" style={{ width: `${(r.sent / Math.max(r.total, 1)) * 100}%` }} />
      </div>
      <span className="progress__label">
        Đã gửi {num(r.sent)}/{num(r.total)} — {pct(r.sent, r.total)}
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
        <span className="cell-time cell-time--end num">
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
        filters={<><ChoiceSelect aria-label="Lọc trạng thái đợt" value={p.rs} options={RUN_OPTIONS} onValueChange={(rs) => set({ rs, page: 1 })} className="choice-select--w200" />
        <ListReset show={!!(p.rq || p.rs !== 'all')} onReset={() => set({ rq: null, rs: null, page: 1 })} /></>}
        count={<span className="detail__count">{q.data ? `${num(q.data.total)} đợt` : ''}</span>}
        activeCount={p.rs !== 'all' ? 1 : 0}
      />
      <div className={q.isPlaceholderData ? 'pane-results is-stale' : 'pane-results'} aria-busy={q.isPlaceholderData}>
      {q.isError ? (
        <div className="pane-results__state">
          <BlockError message="Không tải được danh sách đợt gửi." onRetry={() => q.refetch()} />
        </div>
      ) : !q.data ? (
        <SkeletonRows n={4} />
      ) : q.data.total === 0 ? (
        <div className="pane-results__state">{empty}</div>
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
