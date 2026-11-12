/* ---------- Nội dung minh họa của bản đẩy và nội dung đầy đủ ---------- */

export function PushPreview({ title, body }: { title: string; body: string }) {
  return (
    <div className="push-frame" aria-label="Bản đẩy trên iHanoi">
      <div className="push-frame__bar">
        <span>09:16</span>
        <span>Thứ Tư, 28/10</span>
      </div>
      <div className="push-card">
        <span className="push-card__app">
          <i aria-hidden="true" /> iHanoi · bây giờ
        </span>
        <b>{title}</b>
        {body}
      </div>
    </div>
  );
}
