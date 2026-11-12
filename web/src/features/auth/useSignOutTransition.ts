import { animate } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';
import { EASE_LOGO, EASE_REVEAL, GOLD, NO_RING, OUT, T, findTarget, prefersReduced, setBox, sleep, type Box, type Status } from './authStage';
import type { StageRefs } from './stageRefs';

/** Chuyển cảnh khi đăng xuất: lớp che khép về logo trang chủ, rồi logo bay về màn đăng nhập. */
export function useSignOutTransition(
  { leaveRun, status, setStatus }: { leaveRun: number; status: Status; setStatus: (s: Status) => void },
  { loginRef, stageRef, coverRef, logoRef, nameRef, dotsRef }: StageRefs,
) {
  /** Hộp và viền của logo bay ở cuối pha đóng, để pha bay về bắt đầu đúng chỗ. */
  const fromRef = useRef<{ box: Box; shadow: string } | null>(null);

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
}
