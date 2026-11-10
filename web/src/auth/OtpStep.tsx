import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ProtoBadge, ProtoNote } from '../components/Proto';
import { DEMO_OTP, MASKED_PHONE, MAX_ATTEMPTS, OTP_LEN, REMEMBER_DAYS, RESEND_SEC, VERIFY_DELAY } from './mfa';
import './otp.css';

// Bước 2 của đăng nhập: nhập mã một lần (yếu tố thứ hai). Giả lập hoàn toàn ở trình duyệt.
// Một ô nhập duy nhất (inputMode numeric + autocomplete one-time-code): dán "246 810" hay "246810" đều được, trình
// đọc màn hình đọc một trường thay vì sáu ô rời.

interface Props {
  /** Tên cán bộ đang đăng nhập, để người dùng biết mã gửi cho tài khoản nào. */
  name: string;
  /** Khóa thao tác khi đang chuyển cảnh. */
  disabled: boolean;
  onBack: () => void;
  onVerified: (remember: boolean) => void;
}

export default function OtpStep({ name, disabled, onBack, onVerified }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [wrong, setWrong] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [remember, setRemember] = useState(false);
  const [wait, setWait] = useState(RESEND_SEC);
  const inputRef = useRef<HTMLInputElement>(null);
  const lockBtnRef = useRef<HTMLButtonElement>(null);
  const alive = useRef(true);
  const locked = wrong >= MAX_ATTEMPTS;

  useEffect(() => {
    alive.current = true;
    inputRef.current?.focus();
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (wait <= 0 || locked) return;
    const t = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [wait, locked]);

  useEffect(() => {
    if (locked) lockBtnRef.current?.focus();
  }, [locked]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (verifying || locked || disabled) return;
    setInfo(null);
    if (code.length !== OTP_LEN) {
      setError(`Nhập đủ ${OTP_LEN} số của mã xác thực.`);
      inputRef.current?.focus();
      return;
    }
    setError(null);
    setVerifying(true);
    await new Promise((r) => setTimeout(r, VERIFY_DELAY));
    if (!alive.current) return;
    if (code === DEMO_OTP) {
      // Giữ trạng thái đang xác minh: chuyển cảnh bắt đầu ngay, nút không bật lại.
      onVerified(remember);
      return;
    }
    setVerifying(false);
    const n = wrong + 1;
    setWrong(n);
    const left = MAX_ATTEMPTS - n;
    if (left > 0) {
      setError(`Mã không đúng. Còn ${left} lần thử.`);
      setCode('');
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setError(null);
    }
  };

  const resend = () => {
    if (wait > 0 || locked) return;
    setWait(RESEND_SEC);
    setError(null);
    setCode('');
    setInfo(`Đã gửi lại mã tới số ${MASKED_PHONE}.`);
    inputRef.current?.focus();
  };

  const back = (
    <button type="button" className="otp__back" onClick={onBack} disabled={disabled}>
      <ArrowLeft aria-hidden="true" />
      Đăng nhập bằng tài khoản khác
    </button>
  );

  if (locked) {
    return (
      <div className="otp">
        <h2 id="login-heading" className="login__heading">Tạm khóa xác thực</h2>
        <div className="otp__locked" role="alert">
          <ShieldAlert aria-hidden="true" />
          <p>
            Bạn đã nhập sai mã {MAX_ATTEMPTS} lần. Để bảo vệ tài khoản, mã hiện tại không còn dùng được. Quay lại đăng
            nhập để nhận mã mới.
          </p>
        </div>
        <Button ref={lockBtnRef} type="button" className="login__submit otp__full" onClick={onBack} disabled={disabled}>
          Quay lại đăng nhập
        </Button>
      </div>
    );
  }

  const describedBy = ['otp-hint', error ? 'otp-err' : null].filter(Boolean).join(' ');

  return (
    <div className="otp">
      {back}
      <h2 id="login-heading" className="login__heading">Nhập mã xác thực</h2>
      <p className="login__sub otp__sub">
        Mã gồm {OTP_LEN} số đã gửi qua tin nhắn tới số điện thoại đăng ký <strong>{MASKED_PHONE}</strong> của {name}.
      </p>

      <div className="otp__demo">
        <ProtoBadge kind="mock" note="Mã thử cố định, không có tin nhắn thật được gửi" />
        <span>
          Mã thử: <strong className="otp__demo-code">{DEMO_OTP}</strong>
        </span>
      </div>

      <form className="login__form" onSubmit={submit} noValidate>
        <div className="login__field">
          <Label htmlFor="otp-code">Mã xác thực</Label>
          <input
            ref={inputRef}
            id="otp-code"
            name="otp"
            className="otp__input"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={OTP_LEN + 4}
            spellCheck={false}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LEN));
              if (error) setError(null);
            }}
            aria-invalid={!!error || undefined}
            aria-describedby={describedBy}
            disabled={verifying || disabled}
          />
          <p id="otp-hint" className="otp__hint">
            {OTP_LEN} chữ số, không có khoảng trắng.
          </p>
          {/* Vùng thông báo luôn có mặt để trình đọc màn hình đọc lỗi ngay khi nội dung đổi. */}
          <div aria-live="assertive" aria-atomic="true">
            {error && (
              <p id="otp-err" className="login__field-err">
                {error}
              </p>
            )}
          </div>
          <div aria-live="polite" aria-atomic="true" className="otp__info">
            {info}
          </div>
        </div>

        <div className="otp__remember">
          <label className="otp__check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={verifying || disabled} />
            <span>Ghi nhớ thiết bị này trong {REMEMBER_DAYS} ngày</span>
          </label>
          <ProtoBadge kind="proposal" note={`Bỏ qua bước nhập mã trên trình duyệt này trong ${REMEMBER_DAYS} ngày`} />
        </div>

        <Button type="submit" className="login__submit" disabled={verifying || disabled} aria-busy={verifying || undefined}>
          {verifying ? (
            <>
              <span className="otp__spinner" aria-hidden="true" />
              Đang xác minh…
            </>
          ) : (
            'Xác nhận'
          )}
        </Button>
      </form>

      <p className="otp__resend">
        {wait > 0 ? (
          <span>
            Chưa nhận được mã? Gửi lại sau <span className="otp__count">{wait}</span> giây.
          </span>
        ) : (
          <>
            Chưa nhận được mã?{' '}
            <button type="button" className="otp__link" onClick={resend} disabled={disabled}>
              Gửi lại mã
            </button>
          </>
        )}
      </p>

      <div className="otp__notes">
        <ProtoNote kind="proposal">
          Ghi nhớ {REMEMBER_DAYS} ngày theo từng tài khoản trên trình duyệt này; khóa sau {MAX_ATTEMPTS} lần sai, chờ{' '}
          {RESEND_SEC} giây mới gửi lại mã. Chưa được nghiệp vụ chốt.
        </ProtoNote>
        <ProtoNote kind="mock">
          Màn này chỉ minh họa luồng. Xác thực nhiều yếu tố thật phải do máy chủ sinh và kiểm tra mã.
        </ProtoNote>
      </div>
    </div>
  );
}
