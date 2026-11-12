import type { ConfigValues } from '@/shared/data/config';
import { toMinutes } from '@/shared/lib/format';

const DAY = 24 * 60;
const at = (t: string) => `${(toMinutes(t) / DAY) * 100}%`;
const HOURS = [0, 3, 6, 9, 12, 15, 18, 21, 24];

/**
 * Một ngày vận hành theo giờ Việt Nam: lượt rà soát, quét bù và khung gửi trên cùng trục 24 giờ.
 * Khi đang sửa, giá trị đang áp dụng hiện bằng nét đứt để thấy ngay khác biệt.
 */
export function DayRibbon({ v, applied, compact }: { v: ConfigValues; applied?: ConfigValues; compact?: boolean }) {
  const ghost = applied && (applied.scanTime !== v.scanTime || applied.catchupTime !== v.catchupTime || applied.sendStart !== v.sendStart || applied.sendEnd !== v.sendEnd);
  const winLeft = toMinutes(v.sendStart);
  const winWidth = Math.max(0, toMinutes(v.sendEnd) - winLeft);
  const label = `Rà soát ${v.autoScan ? v.scanTime : 'tắt'}, quét bù ${v.catchupTime}, khung gửi ${v.sendStart}–${v.sendEnd}, kiểm tra đợt đến lượt mỗi 5 phút.`;

  return (
    <figure className="ribbon" aria-label={`Lịch trong ngày: ${label}`}>
      <div className="ribbon__track" role="img" aria-label={label}>
        {HOURS.slice(1, -1).map((h) => (
          <span key={h} className="ribbon__tick ribbon__tick--hour" style={{ left: `${(h / 24) * 100}%` }} />
        ))}
        {ghost && (
          <span
            className="ribbon__window ribbon__window--ghost"
            style={{ left: at(applied!.sendStart), width: `${((toMinutes(applied!.sendEnd) - toMinutes(applied!.sendStart)) / DAY) * 100}%` }}
          />
        )}
        <span className="ribbon__window" style={{ left: `${(winLeft / DAY) * 100}%`, width: `${(winWidth / DAY) * 100}%` }}>
          {/* Mốc mỗi giờ trong khung gửi; nhịp kiểm tra 5 phút ghi ở chú thích */}
          {Array.from({ length: Math.max(0, Math.ceil(winWidth / 60) - 1) }, (_, i) => (
            <span key={i} className="ribbon__tick" style={{ left: `${(((i + 1) * 60) / Math.max(winWidth, 1)) * 100}%` }} />
          ))}
        </span>
        {ghost && applied!.scanTime !== v.scanTime && <span className="ribbon__mark ribbon__mark--ghost" style={{ left: at(applied!.scanTime) }} />}
        {ghost && applied!.catchupTime !== v.catchupTime && <span className="ribbon__mark ribbon__mark--ghost" style={{ left: at(applied!.catchupTime) }} />}
        <span className={`ribbon__mark${v.autoScan ? '' : ' ribbon__mark--off'}`} style={{ left: at(v.scanTime) }} />
        <span className="ribbon__mark ribbon__mark--hollow" style={{ left: at(v.catchupTime) }} />
      </div>
      <div className="ribbon__hours" aria-hidden="true">
        {HOURS.filter((h) => !compact || h % 6 === 0).map((h) => (
          <span key={h} style={{ left: `${(h / 24) * 100}%` }}>
            {String(h).padStart(2, '0')}:00
          </span>
        ))}
      </div>
      <figcaption className="ribbon__legend">
        <span><i className="lg-dot" /> Rà soát {v.autoScan ? v.scanTime : '(đang tắt)'}</span>
        <span><i className="lg-ring" /> Quét bù {v.catchupTime}</span>
        <span><i className="lg-band" /> Khung gửi {v.sendStart}–{v.sendEnd}</span>
        {ghost && <span><i className="lg-ghost" /> Đang áp dụng</span>}
      </figcaption>
    </figure>
  );
}

