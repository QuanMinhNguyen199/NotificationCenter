import type { ReactNode } from 'react';
import type { DeliveryStatus, Priority, RunStatus, SendStatus } from '../data/types';

export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

/** Pill trạng thái: nền nhạt, chữ đậm cùng sắc — trạng thái luôn đọc được bằng chữ, không dựa riêng vào màu. */
export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export const SEND: Record<SendStatus, { label: string; tone: Tone }> = {
  SENT: { label: 'Đã gửi Noti', tone: 'info' },
  PENDING: { label: 'Chờ gửi', tone: 'warning' },
  FAILED: { label: 'Gửi thất bại', tone: 'danger' },
  UNKNOWN: { label: 'Chưa rõ kết quả', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn gửi', tone: 'neutral' },
  SKIPPED: { label: 'Bỏ qua', tone: 'neutral' },
};

export const DELIVERY: Record<DeliveryStatus, { label: string; tone: Tone }> = {
  DELIVERED: { label: 'Đã giao', tone: 'success' },
  ACCEPTED: { label: 'iHanoi đã tiếp nhận', tone: 'info' },
  DELIVERY_FAILED: { label: 'Giao thất bại', tone: 'danger' },
  NO_FINAL: { label: 'Chưa có kết quả cuối', tone: 'neutral' },
  NA: { label: 'Chưa áp dụng', tone: 'neutral' },
};

export const RUN: Record<RunStatus, { label: string; tone: Tone }> = {
  PLANNED: { label: 'Đang lập danh sách', tone: 'info' },
  HOLD: { label: 'Chờ duyệt', tone: 'warning' },
  APPROVED: { label: 'Đã duyệt', tone: 'info' },
  SENDING: { label: 'Đang gửi', tone: 'info' },
  PAUSED: { label: 'Tạm dừng', tone: 'warning' },
  DONE: { label: 'Hoàn tất', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'neutral' },
};

export const PRIORITY: Record<Priority, { label: string; tone: Tone }> = {
  OVERDUE: { label: 'Quá hạn', tone: 'danger' },
  DUE_SOON: { label: 'Sắp hạn', tone: 'warning' },
  IN_TERM: { label: 'Còn trong hạn', tone: 'neutral' },
};

export const GROUP_LABEL: Record<string, string> = {
  D1: 'Nhắc nghĩa vụ thuế',
  D1a: 'Khai thuế',
  D1b: 'Nộp thuế',
  D1c: 'Trạng thái HKD',
  D3: 'Chuyển tuyến',
  D4: 'Doanh thu',
  D5: 'Thông báo chung',
  D6: 'Ngân hàng',
};

export function GroupTags({ groups }: { groups: string[] }) {
  return (
    <span className="group-tags">{groups.map((g) => GROUP_LABEL[g]).join(', ')}</span>
  );
}

export function Pill<K extends string>({ map, value }: { map: Record<K, { label: string; tone: Tone }>; value: K }) {
  const m = map[value];
  return <StatusPill tone={m.tone}>{m.label}</StatusPill>;
}
