// Cơ cấu minh họa của Thuế cơ sở 1: 3 tổ, mỗi tổ một lãnh đạo tổ và các cán bộ quản lý HKD.
// Không có trong mục 5 đặc tả; dùng để thể hiện phạm vi xem theo 3 cấp tài khoản.
import { taxpayers } from './mock';
import type { Staff, Team } from './types';

export const TEAMS: Team[] = [
  { id: 'T1', name: 'Tổ 1' },
  { id: 'T2', name: 'Tổ 2' },
  { id: 'T3', name: 'Tổ 3' },
];

export const STAFF: Staff[] = [
  { id: 'an', name: 'Nguyễn Minh An', username: 'an.nm', role: 'base', team: null, active: true },
  { id: 'ha', name: 'Trần Thu Hà', username: 'ha.tt', role: 'team', team: 'T1', active: true },
  { id: 'binh', name: 'Lê Văn Bình', username: 'binh.lv', role: 'officer', team: 'T1', active: true },
  { id: 'mai', name: 'Phạm Ngọc Mai', username: 'mai.pn', role: 'officer', team: 'T1', active: true },
  { id: 'hung', name: 'Đỗ Quốc Hưng', username: 'hung.dq', role: 'officer', team: 'T1', active: true },
  { id: 'tung', name: 'Vũ Thanh Tùng', username: 'tung.vt', role: 'team', team: 'T2', active: true },
  { id: 'hanh', name: 'Bùi Thị Hạnh', username: 'hanh.bt', role: 'officer', team: 'T2', active: true },
  { id: 'long', name: 'Ngô Đức Long', username: 'long.nd', role: 'officer', team: 'T2', active: true },
  { id: 'huy', name: 'Hoàng Gia Huy', username: 'huy.hg', role: 'team', team: 'T3', active: true },
  { id: 'trang', name: 'Dương Thu Trang', username: 'trang.dt', role: 'officer', team: 'T3', active: true },
  { id: 'nam', name: 'Lý Hải Nam', username: 'nam.lh', role: 'officer', team: 'T3', active: true },
  { id: 'oanh', name: 'Đinh Kim Oanh', username: 'oanh.dk', role: 'officer', team: 'T3', active: true },
  { id: 'khoi', name: 'Phan Văn Khôi', username: 'khoi.pv', role: 'officer', team: 'T3', active: false },
];

// Số NNT mỗi cán bộ phụ trách (tổng 6.200). Tài khoản đang khóa không còn NNT.
const LOAD: [string, number][] = [
  ['binh', 820], ['mai', 760], ['hung', 790],
  ['hanh', 700], ['long', 830],
  ['trang', 740], ['nam', 810], ['oanh', 750],
];

// Bộ sinh số riêng để không làm lệch dữ liệu minh họa trong mock.ts.
function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(31102026);
const ids = taxpayers.map((t) => t.id);
for (let i = ids.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [ids[i], ids[j]] = [ids[j], ids[i]];
}

/** Cán bộ phụ trách theo id NNT. */
export const officerOf: string[] = Array.from<string>({ length: taxpayers.length });
let cursor = 0;
for (const [staff, n] of LOAD) for (let k = 0; k < n; k++) officerOf[ids[cursor++]] = staff;
// Năm NNT minh họa ở đầu danh sách thuộc cán bộ Lê Văn Bình (Tổ 1).
for (let id = 0; id < 5; id++) officerOf[id] = 'binh';

console.assert(cursor === taxpayers.length, 'Mỗi NNT có đúng một cán bộ phụ trách');
