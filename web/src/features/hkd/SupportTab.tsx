import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { REQUEST_STATUS_LABEL, fetchSupport, type RequestStatus } from './hkdApi';
import { BlockError, Panel, Skel } from '@/shared/components/Blocks';
import { StatusPill } from '@/shared/components/Status';
import { dmy, num, pct } from '@/shared/lib/format';
import { TopRows } from '@/shared/components/TopRows';
import { hours } from './hkdChart';
import { Kpi, KpiStrip } from '@/shared/components/Kpi';
import { ProtoBadge } from '@/shared/components/Proto';

const STATUS_TONE: Record<RequestStatus, 'info' | 'warning' | 'success' | 'neutral' | 'danger'> = { NEW: 'info', PROCESSING: 'info', NEED_MORE: 'warning', RESOLVED: 'success', REJECTED: 'neutral' };

/* ---------- Tab 4: Hỗ trợ HKD ---------- */

export function SupportTab({ scope }: { scope: string }) {
  const q = useQuery({ queryKey: ['hkd-support', scope], queryFn: () => fetchSupport(scope), placeholderData: keepPreviousData });
  if (q.isError) return <BlockError message="Không tải được số liệu hỗ trợ HKD." onRetry={() => q.refetch()} />;
  const d = q.data;
  const statuses = Object.keys(REQUEST_STATUS_LABEL) as RequestStatus[];
  const table = (title: string, rows: NonNullable<typeof d>['officers'], first: string) => (
    <Panel title={<span className="title-with-tip">{title}<ProtoBadge note="Các trạng thái yêu cầu là cách phân loại tạm của bản mẫu, cần đối chiếu quy trình hỗ trợ thực tế." /></span>} sub="30 ngày" className="dashboard-card--static hkd-table">
      {!d ? <Skel w="100%" h={140} /> : (
        <TopRows total={rows.length} noun="dòng"><table className="mini-table">
          <thead><tr><th scope="col">{first}</th><th scope="col">Tổng</th>{statuses.map((s) => <th scope="col" key={s}>{REQUEST_STATUS_LABEL[s]}</th>)}<th scope="col">Xử lý trung bình</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.name}><th scope="row">{r.name}</th><td>{num(r.total)}</td>{statuses.map((s) => <td key={s}>{num(r.status[s])}</td>)}<td>{hours(r.avgHours)}</td></tr>)}</tbody>
        </table></TopRows>
      )}
    </Panel>
  );
  return (
    <div className={`hkd-tab${q.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={q.isPlaceholderData}>
      <KpiStrip lead label="Chỉ số hỗ trợ HKD">
        <Kpi primary proposal label="Đã giải quyết" info="đếm yêu cầu đã giải quyết trong tập yêu cầu tiếp nhận 30 ngày; tỷ lệ tính trên tổng yêu cầu trong phạm vi đang xem, không cộng yêu cầu từ chối." value={d ? num(d.resolved) : <Skel w={80} h={28} />} note={d && `${pct(d.resolved, d.total)} trên ${num(d.total)} yêu cầu, ngoài ra ${num(d.rejected)} từ chối`} />
        <Kpi proposal label="Yêu cầu tiếp nhận" info="tổng yêu cầu tiếp nhận trong 30 ngày, thuộc phạm vi đang chọn; bao gồm tất cả trạng thái." value={d ? num(d.total) : <Skel w={80} h={28} />} note="30 ngày" />
        <Kpi proposal label="Đang xử lý" info="cộng yêu cầu mới tiếp nhận và yêu cầu đang xử lý. Chưa bao gồm yêu cầu chờ HKD bổ sung; cách gộp này chưa được nghiệp vụ xác nhận." value={d ? num(d.open) : <Skel w={80} h={28} />} note="Gồm mới tiếp nhận và đang xử lý" />
        <Kpi proposal label="Chờ HKD bổ sung" info="đếm yêu cầu có trạng thái chờ bổ sung trong tập yêu cầu tiếp nhận 30 ngày, thuộc phạm vi đang chọn." value={d ? num(d.needMore) : <Skel w={80} h={28} />} tone="danger" />
        <Kpi proposal label="Thời gian xử lý trung bình" info="trung bình thời gian của yêu cầu đã giải quyết hoặc từ chối. Thời gian hiện được sinh giả lập; mốc bắt đầu, kết thúc và việc có tính yêu cầu từ chối cần nghiệp vụ xác nhận." value={d ? hours(d.avgHours) : <Skel w={80} h={28} />} note="Tính cả yêu cầu từ chối" />
      </KpiStrip>
      {table('Theo cán bộ', d?.officers ?? [], 'Cán bộ')}
      {table('Theo địa bàn', d?.wards ?? [], 'Địa bàn')}
      <div className="charts">
        <Panel title={<span className="title-with-tip">Theo loại yêu cầu<ProtoBadge note="Danh mục loại yêu cầu là cách phân loại tạm của bản mẫu." /></span>} className="dashboard-card--static hkd-table">
          {!d ? <Skel w="100%" h={120} /> : (
            <TopRows total={d.types.length} noun="loại"><table className="mini-table">
              <thead><tr><th scope="col">Loại yêu cầu</th><th scope="col">Số yêu cầu</th><th scope="col">Tỷ lệ</th></tr></thead>
              <tbody>{d.types.map((t) => <tr key={t.name}><th scope="row">{t.name}</th><td>{num(t.total)}</td><td>{pct(t.total, d.total)}</td></tr>)}</tbody>
            </table></TopRows>
          )}
        </Panel>
        <Panel title="Đang chờ HKD bổ sung" className="dashboard-card--static hkd-table">
          {!d ? <Skel w="100%" h={120} /> : d.waiting.length === 0 ? <p className="chart-note">Không có yêu cầu chờ bổ sung.</p> : (
            <TopRows total={d.waiting.length} noun="yêu cầu"><table className="mini-table">
              <thead><tr><th scope="col">Mã</th><th scope="col">Ngày</th><th scope="col">Loại</th><th scope="col">Cán bộ</th><th scope="col">Trạng thái</th></tr></thead>
              <tbody>{d.waiting.map((r) => <tr key={r.id}><th scope="row" className="id">{r.id}</th><td>{dmy(r.date)}</td><td>{r.type}</td><td>{r.officerName}</td><td><StatusPill tone={STATUS_TONE[r.status]}>{REQUEST_STATUS_LABEL[r.status]}</StatusPill></td></tr>)}</tbody>
            </table></TopRows>
          )}
        </Panel>
      </div>
    </div>
  );
}
