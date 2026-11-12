import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/shared/demo/useDemo';
import { NOW_ISO, fetchCases, minutesBetween, type RoutingCase, type RoutingScope } from './routingApi';

/** Phạm vi hộp việc: lãnh đạo cơ sở xem mọi tổ; lãnh đạo tổ và cán bộ xem hàng chung của tổ mình. */
export function useRoutingScope(): RoutingScope {
  const { role, user } = usePermissions();
  return role === 'base' ? 'ALL' : (user.team ?? 'NONE');
}

export const casesKey = (scope: RoutingScope) => ['routing', 'cases', scope] as const;

export function useCases() {
  const scope = useRoutingScope();
  return useQuery({ queryKey: casesKey(scope), queryFn: () => fetchCases(scope) });
}

/** Số ca Mới trong phạm vi của tài khoản, dùng cho số đếm trên menu. 0 khi đang tải. */
export function useOpenCaseCount() {
  const q = useCases();
  return q.data?.cases.filter((c) => c.status === 'NEW').length ?? 0;
}

/** Khoảng thời gian thô cho danh sách: "45 phút", "5 giờ", "2 ngày". */
export function coarse(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} giờ`;
  return `${Math.floor(h / 24)} ngày`;
}

export const ago = (iso: string) => {
  const m = minutesBetween(iso, NOW_ISO);
  return m < 1 ? 'Vừa xong' : `${coarse(m)} trước`;
};

export interface DueInfo {
  text: string;
  tone: 'danger' | 'warning' | 'neutral' | 'success';
  overdue: boolean;
}

/** Thời hạn còn lại của ca chưa trả lời, hoặc kết quả đúng/trễ hạn của ca đã trả lời. */
export function dueInfo(c: RoutingCase): DueInfo {
  if (c.answeredAt) {
    const late = c.answeredAt > c.dueAt;
    return { text: late ? 'Trả lời trễ hạn' : 'Trả lời trong hạn', tone: late ? 'warning' : 'success', overdue: false };
  }
  const left = minutesBetween(NOW_ISO, c.dueAt);
  if (left < 0) return { text: `Quá hạn ${coarse(-left)}`, tone: 'danger', overdue: true };
  return { text: `Còn ${coarse(left)}`, tone: left < 4 * 60 ? 'warning' : 'neutral', overdue: false };
}
