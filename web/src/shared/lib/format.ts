// Định dạng theo quy ước Việt Nam: 10.000 · 55,9% · dd/MM/yyyy · 24h.
const intFmt = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const pctFmt = new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const num = (n: number) => intFmt.format(n);
export const pct = (part: number, whole: number) => (whole === 0 ? '—' : `${pctFmt.format((part / whole) * 100)}%`);

const pad = (n: number) => String(n).padStart(2, '0');

/** Ngày lưu dạng ISO "2026-10-28" hoặc "2026-10-28T09:15". */
export function dmy(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
export function dm(iso: string) {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}`;
}
export function hm(iso: string) {
  return iso.slice(11, 16);
}
export function dmyhm(iso: string) {
  return `${dmy(iso)}, ${hm(iso)}`;
}

/** Thời lượng từ số phút: "5 giờ 12 phút", "4 phút", "45 giây". */
export function durationParts(min: number): { value: string; unit: string }[] {
  if (min < 1) return [{ value: String(Math.round(min * 60)), unit: 'giây' }];
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return [{ value: String(m), unit: 'phút' }];
  return m ? [{ value: String(h), unit: 'giờ' }, { value: String(m), unit: 'phút' }] : [{ value: String(h), unit: 'giờ' }];
}
export const duration = (min: number) => durationParts(min).map((p) => `${p.value} ${p.unit}`).join(' ');

/** "HH:mm" → phút trong ngày. */
export function toMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
export function fromMinutes(min: number) {
  return `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
}
export { pad };
