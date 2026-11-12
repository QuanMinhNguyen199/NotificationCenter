import type { Notification } from '@/shared/data/types';

export function pushText(n: Pick<Notification, 'groups' | 'title'>) {
  if (n.groups.includes('D4')) return { title: 'Doanh thu gần ngưỡng sử dụng hóa đơn', body: 'Mở iHanoi để xem doanh thu ghi nhận và việc cần chuẩn bị.' };
  if (n.groups.length > 1) return { title: 'Bạn còn hồ sơ khai và khoản thuế cần xử lý', body: 'Mở iHanoi để xem chi tiết và hạn hoàn thành.' };
  if (n.groups.includes('D1b')) return { title: 'Nhắc nộp thuế', body: 'Bạn còn khoản thuế cần nộp. Mở iHanoi để xem hạn nộp.' };
  return { title: 'Nhắc khai thuế', body: 'Bạn còn hồ sơ khai thuế cần nộp. Mở iHanoi để xem hạn nộp.' };
}
