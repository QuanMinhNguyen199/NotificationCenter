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
 * Animation cho ECharts (11/11/2026, theo yêu cầu người dùng):
 * - Lần vẽ đầu: cột mọc từ trục lên, đường vẽ dần từ trái sang phải, 600ms ease-out; mỗi cột trễ thêm 18ms
 *   (tổng trễ tối đa 360ms) để mắt đọc theo thứ tự thời gian thay vì cả khối bật ra cùng lúc.
 * - Đổi bộ lọc: chuyển từ số cũ sang số mới trong 320ms, không vẽ lại từ đầu, không trễ.
 * - Giảm chuyển động hoặc đang chuyển cảnh đăng nhập: tắt hẳn, vẽ thẳng số cuối.
 */
export const chartMotion = (reduced: boolean) =>
  reduced || authTransition.get()
    ? { animation: false }
    : {
        animation: true,
        animationDuration: 600,
        animationEasing: 'cubicOut',
        animationDelay: (i: number) => Math.min(i * 18, 360),
        animationDurationUpdate: 320,
        animationEasingUpdate: 'cubicOut',
        animationDelayUpdate: 0,
      };
