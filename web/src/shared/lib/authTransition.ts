import { useSyncExternalStore } from 'react';

// Cờ "đang chuyển cảnh đăng nhập": trang chủ đọc cờ này để tạm bỏ hiệu ứng xuất hiện của nội dung
// (fade đổi màn, animation biểu đồ), tránh chạy chồng với reveal.
let active = false;
const subs = new Set<() => void>();

export const authTransition = {
  get: () => active,
  set(v: boolean) {
    if (v === active) return;
    active = v;
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

export const useAuthTransition = () => useSyncExternalStore(authTransition.subscribe, authTransition.get, authTransition.get);
