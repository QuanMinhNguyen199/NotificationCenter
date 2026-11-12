import { useEffect, useSyncExternalStore } from 'react';

// Đếm overlay toàn màn hình đang mở trên mobile để tạm ẩn điều hướng chính (đặc tả 2, mục điều hướng).
let count = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useOverlayOpen() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => count > 0,
  );
}

export function useHideNavWhile(open: boolean) {
  useEffect(() => {
    if (!open) return;
    count++;
    emit();
    return () => {
      count--;
      emit();
    };
  }, [open]);
}
