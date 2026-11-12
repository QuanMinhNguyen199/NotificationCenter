import { Children, type CSSProperties, type ReactNode } from 'react';
import { InfoTip } from './InfoTip';
import { ProtoBadge } from './Proto';

/**
 * Dải chỉ số đầu tab. Một ô chính (primary) đặt đầu dải, số lớn và rộng hơn; các ô còn lại là phụ.
 * Mobile: ô chính chiếm cả hàng, ô phụ xếp 2 cột.
 */
export function KpiStrip({ label, lead, busy, className, children }: {
  label?: string; lead?: boolean; busy?: boolean; className?: string; children: ReactNode;
}) {
  // Ô phụ = tổng số ô trừ ô chính; xếp thành 2 hàng.
  const secondary = Children.count(children) - 1;
  const style = lead ? ({ '--kpi-cols': Math.max(1, Math.ceil(secondary / 2)) } as CSSProperties) : undefined;
  const odd = lead && secondary > 1 && secondary % 2 === 1;
  return (
    <div className={`hkd-kpis${lead ? ' hkd-kpis--lead' : ''}${odd ? ' kpis--odd' : ''}${className ? ` ${className}` : ''}`} style={style} role="group" aria-label={label} aria-busy={busy}>
      {children}
    </div>
  );
}

export function Kpi({ label, value, note, tone, primary, info, proposal, children }: {
  label: ReactNode; value: ReactNode; note?: ReactNode; tone?: 'danger';
  /** Ô chính của dải (chỉ một ô mỗi dải). */
  primary?: boolean;
  /** Cách tính, hiện trong tooltip cạnh nhãn. */
  info?: ReactNode;
  /** Chỉ số hoặc cách tính do nhóm thiết kế tự đặt: hiện nhãn "Đề xuất" (tooltip = info) thay cho icon ⓘ. */
  proposal?: boolean;
  /** Nội dung thêm giữa số và ghi chú (vd. dòng mục tiêu). */
  children?: ReactNode;
}) {
  return (
    <div className={`hkd-kpi${primary ? ' hkd-kpi--primary' : ''}`}>
      <span className="kpi__label">{label}{proposal ? <ProtoBadge note={info} /> : info && <InfoTip>{info}</InfoTip>}</span>
      <span className={`kpi__value${tone === 'danger' ? ' kpi__value--failed' : ''}`}>{value}</span>
      {children}
      {note && <span className="kpi__note">{note}</span>}
    </div>
  );
}
