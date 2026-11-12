import { varLabel } from './notifyApi';

// Giới hạn độ dài và điền biến minh họa cho mẫu tin.

export const TITLE_MAX = 65;

export const BODY_MAX = 240;

/** Điền biến minh họa để xem trước: biến tự điền lấy từ một NNT mẫu, biến khác hiện tên biến. */
export function fillSample(text: string, values: Record<string, string> = {}) {
  const sample: Record<string, string> = { ten_nnt: 'Hộ kinh doanh An Bình', mst: '9990000001', ...values };
  return text.replace(/\{(\w+)\}/g, (_, k: string) => sample[k] || `[${varLabel(k)}]`);
}
