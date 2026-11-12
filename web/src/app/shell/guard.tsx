import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { GuardCtx, type GuardApi } from '@/shared/lib/guardContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';


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
    <GuardCtx.Provider value={{ setGuard, confirmLeave }}>
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
    </GuardCtx.Provider>
  );
}
