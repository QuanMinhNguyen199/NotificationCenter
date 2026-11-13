import { Button } from '@/shared/ui/button';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { REMINDER_LABEL, REMINDER_ORDER, fetchReminders, type ReminderKind } from './hkdApi';
import { BlockError, Panel, Skel } from '@/shared/components/Blocks';
import { usePermissions } from '@/shared/demo/useDemo';
import { num, pct } from '@/shared/lib/format';
import { useRoute } from '@/shared/lib/router';
import { C } from '@/shared/theme';
import { TopRows } from '@/shared/components/TopRows';
import { money } from './hkdChart';
import { Kpi, KpiStrip } from '@/shared/components/Kpi';
import { ChevronRight } from 'lucide-react';
import type { Priority } from '@/shared/data/types';
import { ProtoBadge } from '@/shared/components/Proto';

// Diễn giải do nhóm thiết kế đặt cho từng nhóm nhắc (chưa được nghiệp vụ xác nhận).
const KIND_NOTE: Partial<Record<string, string>> = {
  DUE_SOON: 'Cửa sổ sắp đến hạn 7 ngày là diễn giải của nhóm thiết kế.',
  TODO: 'Nhắc HKD có nghĩa vụ đã phát sinh, còn trên 7 ngày tới hạn (yêu cầu gọi là “việc phải làm”). Cách hiểu này là diễn giải của nhóm thiết kế.',
};

/* ---------- Tab 5: Nhắc việc ---------- */

// Màu theo mức khẩn, dùng lại thang của biểu đồ nghĩa vụ ở màn Thống kê; ngưỡng doanh thu là thông tin, dùng xanh dương.
// Loại nhắc ↔ mức ưu tiên hạn trong Danh sách nghĩa vụ (cùng quy tắc với hkdApi PR_OF).
const PRIO_OF: Record<Exclude<ReminderKind, 'THRESHOLD'>, Priority> = { DUE_SOON: 'DUE_SOON', OVERDUE: 'OVERDUE', TODO: 'IN_TERM' };

const REMINDER_COLOR: Record<ReminderKind, string> = { DUE_SOON: C.dueSoon, OVERDUE: C.overdue, TODO: C.inTerm, THRESHOLD: C.info };

export function RemindersTab({ scope }: { scope: string }) {
  const { navigate } = useRoute();
  const { canEditConfig } = usePermissions();
  const q = useQuery({ queryKey: ['hkd-reminders', scope], queryFn: () => fetchReminders(scope), placeholderData: keepPreviousData });
  if (q.isError) return <BlockError message="Không tải được thống kê nhắc việc." onRetry={() => q.refetch()} />;
  const d = q.data;
  const off = d?.kinds.filter((k) => !k.enabled) ?? [];
  return (
    <div className={`hkd-tab hkd-reminders${q.isPlaceholderData ? ' is-stale' : ''}`} aria-busy={q.isPlaceholderData}>
      <KpiStrip label="Chỉ số nhắc việc">
        {REMINDER_ORDER.map((k, i) => {
          const r = d?.kinds[i];
          return <Kpi key={k} proposal={!!KIND_NOTE[k]} info={KIND_NOTE[k]} label={`HKD ${REMINDER_LABEL[k].toLowerCase()}`} value={r ? num(r.hkd) : <Skel w={80} h={28} />} tone={k === 'OVERDUE' ? 'danger' : undefined} />;
        })}
      </KpiStrip>
      {off.length > 0 && (
        <p className="hkd-off" role="status">
          {off.map((k) => REMINDER_LABEL[k.kind]).join(', ')}: đang tắt trong Thiết lập, số liệu là của thời gian còn bật.
        </p>
      )}
      {/* Phễu nhắc: Đã nhắc = Đã hoàn thành + Chưa hoàn thành. Ngưỡng doanh thu không có "hoàn thành" nên nằm ở bảng riêng bên dưới. */}
      <Panel title={<span className="title-with-tip">Hiệu quả nhắc 30 ngày<ProtoBadge note="Cách đo “hoàn thành sau nhắc” là diễn giải của nhóm thiết kế: HKD đã nộp tờ khai hoặc nộp thuế sau khi được nhắc." /></span>} className="dashboard-card--static hkd-table">
        {!d ? <Skel w="100%" h={160} /> : (<>
          <table className="mini-table rem-table">
            <thead><tr><th scope="col">Loại nhắc</th><th scope="col">Đã nhắc</th><th scope="col">Đã hoàn thành</th><th scope="col">Tỷ lệ hoàn thành</th><th scope="col">Chưa hoàn thành</th></tr></thead>
            <tbody>
              {d.kinds.filter((k) => k.kind !== 'THRESHOLD').map((k) => {
                const done = k.done ?? 0;
                const rate = k.reminded ? done / k.reminded : 0;
                const open = () => navigate('/quan-ly-hkd', { unit: scope, muc: 'danh-sach', prio: PRIO_OF[k.kind as keyof typeof PRIO_OF] });
                // Cả hàng bấm được; bàn phím dùng nút ở ô cuối.
                return (
                  <tr key={k.kind} className="rem-row" onClick={(e) => { if (!(e.target as HTMLElement).closest('button')) open(); }}>
                    <th scope="row"><span className="rem-kind"><i className="swatch" style={{ background: REMINDER_COLOR[k.kind] }} aria-hidden="true" />{REMINDER_LABEL[k.kind]}</span></th>
                    <td data-label="Đã nhắc">{num(k.reminded)}</td>
                    <td data-label="Đã hoàn thành">{num(done)}</td>
                    <td data-label="Tỷ lệ hoàn thành">
                      <span className="rem-rate"><span className="rem-rate__bar" aria-hidden="true"><span style={{ transform: `scaleX(${rate})` }} /></span>{pct(done, k.reminded)}</span>
                    </td>
                    <td data-label="Chưa hoàn thành">
                      <button type="button" className="link-btn rem-open" onClick={open}
                        aria-label={`Xem ${num(k.hkd)} HKD ${REMINDER_LABEL[k.kind].toLowerCase()} chưa hoàn thành trong Danh sách nghĩa vụ`}>
                        {num(k.hkd)}<ChevronRight aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>)}
      </Panel>
      <Panel
          title={<span className="title-with-tip">Ngưỡng doanh thu<ProtoBadge note="Ngưỡng gần mốc mặc định 80% là giá trị đề xuất trong bản mẫu." /></span>}
          className="dashboard-card--static hkd-table"
          extra={<Button variant="outline" onClick={() => navigate('/thiet-lap', { muc: 'canh-bao-doanh-thu' })}>{canEditConfig ? 'Sửa ngưỡng' : 'Xem thiết lập'}</Button>}
        >
          {!d ? <Skel w="100%" h={120} /> : (
            <table className="mini-table">
              <thead><tr><th scope="col">Mốc</th><th scope="col">{d ? `Sắp đạt (≥ ${d.rule.nearPct}%)` : 'Sắp đạt'}</th><th scope="col">Đã báo</th><th scope="col">Đã vượt trong năm</th></tr></thead>
              <tbody>
                {d.milestones.map((m) => (
                  <tr key={m.code}><th scope="row">{money(m.amount)}<span className="rem-sub">{m.meaning}</span></th><td data-label={`Sắp đạt (≥ ${d.rule.nearPct}%)`}>{num(m.near)}</td><td data-label="Đã báo">{num(m.notified)}</td><td data-label="Đã vượt trong năm">{num(m.passed)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      {/* So sánh đơn vị chỉ có nghĩa khi có từ 2 đơn vị (cán bộ chỉ có chính mình). */}
      {(!d || d.byUnit.length > 1) && (
        <Panel title="HKD cần nhắc theo đơn vị" className="dashboard-card--static hkd-table">
          {!d ? <Skel w="100%" h={120} /> : (
            <TopRows total={d.byUnit.length} noun="đơn vị"><table className="mini-table">
              <thead><tr><th scope="col">Đơn vị</th>{REMINDER_ORDER.map((k) => <th scope="col" key={k}>{REMINDER_LABEL[k]}</th>)}</tr></thead>
              <tbody>{d.byUnit.map((u) => <tr key={u.name}><th scope="row">{u.name}</th>{REMINDER_ORDER.map((k) => <td key={k} data-label={REMINDER_LABEL[k]}>{num(u.counts[k])}</td>)}</tr>)}</tbody>
            </table></TopRows>
          )}
        </Panel>
      )}
    </div>
  );
}
