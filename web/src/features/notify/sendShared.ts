import { varLabel, type Attempt, type SendView } from './notifyApi';
import { type Tone } from '@/shared/lib/status';
import { taxpayers } from '@/shared/data/mock';

/** Kết quả của từng lần thử gửi (khác trạng thái cuối của kênh). */
export const OUTCOME: Record<Attempt['outcome'], { label: string; tone: Tone }> = {
  DELIVERED: { label: 'Đã lưu vào hộp thư', tone: 'success' },
  ACCEPTED: { label: 'iHanoi tiếp nhận', tone: 'success' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
  UNKNOWN: { label: 'Chưa rõ kết quả', tone: 'warning' },
};
export const SEND_STATUS: Record<SendView['status'], { label: string; tone: Tone }> = {
  SENDING: { label: 'Đang gửi', tone: 'info' },
  DONE: { label: 'Đã xong', tone: 'success' },
  CANCELED: { label: 'Đã hủy phần còn lại', tone: 'neutral' },
};
export const BATCH = 100;

/** Điền biến theo một NNT cụ thể. */
export const fill = (text: string, id: number | undefined, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => (k === 'ten_nnt' && id !== undefined ? taxpayers[id].name : k === 'mst' && id !== undefined ? taxpayers[id].mst : values[k] || `[${varLabel(k)}]`));
