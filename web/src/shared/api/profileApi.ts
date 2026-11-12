// [Thêm] Hồ sơ từng hộ và lịch sử hỏi đáp AI (view.docx mục 2). Toàn bộ là dữ liệu giả lập:
// hệ thống thật chưa có nguồn hội thoại, hồ sơ điện tử hay đánh giá câu trả lời AI.
import { PERIOD, taxpayers } from '@/shared/data/mock';
import { officerOf } from '@/shared/data/org';
import type { Taxpayer } from '@/shared/data/types';

const wait = (ms = 420) => new Promise((r) => setTimeout(r, ms));
// FNV-1a + trộn bit: khóa liền nhau (qa1, qa2…) cho kết quả phân tán, không ra chuỗi lặp.
const hashOf = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
};
/** Số giả ngẫu nhiên ổn định theo khóa, trong [0, 1). */
const rnd = (key: string) => (hashOf(key) % 10_000) / 10_000;

const TODAY = PERIOD.to;
const daysAgo = (n: number, time = '09:00') => {
  const d = new Date(`${TODAY}T00:00:00`);
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${time}`;
};
const clock = (key: string) => `${String(7 + Math.floor(rnd(key) * 11)).padStart(2, '0')}:${String(Math.floor(rnd(`${key}m`) * 60)).padStart(2, '0')}`;

/* ---------- Hồ sơ đã nộp ---------- */

export type FilingStatus = 'ACCEPTED' | 'PROCESSING' | 'REJECTED' | 'DRAFT';
export const FILING_LABEL: Record<FilingStatus, { label: string; tone: 'success' | 'info' | 'danger' | 'neutral' }> = {
  ACCEPTED: { label: 'Đã chấp nhận', tone: 'success' },
  PROCESSING: { label: 'Đang xử lý', tone: 'info' },
  REJECTED: { label: 'Bị từ chối', tone: 'danger' },
  DRAFT: { label: 'Đang làm dở', tone: 'neutral' },
};

export interface Filing {
  id: string;
  form: string;
  period: string;
  submittedAt: string | null;
  status: FilingStatus;
  note?: string;
}

const FORMS = [
  { form: 'Tờ khai thuế HKD (01/CNKD)', period: (q: number) => `Quý ${['I', 'II', 'III', 'IV'][q]}/2026` },
  { form: 'Tờ khai thuế HKD (01/CNKD)', period: (q: number) => `Quý ${['I', 'II', 'III', 'IV'][q]}/2026` },
  { form: 'Thông báo thay đổi thông tin đăng ký', period: () => 'Năm 2026' },
];

export function filingsOf(t: Taxpayer): Filing[] {
  const list: Filing[] = [];
  for (let q = 0; q < 3; q++) {
    const k = `${t.id}-f${q}`;
    const isLatest = q === 2;
    // Quý gần nhất: hộ còn thiếu hồ sơ khai thì để "đang làm dở" hoặc chưa có.
    if (isLatest && t.fileCount > 0) {
      if (rnd(k) < 0.5) list.push({ id: `HS-${t.mst}-${q}`, form: FORMS[0].form, period: FORMS[0].period(q), submittedAt: null, status: 'DRAFT', note: 'Đã khai doanh thu, chưa ký nộp' });
      continue;
    }
    const r = rnd(`${k}s`);
    const status: FilingStatus = r < 0.08 ? 'REJECTED' : isLatest && r < 0.25 ? 'PROCESSING' : 'ACCEPTED';
    list.push({
      id: `HS-${t.mst}-${q}`,
      form: FORMS[0].form,
      period: FORMS[0].period(q),
      submittedAt: daysAgo(150 - q * 90 + Math.floor(rnd(`${k}d`) * 20), clock(k)),
      status,
      note: status === 'REJECTED' ? 'Sai chỉ tiêu doanh thu, cần khai bổ sung' : undefined,
    });
  }
  if (rnd(`${t.id}-chg`) < 0.2) list.push({ id: `HS-${t.mst}-tt`, form: FORMS[2].form, period: FORMS[2].period(0), submittedAt: daysAgo(40, '14:20'), status: 'ACCEPTED' });
  return list.reverse();
}

/* ---------- Hội thoại với Geo AI ---------- */

export interface ChatMessage {
  from: 'hkd' | 'ai' | 'officer';
  at: string;
  text: string;
}

export interface QaItem {
  id: string;
  taxpayerId: number;
  askedAt: string;
  topic: string;
  question: string;
  answer: string;
  /** AI không trả lời được và đã chuyển cán bộ. */
  escalated: boolean;
  rating: QaRating | null;
  ratingNote?: string;
  ratedBy?: string;
}

export type QaRating = 'OK' | 'WRONG' | 'INCOMPLETE';
export const RATING_LABEL: Record<QaRating, string> = { OK: 'Đúng', WRONG: 'Sai', INCOMPLETE: 'Chưa đủ' };

const QA_BANK: { topic: string; q: string; a: string; escalate?: boolean }[] = [
  { topic: 'Hạn nộp', q: 'Hạn nộp tờ khai quý III là ngày nào?', a: 'Hạn nộp tờ khai thuế quý III/2026 là ngày 30/10/2026. Bạn có thể nộp trên ứng dụng iHanoi, mục Thuế hộ kinh doanh.' },
  { topic: 'Số tiền phải nộp', q: 'Tôi còn phải nộp bao nhiêu tiền thuế?', a: 'Theo dữ liệu đến 28/10/2026, bạn còn 1.250.000 đồng tiền thuế cần nộp, hạn 30/10/2026.' },
  { topic: 'Hóa đơn', q: 'Doanh thu bao nhiêu thì phải dùng hóa đơn điện tử?', a: 'Hộ kinh doanh có doanh thu từ 1 tỷ đồng/năm trở lên phải sử dụng hóa đơn điện tử khởi tạo từ máy tính tiền.' },
  { topic: 'Đổi thông tin', q: 'Tôi chuyển địa điểm kinh doanh thì phải làm gì?', a: 'Bạn cần nộp Thông báo thay đổi thông tin đăng ký thuế trong 10 ngày kể từ ngày thay đổi.' },
  { topic: 'Miễn giảm', q: 'Cửa hàng tôi bị ngập, có được giảm thuế không?', a: 'Câu hỏi cần cán bộ xem xét hồ sơ thực tế. Tôi đã chuyển câu hỏi tới cán bộ phụ trách.', escalate: true },
  { topic: 'Tạm ngừng', q: 'Tôi muốn tạm nghỉ bán 2 tháng thì khai thế nào?', a: 'Bạn gửi thông báo tạm ngừng kinh doanh chậm nhất 1 ngày làm việc trước khi tạm ngừng.' },
  { topic: 'Chữ ký số', q: 'Chữ ký số của tôi sắp hết hạn, gia hạn ở đâu?', a: 'Bạn liên hệ nhà cung cấp chữ ký số để gia hạn; sau khi gia hạn, cập nhật lại trên iHanoi.' },
  { topic: 'Nộp chậm', q: 'Nộp chậm 5 ngày thì bị phạt bao nhiêu?', a: 'Tiền chậm nộp tính 0,03%/ngày trên số thuế chậm nộp. Mức phạt vi phạm hành chính cần cán bộ xác định.', escalate: true },
];

let qaStore: QaItem[] | null = null;
function qa(): QaItem[] {
  if (qaStore) return qaStore;
  const items: QaItem[] = [];
  // Khoảng 2.400 câu hỏi trong 30 ngày, rải trên các hộ (giả lập).
  for (let i = 0; i < 2400; i++) {
    const tp = Math.floor(rnd(`qa${i}`) * taxpayers.length);
    const b = QA_BANK[Math.floor(rnd(`qb${i}`) * QA_BANK.length)];
    const ago = Math.floor(rnd(`qd${i}`) * 30);
    const rated = rnd(`qr${i}`);
    items.push({
      id: `HD-${String(i + 1).padStart(5, '0')}`,
      taxpayerId: tp,
      askedAt: daysAgo(ago, clock(`qt${i}`)),
      topic: b.topic,
      question: b.q,
      answer: b.a,
      escalated: !!b.escalate,
      rating: rated < 0.06 ? 'WRONG' : rated < 0.13 ? 'INCOMPLETE' : rated < 0.3 ? 'OK' : null,
      ratedBy: rated < 0.3 ? 'Cán bộ phụ trách' : undefined,
    });
  }
  qaStore = items.sort((a, b) => b.askedAt.localeCompare(a.askedAt));
  return qaStore;
}

export function conversationOf(taxpayerId: number): ChatMessage[] {
  const mine = qa().filter((x) => x.taxpayerId === taxpayerId).slice(0, 4).reverse();
  const msgs: ChatMessage[] = [];
  mine.forEach((x) => {
    msgs.push({ from: 'hkd', at: x.askedAt, text: x.question });
    msgs.push({ from: 'ai', at: x.askedAt, text: x.answer });
    if (x.escalated) msgs.push({ from: 'officer', at: x.askedAt, text: 'Cán bộ đã nhận câu hỏi và sẽ trả lời trong 1 ngày làm việc.' });
  });
  return msgs;
}

export async function fetchProfile(taxpayerId: number) {
  await wait();
  const t = taxpayers[taxpayerId];
  return { filings: filingsOf(t), conversation: conversationOf(taxpayerId) };
}

export interface QaQuery {
  /** Danh sách NNT trong phạm vi; null = toàn cơ sở. */
  ids: Set<number> | null;
  q: string;
  rating: 'all' | 'unrated' | QaRating;
  escalated: boolean;
  page: number;
  size: number;
}

export async function fetchQa(qy: QaQuery) {
  await wait();
  const s = qy.q.trim().toLowerCase();
  const rows = qa().filter((x) => {
    if (qy.ids && !qy.ids.has(x.taxpayerId)) return false;
    if (qy.escalated && !x.escalated) return false;
    if (qy.rating === 'unrated' ? x.rating : qy.rating !== 'all' && x.rating !== qy.rating) return false;
    if (s) {
      const t = taxpayers[x.taxpayerId];
      if (!(t.name.toLowerCase().includes(s) || t.mst.includes(s) || x.question.toLowerCase().includes(s))) return false;
    }
    return true;
  });
  const inScope = qy.ids ? qa().filter((x) => qy.ids!.has(x.taxpayerId)) : qa();
  const start = (qy.page - 1) * qy.size;
  return {
    total: rows.length,
    rows: rows.slice(start, start + qy.size).map((x) => ({ ...x, taxpayer: taxpayers[x.taxpayerId] })),
    all: rows,
    stats: {
      total: inScope.length,
      escalated: inScope.filter((x) => x.escalated).length,
      wrong: inScope.filter((x) => x.rating === 'WRONG').length,
      incomplete: inScope.filter((x) => x.rating === 'INCOMPLETE').length,
      rated: inScope.filter((x) => x.rating).length,
    },
  };
}

/** Đánh giá câu trả lời AI (đánh dấu sai hoặc chưa đủ). */
export async function rateQa(id: string, rating: QaRating, note: string, by: string) {
  await wait(300);
  const x = qa().find((q) => q.id === id);
  if (!x) throw new Error('Không tìm thấy câu hỏi.');
  x.rating = rating;
  x.ratingNote = note || undefined;
  x.ratedBy = by;
  return { ...x };
}

/** NNT do cán bộ phụ trách (dùng lọc phạm vi). */
export const ownerOf = (taxpayerId: number) => officerOf[taxpayerId];
