// Bật/tắt tính năng chưa đưa vào sử dụng (yêu cầu người dùng 12/11/2026: tạm ẩn).
// Đổi thành true để hiện lại; code của tính năng vẫn giữ nguyên.
export const FEATURES = {
  /** Màn Chuyển tuyến (ca Geo AI chuyển cho cán bộ), số ca Mới trên menu, ca chuyển tuyến trong chuông. */
  routing: false,
  /** Tab Hỏi đáp AI trong Quản lý HKD và tab Hội thoại (với Geo AI) trong hồ sơ hộ. */
  aiQa: false,
  /** Tab Hỗ trợ HKD trong Quản lý HKD (hành vi xử lý yêu cầu của cán bộ). Tạm bỏ theo góp ý web quản trị v2 (13/11/2026). */
  hkdSupport: false,
} as const;
