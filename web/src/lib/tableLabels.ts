/**
 * Gắn data-label cho ô bảng nhỏ (.mini-table) từ tiêu đề cột, để trên mobile mỗi ô hiện "nhãn – giá trị" khi bảng xếp dọc.
 * Ô đã có data-label thì giữ nguyên. Chạy lại khi nội dung trong main đổi.
 */
export function watchTableLabels(root: HTMLElement) {
  const label = () => {
    root.querySelectorAll<HTMLTableElement>('table.mini-table').forEach((t) => {
      const heads = [...t.querySelectorAll('thead tr:last-child th')].map((th) => th.textContent?.trim() ?? '');
      if (!heads.length) return;
      t.querySelectorAll('tbody tr').forEach((tr) => {
        [...tr.children].forEach((cell, i) => {
          if (cell.tagName === 'TD' && !cell.hasAttribute('data-label') && heads[i]) cell.setAttribute('data-label', heads[i]);
        });
      });
    });
  };
  label();
  let raf = 0;
  const mo = new MutationObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(label);
  });
  mo.observe(root, { childList: true, subtree: true });
  return () => {
    cancelAnimationFrame(raf);
    mo.disconnect();
  };
}
