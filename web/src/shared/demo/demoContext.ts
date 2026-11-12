import { createContext } from 'react';

// Tài khoản xem thử của bản thiết kế, mỗi cấp một tài khoản. Khi nối đăng nhập Keycloak/OIDC, tài khoản lấy từ token.
// Vai trò và tổ đọc trực tiếp từ kho tài khoản, nên đổi quyền ở màn Tài khoản có tác dụng ngay khi chuyển sang tài khoản đó.
export const DEMO_ACCOUNTS = ['an', 'ha', 'binh'] as const;
export type DemoId = (typeof DEMO_ACCOUNTS)[number];

export interface DemoState {
  userId: DemoId;
  setUserId: (id: DemoId) => void;
}

export const DEMO_USER_KEY = 'qttb-demo-user';

export function loadDemoUser(): DemoId {
  try {
    const v = localStorage.getItem(DEMO_USER_KEY);
    return DEMO_ACCOUNTS.find((d) => d === v) ?? 'an';
  } catch {
    return 'an';
  }
}

export const DemoCtx = createContext<DemoState | null>(null);
