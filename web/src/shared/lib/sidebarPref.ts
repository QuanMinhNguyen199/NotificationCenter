// Lựa chọn ghim / thu gọn sidebar trên desktop.
// Giữ qua các lần tải lại trong cùng phiên đăng nhập; mỗi lần đăng nhập lại thì sidebar luôn mở (09/11/2026, theo yêu cầu người dùng).
const KEY = 'qttb-sidebar';

export function readPinned() {
  try {
    return localStorage.getItem(KEY) !== 'collapsed';
  } catch {
    return true;
  }
}

export function savePinned(pinned: boolean) {
  try {
    localStorage.setItem(KEY, pinned ? 'pinned' : 'collapsed');
  } catch {
    /* chỉ giữ trong phiên */
  }
}

/** Gọi khi đăng nhập, trước khi trang chủ được dựng: bỏ lựa chọn thu gọn của phiên trước. */
export function resetPinned() {
  savePinned(true);
}
