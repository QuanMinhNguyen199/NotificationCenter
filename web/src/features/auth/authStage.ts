import { authTransition } from '@/shared/lib/authTransition';

// Hằng số, kiểu và hàm phụ của chuyển cảnh Đăng nhập ↔ Trang chủ (xem mô tả bốn pha trong AuthGate.tsx).

/** leave/enter: chuyển cảnh ngược khi đăng xuất (đóng lớp che trên trang chủ → logo bay về màn đăng nhập). */
export type Status = 'out' | 'gather' | 'hold' | 'in' | 'leave' | 'enter';

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface Origin {
  logo: Box;
  name: Box;
  loginEdge: string;
}

export const SESSION_KEY = 'qttb-session';
/** Đánh dấu đang ở pha chờ: nếu tài liệu được tải lại / chuyển trang giữa chừng, tài liệu mới nối tiếp từ pha chờ. */
export const STAGE_KEY = 'qttb-auth-stage';

export const T = { gather: 560, holdMin: 1600, nameFade: 220, land: 620, reveal: 980, logoFade: 180, fade: 200, readyCap: 8000 };
/** Chiều ra ngắn hơn chiều vào: không có pha chờ, lớp che đóng nhanh hơn reveal. Chưa kiểm chứng với người dùng. */
export const OUT = { close: 720, appear: 360, appearDelay: 240 };
export const NO_RING = 'rgba(254, 219, 0, 0) 0px 0px 0px 0px';
export const EASE_LOGO = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE_REVEAL = [0.45, 0, 0.2, 1] as const;
export const GOLD = '#FEDB00';
export const DOTS = { w: 40, h: 8, gap: 20 };

export const store = {
  get(k: string) {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null) {
    try {
      if (v == null) sessionStorage.removeItem(k);
      else sessionStorage.setItem(k, v);
    } catch {
      /* không lưu được thì chỉ giữ trong phiên hiện tại */
    }
  },
};

export const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const toBox = (r: DOMRect): Box => ({ left: r.left, top: r.top, width: r.width, height: r.height });
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const frames = (n: number) => new Promise<void>((r) => {
  const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : r());
  step(n);
});
export const setBox = (el: HTMLElement, b: Partial<Box>) => {
  if (b.left != null) el.style.left = `${b.left}px`;
  if (b.top != null) el.style.top = `${b.top}px`;
  if (b.width != null) el.style.width = `${b.width}px`;
  if (b.height != null) el.style.height = `${b.height}px`;
};

/** Logo đích: bản đang thấy trên màn hình (sidebar ghim, topbar hoặc header mobile). */
export function findTarget() {
  return [...document.querySelectorAll<HTMLImageElement>('img[data-shared-logo]')].find((el) => {
    if (el.closest('aside')?.inert) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
  });
}

export function focusMain() {
  const main = document.getElementById('main');
  if (!main) return;
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  main.focus({ preventScroll: true });
}


export function initialStatus(): Status {
  if (store.get(SESSION_KEY) === '1' && store.get(STAGE_KEY)) {
    authTransition.set(true);
    return 'hold';
  }
  store.set(STAGE_KEY, null);
  document.documentElement.removeAttribute('data-auth-boot');
  return store.get(SESSION_KEY) === '1' ? 'in' : 'out';
}
