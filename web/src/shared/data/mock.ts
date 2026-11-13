// Dữ liệu minh họa theo mục 5 của đặc tả. Mọi tổng hiển thị được tính lại từ các dòng ở đây.
import type { DeliveryStatus, GroupCode, Notification, Priority, SendRun, SendStatus, Taxpayer, Unit } from './types';

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261028);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const repeat = <T,>(value: T, n: number) => Array.from({ length: n }, () => value);

export const UNITS: Unit[] = [{ id: 'A', name: 'Thuế cơ sở 1' }];

export const PERIOD = { from: '2026-10-22', to: '2026-10-28' };
export const UPDATED_AT = '2026-10-28T09:15';
export const OBLIGATION_CUTOFF = '2026-10-28T02:05';

export const DAYS = [
  { date: '2026-10-22', total: 1000, sent: 900, failed: 45, unknown: 10, expired: 35, skipped: 10, pending: 0 },
  { date: '2026-10-23', total: 1200, sent: 1100, failed: 45, unknown: 10, expired: 35, skipped: 10, pending: 0 },
  { date: '2026-10-24', total: 1300, sent: 1200, failed: 45, unknown: 10, expired: 35, skipped: 10, pending: 0 },
  { date: '2026-10-25', total: 1400, sent: 1300, failed: 45, unknown: 10, expired: 35, skipped: 10, pending: 0 },
  { date: '2026-10-26', total: 1600, sent: 1450, failed: 70, unknown: 15, expired: 50, skipped: 15, pending: 0 },
  { date: '2026-10-27', total: 1800, sent: 1600, failed: 90, unknown: 25, expired: 60, skipped: 25, pending: 0 },
  { date: '2026-10-28', total: 1700, sent: 950, failed: 60, unknown: 20, expired: 50, skipped: 20, pending: 600 },
];

/* ---------- NNT ---------- */

const HO = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Ngô', 'Dương', 'Lý', 'Phan', 'Đinh', 'Trịnh'];
const DEM = ['Văn', 'Thị', 'Minh', 'Quốc', 'Thu', 'Đức', 'Ngọc', 'Hữu', 'Thanh', 'Gia', 'Hải', 'Kim'];
const TEN = ['An', 'Bình', 'Châu', 'Dũng', 'Giang', 'Hà', 'Hạnh', 'Hiếu', 'Hòa', 'Huyền', 'Khánh', 'Lan', 'Linh', 'Long', 'Mai', 'Nam', 'Nga', 'Phúc', 'Quân', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Tuấn', 'Vân', 'Yến'];
const HO_KD = ['Hộ kinh doanh Phúc Lộc', 'Hộ kinh doanh Minh Khai', 'Hộ kinh doanh Hồng Hà', 'Hộ kinh doanh Tân Mai', 'Hộ kinh doanh Kim Liên', 'Hộ kinh doanh Thành Công', 'Hộ kinh doanh Đông Xuân', 'Hộ kinh doanh Hải Yến', 'Hộ kinh doanh Ngọc Khánh', 'Hộ kinh doanh Vạn Phúc'];

const TAXPAYER_COUNT = 6200;
const NAMED = ['Hộ kinh doanh An Bình', 'Nguyễn Minh Phương', 'Trần Văn Hòa', 'Phạm Thị Lan', 'Lê Quốc Hưng'];

export const taxpayers: Taxpayer[] = Array.from({ length: TAXPAYER_COUNT }, (_, i) => ({
  id: i,
  name: NAMED[i] ?? (rand() < 0.22 ? `${pick(HO_KD)} ${i % 97 + 1}` : `${pick(HO)} ${pick(DEM)} ${pick(TEN)}`),
  mst: `999${String(i + 1).padStart(7, '0')}`,
  hkdStatus: rand() < 0.06 ? 'Tạm ngừng kinh doanh' : 'Đang hoạt động',
  fileCount: 0,
  payCount: 0,
  updatedAt: OBLIGATION_CUTOFF,
}));

// Nghĩa vụ: 4.100 NNT khai, 3.500 NNT nộp, 1.400 NNT thuộc cả hai → 6.200 NNT duy nhất.
const order = shuffle(Array.from({ length: TAXPAYER_COUNT }, (_, i) => i));
const place = (id: number, pos: number) => {
  const cur = order.indexOf(id);
  [order[cur], order[pos]] = [order[pos], order[cur]];
};
place(0, 10); // An Bình: chỉ khai
place(3, 11); // Phạm Thị Lan: chỉ khai
place(2, 3000); // Trần Văn Hòa: khai và nộp
place(1, 5000); // Nguyễn Minh Phương: chỉ nộp
place(4, 5001); // Lê Quốc Hưng: chỉ nộp

const fileSet = order.slice(0, 4100);
const paySet = order.slice(2700, 6200);
const priorities = (o: number, d: number, t: number) =>
  shuffle([...repeat<Priority>('OVERDUE', o), ...repeat<Priority>('DUE_SOON', d), ...repeat<Priority>('IN_TERM', t)]);
const filePr = priorities(1700, 1800, 600);
const payPr = priorities(1400, 1600, 500);
const fileTwo = new Set(shuffle([...fileSet]).slice(0, 1100));
const payTwo = new Set(shuffle([...paySet]).slice(0, 1200));
fileSet.forEach((id, k) => {
  taxpayers[id].fileCount = fileTwo.has(id) ? 2 : 1;
  taxpayers[id].filePriority = filePr[k];
});
paySet.forEach((id, k) => {
  taxpayers[id].payCount = payTwo.has(id) ? 2 : 1;
  taxpayers[id].payPriority = payPr[k];
});

/* ---------- Thông báo ---------- */

const TITLES: Record<string, string[]> = {
  D1a: ['Nhắc nộp hồ sơ khai thuế quý III/2026', 'Nhắc hồ sơ khai thuế còn thiếu'],
  D1b: ['Nhắc khoản tiền thuế còn phải nộp', 'Nhắc khoản thuế sắp đến hạn nộp'],
  both: ['Nhắc hồ sơ khai và khoản thuế còn phải nộp'],
  D4: ['Doanh thu đang gần ngưỡng sử dụng hóa đơn', 'Doanh thu dự báo vượt ngưỡng trong năm'],
};

function groupsFor(): { groups: GroupCode[]; title: string } {
  const r = rand();
  if (r < 0.42) return { groups: ['D1a'], title: pick(TITLES.D1a) };
  if (r < 0.76) return { groups: ['D1b'], title: pick(TITLES.D1b) };
  if (r < 0.88) return { groups: ['D1a', 'D1b'], title: TITLES.both[0] };
  return { groups: ['D4'], title: pick(TITLES.D4) };
}

const runId = (date: string, unit = 'A') => `DG-${date.replaceAll('-', '')}-${unit}`;

// NNT: ngày 28/10 dùng 1.500 NNT (id 0–1.499), các ngày còn lại dùng id 1.500–5.799 → 5.800 NNT duy nhất.
const lastDay = DAYS[DAYS.length - 1];
const day28Tp = shuffle(Array.from({ length: 1500 }, (_, i) => i).filter((i) => i > 4));
const day28Pool = [...day28Tp, ...Array.from({ length: lastDay.total - 1500 }, () => pick(day28Tp))];
shuffle(day28Pool);
const otherTotal = DAYS.slice(0, -1).reduce((s, d) => s + d.total, 0);
const otherIds = Array.from({ length: 4300 }, (_, i) => 1500 + i);
const otherPool = shuffle([...otherIds, ...Array.from({ length: otherTotal - otherIds.length }, () => pick(otherIds))]);

export const notifications: Notification[] = [];
let otherCursor = 0;
for (const day of DAYS) {
  const statuses = shuffle<SendStatus>([
    ...repeat<SendStatus>('SENT', day.sent),
    ...repeat<SendStatus>('PENDING', day.pending),
    ...repeat<SendStatus>('FAILED', day.failed),
    ...repeat<SendStatus>('UNKNOWN', day.unknown),
    ...repeat<SendStatus>('EXPIRED', day.expired),
    ...repeat<SendStatus>('SKIPPED', day.skipped),
  ]);
  const isLast = day === lastDay;
  for (let k = 0; k < day.total; k++) {
    // Lượt rà soát 02:00 tạo thông báo trong khoảng 10 phút, tăng dần theo k.
    const offset = Math.floor((k * 600) / day.total);
    const minute = Math.floor(offset / 60);
    const second = offset % 60;
    const tp = isLast ? (k >= day.total - 5 ? day.total - 1 - k : day28Pool[k]) : otherPool[otherCursor++];
    const g = groupsFor();
    notifications.push({
      id: `TB-${day.date.replaceAll('-', '')}-${String(k + 1).padStart(5, '0')}`,
      createdAt: `${day.date}T02:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`,
      taxpayerId: tp,
      groups: g.groups,
      title: g.title,
      send: statuses[k],
      delivery: 'NA',
      runId: runId(day.date),
    });
  }
}

// Kết quả giao trong 8.500 đã gửi: 7.000 đã giao, 800 iHanoi tiếp nhận, 300 giao thất bại, 400 chưa có kết quả cuối.
const sentRows = notifications.filter((n) => n.send === 'SENT');
const deliveries = shuffle<DeliveryStatus>([
  ...repeat<DeliveryStatus>('DELIVERED', 7000),
  ...repeat<DeliveryStatus>('ACCEPTED', 800),
  ...repeat<DeliveryStatus>('DELIVERY_FAILED', 300),
  ...repeat<DeliveryStatus>('NO_FINAL', 400),
]);
sentRows.forEach((n, i) => (n.delivery = deliveries[i]));

// Năm dòng minh họa ở đầu danh sách (mới nhất ngày 28/10), trạng thái theo mục 5.3.
const FORCED: { tp: number; groups: GroupCode[]; title: string; send: SendStatus; delivery: DeliveryStatus }[] = [
  { tp: 0, groups: ['D1a'], title: 'Nhắc nộp hồ sơ khai thuế quý III/2026', send: 'SENT', delivery: 'DELIVERED' },
  { tp: 1, groups: ['D1b'], title: 'Nhắc khoản tiền thuế còn phải nộp', send: 'SENT', delivery: 'DELIVERED' },
  { tp: 2, groups: ['D4'], title: 'Doanh thu đang gần ngưỡng sử dụng hóa đơn', send: 'SENT', delivery: 'ACCEPTED' },
  { tp: 3, groups: ['D1a'], title: 'Nhắc hồ sơ khai thuế còn thiếu', send: 'FAILED', delivery: 'NA' },
  { tp: 4, groups: ['D1b'], title: 'Nhắc khoản thuế sắp đến hạn nộp', send: 'PENDING', delivery: 'NA' },
];
const day28Rows = notifications.filter((n) => n.createdAt.startsWith(lastDay.date));
FORCED.forEach((f) => {
  const row = day28Rows.find((n) => n.taxpayerId === f.tp)!;
  row.groups = f.groups;
  row.title = f.title;
  if (row.send !== f.send || row.delivery !== f.delivery) {
    // Hoán đổi với một dòng cùng ngày có đúng trạng thái để giữ nguyên tổng.
    const donor = day28Rows.find((n) => n !== row && n.taxpayerId > 4 && n.send === f.send && (f.send !== 'SENT' || n.delivery === f.delivery))
      ?? notifications.find((n) => n.send === f.send && n.delivery === f.delivery && n.taxpayerId > 4)!;
    if (donor.createdAt.startsWith(lastDay.date)) {
      [row.send, donor.send] = [donor.send, row.send];
      [row.delivery, donor.delivery] = [donor.delivery, row.delivery];
    } else {
      // Khác ngày: chỉ đổi kết quả giao (trạng thái gửi đã đúng).
      [row.delivery, donor.delivery] = [donor.delivery, row.delivery];
    }
  }
});

// Thời điểm xử lý minh họa: rải đều trong khung 06:00–09:55 của ngày phát sinh, theo thứ tự tạo.
// iHanoi xác nhận giao sau 1–20 phút, đa số dưới 5 phút (bộ sinh số riêng để không đổi các tổng ở trên).
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const lag = rng(28102026);
for (const day of DAYS) {
  const rows = notifications.filter((n) => n.createdAt.startsWith(day.date));
  rows.forEach((n, k) => {
    if (n.send === 'PENDING') return;
    // Ngày 28/10 đang gửi, 'bây giờ' là 09:15 nên mốc cuối là 09:14.
    const span = day === lastDay ? 194 : 235;
    const min = 360 + Math.floor((k * span) / rows.length);
    n.processedAt = `${day.date}T${hhmm(min)}`;
    const delay = 1 + Math.floor(lag() ** 2.5 * 20);
    if (n.delivery === 'DELIVERED') n.deliveredAt = `${day.date}T${hhmm(day === lastDay ? Math.min(min + delay, 554) : min + delay)}`;
  });
}

notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));

/* ---------- Đợt gửi ---------- */

export const runs: SendRun[] = DAYS.map((d) => {
  const rows = notifications.filter((n) => n.runId === runId(d.date));
  const isLast = d === lastDay;
  return {
    id: runId(d.date),
    date: d.date,
    unit: 'A',
    window: '06:00–10:00',
    total: rows.length,
    taxpayers: new Set(rows.map((r) => r.taxpayerId)).size,
    sent: rows.filter((r) => r.send === 'SENT').length,
    pending: rows.filter((r) => r.send === 'PENDING').length,
    failed: rows.filter((r) => r.send === 'FAILED').length,
    unknown: rows.filter((r) => r.send === 'UNKNOWN').length,
    expired: rows.filter((r) => r.send === 'EXPIRED').length,
    skipped: rows.filter((r) => r.send === 'SKIPPED').length,
    status: isLast ? 'SENDING' : 'DONE',
    configVersion: isLast ? 12 : 11,
    approvedBy: 'Tự động — không vượt hệ số tăng',
    timeline: [
      { at: `${d.date}T02:00`, text: 'Bắt đầu rà soát và lập danh sách' },
      { at: `${d.date}T02:10`, text: `Danh sách sẵn sàng: ${rows.length.toLocaleString('vi-VN')} thông báo` },
      { at: `${d.date}T02:10`, text: 'Tự động duyệt — không vượt 3 lần trung vị 7 đợt gần nhất' },
      { at: `${d.date}T06:00`, text: 'Bắt đầu gửi trong khung 06:00–10:00' },
      ...(isLast ? [] : [{ at: `${d.date}T09:55`, text: 'Hoàn tất khung gửi' }]),
    ],
  };
});

/* ---------- Kiểm tra đối chiếu với mục 5.2 ---------- */
const count = (f: (n: Notification) => boolean) => notifications.filter(f).length;
console.assert(notifications.length === 10000, 'Tổng thông báo phải là 10.000');
console.assert(count((n) => n.send === 'SENT') === 8500, 'Đã gửi Noti 8.500');
console.assert(count((n) => n.send === 'PENDING') === 600, 'Chờ gửi 600');
console.assert(count((n) => n.send === 'FAILED') === 400, 'Gửi thất bại 400');
console.assert(count((n) => n.delivery === 'DELIVERED') === 7000, 'Đã giao 7.000');
console.assert(new Set(notifications.map((n) => n.taxpayerId)).size === 5800, 'NNT duy nhất 5.800');
const last = runs[runs.length - 1];
console.assert(last.total === 1700 && last.taxpayers === 1500 && last.sent === 950 && last.pending === 600, 'Đợt DG-20261028-A');
console.assert(taxpayers.filter((t) => t.fileCount).length === 4100 && taxpayers.filter((t) => t.payCount).length === 3500, 'NNT theo nghĩa vụ');
console.assert(taxpayers.reduce((s, t) => s + t.fileCount, 0) === 5200 && taxpayers.reduce((s, t) => s + t.payCount, 0) === 4700, 'Số nghĩa vụ');
