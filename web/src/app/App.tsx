import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig, domAnimation, m } from 'motion/react';
import { lazy, Suspense } from 'react';
import { Toaster } from '@/shared/ui/sonner';
import { DemoProvider } from '@/shared/demo/DemoProvider';
import { AuthGate } from '@/features/auth/AuthGate';
import { useAuthTransition } from '@/shared/lib/authTransition';
import { GuardProvider } from '@/app/shell/guard';
import AppShell from '@/app/shell/AppShell';
import { useRoute } from '@/shared/lib/router';
import { PalettePanel } from '@/dev/PalettePanel';
import { DUR, tween } from '@/shared/lib/motion';
// Tách gói theo route: ECharts chỉ tải ở màn Thống kê.
const StatsPage = lazy(() => import('@/features/stats/StatsPage'));
const ConfigPage = lazy(() => import('@/features/settings/SettingsWorkspace'));
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage'));
const SendPage = lazy(() => import('@/features/notify/NotificationWorkspace'));
const HkdPage = lazy(() => import('@/features/hkd/HkdPage'));
const RoutingPage = lazy(() => import('@/features/routing/RoutingPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 0, refetchOnWindowFocus: false } },
});

function Routes() {
  const { path } = useRoute();
  // Lúc chuyển cảnh đăng nhập: nội dung hiện sẵn dưới lớp che, không fade để không chạy chồng với reveal.
  const quiet = useAuthTransition();
  // Đổi màn: nội dung hiện dần 160ms (chỉ độ mờ, không trượt) để phản hồi thao tác bấm điều hướng.
  return (
    <Suspense fallback={<div className="page-skel" aria-busy="true" aria-label="Đang tải màn hình" />}>
      <m.div key={path} initial={quiet ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={tween(DUR.state)}>
        {path === '/chuyen-tuyen' ? <RoutingPage /> : path === '/thiet-lap' ? <ConfigPage /> : path === '/tai-khoan' ? <AccountsPage /> : path === '/gui-thong-bao' ? <SendPage /> : path === '/quan-ly-hkd' ? <HkdPage /> : <StatsPage />}
      </m.div>
    </Suspense>
  );
}

export default function App() {
  return (
    // LazyMotion + m: chỉ nạp bộ tính năng animation DOM cơ bản (opacity, transform, hover/tap, exit), nhẹ hơn motion.* đầy đủ.
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={queryClient}>
        <DemoProvider>
          <AuthGate>
            <GuardProvider>
              <AppShell>
                <Routes />
              </AppShell>
            </GuardProvider>
          </AuthGate>
        </DemoProvider>
      </QueryClientProvider>
      <PalettePanel />
      <Toaster position="top-center" richColors={false} />
    </MotionConfig>
    </LazyMotion>
  );
}
