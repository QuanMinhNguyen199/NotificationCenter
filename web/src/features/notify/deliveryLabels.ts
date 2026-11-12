import type { Tone } from '@/shared/lib/status';
import type { DeliveryState } from './notifyApi';

// Nhãn trạng thái giao tới từng người nhận của một lần gửi chủ động.

export const STATE: Record<DeliveryState, { label: string; tone: Tone }> = {
  READY: { label: 'Chờ gửi', tone: 'neutral' },
  SENDING: { label: 'Đang gửi', tone: 'info' },
  RETRY_WAIT: { label: 'Chờ thử lại', tone: 'warning' },
  ACCEPTED: { label: 'Đã tiếp nhận', tone: 'success' },
  DELIVERED: { label: 'Đã vào hộp thư', tone: 'success' },
  FAILED: { label: 'Thất bại', tone: 'danger' },
  UNKNOWN: { label: 'Chưa rõ', tone: 'warning' },
  SKIPPED: { label: 'Bỏ qua', tone: 'neutral' },
  CANCELED: { label: 'Đã hủy', tone: 'neutral' },
};
