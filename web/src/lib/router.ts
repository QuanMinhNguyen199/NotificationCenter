import { useCallback, useSyncExternalStore } from 'react';

// Ba route chính, trạng thái lọc/tab/trang nằm trong query của hash để tải lại hoặc chia sẻ vẫn giữ ngữ cảnh.
export type RoutePath = '/thong-ke' | '/gui-thong-bao' | '/mau-tin' | '/kenh-gui' | '/thiet-lap' | '/tai-khoan';

export interface Route {
  path: RoutePath;
  params: URLSearchParams;
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/thong-ke';
  const [p, q = ''] = raw.split('?');
  // '/cau-hinh' là đường dẫn cũ của màn Thiết lập (đổi tên 04/11/2026), giữ để link cũ vẫn mở đúng màn.
  const known: RoutePath[] = ['/gui-thong-bao', '/mau-tin', '/kenh-gui', '/thiet-lap', '/tai-khoan'];
  const path: RoutePath = p === '/cau-hinh' ? '/thiet-lap' : known.includes(p as RoutePath) ? (p as RoutePath) : '/thong-ke';
  return { path, params: new URLSearchParams(q) };
}

let cache = parse();
let cacheKey = window.location.hash;

function snapshot() {
  if (window.location.hash !== cacheKey) {
    cacheKey = window.location.hash;
    cache = parse();
  }
  return cache;
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function buildHash(path: RoutePath, params?: URLSearchParams | Record<string, string | undefined>) {
  const sp = params instanceof URLSearchParams ? params : new URLSearchParams();
  if (params && !(params instanceof URLSearchParams)) {
    Object.entries(params).forEach(([k, v]) => v != null && v !== '' && sp.set(k, v));
  }
  const q = sp.toString();
  return `#${path}${q ? `?${q}` : ''}`;
}

export function useRoute() {
  const route = useSyncExternalStore(subscribe, snapshot, snapshot);

  const navigate = useCallback((path: RoutePath, params?: URLSearchParams | Record<string, string | undefined>, replace = false) => {
    const hash = buildHash(path, params);
    if (replace) {
      history.replaceState(null, '', hash);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } else {
      window.location.hash = hash;
    }
  }, []);

  return { ...route, navigate };
}
