import type { ReactNode } from 'react';
import { Lightbulb } from 'lucide-react';
import { HoverTip } from './InfoTip';

/**
 * Nhãn "Đề xuất" đặt cạnh tiêu đề của phần do nhóm thiết kế tự đặt, chưa được nghiệp vụ chốt
 * (quy tắc, cách tính, ngưỡng, cách phân nhóm). Rê chuột hoặc focus để đọc giải thích.
 * Viền nét đứt để không lẫn với pill trạng thái (nền đặc).
 * Không gắn nhãn cho số liệu minh họa: toàn bộ số liệu của bản mẫu đều là dữ liệu giả.
 */
export function ProtoBadge({ note, className }: { note?: ReactNode; className?: string }) {
  const cls = `proto proto--proposal${className ? ` ${className}` : ''}`;
  const body = <><Lightbulb aria-hidden="true" /><span aria-hidden="true">Đề xuất</span></>;
  if (!note) return <span className={cls} title="Đề xuất: do nhóm thiết kế tự đặt, chưa được nghiệp vụ chốt">{body}<span className="sr-only">Đề xuất, chưa được nghiệp vụ chốt</span></span>;
  return (
    <HoverTip label="Đề xuất, chưa được nghiệp vụ chốt" className={`${cls} proto--tip`} trigger={body}>
      <b>Đề xuất, chưa được nghiệp vụ chốt.</b> {note}
    </HoverTip>
  );
}
