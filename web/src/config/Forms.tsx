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
  content: ReactNode;
  fields: FieldKey[];
}

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

function SwitchRow({ k, ctx, desc }: { k: 'autoScan' | 'holdAbnormal' | 'reminderEnabled' | 'revenueEnabled'; ctx: Ctx; desc?: ReactNode }) {
  const on = ctx.v[k];
  const dirty = ctx.api.dirtyKeys.includes(k);
  return (
    <div className="switch-row">
      <label className="switch-row__title" htmlFor={`cfg-${k}`}>
        {FIELD_META[k].label}
        {ctx.readOnly && <StatusPill tone={on ? 'success' : 'neutral'}>{on ? 'Đang bật' : 'Đang tắt'}</StatusPill>}
        {dirty && !ctx.readOnly && <span className="dirty-note">đã sửa</span>}
      </label>
      {desc && <span className="switch-row__desc">{desc}</span>}
      {!ctx.readOnly && <Switch id={`cfg-${k}`} checked={on} onCheckedChange={(c) => ctx.api.update(k, c)} />}
    </div>
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
      title: 'Rà soát hằng ngày',
      desc: 'Lập danh sách thông báo mỗi ngày theo giờ Việt Nam. Quét bù chạy khi lượt chính bị lỡ.',
      summary: v.autoScan ? `${v.scanTime}, quét bù ${v.catchupTime}` : 'Quét tự động đang tắt',
      fields: ['autoScan', 'scanTime', 'catchupTime'],
      content: (
        <>
          <SwitchRow k="autoScan" ctx={ctx} desc="Tắt chỉ dừng việc tự lập danh sách mới; đợt đã tạo hoặc đang gửi vẫn tiếp tục." />
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
      desc: 'Chỉ gửi trong khung này, trong cùng một ngày.',
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
      desc: 'Giữ lại đợt có số lượng tăng đột biến để cán bộ duyệt trước khi gửi.',
      summary: v.holdAbnormal ? `Giữ khi tăng trên ${v.growthFactor} lần` : 'Không giữ',
      fields: ['holdAbnormal', 'growthFactor', 'historyRuns', 'minRuns'],
      content: (
        <>
          <SwitchRow k="holdAbnormal" ctx={ctx} desc="Đợt bị giữ hiện trạng thái Chờ duyệt ở tab Đợt gửi." />
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
      desc: 'Nhắc hồ sơ khai còn thiếu và khoản thuế còn phải nộp.',
      summary: `${v.reminderEnabled ? 'Đang bật' : 'Đang tắt'}, nhắc trước hạn ${v.daysBefore} ngày`,
      fields: ['reminderEnabled', 'daysBefore'],
      content: (
        <>
          <SwitchRow k="reminderEnabled" ctx={ctx} />
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
      desc: 'Cảnh báo doanh thu gần ngưỡng hoặc dự báo vượt ngưỡng, và nhắc khuyến khích lên doanh nghiệp.',
      summary: v.revenueEnabled ? 'Đang bật' : 'Đang tắt',
      fields: ['revenueEnabled'],
      content: <SwitchRow k="revenueEnabled" ctx={ctx} />,
    },
    {
      key: 'rule',
      title: 'Điều kiện cảnh báo',
      desc: 'Tỷ lệ và nhịp nhắc, tính trên bảng ngưỡng chính sách.',
      summary: `Gần ngưỡng ${v.nearThresholdPct}%, biên dự báo ${v.forecastMarginPct}%`,
      fields: ['nearThresholdPct', 'forecastMarginPct', 'forecastMinDays', 'confirmGapDays', 'confirmCount', 'upsellCycleDays'],
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
      desc: 'Chỉ đọc, lấy từ hệ thống cấu hình chính sách.',
      summary: POLICY_THRESHOLDS.map((t) => `${num(t.amount / 1e9)} tỷ`).join(', '),
      fields: [],
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
        <p className="cfg-card__desc">Các loại thông báo dưới đây chưa có trong hệ thống đang chạy nên chưa có tham số để bật hay chỉnh.</p>
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
