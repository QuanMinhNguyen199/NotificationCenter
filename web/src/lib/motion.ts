import { authTransition } from '../auth/transitionState';

// Token chuyển động dùng chung cho motion/react và ECharts; khớp biến CSS --dur-* và --ease-* trong styles.css.
// Giá trị là điểm khởi đầu để thử, chưa kiểm chứng với người dùng.

/** Thời lượng (giây) cho motion/react. */
export const DUR = {
  /** Phản hồi nhỏ: hover, nhấn, đổi màu. */
  fast: 0.12,
  /** Chuyển trạng thái: tab, accordion, đổi màn. */
  state: 0.18,
  /** Drawer, modal, thanh bên trượt ra. */
  overlay: 0.24,
} as const;

/** Ease-out: vào nhanh, dừng êm, không nảy. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const tween = (duration: number) => ({ type: 'tween' as const, duration, ease: EASE_OUT });

/**
 * Animation cho ECharts: lần vẽ đầu ngắn, lần cập nhật chuyển từ số cũ sang số mới (không vẽ lại từ đầu).
 * Giảm chuyển động thì tắt hẳn.
 */
export const chartMotion = (reduced: boolean) =>
  // Đang chuyển cảnh đăng nhập: vẽ thẳng số cuối, biểu đồ đứng yên khi lớp che mở ra.
  reduced || authTransition.get()
    ? { animation: false }
    : { animation: true, animationDuration: 300, animationEasing: 'cubicOut', animationDurationUpdate: 240, animationEasingUpdate: 'cubicOut' };
