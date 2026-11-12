// Xác thực nhiều yếu tố (bản giả lập). Mã thử cố định; hệ thống thật phải sinh và kiểm mã ở máy chủ.
// "Ghi nhớ thiết bị" là quy tắc đề xuất: lưu hạn dùng theo từng tài khoản trong localStorage của trình duyệt này.

export const DEMO_OTP = '246810';
export const OTP_LEN = 6;
export const MAX_ATTEMPTS = 5;
export const RESEND_SEC = 30;
export const REMEMBER_DAYS = 30;
export const VERIFY_DELAY = 500;
/** Số điện thoại nhận mã, chỉ hiện 3 số cuối. Giả lập, chưa nối hồ sơ cán bộ. */
export const MASKED_PHONE = '***789';

const KEY = 'qttb-mfa-trusted';
type Trusted = Record<string, number>;

function read(): Trusted {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' ? (v as Trusted) : {};
  } catch {
    return {};
  }
}

function write(v: Trusted) {
  try {
    if (Object.keys(v).length) localStorage.setItem(KEY, JSON.stringify(v));
    else localStorage.removeItem(KEY);
  } catch {
    /* không lưu được: lần sau vẫn hỏi mã, an toàn hơn */
  }
}

/** Gỡ các mục đã hết hạn rồi trả về danh sách còn hiệu lực. */
function live(): Trusted {
  const now = Date.now();
  const all = read();
  const kept = Object.fromEntries(Object.entries(all).filter(([, exp]) => typeof exp === 'number' && exp > now));
  if (Object.keys(kept).length !== Object.keys(all).length) write(kept);
  return kept;
}

export function isTrusted(userId: string) {
  return userId in live();
}

export function trustDevice(userId: string) {
  write({ ...live(), [userId]: Date.now() + REMEMBER_DAYS * 86_400_000 });
}

export function trustedCount() {
  return Object.keys(live()).length;
}

export function forgetDevice() {
  write({});
}
