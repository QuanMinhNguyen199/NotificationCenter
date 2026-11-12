import type { Tone } from '@/shared/lib/status';
import type { ChannelStatus } from '@/features/notify/notifyApi';

export const CHANNEL_STATUS: Record<ChannelStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Đang hoạt động', tone: 'success' },
  PAUSED: { label: 'Tạm dừng', tone: 'warning' },
  DISABLED_EMERGENCY: { label: 'Ngắt khẩn cấp', tone: 'danger' },
  NOT_CONNECTED: { label: 'Chưa kết nối', tone: 'neutral' },
};
