import { HKD_STATUS, hkdStatusLabel, type HkdStatusCode } from '@/shared/data/hkdStatus';
import { ListToolbar } from '@/shared/components/ListToolbar';
import { ChoiceSelect } from '@/shared/components/Controls';
import { Button } from '@/shared/ui/button';
import { ChevronRight } from 'lucide-react';
import { downloadXlsx } from '@/shared/lib/xlsx';
import { ExcelButton } from '@/shared/components/ExcelButton';
import { DataTable, type DataColumns } from '@/shared/components/DataTable';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { appRegistered, fetchTaxpayers, type TaxpayerQuery } from '@/shared/api/mockApi';
import { BlockError } from '@/shared/components/Blocks';
import { PRIORITY } from '@/shared/lib/status';
import { Pill } from '@/shared/components/Status';
import { OBLIGATION_CUTOFF } from '@/shared/data/mock';
import { dmy, dmyhm, hm, num } from '@/shared/lib/format';
import { useBreakpoint } from '@/shared/lib/useMedia';
import type { Priority, Taxpayer } from '@/shared/data/types';
import { filterOf, type StatsParams } from '@/features/stats/useStatsParams';
import { Chip, ListReset, Pager, Search, SkeletonRows } from './ListParts';
import { useEmpty } from './listEmpty';
import { pagination, topPriority, type SetFn } from './listHelpers';

/* ---------- Tab NNT ---------- */

export function TaxpayersPane({ p, set, open, reset }: { p: StatsParams; set: SetFn; open: (k: string) => void; reset: () => void }) {
  const bp = useBreakpoint();
  const q = useQuery({
    // Đổi bộ lọc hoặc trang: giữ dòng cũ làm mờ tại chỗ, không về skeleton.
    placeholderData: keepPreviousData,
    queryKey: ['taxpayers', filterOf(p), p.tq, p.notified, p.kind, p.prio, p.hst, p.page, p.size],
    queryFn: () => fetchTaxpayers({ ...filterOf(p), q: p.tq, notified: p.notified, kind: p.kind, priority: p.prio, hst: p.hst, page: p.page, size: p.size }),
  });
  const tpQuery: TaxpayerQuery = { ...filterOf(p), q: p.tq, notified: p.notified, kind: p.kind, priority: p.prio, hst: p.hst, page: 1, size: 1e6 };
  const exportTaxpayers = async () => {
    const all = await fetchTaxpayers(tpQuery);
    downloadXlsx(`ho-kinh-doanh_${p.unit}`, [
      ['NNT', 'MST', 'Trạng thái HKD', 'Hồ sơ khai còn thiếu', 'Ưu tiên khai', 'Khoản còn phải nộp', 'Ưu tiên nộp', 'Đăng ký iHanoi (giả lập)', 'Cập nhật'],
      ...all.rows.map((t) => [t.name, t.mst, hkdStatusLabel(t.hkdStatus), t.fileCount, t.filePriority ? PRIORITY[t.filePriority].label : '', t.payCount, t.payPriority ? PRIORITY[t.payPriority].label : '', appRegistered(t.id) ? 'Có' : 'Chưa', dmyhm(t.updatedAt)]),
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
    { title: 'Cập nhật', key: 'u', width: 112, render: (_, t) => <span className="cell-time">{dmy(t.updatedAt)}<small>{hm(t.updatedAt)}</small></span> },
    {
      title: 'NNT / MST',
      key: 'tp',
      width: 220,
      render: (_, t) => (
        <span className="cell-tp">
          <span className="cell-tp__name">{t.name}</span>
          <span className="cell-tp__mst">{t.mst}</span>
        </span>
      ),
    },
    { title: 'Trạng thái HKD', dataIndex: 'hkdStatus', render: (v: HkdStatusCode) => hkdStatusLabel(v) },
    { title: 'Hồ sơ khai còn thiếu', key: 'f', width: 140, align: 'right', render: (_, t) => countLink(t.fileCount, 'hồ sơ khai còn thiếu', t) },
    { title: 'Khoản còn phải nộp', key: 'p', width: 140, align: 'right', render: (_, t) => countLink(t.payCount, 'khoản còn phải nộp', t) },
    { title: 'Ưu tiên hạn', key: 'pr', width: 120, render: (_, t) => (topPriority(t) ? <Pill map={PRIORITY} value={topPriority(t)!} /> : <span className="cell-faint">—</span>) },
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
          className="choice-select--w180"
        />
        <ChoiceSelect
          aria-label="Lọc mức ưu tiên hạn"
          value={p.prio ?? 'all'}
          onValueChange={(v) => set({ prio: v === 'all' ? null : v, page: 1 })}
          options={[{ value: 'all', label: 'Mọi mức ưu tiên' }, ...(Object.keys(PRIORITY) as Priority[]).map((k) => ({ value: k, label: PRIORITY[k].label }))]}
          className="choice-select--w170"
        />
        <ChoiceSelect
          aria-label="Lọc theo trạng thái HKD"
          value={p.hst ?? 'all'}
          onValueChange={(v) => set({ hst: v === 'all' ? null : v, page: 1 })}
          options={[{ value: 'all', label: 'Mọi trạng thái HKD' }, ...HKD_STATUS.map((s) => ({ value: s.code, label: s.label }))]}
          className="choice-select--w200"
        />
        <ListReset show={!!(p.tq || p.kind || p.prio || p.notified || p.hst)} onReset={() => set({ tq: null, kind: null, prio: null, notified: null, hst: null, page: 1 })} /></>}
        count={<span className="detail__count">{q.data ? `${num(q.data.total)} NNT` : ''}</span>}
        activeCount={[!!p.kind, !!p.prio, !!p.notified, !!p.hst].filter(Boolean).length}
        actions={<ExcelButton className="export-btn" disabled={!q.data?.total} label="Xuất danh sách hộ ra Excel" onExport={exportTaxpayers} />}
      />
      <p className="caption-line caption-line--tight">
        Nghĩa vụ chốt {dmyhm(OBLIGATION_CUTOFF)}.
      </p>
      <div className={q.isPlaceholderData ? 'pane-results is-stale' : 'pane-results'} aria-busy={q.isPlaceholderData}>
      {q.isError ? (
        <div className="pane-results__state">
          <BlockError message="Không tải được danh sách NNT." onRetry={() => q.refetch()} />
        </div>
      ) : !q.data ? (
        <SkeletonRows />
      ) : q.data.total === 0 ? (
        <div className="pane-results__state">{empty}</div>
      ) : bp === 'mobile' ? (
        <>
          <div className="m-list">
            {q.data.rows.map((t) => (
              <article key={t.id} className="m-card m-card--link">
                <div className="m-card__top">
                  <span className="cell-tp">
                    <button type="button" className="m-card__link cell-tp__name" onClick={() => open(`t:${t.id}`)}>{t.name}</button>
                    {/* Đa số HKD đang hoạt động: chỉ gắn nhãn hộ tạm ngừng. */}
                    <span className="cell-tp__mst">MST {t.mst}{t.hkdStatus !== '00' && ` · ${hkdStatusLabel(t.hkdStatus)}`}</span>
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
        <DataTable<Taxpayer> fixed rowKey="id" columns={cols} dataSource={q.data.rows} rowClassName="row-open" onRow={(t) => ({ onClick: (e) => !(e.target as HTMLElement).closest('button,a') && open(`t:${t.id}`) })} pagination={pagination(p, q.data.total, set)} />
      )}
      </div>
    </>
  );
}
