import { TimeSelect } from '@/components/Controls';
import { CalendarClock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { ReactNode } from 'react';
import { FIELD_META, GROUPS, POLICY_THRESHOLDS, formatValue, type AreaId, type ConfigValues, type FieldKey } from '../data/config';
import { StatusPill } from '../components/Status';
import { dmy, num } from '../lib/format';
import { nextRuns } from './DayRibbon';
import type { DraftApi } from './useConfigDraft';

export interface Section {
  key: string;
  title: string;
  desc?: string;
  /** Tóm tắt giá trị hiện trên accordion mobile khi đóng. */
  summary: string;
  /** Không có nội dung ngoài công tắc thì để null: thẻ chỉ còn tiêu đề, mô tả và công tắc. */
  content: ReactNode;
  fields: FieldKey[];
  /** Công tắc bật/tắt cả mục, đặt cùng hàng tiêu đề thẻ. Tắt thì ẩn phần thân thẻ. */
  toggle?: SwitchKey;
  /** Thẻ thuộc phạm vi của công tắc ở thẻ khác: công tắc đó tắt thì ẩn cả thẻ. */
  dependsOn?: SwitchKey;
}

type SwitchKey = 'autoScan' | 'holdAbnormal' | 'reminderEnabled' | 'revenueEnabled';

interface Ctx {
  api: DraftApi;
  v: ConfigValues;
  readOnly: boolean;
}

/* ---------- Trường ---------- */

function FieldShell({ k, ctx, help, children }: { k: FieldKey; ctx: Ctx; help?: ReactNode; children: ReactNode }) {
  const dirty = ctx.api.dirtyKeys.includes(k);
  const err = ctx.api.showErrors || dirty ? ctx.api.errors[k] : undefined;
  return (
    <div className={`field${dirty && !ctx.readOnly ? ' field--dirty' : ''}`}>
      <label className="field__label" htmlFor={`cfg-${k}`}>
        {FIELD_META[k].label}
      </label>
      {ctx.readOnly ? <span className="field__ro" id={`cfg-${k}`}>{formatValue(k, ctx.v[k])}</span> : children}
      {err && (
        <span className="field__error" id={`cfg-${k}-err`} role="alert">
          {err}
        </span>
      )}
      {help && <span className="field__help" id={`cfg-${k}-help`}>{help}</span>}
    </div>
  );
}

function TimeField({ k, ctx, help }: { k: 'scanTime' | 'catchupTime' | 'sendStart' | 'sendEnd'; ctx: Ctx; help?: ReactNode }) {
  const err = (ctx.api.showErrors || ctx.api.dirtyKeys.includes(k)) && ctx.api.errors[k];
  return (
    <FieldShell k={k} ctx={ctx} help={help}>
      <TimeSelect id={`cfg-${k}`} label={FIELD_META[k].label} value={ctx.v[k]} onValueChange={(time) => ctx.api.update(k, time)}
        aria-describedby={err ? `cfg-${k}-err` : help ? `cfg-${k}-help` : undefined} aria-invalid={!!err} />
    </FieldShell>
  );
}

function NumField({ k, ctx, help, min, max }: { k: FieldKey; ctx: Ctx; help?: ReactNode; min?: number; max?: number }) {
  const err = (ctx.api.showErrors || ctx.api.dirtyKeys.includes(k)) && ctx.api.errors[k];
  return (
    <FieldShell k={k} ctx={ctx} help={help}>
      <div className="number-field">
        <Input type="number" step={1} id={`cfg-${k}`} value={Number.isFinite(ctx.v[k] as number) ? ctx.v[k] as number : ''} min={min} max={max} inputMode="numeric"
          onChange={(e) => ctx.api.update(k, e.target.value === '' ? NaN as never : Number(e.target.value) as never)}
          aria-describedby={err ? `cfg-${k}-err` : help ? `cfg-${k}-help` : undefined} aria-invalid={!!err} />
        {FIELD_META[k].unit && <span className="text-sm text-muted-foreground">{FIELD_META[k].unit}</span>}
      </div>
    </FieldShell>
  );
}

/** Công tắc bật/tắt cả mục, đặt cạnh tiêu đề thẻ; tài khoản chỉ xem thấy nhãn trạng thái thay cho công tắc. */
export function SectionToggle({ k, ctx }: { k: SwitchKey; ctx: Ctx }) {
  const on = ctx.v[k];
  const dirty = ctx.api.dirtyKeys.includes(k);
  if (ctx.readOnly) return <StatusPill tone={on ? 'success' : 'neutral'}>{on ? 'Đang bật' : 'Đang tắt'}</StatusPill>;
  return (
    <span className="section-toggle">
      {dirty && <span className="dirty-mark" role="img" aria-label="Đã sửa, chưa lưu" title="Đã sửa, chưa lưu">!</span>}
      <Switch id={`cfg-${k}`} checked={on} onCheckedChange={(c) => ctx.api.update(k, c)} aria-label={FIELD_META[k].label} />
    </span>
  );
}

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
              <th className="num" style={{ textAlign: 'right' }}>
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

/** Các loại thông báo chưa có trong hệ thống đang chạy: chỉ đọc mô tả, không có công tắc. */
export function UnusedGroups() {
  return (
    <section className="panel">
      <div className="panel__body">
        
        <dl className="unused-list">
          {GROUPS.filter((g) => g.unused).map((g) => (
            <div key={g.id} className="unused-list__item">
              <dt>{g.name}</dt>
              <dd>{g.description}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export type { Ctx };
