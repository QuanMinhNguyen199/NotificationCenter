// Cấu hình Engagement — giá trị ban đầu theo mục 3.3 của đặc tả (bối cảnh mock: nhắc nghĩa vụ và doanh thu đang bật).

export interface ConfigValues {
  autoScan: boolean;
  scanFrequency: 'daily';
  scanTime: string;
  catchupTime: string;
  sendStart: string;
  sendEnd: string;
  holdAbnormal: boolean;
  growthFactor: number;
  historyRuns: number;
  minRuns: number;
  /** Một cờ nghiệp vụ dùng chung cho D1a và D1b. */
  reminderEnabled: boolean;
  daysBefore: number;
  revenueEnabled: boolean;
  nearThresholdPct: number;
  forecastMarginPct: number;
  forecastMinDays: number;
  confirmGapDays: number;
  confirmCount: number;
  upsellCycleDays: number;
}

export type FieldKey = keyof ConfigValues;

export const INITIAL_CONFIG: ConfigValues = {
  autoScan: true,
  scanFrequency: 'daily',
  scanTime: '02:00',
  catchupTime: '02:30',
  sendStart: '06:00',
  sendEnd: '10:00',
  holdAbnormal: true,
  growthFactor: 3,
  historyRuns: 7,
  minRuns: 3,
  reminderEnabled: true,
  daysBefore: 7,
  revenueEnabled: true,
  nearThresholdPct: 80,
  forecastMarginPct: 20,
  forecastMinDays: 30,
  confirmGapDays: 7,
  confirmCount: 2,
  upsellCycleDays: 7,
};

export type GroupId = 'D2' | 'D1a' | 'D1b' | 'D1c' | 'D3' | 'D4' | 'D5' | 'D6';
export type GroupState = 'on' | 'off' | 'unused';

export interface ConfigGroup {
  id: GroupId;
  code: string;
  name: string;
  /** Trường cờ quyết định Đang bật/Đang tắt; null = cấu hình chung hoặc chưa sử dụng. */
  flag: FieldKey | null;
  unused?: boolean;
  description: string;
}

export const GROUPS: ConfigGroup[] = [
  { id: 'D2', code: 'D2', name: 'Thiết lập chung', flag: 'autoScan', description: 'Quét tự động, lịch quét và quét bù, khung gửi, nhịp điều phối và duyệt đợt bất thường.' },
  { id: 'D1a', code: 'D1a', name: 'Nhắc khai thuế', flag: 'reminderEnabled', description: 'Nhắc hồ sơ khai thuế trước hạn và quá hạn, gộp theo NNT mỗi ngày.' },
  { id: 'D1b', code: 'D1b', name: 'Nhắc nộp thuế', flag: 'reminderEnabled', description: 'Nhắc phần tiền thuế còn phải nộp trước hạn và quá hạn, gộp theo NNT mỗi ngày.' },
  { id: 'D1c', code: 'D1c', name: 'Trạng thái HKD', flag: null, unused: true, description: 'Quy tắc nhắc theo trạng thái NNT, tính mốc nhắc từ ngày hiệu lực của trạng thái. Các tham số chưa có trong hệ thống đang chạy.' },
  { id: 'D3', code: 'D3', name: 'Trả kết quả chuyển tuyến', flag: null, unused: true, description: 'Thông báo kết quả xử lý hồ sơ chuyển tuyến. Chưa có quy tắc thời gian và nguồn dữ liệu, nên chưa có tham số để thiết lập.' },
  { id: 'D4', code: 'D4', name: 'Cảnh báo doanh thu', flag: 'revenueEnabled', description: 'Cảnh báo doanh thu gần ngưỡng hoặc dự báo vượt ngưỡng sử dụng hóa đơn, và nhắc khuyến khích lên doanh nghiệp.' },
  { id: 'D5', code: 'D5', name: 'Thông báo chung', flag: null, unused: true, description: 'Nội dung thông báo theo sự kiện do cơ quan thuế phát hành.' },
  { id: 'D6', code: 'D6', name: 'Tiện ích ngân hàng', flag: null, unused: true, description: 'Thông tin tiện ích nộp thuế qua ngân hàng và nguồn nội dung liên quan.' },
];

/** Bốn mục hiển thị ở màn Cấu hình. Nhắc khai và nhắc nộp gộp một mục vì dùng chung một cờ và một cửa sổ nhắc. */
export type AreaId = 'schedule' | 'reminder' | 'revenue' | 'unused';

export const AREAS: { id: AreaId; slug: string; name: string; flag: FieldKey | null; groups: GroupId[] }[] = [
  { id: 'schedule', slug: 'lich-chay', name: 'Lịch chạy', flag: 'autoScan', groups: ['D2'] },
  { id: 'reminder', slug: 'nhac-nghia-vu', name: 'Nhắc nghĩa vụ thuế', flag: 'reminderEnabled', groups: ['D1a', 'D1b'] },
  { id: 'revenue', slug: 'canh-bao-doanh-thu', name: 'Cảnh báo doanh thu', flag: 'revenueEnabled', groups: ['D4'] },
  { id: 'unused', slug: 'chua-su-dung', name: 'Chưa sử dụng', flag: null, groups: ['D1c', 'D3', 'D5', 'D6'] },
];

export function areaOfField(k: FieldKey) {
  return AREAS.find((a) => a.groups.some((g) => FIELD_META[k].group.includes(g)))!;
}

export function groupState(g: ConfigGroup, v: ConfigValues): GroupState {
  if (g.unused || !g.flag) return 'unused';
  return v[g.flag] ? 'on' : 'off';
}

export const FIELD_META: Record<FieldKey, { label: string; group: GroupId[]; unit?: string; fmt?: (v: ConfigValues[FieldKey]) => string }> = {
  autoScan: { label: 'Quét tự động', group: ['D2'], fmt: (v) => (v ? 'Bật' : 'Tắt') },
  scanFrequency: { label: 'Tần suất rà soát', group: ['D2'], fmt: () => 'Hằng ngày' },
  scanTime: { label: 'Giờ rà soát', group: ['D2'] },
  catchupTime: { label: 'Quét bù từ', group: ['D2'] },
  sendStart: { label: 'Bắt đầu gửi', group: ['D2'] },
  sendEnd: { label: 'Kết thúc gửi', group: ['D2'] },
  holdAbnormal: { label: 'Giữ đợt tăng bất thường để duyệt', group: ['D2'], fmt: (v) => (v ? 'Bật' : 'Tắt') },
  growthFactor: { label: 'Hệ số tăng', group: ['D2'], unit: 'lần' },
  historyRuns: { label: 'Lịch sử so sánh', group: ['D2'], unit: 'đợt' },
  minRuns: { label: 'Số đợt tối thiểu', group: ['D2'], unit: 'đợt' },
  reminderEnabled: { label: 'Nhắc nghĩa vụ khai và nộp', group: ['D1a', 'D1b'], fmt: (v) => (v ? 'Bật' : 'Tắt') },
  daysBefore: { label: 'Nhắc trước hạn', group: ['D1a', 'D1b'], unit: 'ngày' },
  revenueEnabled: { label: 'Cảnh báo doanh thu', group: ['D4'], fmt: (v) => (v ? 'Bật' : 'Tắt') },
  nearThresholdPct: { label: 'Gần ngưỡng hóa đơn', group: ['D4'], unit: '%' },
  forecastMarginPct: { label: 'Biên dự báo ban đầu', group: ['D4'], unit: '%' },
  forecastMinDays: { label: 'Số ngày tối thiểu để dự báo', group: ['D4'], unit: 'ngày' },
  confirmGapDays: { label: 'Khoảng cách xác nhận', group: ['D4'], unit: 'ngày' },
  confirmCount: { label: 'Số lần xác nhận', group: ['D4'], unit: 'lần' },
  upsellCycleDays: { label: 'Chu kỳ nhắc khuyến khích lên doanh nghiệp', group: ['D4'], unit: 'ngày' },
};

export function formatValue(key: FieldKey, v: ConfigValues[FieldKey]) {
  const m = FIELD_META[key];
  if (m.fmt) return m.fmt(v);
  if (m.unit === '%') return `${v}%`;
  return m.unit ? `${v} ${m.unit}` : String(v);
}

export function diffConfig(a: ConfigValues, b: ConfigValues): FieldKey[] {
  return (Object.keys(a) as FieldKey[]).filter((k) => a[k] !== b[k]);
}

export interface ConfigVersion {
  version: number;
  values: ConfigValues;
  updatedBy: string;
  updatedAt: string;
  effectiveAt: string;
  reason: string;
  changes: { key: FieldKey; from: string; to: string }[];
  /** Hiệu lực trong tương lai → "Chờ hiệu lực". */
  pending?: boolean;
}

export const POLICY_THRESHOLDS = [
  // Mã, ý nghĩa, phiên bản là minh họa; số tiền theo mục 3.3. Giá trị thật đọc từ Configuration.
  { code: 'NG-01', meaning: 'Ngưỡng doanh thu sử dụng hóa đơn (minh họa)', amount: 1_000_000_000, version: 'CF-2026.2', effective: '2026-07-01' },
  { code: 'NG-02', meaning: 'Ngưỡng doanh thu bậc 2 (minh họa)', amount: 3_000_000_000, version: 'CF-2026.2', effective: '2026-07-01' },
  { code: 'NG-03', meaning: 'Ngưỡng khuyến khích lên doanh nghiệp (minh họa)', amount: 50_000_000_000, version: 'CF-2026.2', effective: '2026-07-01' },
];

// Lịch sử phiên bản minh họa (không phải lịch sử thật của hệ thống).
const v11: ConfigValues = { ...INITIAL_CONFIG, sendEnd: '09:30' };
const v10: ConfigValues = { ...v11, revenueEnabled: false };

export const INITIAL_HISTORY: ConfigVersion[] = [
  {
    version: 12,
    values: INITIAL_CONFIG,
    updatedBy: 'Nguyễn Minh An',
    updatedAt: '2026-10-27T15:30',
    effectiveAt: '2026-10-27T15:30',
    reason: 'Kéo dài khung gửi tới 10:00 để hết hàng chờ nhắc nộp cuối tháng.',
    changes: [{ key: 'sendEnd', from: '09:30', to: '10:00' }],
  },
  {
    version: 11,
    values: v11,
    updatedBy: 'Nguyễn Minh An',
    updatedAt: '2026-10-20T10:05',
    effectiveAt: '2026-10-21T00:00',
    reason: 'Bật cảnh báo doanh thu sau khi chốt ngưỡng chính sách CF-2026.2.',
    changes: [{ key: 'revenueEnabled', from: 'Tắt', to: 'Bật' }],
  },
  {
    version: 10,
    values: v10,
    updatedBy: 'Trần Thu Hà',
    updatedAt: '2026-10-02T16:40',
    effectiveAt: '2026-10-02T16:40',
    reason: 'Thiết lập ban đầu cho quý IV/2026.',
    changes: [],
  },
];
