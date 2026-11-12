import { createContext, useContext } from 'react';

// Chặn rời màn khi còn thay đổi chưa lưu: hỏi "Tiếp tục chỉnh sửa / Bỏ thay đổi", không tự lưu.
export interface GuardApi {
  /** Màn đang sửa đăng ký trạng thái "bẩn" và hàm bỏ thay đổi. */
  setGuard: (g: { dirty: boolean; discard: () => void } | null) => void;
  /** Gọi trước khi rời màn; proceed chạy ngay nếu không có thay đổi hoặc sau khi người dùng chọn bỏ. */
  confirmLeave: (proceed: () => void) => void;
}

export const GuardCtx = createContext<GuardApi | null>(null);

export function useGuard() {
  const v = useContext(GuardCtx);
  if (!v) throw new Error('useGuard cần GuardProvider');
  return v;
}
