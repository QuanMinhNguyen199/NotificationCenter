import { useState } from 'react';
import { Palette, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { C } from '../theme';
import {
  CHART_COLOR_GROUPS,
  PALETTE_TOOL,
  applyForEveryone,
  chartColorsSnippet,
  discardDraft,
  hasDraft,
  previewDefaults,
  setChartColor,
  sharedColors,
  syncInfo,
  useChartColorVersion,
  type ChartColorKey,
} from './chartPalette';

const HEX = /^#[0-9a-f]{6}$/i;

function ColorRow({ k, label }: { k: ChartColorKey; label: string }) {
  const value = C[k];
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setText(value);
  }
  const changed = value.toLowerCase() !== sharedColors()[k].toLowerCase();
  return (
    <div className="palette__row">
      <label className="palette__label" htmlFor={`pal-${k}`}>
        {label}
        {changed && <span className="palette__changed">chưa áp dụng</span>}
      </label>
      <input id={`pal-${k}`} type="color" className="palette__swatch" value={value} onChange={(e) => setChartColor(k, e.target.value)} />
      <input
        className="palette__hex num"
        aria-label={`Mã màu ${label}`}
        value={text}
        maxLength={7}
        spellCheck={false}
        onChange={(e) => {
          const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
          setText(v);
          if (HEX.test(v)) setChartColor(k, v);
        }}
      />
    </div>
  );
}

/** Bảng chỉnh màu biểu đồ dùng chung (tạm thời). */
export function PalettePanel() {
  useChartColorVersion();
  const [open, setOpen] = useState(false);
  if (!PALETTE_TOOL) return null;
  const { status, updatedAt } = syncInfo();
  const draft = hasDraft();

  const save = async () => {
    if (await applyForEveryone()) toast.success('Đã áp dụng màu cho mọi người đang mở trang');
    else toast.error('Không lưu được màu lên máy chủ. Màu vẫn đang xem trước trên máy này.');
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(chartColorsSnippet());
      toast.success('Đã sao chép mã màu để dán vào theme.ts');
    } catch {
      toast.error('Trình duyệt không cho sao chép.');
    }
  };

  if (!open) {
    return (
      <Button variant="outline" className="palette-toggle" onClick={() => setOpen(true)} aria-expanded={false} aria-controls="palette-panel">
        <Palette aria-hidden="true" />
        Màu biểu đồ
      </Button>
    );
  }

  const statusText =
    status === 'loading'
      ? 'Đang tải màu chung…'
      : status === 'saving'
        ? 'Đang áp dụng…'
        : status === 'offline'
          ? 'Không kết nối được máy chủ màu; thay đổi chỉ xem trên máy này.'
          : draft
            ? 'Đang xem trước trên máy này. Bấm Áp dụng để mọi người cùng thấy.'
            : updatedAt
              ? `Màu chung, cập nhật ${new Date(updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}.`
              : 'Đang dùng màu mặc định trong code.';

  return (
    <section className="palette" id="palette-panel" role="dialog" aria-label="Chỉnh màu biểu đồ">
      <header className="palette__head">
        <h2 className="palette__title">Màu biểu đồ</h2>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Đóng bảng màu">
          <X aria-hidden="true" />
        </Button>
      </header>
      <p className="palette__status" aria-live="polite">{statusText}</p>
      <div className="palette__body">
        {CHART_COLOR_GROUPS.map((g) => (
          <fieldset key={g.title} className="palette__group">
            <legend className="palette__legend">{g.title}</legend>
            {g.items.map((i) => (
              <ColorRow key={i.key} k={i.key} label={i.label} />
            ))}
          </fieldset>
        ))}
        <div className="palette__extra">
          <Button variant="ghost" size="sm" onClick={previewDefaults}>
            Xem màu mặc định
          </Button>
          <Button variant="ghost" size="sm" onClick={copy}>
            Sao chép mã màu
          </Button>
        </div>
      </div>
      <footer className="palette__foot">
        <Button variant="outline" onClick={discardDraft} disabled={!draft}>
          Hoàn tác
        </Button>
        <Button onClick={save} disabled={!draft || status === 'saving'}>
          Áp dụng cho mọi người
        </Button>
      </footer>
    </section>
  );
}
