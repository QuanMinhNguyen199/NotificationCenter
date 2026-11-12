import type { DeliveryStatus, Priority, RunStatus, SendStatus } from '@/shared/data/types';

// Nhãn và tone trạng thái dùng chung; component hiển thị nằm ở shared/components/Status.tsx.
export type Tone = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

export const SEND: Record<SendStatus, { label: string; tone: Tone }> = {
  SENT: { label: 'Đã gửi', tone: 'info' },
  PENDING: { label: 'Chờ gửi', tone: 'warning' },
  FAILED: { label: 'Gửi thất bại', tone: 'danger' },
  UNKNOWN: { label: 'Chưa rõ kết quả', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn gửi', tone: 'neutral' },
  SKIPPED: { label: 'Bỏ qua', tone: 'neutral' },
};

export const DELIVERY: Record<DeliveryStatus, { label: string; tone: Tone }> = {
  // iHanoi chưa xác minh có xác nhận đã giao tới máy (tài liệu Notification Center 7.2): gộp DELIVERED và ACCEPTED thành "Đã tiếp nhận".
  DELIVERED: { label: 'Đã tiếp nhận', tone: 'success' },
  ACCEPTED: { label: 'Đã tiếp nhận', tone: 'success' },
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
