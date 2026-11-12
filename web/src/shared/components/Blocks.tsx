import { Button } from '@/shared/ui/button';
import type { CSSProperties, ReactNode } from 'react';
import { dmyhm } from '@/shared/lib/format';

export function Panel({ title, sub, extra, children, className, style, id }: { title?: ReactNode; sub?: ReactNode; extra?: ReactNode; children: ReactNode; className?: string; style?: CSSProperties; id?: string }) {
  return (
    <section className={`dashboard-card dashboard-card--static panel${className ? ` ${className}` : ''}`} style={style} aria-labelledby={id}>
      {(title || extra) && (
        <div className="panel__head">
          <div>
            {title && <h2 className="panel__title" id={id}>{title}</h2>}
            {sub && <p className="panel__sub">{sub}</p>}
          </div>
          {extra}
        </div>
      )}
      <div className="panel__body">{children}</div>
    </section>
  );
}

/** Lỗi tại khối bị ảnh hưởng, không xóa các khối khác. */
export function BlockError({ message, lastGood, onRetry }: { message: string; lastGood?: string; onRetry: () => void }) {
  return (
    <div className="block-error" role="alert">
      <span>
        {message}
        {lastGood ? ` Lần cập nhật được gần nhất: ${dmyhm(lastGood)}.` : ''}
      </span>
      <Button onClick={onRetry} size="sm" variant="outline">
        Thử lại
      </Button>
    </div>
  );
}

export function BlockEmpty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="block-empty">
      <span>{children}</span>
      {action}
    </div>
  );
}

export function StaleNotice({ at }: { at: string }) {
  return (
    <div className="notice" role="status">
      <span>
        <b>Dữ liệu chưa cập nhật.</b> Số liệu dưới đây tính tới {dmyhm(at)}; lần làm mới gần nhất chưa lấy được dữ liệu mới.
      </span>
    </div>
  );
}

/** Thanh xám giữ đúng kích thước giá trị thật trong lúc tải — không shimmer, không nhảy bố cục. */
export function Skel({ w, h = 14, className }: { w: number | string; h?: number; className?: string }) {
  return <span className={className ? `skel ${className}` : 'skel'} style={{ width: w, height: h }} aria-hidden="true" />;
}
