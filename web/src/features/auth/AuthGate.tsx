import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { AuthCtx } from './authContext';
import { resetPinned } from '@/shared/lib/sidebarPref';
import LoginScreen from './LoginScreen';
import { authTransition } from '@/shared/lib/authTransition';
import { SESSION_KEY, STAGE_KEY, initialStatus, store, toBox, type Origin, type Status } from './authStage';
import { useSignInTransition } from './useSignInTransition';
import { useSignOutTransition } from './useSignOutTransition';

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

  const refs = { loginRef, stageRef, coverRef, logoRef, nameRef, dotsRef };
  useSignOutTransition({ leaveRun, status, setStatus }, refs);
  useSignInTransition({ run, origin, queryClient, setStatus }, refs);

  const staging = status === 'gather' || status === 'hold' || status === 'leave' || status === 'enter';
  const showHome = status === 'gather' || status === 'hold' || status === 'in' || status === 'leave';
  const showLogin = status === 'out' || status === 'gather' || status === 'enter';

  return (
    <AuthCtx.Provider value={{ signOut }}>
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
    </AuthCtx.Provider>
  );
}
