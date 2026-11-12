import { TimeSelect } from '@/shared/components/Controls';
import { Input } from '@/shared/ui/input';
import { Switch } from '@/shared/ui/switch';
import type { ReactNode } from 'react';
import { FIELD_META, GROUPS, formatValue, type ConfigValues, type FieldKey } from '@/shared/data/config';
import { StatusPill } from '@/shared/components/Status';
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

export function FieldShell({ k, ctx, help, children }: { k: FieldKey; ctx: Ctx; help?: ReactNode; children: ReactNode }) {
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

export function TimeField({ k, ctx, help }: { k: 'scanTime' | 'catchupTime' | 'sendStart' | 'sendEnd'; ctx: Ctx; help?: ReactNode }) {
  const err = (ctx.api.showErrors || ctx.api.dirtyKeys.includes(k)) && ctx.api.errors[k];
  return (
    <FieldShell k={k} ctx={ctx} help={help}>
      <TimeSelect id={`cfg-${k}`} label={FIELD_META[k].label} value={ctx.v[k]} onValueChange={(time) => ctx.api.update(k, time)}
        aria-describedby={err ? `cfg-${k}-err` : help ? `cfg-${k}-help` : undefined} aria-invalid={!!err} />
    </FieldShell>
  );
}

export function NumField({ k, ctx, help, min, max }: { k: FieldKey; ctx: Ctx; help?: ReactNode; min?: number; max?: number }) {
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
