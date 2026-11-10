import { FlaskConical, Lightbulb } from 'lucide-react';

/**
 * Nhãn cho phần chưa có trong hệ thống thật (view.docx, mục [Thêm]):
 * - "Giả lập": dữ liệu hoặc hành vi do bản mock tạo ra, chưa nối nguồn thật.
 * - "Đề xuất": quy tắc nghiệp vụ do nhóm thiết kế tự đặt, chưa được nghiệp vụ chốt.
 * Viền nét đứt để không lẫn với pill trạng thái (nền đặc).
 */
export type ProtoKind = 'mock' | 'proposal';

const META: Record<ProtoKind, { label: string; hint: string }> = {
  mock: { label: 'Giả lập', hint: 'Dữ liệu và thao tác mô phỏng, chưa nối hệ thống thật' },
  proposal: { label: 'Đề xuất', hint: 'Quy tắc do nhóm thiết kế tự đặt, chưa được nghiệp vụ chốt' },
};

export function ProtoBadge({ kind, note, className }: { kind: ProtoKind; note?: string; className?: string }) {
  const m = META[kind];
  const text = note ? `${m.label}: ${note}` : `${m.label}: ${m.hint}`;
  const Icon = kind === 'mock' ? FlaskConical : Lightbulb;
  return (
    <span className={`proto proto--${kind}${className ? ` ${className}` : ''}`} title={text}>
      <Icon aria-hidden="true" />
      <span aria-hidden="true">{m.label}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
}

/** Dòng giải thích quy tắc tạm ngay tại chỗ dùng: nhãn + nội dung giả định. */
export function ProtoNote({ kind, children }: { kind: ProtoKind; children: React.ReactNode }) {
  return (
    <p className={`proto-note proto-note--${kind}`}>
      <ProtoBadge kind={kind} />
      <span>{children}</span>
    </p>
  );
}
