import { Download } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { IconButton } from './IconButton';

/** Nút xuất tệp Excel: màu xanh lá nhận diện Excel để người dùng biết trước loại tệp sẽ tải về. */
export function ExcelButton({ label, onExport, disabled, className }: {
  label: string;
  onExport: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <IconButton
      icon={Download}
      variant="default"
      className={`excel-btn${className ? ` ${className}` : ''}`}
      disabled={disabled}
      loading={busy}
      label={busy ? 'Đang xuất tệp Excel…' : label}
      onClick={async () => {
        setBusy(true);
        try {
          await onExport();
        } catch {
          toast.error('Không xuất được tệp Excel. Thử lại sau.');
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
