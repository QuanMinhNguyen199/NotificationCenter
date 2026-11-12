// Mock API cho Chuyển tuyến: ca do Geo AI chuyển tới cán bộ và chuông báo cho cán bộ.
// Toàn bộ dữ liệu là giả lập; thay bằng API Chuyển tuyến thật khi backend sẵn sàng.
import { taxpayers } from '@/shared/data/mock';
import { isWorkday } from '@/shared/lib/workdays';
import { STAFF, TEAMS, officerOf } from '@/shared/data/org';
import type { Taxpayer } from '@/shared/data/types';

const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms));

export class RoutingError extends Error {
  code: 'NOT_FOUND' | 'CONFLICT' | 'FORBIDDEN' | 'INVALID';
  constructor(code: RoutingError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

/* ---------- Thời gian ---------- */

/** "Bây giờ" của bản mock, khớp ngày số liệu của ứng dụng (28/10/2026). */
export const NOW_ISO = '2026-10-28T10:00';
const pad = (n: number) => String(n).padStart(2, '0');
export const toDate = (iso: string) => new Date(iso);
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const NOW = toDate(NOW_ISO);
const addMin = (iso: string, min: number) => toIso(new Date(toDate(iso).getTime() + min * 60_000));
export const minutesBetween = (a: string, b: string) => (toDate(b).getTime() - toDate(a).getTime()) / 60_000;

/** Đề xuất: hạn trả lời = cùng giờ của ngày làm việc kế tiếp (bỏ thứ Bảy, Chủ nhật và ngày lễ giả lập ở lib/workdays.ts). */
export function dueOf(createdAt: string) {
  const d = toDate(createdAt);
  do d.setDate(d.getDate() + 1);
  while (!isWorkday(toIso(d)));
  return toIso(d);
}

/* ---------- Kiểu dữ liệu ---------- */

export type CaseStatus = 'NEW' | 'IN_PROGRESS' | 'ANSWERED' | 'DONE';
export type CaseKind = 'QUESTION' | 'DECLARATION';

export const STATUS_ORDER: CaseStatus[] = ['NEW', 'IN_PROGRESS', 'ANSWERED', 'DONE'];
export const STATUS_LABEL: Record<CaseStatus, string> = { NEW: 'Mới', IN_PROGRESS: 'Đang xử lý', ANSWERED: 'Đã trả lời', DONE: 'Hoàn tất' };
export const KIND_LABEL: Record<CaseKind, string> = { QUESTION: 'Câu hỏi ngoài phạm vi Geo AI', DECLARATION: 'Tờ khai chuyển đến cán bộ' };
export const KIND_SHORT: Record<CaseKind, string> = { QUESTION: 'Câu hỏi', DECLARATION: 'Tờ khai' };

export interface ChatMessage {
  from: 'household' | 'ai' | 'officer';
  at: string;
  text: string;
  /** Cán bộ gửi (khi from = officer). */
  by?: string;
}

export interface DraftField {
  label: string;
  /** null = hộ chưa điền. */
  value: string | null;
}

export interface CaseEvent {
  at: string;
  text: string;
  by?: string;
}

export interface RoutingCase {
  id: string;
  kind: CaseKind;
  status: CaseStatus;
  taxpayerId: number;
  team: string;
  createdAt: string;
  dueAt: string;
  topic: string;
  /** Lý do Geo AI chuyển tuyến. */
  reason: string;
  claimedBy?: string;
  claimedAt?: string;
  answeredAt?: string;
  doneAt?: string;
  chat: ChatMessage[];
  draft?: { form: string; period: string; fields: DraftField[] };
  events: CaseEvent[];
}

/* ---------- Sinh dữ liệu tất định ---------- */

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(28102026);
const between = (a: number, b: number) => a + rand() * (b - a);

const teamOfTaxpayer = (id: number) => STAFF.find((s) => s.id === officerOf[id])?.team ?? 'T1';
const officersOf = (team: string) => STAFF.filter((s) => s.team === team && s.active && s.role === 'officer').map((s) => s.id);

const QUESTIONS: { topic: string; ask: string; ai: string; reason: string }[] = [
  {
    topic: 'Doanh thu bán qua sàn đã được sàn khấu trừ thuế',
    ask: 'Hộ tôi bán thêm trên sàn thương mại điện tử, sàn đã khấu trừ thuế rồi. Tôi có phải khai phần doanh thu này nữa không?',
    ai: 'Trường hợp doanh thu đã được sàn khấu trừ cần đối chiếu chứng từ khấu trừ của hộ. Tôi chưa trả lời chắc chắn được nên đã chuyển câu hỏi tới cán bộ thuế phụ trách.',
    reason: 'Cần đối chiếu chứng từ khấu trừ của sàn',
  },
  {
    topic: 'Tạm ngừng kinh doanh 2 tháng để sửa cửa hàng',
    ask: 'Tôi đóng cửa hàng khoảng 2 tháng để sửa nhà. Tôi có phải báo với cơ quan thuế không, báo thế nào?',
    ai: 'Thủ tục tạm ngừng phụ thuộc thời điểm và hồ sơ đăng ký của hộ. Tôi đã chuyển câu hỏi để cán bộ hướng dẫn cụ thể cho hộ.',
    reason: 'Thủ tục phụ thuộc hồ sơ đăng ký của hộ',
  },
  {
    topic: 'Xin miễn tiền chậm nộp vì nằm viện',
    ask: 'Tháng trước tôi nằm viện nên nộp thuế muộn. Tôi muốn xin không tính tiền chậm nộp thì làm thế nào?',
    ai: 'Đề nghị miễn tiền chậm nộp cần cán bộ xem xét hồ sơ và lý do cụ thể. Tôi đã chuyển yêu cầu tới cán bộ thuế phụ trách.',
    reason: 'Đề nghị cần cán bộ xem xét hồ sơ',
  },
  {
    topic: 'Chuyển cửa hàng sang phường khác',
    ask: 'Tôi chuyển cửa hàng sang phường bên cạnh từ tháng sau. Tôi có phải đổi nơi nộp thuế không?',
    ai: 'Việc đổi cơ quan thuế quản lý khi chuyển địa điểm cần cán bộ xác nhận theo địa bàn mới. Tôi đã chuyển câu hỏi tới cán bộ.',
    reason: 'Cần xác nhận địa bàn quản lý mới',
  },
  {
    topic: 'Cho thuê một phần mặt bằng',
    ask: 'Tôi cho người khác thuê lại một phần mặt bằng. Tiền thuê này khai chung với doanh thu bán hàng hay khai riêng?',
    ai: 'Câu hỏi về khoản thu cho thuê ngoài ngành nghề đã đăng ký nằm ngoài phạm vi tôi trả lời được. Tôi đã chuyển tới cán bộ thuế.',
    reason: 'Khoản thu ngoài ngành nghề đã đăng ký',
  },
  {
    topic: 'Số tiền trên thông báo khác số hộ tự tính',
    ask: 'Thông báo nộp thuế ghi số tiền cao hơn tôi tự tính. Tôi phải làm gì?',
    ai: 'Tôi không xem được chi tiết cách tính trong thông báo của hộ. Tôi đã chuyển câu hỏi để cán bộ đối chiếu.',
    reason: 'Cần đối chiếu chi tiết thông báo nộp thuế',
  },
];

const DECLARATIONS: { topic: string; ask: string; ai: string; reason: string; fields: (r: number) => DraftField[] }[] = [
  {
    topic: 'Kinh doanh nhiều ngành, chưa chọn được tỷ lệ thuế',
    ask: 'Tôi vừa bán đồ ăn vừa bán tạp hóa. Tờ khai bắt chọn một ngành, tôi không biết chọn ngành nào.',
    ai: 'Hộ có nhiều ngành nghề cần cán bộ xác nhận cách kê. Tôi đã lưu phần hộ đang khai và chuyển tờ khai tới cán bộ.',
    reason: 'Nhiều ngành nghề, chưa xác định tỷ lệ thuế',
    fields: (r) => [
      { label: 'Ngành nghề', value: 'Ăn uống; Bán lẻ tạp hóa' },
      { label: 'Doanh thu ăn uống', value: `${Math.round(60 + r * 80)}.000.000 đ` },
      { label: 'Doanh thu bán lẻ', value: null },
      { label: 'Thuế GTGT tự tính', value: null },
      { label: 'Thuế TNCN tự tính', value: null },
    ],
  },
  {
    topic: 'Muốn khai bổ sung tờ khai đã nộp',
    ask: 'Tôi khai thiếu doanh thu tháng 8 trong tờ khai đã nộp. Tôi muốn sửa lại thì làm thế nào?',
    ai: 'Khai bổ sung cần cán bộ hướng dẫn và kiểm tra. Tôi đã chuyển tờ khai cùng phần hộ đang sửa tới cán bộ.',
    reason: 'Khai bổ sung cho tờ khai đã nộp',
    fields: (r) => [
      { label: 'Tờ khai gốc', value: 'Nộp ngày 20/07/2026' },
      { label: 'Doanh thu đã khai', value: `${Math.round(90 + r * 60)}.000.000 đ` },
      { label: 'Doanh thu khai bổ sung', value: `${Math.round(10 + r * 30)}.000.000 đ` },
      { label: 'Lý do khai bổ sung', value: 'Khai thiếu doanh thu tháng 8' },
      { label: 'Số thuế điều chỉnh', value: null },
    ],
  },
  {
    topic: 'Doanh thu kê khai tăng mạnh so với kỳ trước',
    ask: 'Quý này tôi có đơn hàng lớn nên doanh thu tăng nhiều. Hệ thống báo cần kiểm tra, tôi phải làm gì tiếp?',
    ai: 'Doanh thu kê khai chênh lệch lớn so với kỳ trước cần cán bộ xem xét trước khi nộp. Tôi đã chuyển tờ khai tới cán bộ.',
    reason: 'Doanh thu chênh lệch lớn so với kỳ trước',
    fields: (r) => [
      { label: 'Ngành nghề', value: 'Bán lẻ' },
      { label: 'Doanh thu kỳ này', value: `${Math.round(320 + r * 200)}.000.000 đ` },
      { label: 'Doanh thu kỳ trước', value: `${Math.round(90 + r * 40)}.000.000 đ` },
      { label: 'Thuế GTGT tự tính', value: null },
      { label: 'Số tài khoản nộp thuế', value: null },
    ],
  },
];

const REPLIES = [
  'Chào anh/chị, cán bộ thuế đã xem câu hỏi. Anh/chị vui lòng mang theo giấy tờ liên quan tới bộ phận một cửa hoặc gọi số đường dây nóng để được hướng dẫn chi tiết.',
  'Cán bộ thuế đã kiểm tra và hướng dẫn anh/chị hoàn tất phần còn thiếu trên ứng dụng. Nếu cần hỗ trợ thêm, anh/chị trả lời tin này.',
  'Cán bộ đã đối chiếu hồ sơ của hộ. Anh/chị tiếp tục khai theo hướng dẫn trong tin nhắn, phần đã lưu vẫn còn nguyên.',
];

// Trạng thái theo thứ tự ca từ mới tới cũ; vài ca cũ vẫn ở Mới/Đang xử lý để có trường hợp quá hạn.
const STATUS_PLAN: CaseStatus[] = [
  'NEW', 'NEW', 'NEW', 'IN_PROGRESS', 'NEW', 'IN_PROGRESS', 'NEW', 'IN_PROGRESS', 'ANSWERED', 'NEW',
  'IN_PROGRESS', 'ANSWERED', 'IN_PROGRESS', 'ANSWERED', 'NEW', 'ANSWERED', 'DONE', 'IN_PROGRESS', 'ANSWERED', 'DONE',
  'DONE', 'NEW', 'ANSWERED', 'DONE', 'DONE', 'IN_PROGRESS', 'DONE', 'ANSWERED', 'DONE', 'DONE',
  'DONE', 'ANSWERED', 'DONE', 'DONE', 'DONE', 'DONE', 'ANSWERED', 'DONE', 'DONE', 'DONE',
];

// Năm NNT minh họa (thuộc Lê Văn Bình, Tổ 1) nằm xen trong các ca mới nhất.
const NAMED_AT: Record<number, number> = { 0: 0, 3: 2, 5: 1, 8: 3, 12: 4 };

const name = (id?: string) => STAFF.find((s) => s.id === id)?.name ?? '';

function buildCases(): RoutingCase[] {
  const out: RoutingCase[] = [];
  const used = new Set<number>([0, 1, 2, 3, 4]);
  const claimCursor: Record<string, number> = {};
  let ageMin = 25;
  STATUS_PLAN.forEach((status, i) => {
    let tpId = NAMED_AT[i];
    if (tpId === undefined) {
      // Ưu tiên thêm ca cho Tổ 1 để các tài khoản xem thử (Tổ 1) có đủ ca ở mọi trạng thái.
      do tpId = 5 + Math.floor(rand() * (taxpayers.length - 5));
      while (used.has(tpId) || (i % 4 === 0 && teamOfTaxpayer(tpId) !== 'T1'));
      used.add(tpId);
    }
    const team = teamOfTaxpayer(tpId);
    const createdAt = toIso(new Date(NOW.getTime() - ageMin * 60_000));
    const kind: CaseKind = i % 3 === 1 ? 'DECLARATION' : 'QUESTION';
    const tpl = kind === 'QUESTION' ? QUESTIONS[i % QUESTIONS.length] : DECLARATIONS[i % DECLARATIONS.length];
    const r = rand();
    const chat: ChatMessage[] = [
      { from: 'household', at: addMin(createdAt, -6), text: tpl.ask },
      { from: 'ai', at: addMin(createdAt, -5), text: 'Geo AI đang tìm hướng dẫn phù hợp với trường hợp của hộ.' },
      { from: 'household', at: addMin(createdAt, -2), text: 'Tôi cần câu trả lời cụ thể cho trường hợp của tôi.' },
      { from: 'ai', at: createdAt, text: tpl.ai },
    ];
    const events: CaseEvent[] = [{ at: createdAt, text: `Geo AI chuyển ca tới hàng chung ${TEAMS.find((t) => t.id === team)?.name}` }];
    const c: RoutingCase = {
      id: `CT-${createdAt.slice(5, 7)}${createdAt.slice(8, 10)}-${String(40 - i).padStart(3, '0')}`,
      kind,
      status,
      taxpayerId: tpId,
      team,
      createdAt,
      dueAt: dueOf(createdAt),
      topic: tpl.topic,
      reason: tpl.reason,
      chat,
      events,
      draft: kind === 'DECLARATION' ? { form: 'Tờ khai thuế đối với hộ kinh doanh (01/CNKD)', period: 'Quý III/2026', fields: (tpl as (typeof DECLARATIONS)[number]).fields(r) } : undefined,
    };
    if (status !== 'NEW') {
      const officers = officersOf(team);
      const k = claimCursor[team] ?? 0;
      claimCursor[team] = k + 1;
      c.claimedBy = officers[k % officers.length];
      c.claimedAt = addMin(createdAt, Math.min(ageMin * 0.3, between(10, 90)));
      events.push({ at: c.claimedAt, text: 'Nhận ca', by: name(c.claimedBy) });
    }
    if (status === 'ANSWERED' || status === 'DONE') {
      const left = minutesBetween(c.claimedAt!, NOW_ISO);
      c.answeredAt = addMin(c.claimedAt!, Math.min(left * 0.6, between(30, 26 * 60)));
      chat.push({ from: 'officer', at: c.answeredAt, text: REPLIES[i % REPLIES.length], by: c.claimedBy });
      events.push({ at: c.answeredAt, text: 'Trả lời hộ', by: name(c.claimedBy) });
      events.push({ at: c.answeredAt, text: 'Đã báo kết quả cho hộ qua iHanoi' });
    }
    if (status === 'DONE') {
      c.doneAt = addMin(c.answeredAt!, Math.min(minutesBetween(c.answeredAt!, NOW_ISO) * 0.5, between(20, 600)));
      events.push({ at: c.doneAt, text: 'Đánh dấu hoàn tất', by: name(c.claimedBy) });
    }
    out.push(c);
    // Khoảng 15 ca gần nhất rơi trong 24 giờ qua, các ca cũ hơn trải đều tới 7 ngày.
    ageMin += Math.round(i < 14 ? between(45, 110) : between(160, 430));
  });
  return out;
}

let store: RoutingCase[] = buildCases();
// Ca minh họa xung đột: lần nhận đầu tiên báo người khác vừa nhận trước.
const RACE_ID = store.filter((c) => c.status === 'NEW' && c.team === 'T1')[1]?.id;
let raced = false;

/** Số hội thoại Geo AI 7 ngày theo tổ (giả lập), để tính tỷ lệ chuyển tuyến. */
const AI_CONVERSATIONS: Record<string, number> = { T1: 1240, T2: 1080, T3: 1310 };

/* ---------- Phạm vi ---------- */

/** 'ALL' (lãnh đạo cơ sở) hoặc mã tổ. */
export type RoutingScope = string;
const inScope = (scope: RoutingScope, team: string) => scope === 'ALL' || scope === team;

/* ---------- Đọc ---------- */

export interface RoutingSummary {
  waiting: number;
  overdue: number;
  avgHandleMin: number | null;
  handledCount: number;
  casesWeek: number;
  conversationsWeek: number;
}

export const isOverdue = (c: RoutingCase, at = NOW_ISO) => (c.status === 'NEW' || c.status === 'IN_PROGRESS') && c.dueAt < at;

export async function fetchCases(scope: RoutingScope): Promise<{ cases: RoutingCase[]; summary: RoutingSummary }> {
  await wait();
  const cases = store.filter((c) => inScope(scope, c.team)).map((c) => ({ ...c }));
  const weekFrom = toIso(new Date(NOW.getTime() - 7 * 24 * 60 * 60_000));
  const week = cases.filter((c) => c.createdAt >= weekFrom);
  const handled = week.filter((c) => c.answeredAt);
  const teams = scope === 'ALL' ? Object.keys(AI_CONVERSATIONS) : [scope];
  return {
    cases,
    summary: {
      waiting: cases.filter((c) => c.status === 'NEW' || c.status === 'IN_PROGRESS').length,
      overdue: cases.filter((c) => isOverdue(c)).length,
      avgHandleMin: handled.length ? handled.reduce((s, c) => s + minutesBetween(c.createdAt, c.answeredAt!), 0) / handled.length : null,
      handledCount: handled.length,
      casesWeek: week.length,
      conversationsWeek: teams.reduce((s, t) => s + (AI_CONVERSATIONS[t] ?? 0), 0),
    },
  };
}

export async function fetchCase(id: string): Promise<RoutingCase> {
  await wait(380);
  const c = store.find((x) => x.id === id);
  if (!c) throw new RoutingError('NOT_FOUND', 'Không tìm thấy ca chuyển tuyến này.');
  return { ...c, chat: [...c.chat], events: [...c.events] };
}

/* ---------- Thao tác ---------- */

function mutable(id: string) {
  const i = store.findIndex((x) => x.id === id);
  if (i < 0) throw new RoutingError('NOT_FOUND', 'Không tìm thấy ca chuyển tuyến này.');
  return i;
}
const nowStamp = () => NOW_ISO;

export async function claimCase(id: string, staffId: string) {
  await wait(500);
  const i = mutable(id);
  const c = store[i];
  if (id === RACE_ID && !raced && staffId !== 'mai') {
    raced = true;
    store[i] = { ...c, status: 'IN_PROGRESS', claimedBy: 'mai', claimedAt: nowStamp(), events: [...c.events, { at: nowStamp(), text: 'Nhận ca', by: name('mai') }] };
    throw new RoutingError('CONFLICT', `${name('mai')} vừa nhận ca này trước bạn. Danh sách đã được cập nhật.`);
  }
  if (c.status !== 'NEW') throw new RoutingError('CONFLICT', `Ca này đã được ${name(c.claimedBy) || 'người khác'} nhận.`);
  store[i] = { ...c, status: 'IN_PROGRESS', claimedBy: staffId, claimedAt: nowStamp(), events: [...c.events, { at: nowStamp(), text: 'Nhận ca', by: name(staffId) }] };
}

export async function replyCase(id: string, staffId: string, text: string) {
  await wait(700);
  const i = mutable(id);
  const c = store[i];
  if (c.claimedBy !== staffId) throw new RoutingError('FORBIDDEN', 'Chỉ người đã nhận ca mới gửi được trả lời.');
  if (c.status === 'DONE') throw new RoutingError('CONFLICT', 'Ca đã hoàn tất, không gửi thêm trả lời.');
  if (text.trim().length < 10) throw new RoutingError('INVALID', 'Nội dung trả lời quá ngắn.');
  const at = nowStamp();
  store[i] = {
    ...c,
    status: 'ANSWERED',
    answeredAt: c.answeredAt ?? at,
    chat: [...c.chat, { from: 'officer', at, text: text.trim(), by: staffId }],
    events: [...c.events, { at, text: 'Trả lời hộ', by: name(staffId) }, { at, text: 'Đã báo kết quả cho hộ qua iHanoi' }],
  };
}

export async function completeCase(id: string, staffId: string) {
  await wait(450);
  const i = mutable(id);
  const c = store[i];
  if (c.claimedBy !== staffId) throw new RoutingError('FORBIDDEN', 'Chỉ người đã nhận ca mới đánh dấu hoàn tất được.');
  if (c.status === 'DONE') return;
  store[i] = { ...c, status: 'DONE', doneAt: nowStamp(), events: [...c.events, { at: nowStamp(), text: 'Đánh dấu hoàn tất', by: name(staffId) }] };
}

/* ---------- Chuông báo ---------- */

export type BellKind = 'ESCALATION' | 'OVERDUE' | 'THRESHOLD';
export interface BellItem {
  id: string;
  kind: BellKind;
  at: string;
  title: string;
  taxpayer: Taxpayer;
  caseId?: string;
}

// Dấu hiệu bất thường (đề xuất): hộ chuyển sang quá hạn hoặc doanh thu vượt ngưỡng dùng hóa đơn, trong 24 giờ qua.
interface AbnormalSeed { id: string; kind: 'OVERDUE' | 'THRESHOLD'; at: string; taxpayerId: number }
function buildAbnormal(): AbnormalSeed[] {
  const r = rng(24102026);
  const out: AbnormalSeed[] = [];
  const isOver = (t: Taxpayer) => t.filePriority === 'OVERDUE' || t.payPriority === 'OVERDUE';
  const push = (id: number, kind: 'OVERDUE' | 'THRESHOLD') => {
    const at = toIso(new Date(NOW.getTime() - Math.round(20 + r() * 22 * 60) * 60_000));
    out.push({ id: `b-${kind}-${id}`, kind, at, taxpayerId: id });
  };
  // Một NNT minh họa của Tổ 1 cho mỗi loại.
  const named = [0, 1, 2, 3, 4];
  const over = named.find((id) => isOver(taxpayers[id]));
  if (over !== undefined) push(over, 'OVERDUE');
  push(named.find((id) => id !== over) ?? 3, 'THRESHOLD');
  for (let k = 0; k < 14; k++) {
    const id = 5 + Math.floor(r() * (taxpayers.length - 5));
    const t = taxpayers[id];
    if (k % 2 === 0 && isOver(t)) push(id, 'OVERDUE');
    else if (k % 2 === 1) push(id, 'THRESHOLD');
  }
  return out;
}
const ABNORMAL = buildAbnormal();

function abnormalTitle(kind: BellKind, t: Taxpayer) {
  if (kind === 'THRESHOLD') return 'Doanh thu lũy kế vượt ngưỡng phải dùng hóa đơn điện tử';
  return t.payPriority === 'OVERDUE' ? 'Chuyển sang quá hạn nộp thuế' : 'Chuyển sang quá hạn khai thuế';
}

export async function fetchBell(scope: RoutingScope): Promise<BellItem[]> {
  await wait(420);
  const from = toIso(new Date(NOW.getTime() - 24 * 60 * 60_000));
  const esc: BellItem[] = store
    .filter((c) => inScope(scope, c.team) && c.createdAt >= from)
    .map((c) => ({ id: `b-case-${c.id}`, kind: 'ESCALATION', at: c.createdAt, title: `${KIND_SHORT[c.kind]}: ${c.topic}`, taxpayer: taxpayers[c.taxpayerId], caseId: c.id }));
  const abn: BellItem[] = ABNORMAL.filter((a) => a.at >= from && inScope(scope, teamOfTaxpayer(a.taxpayerId))).map((a) => ({
    id: a.id,
    kind: a.kind,
    at: a.at,
    title: abnormalTitle(a.kind, taxpayers[a.taxpayerId]),
    taxpayer: taxpayers[a.taxpayerId],
  }));
  return [...esc, ...abn].sort((a, b) => (a.at < b.at ? 1 : -1));
}

/* ---------- Trạng thái đã đọc (theo tài khoản, trong phiên) ---------- */

const readStore = new Map<string, Set<string>>();
const readSubs = new Set<() => void>();
let readVersion = 0;
export const subscribeRead = (cb: () => void) => (readSubs.add(cb), () => void readSubs.delete(cb));
export const readSnapshot = () => readVersion;
export const isRead = (user: string, id: string) => !!readStore.get(user)?.has(id);
export function markRead(user: string, ids: string[]) {
  const set = readStore.get(user) ?? new Set<string>();
  ids.forEach((i) => set.add(i));
  readStore.set(user, set);
  readVersion++;
  readSubs.forEach((f) => f());
}
