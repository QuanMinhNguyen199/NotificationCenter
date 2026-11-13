// Danh mục trạng thái NNT (hộ kinh doanh) theo bảng mã của ngành thuế, cột "TT NNT".
// Bảng gốc có 8 mã: 00–06 và 09 (không có 07, 08).
export const HKD_STATUS = [
  { code: '00', label: 'Đang hoạt động' },
  { code: '01', label: 'Ngừng hoạt động, đã hoàn thành thủ tục chấm dứt hiệu lực MST' },
  { code: '02', label: 'Đã chuyển cơ quan thuế quản lý' },
  { code: '03', label: 'Ngừng hoạt động, chưa hoàn thành thủ tục chấm dứt hiệu lực MST' },
  { code: '04', label: 'Đang hoạt động (chưa đủ thủ tục cấp MST)' },
  { code: '05', label: 'Tạm ngừng kinh doanh có thời hạn' },
  { code: '06', label: 'Không hoạt động tại địa chỉ đã đăng ký' },
  { code: '09', label: 'Chờ xác minh tình trạng hoạt động tại địa chỉ đã đăng ký' },
] as const;

export type HkdStatusCode = (typeof HKD_STATUS)[number]['code'];

const LABEL = Object.fromEntries(HKD_STATUS.map((s) => [s.code, s.label])) as Record<HkdStatusCode, string>;
export const hkdStatusLabel = (code: HkdStatusCode) => LABEL[code];
export const isHkdStatus = (v: string | null): v is HkdStatusCode => !!v && v in LABEL;
/** Còn hoạt động kinh doanh: vẫn nhận nhắc nghĩa vụ. */
export const isHkdActive = (code: HkdStatusCode) => code === '00' || code === '04';
