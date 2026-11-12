import type { ReactNode } from 'react';
import { GROUP_LABEL, type Tone } from '@/shared/lib/status';

/** Pill trạng thái: nền nhạt, chữ đậm cùng sắc — trạng thái luôn đọc được bằng chữ, không dựa riêng vào màu. */
export function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

export function GroupTags({ groups }: { groups: string[] }) {
  return (
    <span className="group-tags">{groups.map((g) => GROUP_LABEL[g]).join(', ')}</span>
  );
}

export function Pill<K extends string>({ map, value }: { map: Record<K, { label: string; tone: Tone }>; value: K }) {
  const m = map[value];
  return <StatusPill tone={m.tone}>{m.label}</StatusPill>;
}
