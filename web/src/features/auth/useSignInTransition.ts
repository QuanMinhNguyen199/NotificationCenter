import type { QueryClient } from '@tanstack/react-query';
import { animate } from 'motion/react';
import { useLayoutEffect } from 'react';
import { DOTS, EASE_LOGO, EASE_REVEAL, GOLD, STAGE_KEY, T, findTarget, focusMain, frames, prefersReduced, setBox, sleep, store, type Box, type Origin, type Status } from './authStage';
import { authTransition } from '@/shared/lib/authTransition';
import type { StageRefs } from './stageRefs';

/** Chuyển cảnh khi đăng nhập: gom → chờ trang chủ tải xong → hạ cánh → reveal. Chạy lại mỗi lượt `run`. */
export function useSignInTransition(
  { run, origin, queryClient, setStatus }: { run: number; origin: Origin | null; queryClient: QueryClient; setStatus: (s: Status) => void },
  { loginRef, stageRef, coverRef, logoRef, nameRef, dotsRef }: StageRefs,
) {
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
}
