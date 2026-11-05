import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './useMedia';

// Giá trị hiện cuối cùng theo từng khóa. Khi đổi bộ lọc, ô KPI về skeleton rồi hiện lại;
// nhờ nhớ giá trị cũ, số mới vẫn chạy từ số cũ thay vì bật ngay.
const last = new Map<string, number>();

/**
 * Số chạy từ giá trị cũ sang giá trị mới khi dữ liệu đổi (đổi phạm vi, kỳ, nhóm) để người xem thấy số đã thay đổi.
 * Lần hiện đầu tiên không chạy; tắt hẳn khi người dùng chọn giảm chuyển động.
 */
export function useTween(target: number, key: string, duration = 450) {
  const reduced = useReducedMotion();
  const initial = reduced ? target : last.get(key) ?? target;
  const [shown, setShown] = useState(initial);
  // Chạy từ số đang hiện trên màn (không từ bản ghi), để effect chạy lại hai lần ở StrictMode vẫn có chuyển động.
  const shownRef = useRef(initial);
  const frame = useRef(0);

  useEffect(() => {
    last.set(key, target);
    const start = shownRef.current;
    const show = (v: number) => {
      shownRef.current = v;
      setShown(v);
    };
    if (reduced || start === target) {
      show(target);
      return;
    }
    let t0 = -1;
    const step = (now: number) => {
      // Lấy mốc thời gian từ khung hình đầu tiên: dấu thời gian của requestAnimationFrame có thể sớm hơn performance.now().
      if (t0 < 0) t0 = now;
      const p = Math.min(1, (now - t0) / duration);
      show(Math.round(start + (target - start) * (1 - (1 - p) ** 3)));
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [target, key, duration, reduced]);

  return shown;
}
