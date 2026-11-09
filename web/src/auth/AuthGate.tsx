import { useQueryClient } from '@tanstack/react-query';
import { animate } from 'motion/react';
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { resetPinned } from '../shell/sidebarPref';
import LoginScreen from './LoginScreen';
import { authTransition } from './transitionState';

// Cổng đăng nhập + chuyển cảnh Đăng nhập → Trang chủ (shared element + radial reveal), bốn pha:
//  1. Gom (560ms): logo và tên hệ thống trượt từ cột thương hiệu vào giữa màn; nội dung đăng nhập mờ đi,
//     lộ lớp che đỏ brand nằm ngay dưới nó. Trang chủ được dựng bên dưới lớp che.
//  2. Chờ (≥1.600ms): logo + tên đứng giữa, ba chấm nhấp nhô; chờ tới khi trang chủ tải xong số liệu.
//  3. Hạ cánh (620ms): tên và chấm mờ tại chỗ (220ms); chỉ logo bay + thu nhỏ về đúng hộp của logo thật.
//  4. Reveal (980ms): lớp che bị khoét lỗ tròn từ tâm logo, lộ trang chủ đứng yên; logo bay mờ đi khi logo thật lộ ra.
// Chiều ngược (đăng xuất): lớp che khép lỗ tròn về tâm logo trên trang chủ (720ms) → gỡ trang chủ →
// logo bay về hộp logo trên màn đăng nhập (620ms), màn đăng nhập hiện dần quanh nó.
// Giảm chuyển động: thay di chuyển và nhấp nhô bằng fade ngắn. Thời lượng theo yêu cầu, chưa kiểm chứng với người dùng.
//
// Thanh cuộn: lớp position:fixed không phủ được dải thanh cuộn của trang (dải này mang màu nền <html>).
// Vì vậy <html> đổi nền cùng màu lớp che, ẩn con trượt, và trong lúc reveal chuyển dần về nền trang chủ.

/** leave/enter: chuyển cảnh ngược khi đăng xuất (đóng lớp che trên trang chủ → logo bay về màn đăng nhập). */
type Status = 'out' | 'gather' | 'hold' | 'in' | 'leave' | 'enter';

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
interface Origin {
  logo: Box;
  name: Box;
  loginEdge: string;
}

const SESSION_KEY = 'qttb-session';
/** Đánh dấu đang ở pha chờ: nếu tài liệu được tải lại / chuyển trang giữa chừng, tài liệu mới nối tiếp từ pha chờ. */
export const STAGE_KEY = 'qttb-auth-stage';

const T = { gather: 560, holdMin: 1600, nameFade: 220, land: 620, reveal: 980, logoFade: 180, fade: 200, readyCap: 8000 };
/** Chiều ra ngắn hơn chiều vào: không có pha chờ, lớp che đóng nhanh hơn reveal. Chưa kiểm chứng với người dùng. */
const OUT = { close: 720, appear: 360, appearDelay: 240 };
const NO_RING = 'rgba(254, 219, 0, 0) 0px 0px 0px 0px';
const EASE_LOGO = 'cubic-bezier(0.16, 1, 0.3, 1)';
const EASE_REVEAL = [0.45, 0, 0.2, 1] as const;
const GOLD = '#FEDB00';
const DOTS = { w: 40, h: 8, gap: 20 };

const store = {
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

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const toBox = (r: DOMRect): Box => ({ left: r.left, top: r.top, width: r.width, height: r.height });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const frames = (n: number) => new Promise<void>((r) => {
  const step = (k: number) => (k ? requestAnimationFrame(() => step(k - 1)) : r());
  step(n);
});
const setBox = (el: HTMLElement, b: Partial<Box>) => {
  if (b.left != null) el.style.left = `${b.left}px`;
  if (b.top != null) el.style.top = `${b.top}px`;
  if (b.width != null) el.style.width = `${b.width}px`;
  if (b.height != null) el.style.height = `${b.height}px`;
};

/** Logo đích: bản đang thấy trên màn hình (sidebar ghim, topbar hoặc header mobile). */
function findTarget() {
  return [...document.querySelectorAll<HTMLImageElement>('img[data-shared-logo]')].find((el) => {
    if (el.closest('aside')?.inert) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight;
  });
}

function focusMain() {
  const main = document.getElementById('main');
  if (!main) return;
  if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
  main.focus({ preventScroll: true });
}

interface AuthApi {
  signOut: () => void;
}
const Ctx = createContext<AuthApi | null>(null);

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth cần AuthGate');
  return v;
}

function initialStatus(): Status {
  if (store.get(SESSION_KEY) === '1' && store.get(STAGE_KEY)) {
    authTransition.set(true);
    return 'hold';
  }
  store.set(STAGE_KEY, null);
  document.documentElement.removeAttribute('data-auth-boot');
  return store.get(SESSION_KEY) === '1' ? 'in' : 'out';
}

export function AuthGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>(initialStatus);
  const [run, setRun] = useState(() => (status === 'hold' ? 1 : 0));
  const [origin, setOrigin] = useState<Origin | null>(null);
  const loginRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef(status);
  statusRef.current = status;
  const [leaveRun, setLeaveRun] = useState(0);
  /** Hộp và viền của logo bay ở cuối pha đóng, để pha bay về bắt đầu đúng chỗ. */
  const fromRef = useRef<{ box: Box; shadow: string } | null>(null);

  // Đo logo + tên trên màn đăng nhập trước khi bất cứ thứ gì đổi bố cục.
  const signIn = useCallback(() => {
    store.set(SESSION_KEY, '1');
    // Mỗi lần đăng nhập, sidebar luôn mở; logo trên sidebar cũng là đích hạ cánh của chuyển cảnh.
    resetPinned();
    const login = loginRef.current!;
    const q = (s: string) => login.querySelector(s)!.getBoundingClientRect();
    const logo = q('.login__logo');
    const brand = q('.login__brand');
    const title = q('.login__title');
    const org = q('.login__org');
    // Giữ nguyên bề rộng lớp đăng nhập khi thanh cuộn của trang chủ xuất hiện, để nó không xê dịch lúc đang mờ đi.
    const lr = login.getBoundingClientRect();
    login.style.right = 'auto';
    login.style.width = `${lr.width}px`;
    setOrigin({
      logo: toBox(logo),
      name: { left: brand.left, top: title.top, width: brand.width, height: org.bottom - title.top },
      loginEdge: getComputedStyle(login.querySelector('.login__form-side')!).backgroundColor,
    });
    authTransition.set(true);
    setStatus('gather');
    setRun((r) => r + 1);
  }, []);

  const signOut = useCallback(() => {
    if (statusRef.current !== 'in') return;
    store.set(SESSION_KEY, null);
    store.set(STAGE_KEY, null);
    setOrigin(null);
    setStatus('leave');
    setLeaveRun((r) => r + 1);
  }, []);

  // ---- Chiều ngược, pha 1: lớp che khép lỗ về tâm logo của trang chủ ----
  useLayoutEffect(() => {
    if (!leaveRun) return;
    const stage = stageRef.current;
    const cover = coverRef.current;
    const logo = logoRef.current;
    if (!stage || !cover || !logo || !nameRef.current || !dotsRef.current) return;
    nameRef.current.style.display = 'none';
    dotsRef.current.style.display = 'none';

    let alive = true;
    let stop: (() => void) | undefined;
    const anims: Animation[] = [];
    const html = document.documentElement;
    const shell = document.querySelector<HTMLElement>('.shell');
    const coverColor = getComputedStyle(cover).backgroundColor;
    const ground = getComputedStyle(document.body).backgroundColor;
    html.setAttribute('data-auth-transition', '');
    shell?.setAttribute('inert', '');
    (document.activeElement as HTMLElement | null)?.blur();

    const S = cover.getBoundingClientRect();
    const target = findTarget();
    let box: Box;
    let shadow = NO_RING;
    if (target) {
      const t = target.getBoundingClientRect();
      box = { left: t.left - S.left, top: t.top - S.top, width: t.width, height: t.height };
      const ring = getComputedStyle(target).boxShadow;
      if (ring && ring !== 'none') shadow = ring;
    } else {
      // Không có logo đích: logo hiện ra ở giữa màn khi lớp che đã khép.
      box = { left: Math.round(S.width / 2 - 48), top: Math.round(S.height / 2 - 48), width: 96, height: 96 };
      logo.style.opacity = '0';
    }
    setBox(logo, box);
    logo.style.boxShadow = shadow;
    fromRef.current = { box, shadow };
    const center = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    const R = Math.hypot(Math.max(center.x, S.width - center.x), Math.max(center.y, S.height - center.y)) + 2;
    const hasGutter = window.innerWidth - S.width > 0.5;
    const rGutter = S.width - center.x;
    const reduced = prefersReduced();

    if (reduced) {
      if (target) logo.style.opacity = '0';
      anims.push(cover.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.fade, easing: 'ease-out' }));
      if (hasGutter) html.style.backgroundColor = coverColor;
    } else {
      cover.style.setProperty('--rx', `${center.x}px`);
      cover.style.setProperty('--ry', `${center.y}px`);
      cover.style.setProperty('--reveal', `${R}px`);
      cover.dataset.reveal = '';
      if (hasGutter) html.style.backgroundColor = ground;
    }
    stage.dataset.ready = '';

    (async () => {
      if (reduced) {
        await sleep(T.fade);
      } else {
        await new Promise<void>((resolve) => {
          const c = animate(R, 0, {
            duration: OUT.close / 1000,
            ease: EASE_REVEAL,
            onUpdate: (r) => {
              cover.style.setProperty('--reveal', `${r}px`);
              if (hasGutter) {
                const p = Math.min(1, Math.max(0, (r - rGutter) / (R - rGutter)));
                html.style.backgroundColor = `color-mix(in srgb, ${ground} ${(p * 100).toFixed(1)}%, ${coverColor})`;
              }
            },
            onComplete: () => resolve(),
          });
          stop = () => {
            c.stop();
            resolve();
          };
        });
        if (!target && alive) {
          const a = logo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.nameFade, easing: 'ease-out', fill: 'forwards' });
          anims.push(a);
          await a.finished.catch(() => undefined);
          logo.style.opacity = '';
        }
      }
      if (!alive) return;
      alive = false;
      // Lớp che đã kín: gỡ trang chủ (thanh cuộn của nó biến mất sau lớp che), dựng màn đăng nhập ở pha 2.
      delete cover.dataset.reveal;
      html.style.backgroundColor = coverColor;
      setStatus('enter');
    })();

    return () => {
      if (!alive) return;
      alive = false;
      stop?.();
      anims.forEach((a) => a.cancel());
      html.removeAttribute('data-auth-transition');
      html.style.backgroundColor = '';
      shell?.removeAttribute('inert');
    };
  }, [leaveRun]);

  // ---- Chiều ngược, pha 2: logo bay về màn đăng nhập, màn đăng nhập hiện dần ----
  useLayoutEffect(() => {
    if (status !== 'enter') return;
    const login = loginRef.current;
    const stage = stageRef.current;
    const logo = logoRef.current;
    const from = fromRef.current;
    const loginLogo = login?.querySelector<HTMLElement>('.login__logo');
    if (!login || !stage || !logo || !from || !loginLogo) return;

    let alive = true;
    const anims: Animation[] = [];
    const html = document.documentElement;
    const reduced = prefersReduced();
    login.style.opacity = '0';
    loginLogo.style.visibility = 'hidden';
    const S = stage.getBoundingClientRect();
    const L = loginLogo.getBoundingClientRect();
    const end: Box = { left: L.left - S.left, top: L.top - S.top, width: L.width, height: L.height };
    const ring = `0 0 0 3px ${GOLD}`;
    const px = (b: Box) => ({ left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });

    const finish = () => {
      if (!alive) return;
      alive = false;
      // Ghi giá trị cuối vào style trước khi bỏ animation: nếu trình duyệt vẽ một frame trước khi React gỡ lớp bay,
      // logo bay vẫn nằm đúng chỗ, không nhảy về điểm xuất phát.
      setBox(logo, end);
      logo.style.boxShadow = ring;
      login.style.opacity = '';
      loginLogo.style.visibility = '';
      anims.forEach((a) => a.cancel());
      html.removeAttribute('data-auth-transition');
      html.style.backgroundColor = '';
      fromRef.current = null;
      setStatus('out');
      // Màn đăng nhập được dựng khi còn inert nên autoFocus không chạy: gỡ inert ngay (React cũng sẽ gỡ) rồi đặt focus.
      login.inert = false;
      login.querySelector<HTMLInputElement>('#login-user')?.focus({ preventScroll: true });
    };

    (async () => {
      if (reduced) {
        setBox(logo, end);
        logo.style.opacity = '0';
        const a = login.animate([{ opacity: 0 }, { opacity: 1 }], { duration: T.fade, easing: 'ease-out', fill: 'forwards' });
        anims.push(a);
        await a.finished.catch(() => undefined);
        return finish();
      }
      const fly = logo.animate([{ ...px(from.box), boxShadow: from.shadow }, { ...px(end), boxShadow: ring }], {
        duration: T.land,
        easing: EASE_LOGO,
        fill: 'forwards',
      });
      const appear = login.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: OUT.appear,
        delay: OUT.appearDelay,
        easing: 'ease-out',
        fill: 'both',
      });
      anims.push(fly, appear);
      await Promise.all([fly.finished, appear.finished]).catch(() => undefined);
      if (!alive) return;
      // Logo bay đã nằm đúng hộp logo thật: trả chỗ cho logo thật trong cùng một frame.
      finish();
    })();

    return () => {
      if (!alive) return;
      alive = false;
      anims.forEach((a) => a.cancel());
      login.style.opacity = '';
      loginLogo.style.visibility = '';
      html.removeAttribute('data-auth-transition');
      html.style.backgroundColor = '';
    };
  }, [status]);

  useLayoutEffect(() => {
    if (!run) return;
    const stage = stageRef.current;
    const cover = coverRef.current;
    const logo = logoRef.current;
    const name = nameRef.current;
    const dots = dotsRef.current;
    if (!stage || !cover || !logo || !name || !dots) return;

    let alive = true;
    const anims: Animation[] = [];
    const stops: (() => void)[] = [];
    const track = (a: Animation) => (anims.push(a), a);
    const fadeOut = (el: HTMLElement, duration: number) =>
      track(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'ease-out', fill: 'forwards' }));
    const fadeIn = (el: HTMLElement, duration: number) =>
      track(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: 'ease-out', fill: 'backwards' }));

    const html = document.documentElement;
    const reduced = prefersReduced();
    const coverColor = getComputedStyle(cover).backgroundColor;
    const shell = document.querySelector<HTMLElement>('.shell');
    html.setAttribute('data-auth-transition', '');
    // Ép có thanh cuộn ngay từ đầu: bề rộng lớp chuyển cảnh không đổi giữa chừng, tâm màn hình tính một lần là đúng.
    html.setAttribute('data-auth-lock', '');
    html.style.backgroundColor = coverColor;
    // Lớp che đã lên: bỏ màu tô sẵn của khung hình đầu (index.html) để nền trang chủ dưới lớp che là màu thật.
    html.removeAttribute('data-auth-boot');
    shell?.setAttribute('inert', '');

    // ---- Bố cục nhóm giữa màn, tính theo hộp thật của lớp chuyển cảnh (đã trừ dải thanh cuộn) ----
    const S = stage.getBoundingClientRect();
    const logoSize = origin?.logo.width ?? 96;
    const gapLN = origin ? origin.name.top - (origin.logo.top + origin.logo.height) : 16;
    const nameW = origin?.name.width ?? Math.min(S.width - 32, 400);
    setBox(name, { width: nameW });
    const nameH = origin?.name.height ?? name.offsetHeight;
    const groupH = logoSize + gapLN + nameH + DOTS.gap + DOTS.h;
    const logoX = Math.round(S.width / 2 - logoSize / 2);
    const logoY = Math.round(S.height / 2 - groupH / 2);
    const dx = origin ? logoX - (origin.logo.left - S.left) : 0;
    const dy = origin ? logoY - (origin.logo.top - S.top) : 0;
    const nameX = origin ? origin.name.left - S.left + dx : S.width / 2 - nameW / 2;
    const nameY = origin ? origin.name.top - S.top + dy : logoY + logoSize + gapLN;
    setBox(logo, { left: logoX, top: logoY, width: logoSize, height: logoSize });
    setBox(name, { left: nameX, top: nameY });
    setBox(dots, { left: S.width / 2 - DOTS.w / 2, top: nameY + nameH + DOTS.gap });
    logo.style.boxShadow = `0 0 0 3px ${GOLD}`;
    stage.dataset.ready = '';

    const finish = () => {
      if (!alive) return;
      alive = false;
      html.removeAttribute('data-auth-transition');
      html.removeAttribute('data-auth-lock');
      html.removeAttribute('data-auth-boot');
      html.style.backgroundColor = '';
      shell?.removeAttribute('inert');
      store.set(STAGE_KEY, null);
      authTransition.set(false);
      setStatus('in');
      requestAnimationFrame(focusMain);
    };

    (async () => {
      // ---- 1. Gom vào giữa ----
      const login = loginRef.current;
      if (origin && !reduced) {
        const from = `translate(${-dx}px, ${-dy}px)`;
        const opts = { duration: T.gather, easing: EASE_LOGO };
        const moves = [logo, name].map((el) => track(el.animate([{ transform: from }, { transform: 'none' }], opts)));
        track(html.animate([{ backgroundColor: origin.loginEdge }, { backgroundColor: coverColor }], { duration: T.gather, easing: 'ease-out' }));
        if (login) track(login.animate([{ opacity: 1 }, { opacity: 0 }], { duration: T.gather * 0.8, easing: 'ease-out', fill: 'forwards' }));
        await Promise.all(moves.map((a) => a.finished)).catch(() => undefined);
      } else if (origin) {
        [logo, name].forEach((el) => fadeIn(el, T.fade));
        if (login) fadeOut(login, T.fade);
        await sleep(T.fade);
      }
      if (!alive) return;

      // ---- 2. Chờ: tối thiểu 1.600ms và tới khi trang chủ tải xong ----
      store.set(STAGE_KEY, 'hold');
      setStatus('hold');
      dots.dataset.on = '';
      const start = performance.now();
      const ready = () => !document.querySelector('.page-skel') && queryClient.isFetching() === 0 && !!document.getElementById('main');
      while (alive) {
        const t = performance.now() - start;
        if ((t >= T.holdMin && ready()) || t >= T.readyCap) break;
        await sleep(80);
      }
      if (!alive) return;
      // Trả thanh cuộn về trạng thái thật của trang chủ rồi mới đo đích.
      html.removeAttribute('data-auth-lock');
      await frames(2);
      if (!alive) return;

      const S2 = stage.getBoundingClientRect();
      const hasGutter = window.innerWidth - S2.width > 0.5;
      const ground = getComputedStyle(document.body).backgroundColor;

      if (reduced) {
        [cover, logo, name, dots].forEach((el) => fadeOut(el, T.fade));
        if (hasGutter) track(html.animate([{ backgroundColor: coverColor }, { backgroundColor: ground }], { duration: T.fade, fill: 'forwards' }));
        await sleep(T.fade);
        return finish();
      }

      // ---- 3. Hạ cánh ----
      fadeOut(name, T.nameFade);
      fadeOut(dots, T.nameFade);
      const target = findTarget();
      let center: { x: number; y: number };
      let logoR = 0;
      if (target) {
        const t = target.getBoundingClientRect();
        const end: Box = { left: t.left - S2.left, top: t.top - S2.top, width: t.width, height: t.height };
        const ring = getComputedStyle(target).boxShadow;
        const endShadow = ring && ring !== 'none' ? ring : 'rgba(254, 219, 0, 0) 0px 0px 0px 0px';
        const px = (b: Box) => ({ left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
        const land = track(
          logo.animate(
            [
              { ...px({ left: logoX, top: logoY, width: logoSize, height: logoSize }), boxShadow: `0 0 0 3px ${GOLD}` },
              { ...px(end), boxShadow: endShadow },
            ],
            { duration: T.land, easing: EASE_LOGO, fill: 'forwards' },
          ),
        );
        await land.finished.catch(() => undefined);
        if (!alive) return;
        // Ghi giá trị cuối vào style rồi bỏ animation trong cùng một frame: không snap.
        setBox(logo, end);
        logo.style.boxShadow = endShadow;
        land.cancel();
        center = { x: end.left + end.width / 2, y: end.top + end.height / 2 };
        logoR = end.width / 2 + 4;
      } else {
        // Bố cục không có logo đích: logo mờ tại giữa màn, reveal mở từ đó.
        await fadeOut(logo, T.nameFade).finished.catch(() => undefined);
        center = { x: logoX + logoSize / 2, y: logoY + logoSize / 2 };
      }
      if (!alive) return;

      // ---- 4. Reveal ----
      cover.style.setProperty('--rx', `${center.x}px`);
      cover.style.setProperty('--ry', `${center.y}px`);
      cover.style.setProperty('--reveal', '0px');
      cover.dataset.reveal = '';
      const R = Math.hypot(Math.max(center.x, S2.width - center.x), Math.max(center.y, S2.height - center.y)) + 2;
      const rGutter = S2.width - center.x;
      let logoGone = !target;
      await new Promise<void>((resolve) => {
        const c = animate(0, R, {
          duration: T.reveal / 1000,
          ease: EASE_REVEAL,
          onUpdate: (r) => {
            cover.style.setProperty('--reveal', `${r}px`);
            if (!logoGone && r >= logoR) {
              logoGone = true;
              fadeOut(logo, T.logoFade);
            }
            if (hasGutter) {
              const p = Math.min(1, Math.max(0, (r - rGutter) / (R - rGutter)));
              html.style.backgroundColor = `color-mix(in srgb, ${ground} ${(p * 100).toFixed(1)}%, ${coverColor})`;
            }
          },
          onComplete: () => resolve(),
        });
        stops.push(() => {
          c.stop();
          resolve();
        });
      });
      finish();
    })();

    return () => {
      if (!alive) return;
      alive = false;
      stops.forEach((s) => s());
      anims.forEach((a) => a.cancel());
      html.removeAttribute('data-auth-transition');
      html.removeAttribute('data-auth-lock');
      html.removeAttribute('data-auth-boot');
      html.style.backgroundColor = '';
      shell?.removeAttribute('inert');
      delete stage.dataset.ready;
      delete dots.dataset.on;
      delete cover.dataset.reveal;
    };
    // origin đọc theo lượt chạy; chỉ chạy lại khi bắt đầu một lượt đăng nhập mới.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const staging = status === 'gather' || status === 'hold' || status === 'leave' || status === 'enter';
  const showHome = status === 'gather' || status === 'hold' || status === 'in' || status === 'leave';
  const showLogin = status === 'out' || status === 'gather' || status === 'enter';

  return (
    <Ctx.Provider value={{ signOut }}>
      {/* Trang chủ giữ cùng một vị trí trong cây suốt chuyển cảnh nên không bị dựng lại khi gỡ lớp che. */}
      {showHome && children}
      {showLogin && <LoginScreen ref={loginRef} leaving={status === 'gather'} arriving={status === 'enter'} onSignIn={signIn} />}
      {/* Lớp che nằm dưới màn đăng nhập: form mờ đi thì lộ nền đỏ, không lộ trang chủ. */}
      {staging && <div ref={coverRef} className="auth-cover" />}
      {staging && (
        <div ref={stageRef} className="auth-stage">
          <div ref={nameRef} className="auth-stage__name" aria-hidden="true">
            <p className="auth-stage__title">Quản trị thông báo</p>
            <p className="auth-stage__org">Thuế thành phố Hà Nội</p>
          </div>
          <div ref={dotsRef} className="auth-stage__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <img ref={logoRef} className="auth-stage__logo" src={`${import.meta.env.BASE_URL}logo-thue-ha-noi.png`} alt="" />
          <p className="sr-only" role="status">
            {status === 'leave' || status === 'enter' ? 'Đang đăng xuất' : 'Đang mở trang chủ'}
          </p>
        </div>
      )}
    </Ctx.Provider>
  );
}
