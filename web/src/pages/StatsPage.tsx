import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActiveRun, fetchSummary } from '../api/mockApi';
import { RUN } from '../components/Status';
import { num } from '../lib/format';
import { Skel } from '../components/Blocks';
import { BlockError, StaleNotice } from '../components/Blocks';
import { dmyhm } from '../lib/format';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { GROUPS } from '../data/config';
import { FilterBar } from '../stats/FilterBar';
import { Kpis } from '../stats/Kpis';
import { TrendChart } from '../stats/TrendChart';
import { DetailTabs } from '../stats/DetailTabs';
import { DetailOverlay } from '../stats/Details';
import { useRoute } from '../lib/router';
import { filterOf, useStatsParams } from '../stats/useStatsParams';

export default function StatsPage() {
  const { p, set, openDetail, closeDetail } = useStatsParams();
  const qc = useQueryClient();
  const { navigate } = useRoute();
  const f = filterOf(p);

  // Số liệu đang gửi làm mới mỗi 30 giây khi tab Thống kê đang mở.
  // Đổi bộ lọc: giữ số cũ (làm mờ tại vùng kết quả) tới khi có số mới, khung không nhảy về skeleton; lần tải đầu vẫn là skeleton.
  const summary = useQuery({ queryKey: ['summary', f], queryFn: () => fetchSummary(f), refetchInterval: 30_000, placeholderData: keepPreviousData });
  const active = useQuery({ queryKey: ['active-run', f.unit], queryFn: () => fetchActiveRun(f), refetchInterval: 30_000 });

  const scrollToList = () => document.getElementById('detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const resetFilters = () => set({ unit: null, from: null, to: null, group: null, day: null, ns: null, nd: null, nq: null, tq: null, notified: null, kind: null, prio: null, rs: null, rq: null, page: 1 });
  const s = summary.data;
  const unusedGroup = GROUPS.find((g) => g.id === p.group && g.unused);

  return (
    <>
      {/* Tên màn hình đã có ở sidebar; h1 giữ cho trình đọc màn hình. */}
      <h1 className="sr-only">Thống kê thông báo</h1>

      {/* Phát hiện chính: đợt đang vận hành, một lần bấm tới thao tác */}
      <div className="finding">
        {active.isLoading ? (
          <Skel w={420} h={16} />
        ) : active.data ? (
          <>
            <p>
              Đợt <span className="id">{active.data.id}</span> {RUN[active.data.status].label.toLowerCase()}: đã gửi Noti{' '}
              <b className="num">
                {num(active.data.sent)}/{num(active.data.total)}
              </b>
              , còn <b className="num">{num(active.data.pending)}</b> chờ trong khung <span className="nowrap">{active.data.window}</span>.{' '}
              {p.unit !== 'ALL' && 'Số liệu đợt tính cho toàn cơ sở. '}
              <button type="button" className="link-btn finding__link" onClick={() => navigate('/gui-thong-bao', { muc: 'tu-dong', detail: `r:${active.data!.id}` })}>
                Xem đợt gửi
                <ArrowRight aria-hidden="true" />
              </button>
            </p>
          </>
        ) : (
          <p>Không có đợt nào đang vận hành trong phạm vi đã chọn.</p>
        )}
      </div>

      <FilterBar
        p={p}
        stamp={<Freshness at={s?.updatedAt} busy={summary.isFetching && !!s} onRefresh={() => qc.invalidateQueries()} />}
        apply={(d) => set({ unit: d.unit, from: d.from, to: d.to, group: d.group, day: null, page: 1 })} />

      {s?.stale && (
        <div style={{ marginTop: 12 }}>
          <StaleNotice at={s.updatedAt} />
        </div>
      )}


      {summary.isError ? (
        <div style={{ marginTop: 16 }}>
          <BlockError message="Không tải được chỉ số thông báo." onRetry={() => summary.refetch()} />
        </div>
      ) : (
        <Kpis
          stale={summary.isPlaceholderData}
          s={s}
          p={p}
          unused={unusedGroup ? unusedGroup.name : undefined}
          onPick={(k, f) => {
            if (k === 'response') return openDetail('x:response');
            if (k === 'unique') return navigate('/quan-ly-hkd', { muc: 'danh-sach', unit: p.unit, from: p.from, to: p.to, group: p.group, notified: '1' });
            else set({ tab: 'notifications', ns: f?.ns ?? 'all', nd: f?.nd ?? 'all', day: k === 'total' ? null : p.day, page: 1 });
            scrollToList();
          }}
        />
      )}

      <div className={`charts charts--single${summary.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={summary.isPlaceholderData}>
        <TrendChart
          s={s}
          day={p.day}
          emptyText={unusedGroup ? `${unusedGroup.name} chưa sử dụng nên chưa phát sinh thông báo.` : undefined}
          onPickDay={(day) => set({ day, tab: 'notifications', page: 1 })}
          onShowList={() => scrollToList()}
        />

      </div>

      <DetailTabs p={p} set={set} open={openDetail} reset={resetFilters} />

      <DetailOverlay detail={p.detail} filter={f} onClose={closeDetail} />
    </>
  );
}

/** Mốc cập nhật + nút làm mới dạng icon. */
function Freshness({ at, busy, onRefresh }: { at?: string; busy: boolean; onRefresh: () => void }) {
  return (
    <p className="stamp" aria-live="polite">
      <span className="num">{at ? `Cập nhật ${dmyhm(at)}` : 'Đang tải số liệu'}</span>
      <Button variant="ghost" size="icon" className="stamp__refresh" onClick={onRefresh} disabled={busy} aria-label={busy ? 'Đang làm mới số liệu' : 'Làm mới số liệu'} title="Làm mới số liệu">
        <RefreshCw className={busy ? 'spin' : undefined} aria-hidden="true" />
      </Button>
    </p>
  );
}
