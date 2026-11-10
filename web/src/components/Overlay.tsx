import { ArrowLeft } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useBreakpoint } from '../lib/useMedia';
import { useHideNavWhile } from '../shell/overlay';

/**
 * Chi tiết trong cùng màn: sheet bên phải trên desktop/tablet, toàn màn hình có nút quay lại trên mobile.
 * Đóng trả về đúng vị trí cũ vì danh sách bên dưới không bị unmount.
 */
export default function Overlay({
  open,
  onClose,
  title,
  footer,
  width = 640,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  footer?: ReactNode;
  width?: number;
  children: ReactNode;
}) {
  const bp = useBreakpoint();
  const mobile = bp === 'mobile';
  useHideNavWhile(open && mobile);
  // Chi tiết mở qua URL (không qua Trigger của Radix) nên tự nhớ phần tử đang focus lúc mở để trả focus khi đóng.
  // onOpenAutoFocus chạy ngay trước khi Radix chuyển focus vào panel, nên lúc đó vẫn là nút vừa bấm.
  const returnTo = useRef<HTMLElement | null>(null);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        onOpenAutoFocus={() => {
          returnTo.current = document.activeElement as HTMLElement | null;
        }}
        onCloseAutoFocus={(e) => {
          // Trả focus nhưng KHÔNG cuộn trang: bấm chuột vào dòng thì phần tử đang focus thường là khung chứa danh sách
          // (vùng nội dung tab có tabIndex), focus() mặc định sẽ cuộn khung đó vào tầm nhìn → trang giật khi đóng chi tiết.
          e.preventDefault();
          const el = returnTo.current;
          if (el && el.isConnected && el !== document.body) el.focus({ preventScroll: true });
        }}
        side="right"
        showCloseButton={!mobile}
        className="gap-0 p-0 sm:max-w-none"
        style={{ width: mobile ? '100vw' : Math.min(width, window.innerWidth - 48), maxWidth: '100vw' }}
      >
        <SheetHeader className={mobile ? 'flex-row items-center gap-1 border-b px-2 py-2' : 'border-b px-6 py-4'}>
          {mobile && (
            <Button variant="ghost" size="icon-lg" onClick={onClose} aria-label="Quay lại" className="size-11">
              <ArrowLeft />
            </Button>
          )}
          <SheetTitle className="text-base">{title}</SheetTitle>
          <SheetDescription className="sr-only">Chi tiết mở trong cùng màn, đóng để trở lại danh sách.</SheetDescription>
        </SheetHeader>
        <div className={`flex-1 overflow-y-auto ${mobile ? 'p-4' : 'p-6'}`}>{children}</div>
        {footer && <SheetFooter className="border-t px-6 py-3">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
