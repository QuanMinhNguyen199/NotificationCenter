import { CalendarClock } from 'lucide-react';
import { POLICY_THRESHOLDS, type AreaId } from '@/shared/data/config';
import { dmy, num } from '@/shared/lib/format';
import { nextRuns } from './nextRuns';
import { NumField, TimeField, type Ctx, type Section } from './Forms';

// Nội dung từng khu vực của màn Thiết lập (danh sách section theo khu vực).
const finite = (n: number) => (Number.isFinite(n) ? n : '…');

/* ---------- Lịch chạy ---------- */

function scheduleSections(ctx: Ctx): Section[] {
  const { v } = ctx;
  const runs = nextRuns(v);
  return [
    {
      key: 'scan',
      title: 'Tự động tạo đợt nhắc hằng ngày',
      desc: 'Tắt chỉ dừng lập danh sách mới; đợt đã tạo vẫn gửi tiếp.',
      summary: v.autoScan ? `${v.scanTime}, quét bù ${v.catchupTime}` : 'Quét tự động đang tắt',
      fields: ['autoScan', 'scanTime', 'catchupTime'],
      toggle: 'autoScan',
      content: (
        <>
          <div className="fields">
            <TimeField k="scanTime" ctx={ctx} />
            <TimeField k="catchupTime" ctx={ctx} />
          </div>
          <p className="field__help">
            {runs.length ? `Lần chạy tiếp theo: ${runs.join('; ')}.` : 'Quét tự động đang tắt nên không có lượt tự chạy; các giờ trên được giữ lại.'}
          </p>
        </>
      ),
    },
    {
      key: 'send',
      title: 'Khung giờ gửi',
      desc: 'Chỉ áp dụng cho nhắc việc. Thông báo theo sự kiện gửi ngay, không chờ khung giờ.',
      summary: `${v.sendStart}–${v.sendEnd}`,
      fields: ['sendStart', 'sendEnd'],
      content: (
        <div className="fields">
          <TimeField k="sendStart" ctx={ctx} />
          <TimeField k="sendEnd" ctx={ctx} />
        </div>
      ),
    },
    {
      key: 'hold',
      title: 'Duyệt đợt tăng bất thường',
      desc: 'Đợt bị giữ chờ duyệt ở tab Đợt gửi.',
      summary: v.holdAbnormal ? `Giữ khi tăng trên ${v.growthFactor} lần` : 'Không giữ',
      fields: ['holdAbnormal', 'growthFactor', 'historyRuns', 'minRuns'],
      toggle: 'holdAbnormal',
      content: (
        <>
          <div className="fields fields--3">
            <NumField k="growthFactor" ctx={ctx} min={1} />
            <NumField k="historyRuns" ctx={ctx} min={1} />
            <NumField k="minRuns" ctx={ctx} min={1} />
          </div>
          <p className="field__help">
            Giữ đợt khi số thông báo lớn hơn {finite(v.growthFactor)} lần trung vị của tối đa {finite(v.historyRuns)} đợt gần nhất, khi đã có ít nhất{' '}
            {finite(v.minRuns)} đợt.
          </p>
        </>
      ),
    },
  ];
}

/* ---------- Nhắc nghĩa vụ thuế: khai và nộp dùng chung một công tắc và một cửa sổ nhắc ---------- */

function reminderSections(ctx: Ctx, goSchedule: () => void): Section[] {
  const { v } = ctx;
  return [
    {
      key: 'use',
      title: 'Nhắc khai và nộp thuế',
      summary: `${v.reminderEnabled ? 'Đang bật' : 'Đang tắt'}, nhắc trước hạn ${v.daysBefore} ngày`,
      fields: ['reminderEnabled', 'daysBefore'],
      toggle: 'reminderEnabled',
      content: (
        <>
          <div className="fields">
            <NumField k="daysBefore" ctx={ctx} min={0} />
          </div>
          <p className="field__help">
            Nhắc hằng ngày từ {finite(v.daysBefore)} ngày trước hạn và tiếp tục khi quá hạn; mỗi NNT nhận tối đa một thông báo mỗi ngày. Gửi theo{' '}
            <button type="button" className="link-btn" onClick={goSchedule}>
              <CalendarClock aria-hidden="true" />
              Lịch chạy chung
            </button>{' '}
            (rà soát {v.scanTime}, gửi {v.sendStart}–{v.sendEnd}).
          </p>
        </>
      ),
    },
  ];
}

/* ---------- Cảnh báo doanh thu ---------- */

function revenueSections(ctx: Ctx): Section[] {
  const { v } = ctx;
  return [
    {
      key: 'use',
      title: 'Cảnh báo doanh thu',
      summary: v.revenueEnabled ? 'Đang bật' : 'Đang tắt',
      fields: ['revenueEnabled'],
      toggle: 'revenueEnabled',
      content: null,
    },
    {
      key: 'rule',
      title: 'Điều kiện cảnh báo',
      summary: `Gần ngưỡng ${v.nearThresholdPct}%, biên dự báo ${v.forecastMarginPct}%`,
      fields: ['nearThresholdPct', 'forecastMarginPct', 'forecastMinDays', 'confirmGapDays', 'confirmCount', 'upsellCycleDays'],
      dependsOn: 'revenueEnabled',
      content: (
        <div className="fields fields--3">
          <NumField k="nearThresholdPct" ctx={ctx} min={1} max={99} />
          <NumField k="forecastMarginPct" ctx={ctx} min={0} max={100} />
          <NumField k="forecastMinDays" ctx={ctx} min={1} />
          <NumField k="confirmGapDays" ctx={ctx} min={0} />
          <NumField k="confirmCount" ctx={ctx} min={1} />
          <NumField k="upsellCycleDays" ctx={ctx} min={1} />
        </div>
      ),
    },
    {
      key: 'policy',
      title: 'Ngưỡng chính sách',
      desc: 'Chỉ đọc.',
      summary: POLICY_THRESHOLDS.map((t) => `${num(t.amount / 1e9)} tỷ`).join(', '),
      fields: [],
      dependsOn: 'revenueEnabled',
      content: (
        <table className="threshold-table">
          <thead>
            <tr>
              <th>Ngưỡng</th>
              <th className="num">
                Số tiền
              </th>
              <th>Hiệu lực</th>
            </tr>
          </thead>
          <tbody>
            {POLICY_THRESHOLDS.map((t) => (
              <tr key={t.code}>
                <td>{t.meaning}</td>
                <td className="num">{num(t.amount)} đồng</td>
                <td className="num">{dmy(t.effective)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
  ];
}

export function sectionsFor(area: AreaId, ctx: Ctx, goSchedule: () => void): Section[] {
  if (area === 'schedule') return scheduleSections(ctx);
  if (area === 'reminder') return reminderSections(ctx, goSchedule);
  if (area === 'revenue') return revenueSections(ctx);
  return [];
}
