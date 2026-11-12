import { MobileDisclosure } from '@/shared/components/MobileDisclosure';
import { useBreakpoint, useReducedMotion } from '@/shared/lib/useMedia';
import { lazy, Suspense, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { usePermissions } from '@/shared/demo/useDemo';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchActiveRun, fetchSummary } from '@/shared/api/mockApi';
import { RUN } from '@/shared/lib/status';
import { num } from '@/shared/lib/format';
import { Skel } from '@/shared/components/Blocks';
import { BlockError, StaleNotice } from '@/shared/components/Blocks';
import { dmyhm } from '@/shared/lib/format';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { IconButton } from '@/shared/components/IconButton';
import { GROUPS } from '@/shared/data/config';
import { FilterBar } from './FilterBar';
import { Kpis } from './Kpis';
import { TrendChart } from './TrendChart';
import { DetailTabs } from '@/features/records/DetailTabs';
import { DetailOverlay } from '@/features/records/Details';
import { useRoute } from '@/shared/lib/router';
import { filterOf, useStatsParams } from './useStatsParams';

const LeaderStats = lazy(() => import('@/features/leader/LeaderStats'));

export default function StatsPage() {
  const { role } = usePermissions();
  const mobile = useBreakpoint() === 'mobile';
  const reduced = useReducedMotion();
  const { p, set, openDetail, closeDetail } = useStatsParams();
  const qc = useQueryClient();
  const { navigate } = useRoute();
  const f = filterOf(p);
  const leader = role === 'base';
  // Lãnh đạo: danh sách từng thông báo là việc tác nghiệp → thu gọn, mở khi bấm ô số/ngày hoặc nút "Xem danh sách".
  const [listOpen, setListOpen] = useState(!leader || !!p.day || p.ns !== 'all' || p.nd !== 'all' || !!p.nq);
  const showList = !leader || listOpen;

  // Số liệu đang gửi làm mới mỗi 30 giây khi tab Thống kê đang mở.
  // Đổi bộ lọc: giữ số cũ (làm mờ tại vùng kết quả) tới khi có số mới, khung không nhảy về skeleton; lần tải đầu vẫn là skeleton.
  const summary = useQuery({ queryKey: ['summary', f], queryFn: () => fetchSummary(f), refetchInterval: 30_000, placeholderData: keepPreviousData });
  const active = useQuery({ queryKey: ['active-run', f.unit], queryFn: () => fetchActiveRun(f), refetchInterval: 30_000 });

  const scrollToList = () => (setListOpen(true), requestAnimationFrame(() => document.getElementById('detail')?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' })));
  const resetFilters = () => set({ unit: null, from: null, to: null, group: null, day: null, ns: null, nd: null, nq: null, tq: null, notified: null, kind: null, prio: null, rs: null, rq: null, page: 1 });
  const s = summary.data;
  const unusedGroup = GROUPS.find((g) => g.id === p.group && g.unused);

  const trend = (
      <MobileDisclosure label="Xu hướng thông báo theo ngày">
      <div className={`charts charts--single${summary.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={summary.isPlaceholderData}>
        <TrendChart
          s={s}
          day={p.day}
          emptyText={unusedGroup ? `${unusedGroup.name} chưa sử dụng nên chưa phát sinh thông báo.` : undefined}
          onPickDay={(day) => set({ day, tab: 'notifications', page: 1 })}
          onShowList={() => scrollToList()}
        />

      </div>

      </MobileDisclosure>
  );

  return (
    <>
      {/* Tên màn hình đã có ở sidebar; h1 giữ cho trình đọc màn hình. */}
      <h1 className="sr-only">Thống kê</h1>

      {role === 'base' && (
        <Suspense fallback={<Skel w="100%" h={180} />}>
          <LeaderStats />
        </Suspense>
      )}
      {/* Hai vùng tách bạch: kết quả cơ sở (kỳ cố định) ở trên, thống kê thông báo (theo bộ lọc) ở dưới; bộ lọc đứng ngay dưới tiêu đề vùng nó điều khiển. */}
      {role === 'base' && <h2 className="leader-section__title stats-region">Thống kê thông báo</h2>}
      <FilterBar
        p={p}
        stamp={<Freshness at={s?.updatedAt} busy={summary.isFetching && !!s} onRefresh={() => qc.invalidateQueries()} />}
        apply={(d) => set({ unit: d.unit, from: d.from, to: d.to, group: d.group, day: null, page: 1 })} />


      {/* Phát hiện chính: đợt đang vận hành, một lần bấm tới thao tác */}
      <div className="finding">
        {active.isLoading ? (
          <Skel w={420} h={16} />
        ) : active.data ? (
          mobile ? <button type="button" className="mobile-run" aria-label={`Xem đợt gửi ${active.data.id}, toàn cơ sở`} onClick={() => navigate('/gui-thong-bao', { muc: 'tu-dong', detail: `r:${active.data!.id}` })}>
            <span><span className="mobile-run__label">Đợt gửi toàn cơ sở</span><span className="mobile-run__text">{RUN[active.data.status].label} · <b>{num(active.data.pending)}</b> chờ gửi</span></span>
            <ArrowRight className="mobile-run__icon" aria-hidden="true" />
          </button> : <>
            <p>
              Đợt <span className="id">{active.data.id}</span> <span className="finding__scope">(toàn cơ sở)</span> {RUN[active.data.status].label.toLowerCase()}: đã gửi{' '}
              <b className="num">
                {num(active.data.sent)}/{num(active.data.total)}
              </b>
              , còn <b className="num">{num(active.data.pending)}</b> chờ trong khung <span className="nowrap">{active.data.window}</span>.{' '}
              {p.unit !== 'ALL' && 'Số đợt gồm cả NNT ngoài phạm vi đang xem; các ô số bên dưới chỉ tính phạm vi đang xem. '}
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


      {s?.stale && (
        <div className="stats-page__notice">
          <StaleNotice at={s.updatedAt} />
        </div>
      )}


      {summary.isError ? (
        <div className="stats-page__error">
          <BlockError message="Không tải được chỉ số thông báo." onRetry={() => summary.refetch()} />
        </div>
      ) : (
        <Kpis
          keys={leader ? ['total', 'sent', 'failed', 'response'] : undefined}
          labels={leader ? { response: 'Thời gian giao thông báo trung bình' } : undefined}
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

      {!mobile && trend}

      {leader && (
        <button type="button" className="top-rows__toggle stats-list-toggle" aria-expanded={listOpen} aria-controls="detail" onClick={() => setListOpen((v) => !v)}>
          {listOpen ? <>Ẩn danh sách thông báo <ChevronUp aria-hidden="true" /></> : <>Xem danh sách thông báo{s ? ` (${num(s.total)})` : ''} <ChevronDown aria-hidden="true" /></>}
        </button>
      )}
      {showList && <DetailTabs p={p} set={set} open={openDetail} reset={resetFilters} />}
      {mobile && trend}

      <DetailOverlay detail={p.detail} filter={f} onClose={closeDetail} />
    </>
  );
}

/** Mốc cập nhật + nút làm mới dạng icon. */
function Freshness({ at, busy, onRefresh }: { at?: string; busy: boolean; onRefresh: () => void }) {
  return (
    <p className="stamp" aria-live="polite">
      <span className="num">{at ? `Cập nhật ${dmyhm(at)}` : 'Đang tải số liệu'}</span>
      <IconButton variant="ghost" icon={RefreshCw} className="stamp__refresh" onClick={onRefresh} disabled={busy} loading={busy} label={busy ? 'Đang làm mới số liệu' : 'Làm mới số liệu'} />
    </p>
  );
}
