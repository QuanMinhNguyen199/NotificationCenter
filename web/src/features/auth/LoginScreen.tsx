import { useEffect, useRef, useState, type FormEvent, type Ref } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { ProtoBadge } from '@/shared/components/Proto';
import { DEMO_ACCOUNTS } from '@/shared/demo/demoContext';
import { ROLE_LABEL, teamName, useDemo, useStaff } from '@/shared/demo/useDemo';
import { forgetDevice, isTrusted, trustDevice, trustedCount } from './mfa';
import OtpStep from './OtpStep';

// Màn đăng nhập của bản thiết kế, dạng chia đôi: cột thương hiệu (đỏ brand) và cột form.
// Chỉ nhận ba tài khoản xem thử, mật khẩu bất kỳ; khi nối Keycloak/OIDC, phần kiểm tra thay bằng chuyển hướng.
// Hai bước: tài khoản → mã xác thực (OtpStep, giả lập MFA). Thiết bị đã được ghi nhớ thì bỏ qua bước 2.
// Logo, tên hệ thống (.login__logo/.login__title/.login__org) là phần tử dùng chung: AuthGate đo vị trí để chuyển cảnh.

type DemoId = (typeof DEMO_ACCOUNTS)[number];

interface Props {
  ref?: Ref<HTMLDivElement>;
  /** Đang chuyển cảnh sang trang chủ: khóa thao tác, ẩn logo/tên vì bản sao đã thay chỗ. */
  leaving: boolean;
  /** Được dựng trong chuyển cảnh đăng xuất: AuthGate tự cho màn hiện dần, bỏ hiệu ứng vào mặc định. */
  arriving?: boolean;
  onSignIn: () => void;
}

export default function LoginScreen({ ref, leaving, arriving = false, onSignIn }: Props) {
  const { setUserId } = useDemo();
  const staff = useStaff();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErr, setFieldErr] = useState<{ user?: string; pass?: string }>({});
  const [error, setError] = useState<string | null>(null);
  // Khóa chọn lặp: ref chặn ngay trong cùng tick, state để khóa nút trên giao diện.
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  // Nhớ theo lần dựng: nếu bật lại hiệu ứng vào khi arriving tắt, CSS sẽ chạy lại animation và màn nháy.
  const [noIntro] = useState(arriving);
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  /** Bước 2: tài khoản đã qua bước mật khẩu, chờ nhập mã. */
  const [otpFor, setOtpFor] = useState<DemoId | null>(null);
  const [trusted, setTrusted] = useState(trustedCount);
  const backed = useRef(false);

  useEffect(() => {
    if (otpFor || !backed.current) return;
    backed.current = false;
    userRef.current?.focus();
  }, [otpFor]);

  const demo = DEMO_ACCOUNTS.map((id) => staff.find((s) => s.id === id)!);

  const finish = (id: DemoId) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setUserId(id);
    onSignIn();
  };

  const enter = (id: DemoId) => {
    if (lock.current) return;
    if (isTrusted(id)) return finish(id);
    setError(null);
    setOtpFor(id);
  };

  const back = () => {
    backed.current = true;
    setPassword('');
    setOtpFor(null);
  };

  const otpUser = otpFor ? demo.find((s) => s.id === otpFor) : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (lock.current) return;
    const user = username.trim().toLowerCase();
    const errs = { user: user ? undefined : 'Nhập tên đăng nhập.', pass: password ? undefined : 'Nhập mật khẩu.' };
    setFieldErr(errs);
    setError(null);
    if (errs.user) return userRef.current?.focus();
    if (errs.pass) return passRef.current?.focus();
    const match = demo.find((s) => s.username === user);
    if (!match) {
      setError('Tên đăng nhập hoặc mật khẩu không đúng. Kiểm tra lại rồi thử lần nữa.');
      userRef.current?.focus();
      return;
    }
    enter(match.id as DemoId);
  };

  return (
    <div ref={ref} className="login" data-leaving={leaving || undefined} data-no-intro={noIntro || undefined} inert={leaving || arriving}>
      <section className="login__brand-side" aria-label="Quản trị thông báo">
        <div className="login__brand">
          <img
            className="login__logo"
            src={`${import.meta.env.BASE_URL}logo-thue-ha-noi.png`}
            width={96}
            height={96}
            alt="Biểu trưng Thuế thành phố Hà Nội"
          />
          <h1 className="login__title">Quản trị thông báo</h1>
          <p className="login__org">Thuế thành phố Hà Nội</p>
          <p className="login__lede">Thiết lập, gửi và theo dõi thông báo tới người nộp thuế hộ kinh doanh.</p>
        </div>
      </section>

      <section className="login__form-side" aria-labelledby="login-heading">
        <div className="login__panel">
          {otpUser ? (
            <OtpStep
              key={otpUser.id}
              name={otpUser.name}
              disabled={busy}
              onBack={back}
              onVerified={(remember) => {
                if (remember) trustDevice(otpUser.id);
                finish(otpUser.id as DemoId);
              }}
            />
          ) : (
          <>
          <h2 id="login-heading" className="login__heading">Đăng nhập</h2>
          <p className="login__sub">Dùng tài khoản được cấp để vào hệ thống.</p>
          <form className="login__form" onSubmit={submit} noValidate>
            {error && (
              <p className="login__error" role="alert">
                {error}
              </p>
            )}
            <div className="login__field">
              <Label htmlFor="login-user">Tên đăng nhập</Label>
              <Input
                ref={userRef}
                id="login-user"
                className="h-11"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-invalid={!!fieldErr.user || undefined}
                aria-describedby={fieldErr.user ? 'login-user-err' : undefined}
              />
              {fieldErr.user && <p id="login-user-err" className="login__field-err">{fieldErr.user}</p>}
            </div>
            <div className="login__field">
              <Label htmlFor="login-pass">Mật khẩu</Label>
              <Input
                ref={passRef}
                id="login-pass"
                type="password"
                className="h-11"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!fieldErr.pass || undefined}
                aria-describedby={fieldErr.pass ? 'login-pass-err' : undefined}
              />
              {fieldErr.pass && <p id="login-pass-err" className="login__field-err">{fieldErr.pass}</p>}
            </div>
            <Button type="submit" className="login__submit" disabled={busy}>
              Đăng nhập
            </Button>
          </form>

          <div className="login__demo">
            <p className="login__demo-title" id="login-demo-title">Hoặc vào nhanh bằng tài khoản xem thử</p>
            <ul className="login__demo-list" aria-labelledby="login-demo-title">
              {demo.map((s) => (
                <li key={s.id}>
                  <button type="button" className="login__demo-item" onClick={() => enter(s.id as DemoId)} disabled={busy}>
                    <span className="login__demo-name">{s.name}</span>
                    <span className="login__demo-role">{s.team ? `${ROLE_LABEL[s.role]}, ${teamName(s.team)}` : ROLE_LABEL[s.role]}</span>
                    <span className="login__demo-user">{s.username}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {trusted > 0 && (
            <p className="otp-trusted">
              <ProtoBadge note="Thiết bị được ghi nhớ bỏ qua bước nhập mã trong 30 ngày" />
              <span>
                Trình duyệt này đang được ghi nhớ cho {trusted} tài khoản nên sẽ bỏ qua bước nhập mã.
              </span>
              <button
                type="button"
                className="otp__link"
                onClick={() => {
                  forgetDevice();
                  setTrusted(0);
                }}
                disabled={busy}
              >
                Bỏ ghi nhớ
              </button>
            </p>
          )}
          </>
          )}
        </div>
      </section>
    </div>
  );
}
