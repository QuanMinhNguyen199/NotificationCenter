// Ngày nghỉ (đề xuất của người dùng 12/11/2026, dữ liệu giả lập).
// Danh sách ngày lễ 2026–2027 là bản tạm, chưa theo thông báo nghỉ lễ chính thức hằng năm
// (ngày nghỉ bù, thứ Bảy làm bù thay đổi theo từng năm). Khi có nguồn thật, thay HOLIDAYS bằng dữ liệu từ màn Cấu hình.

const range = (from: string, to: string, name: string) => {
  const out: [string, string][] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) out.push([new Date(t).toISOString().slice(0, 10), name]);
  return out;
};

export const HOLIDAYS: Record<string, string> = Object.fromEntries([
  ['2026-01-01', 'Tết Dương lịch'],
  ...range('2026-02-14', '2026-02-22', 'Tết Nguyên đán'),
  ['2026-04-26', 'Giỗ Tổ Hùng Vương'], ['2026-04-27', 'Nghỉ bù Giỗ Tổ Hùng Vương'],
  ['2026-04-30', 'Ngày Giải phóng miền Nam'], ['2026-05-01', 'Quốc tế Lao động'],
  ['2026-09-01', 'Quốc khánh'], ['2026-09-02', 'Quốc khánh'],
  ['2027-01-01', 'Tết Dương lịch'],
  ...range('2027-02-05', '2027-02-10', 'Tết Nguyên đán'),
  ['2027-04-16', 'Giỗ Tổ Hùng Vương'],
  ['2027-04-30', 'Ngày Giải phóng miền Nam'], ['2027-05-01', 'Quốc tế Lao động'], ['2027-05-03', 'Nghỉ bù Quốc tế Lao động'],
  ['2027-09-02', 'Quốc khánh'], ['2027-09-03', 'Quốc khánh'],
]);

const dow = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).getUTCDay();
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export const holidayName = (iso: string): string | undefined => HOLIDAYS[iso.slice(0, 10)];
export const isWeekend = (iso: string) => dow(iso) === 0 || dow(iso) === 6;
/** Ngày làm việc: không phải thứ Bảy, Chủ nhật, không phải ngày lễ. */
export const isWorkday = (iso: string) => !isWeekend(iso) && !holidayName(iso);

/** Ngày làm việc gần nhất từ `iso` (kể cả chính nó) theo chiều `dir`. */
export function workdayFrom(iso: string, dir: 1 | -1 = 1) {
  let d = iso.slice(0, 10);
  while (!isWorkday(d)) d = addDays(d, dir);
  return d;
}

/** Ngày không phải ngày lễ gần nhất (cuối tuần vẫn tính là ngày gửi được). */
export function nonHolidayFrom(iso: string, dir: 1 | -1) {
  let d = iso.slice(0, 10);
  while (holidayName(d)) d = addDays(d, dir);
  return d;
}

/** Lý do ngày nghỉ, để hiện trên giao diện. */
export function offReason(iso: string) {
  const h = holidayName(iso);
  if (h) return `nghỉ lễ ${h}`;
  return isWeekend(iso) ? (dow(iso) === 0 ? 'Chủ nhật' : 'thứ Bảy') : null;
}
