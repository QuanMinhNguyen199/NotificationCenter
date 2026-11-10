import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useBreakpoint } from '../lib/useMedia';

/** Nội dung phụ vẫn ở cùng màn; điện thoại mở khi cần, desktop giữ nguyên. */
export function MobileDisclosure({ label, children }: { label: string; children: ReactNode }) {
  const [visited, setVisited] = useState(false);
  if (useBreakpoint() !== 'mobile') return <>{children}</>;
  return <details className="mobile-disclosure" onToggle={(event) => { if (event.currentTarget.open) setVisited(true); }}>
    <summary><span>{label}</span><ChevronDown aria-hidden="true" /></summary>
    <div className="mobile-disclosure__body">{visited && children}</div>
  </details>;
}
