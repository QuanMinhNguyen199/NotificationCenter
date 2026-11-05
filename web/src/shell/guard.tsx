import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Chặn rời màn khi còn thay đổi chưa lưu: hỏi "Tiếp tục chỉnh sửa / Bỏ thay đổi", không tự lưu.
interface GuardApi {
  /** Màn đang sửa đăng ký trạng thái "bẩn" và hàm bỏ thay đổi. */
  setGuard: (g: { dirty: boolean; discard: () => void } | null) => void;
  /** Gọi trước khi rời màn; proceed chạy ngay nếu không có thay đổi hoặc sau khi người dùng chọn bỏ. */
  confirmLeave: (proceed: () => void) => void;
}

const Ctx = createContext<GuardApi | null>(null);

export function GuardProvider({ children }: { children: ReactNode }) {
  const ref = useRef<{ dirty: boolean; discard: () => void } | null>(null);
  const [pending, setPending] = useState<(() => void) | null>(null);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (ref.current?.dirty) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const setGuard = useCallback<GuardApi['setGuard']>((g) => {
    ref.current = g;
  }, []);

  const confirmLeave = useCallback<GuardApi['confirmLeave']>((proceed) => {
    if (!ref.current?.dirty) return proceed();
    setPending(() => proceed);
  }, []);

  return (
    <Ctx.Provider value={{ setGuard, confirmLeave }}>
      {children}
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Có thay đổi chưa lưu</AlertDialogTitle>
            <AlertDialogDescription>Các trường đã sửa sẽ bị bỏ nếu bạn tiếp tục. Thay đổi chưa được áp dụng cho hệ thống.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus>Tiếp tục chỉnh sửa</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                ref.current?.discard();
                const go = pending;
                setPending(null);
                go?.();
              }}
            >
              Bỏ thay đổi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx.Provider>
  );
}

export function useGuard() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGuard cần GuardProvider');
  return v;
}
