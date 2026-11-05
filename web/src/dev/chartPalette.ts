import { useSyncExternalStore } from 'react';
import { C } from '../theme';

// Công cụ tạm: chỉnh màu biểu đồ trực tiếp trên web và áp dụng chung cho mọi người.
// Màu chung lưu ở server (GET/PUT /api/chart-colors, file web/chart-colors.json).
// Chỉnh trong bảng là xem trước trên máy mình; bấm "Áp dụng" mới ghi cho mọi người.
// Khi chốt màu thì chép giá trị vào theme.ts rồi gỡ công cụ này.
export const PALETTE_TOOL = false;

export type ChartColorKey = 'bar' | 'barDim' | 'barHover' | 'sent' | 'overdue' | 'dueSoon' | 'dueSoonInk' | 'inTerm' | 'inTermInk';
type Colors = Record<ChartColorKey, string>;

export const CHART_COLOR_GROUPS: { title: string; items: { key: ChartColorKey; label: string }[] }[] = [
  {
    title: 'Thông báo phát sinh theo ngày',
    items: [
      { key: 'bar', label: 'Cột tổng phát sinh' },
      { key: 'barDim', label: 'Cột ngày không chọn' },
      { key: 'barHover', label: 'Cột khi rê chuột' },
      { key: 'sent', label: 'Đường đã gửi Noti' },
    ],
  },
  {
    title: 'NNT theo loại nghĩa vụ',
    items: [
      { key: 'overdue', label: 'Quá hạn' },
      { key: 'dueSoon', label: 'Sắp hạn' },
      { key: 'dueSoonInk', label: 'Chữ trên Sắp hạn' },
      { key: 'inTerm', label: 'Còn trong hạn' },
      { key: 'inTermInk', label: 'Chữ trên Còn trong hạn' },
    ],
  },
];

const API = '/api/chart-colors';
const HEX = /^#[0-9a-f]{6}$/i;
const KEYS = CHART_COLOR_GROUPS.flatMap((g) => g.items.map((i) => i.key));
const current = (): Colors => Object.fromEntries(KEYS.map((k) => [k, C[k]])) as Colors;
const same = (a: Colors, b: Colors) => KEYS.every((k) => a[k].toLowerCase() === b[k].toLowerCase());

/** Màu trong code (theme.ts). */
export const CHART_DEFAULTS = current();

export type SyncStatus = 'loading' | 'ready' | 'saving' | 'offline';
const state = {
  /** Màu chung đang áp dụng cho mọi người. */
  shared: { ...CHART_DEFAULTS } as Colors,
  updatedAt: null as string | null,
  status: 'loading' as SyncStatus,
  version: 0,
};

const subs = new Set<() => void>();
const emit = () => {
  state.version++;
  subs.forEach((f) => f());
};

const apply = (colors: Colors) => Object.assign(C, colors);
/** Có chỉnh trên máy này mà chưa áp dụng cho mọi người. */
export const hasDraft = () => !same(current(), state.shared);
export const sharedColors = () => state.shared;
export const syncInfo = () => ({ status: state.status, updatedAt: state.updatedAt });

function take(data: { colors?: Partial<Colors>; updatedAt?: string | null }) {
  const next = { ...CHART_DEFAULTS };
  for (const k of KEYS) {
    const v = data.colors?.[k];
    if (typeof v === 'string' && HEX.test(v)) next[k] = v;
  }
  return { next, updatedAt: data.updatedAt ?? null };
}

async function pull() {
  try {
    const res = await fetch(API, { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const { next, updatedAt } = take(await res.json());
    const draft = hasDraft();
    const changed = !same(next, state.shared) || updatedAt !== state.updatedAt;
    state.shared = next;
    state.updatedAt = updatedAt;
    // Không ghi đè bản đang chỉnh dở của người dùng.
    if (!draft) apply(next);
    if (changed || state.status !== 'ready') {
      state.status = 'ready';
      emit();
    }
  } catch {
    if (state.status !== 'offline') {
      state.status = 'offline';
      emit();
    }
  }
}

if (PALETTE_TOOL && typeof window !== 'undefined') {
  void pull();
  // Lấy màu người khác vừa áp dụng.
  window.setInterval(() => document.visibilityState === 'visible' && void pull(), 10_000);
}

/** Xem trước trên máy này. */
export function setChartColor(key: ChartColorKey, value: string) {
  C[key] = value;
  emit();
}

/** Ghi màu đang xem trước cho mọi người. */
export async function applyForEveryone() {
  state.status = 'saving';
  emit();
  try {
    const res = await fetch(API, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ colors: current() }) });
    if (!res.ok) throw new Error(String(res.status));
    const { next, updatedAt } = take(await res.json());
    state.shared = next;
    state.updatedAt = updatedAt;
    apply(next);
    state.status = 'ready';
    emit();
    return true;
  } catch {
    state.status = 'offline';
    emit();
    return false;
  }
}

/** Bỏ bản xem trước, quay về màu chung. */
export function discardDraft() {
  apply(state.shared);
  emit();
}

/** Xem trước màu trong code (chưa áp dụng cho ai cho tới khi bấm Áp dụng). */
export function previewDefaults() {
  apply(CHART_DEFAULTS);
  emit();
}

/** Đoạn mã để dán vào theme.ts. */
export function chartColorsSnippet() {
  return KEYS.map((k) => `  ${k}: '${C[k].toUpperCase()}',`).join('\n');
}

/** Biểu đồ và bảng màu gọi hook này để vẽ lại khi màu đổi. */
export function useChartColorVersion() {
  return useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => state.version,
  );
}
