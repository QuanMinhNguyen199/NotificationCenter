import type { ReactNode } from 'react';
import { InfoTip } from './InfoTip';
import { ProtoBadge } from './Proto';

/** Dải chỉ số đầu tab: các ô ngang hàng, cùng cỡ. */
export function KpiStrip({ label, busy, className, children }: {
  label?: string; busy?: boolean; className?: string; children: ReactNode;
}) {
  return (
    <div className={`hkd-kpis${className ? ` ${className}` : ''}`} role="group" aria-label={label} aria-busy={busy}>
      {children}
    </div>
  );
}

export function Kpi({ label, value, note, tone, info, proposal, children }: {
  label: ReactNode; value: ReactNode; note?: ReactNode; tone?: 'danger';
  /** Cách tính, hiện trong tooltip cạnh nhãn. */
  info?: ReactNode;
  /** Chỉ số hoặc cách tính do nhóm thiết kế tự đặt: hiện nhãn "Đề xuất" (tooltip = info) thay cho icon ⓘ. */
  proposal?: boolean;
  /** Nội dung thêm giữa số và ghi chú (vd. dòng mục tiêu). */
  children?: ReactNode;
}) {
  return (
    <div className="hkd-kpi">
      <span className="kpi__label">{label}{proposal ? <ProtoBadge note={info} /> : info && <InfoTip>{info}</InfoTip>}</span>
      <span className={`kpi__value${tone === 'danger' ? ' kpi__value--failed' : ''}`}>{value}</span>
      {children}
      {note && <span className="kpi__note">{note}</span>}
    </div>
  );
}
