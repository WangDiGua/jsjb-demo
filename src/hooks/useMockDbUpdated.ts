import { useEffect } from 'react';

/**
 * `saveDb()` 会派发 `jsjb-mock-updated`，多 Tab / 详情与管理端写入后，
 * 列表与统计页应刷新以免与 `getDb()` 内存态不一致。
 */
export function useMockDbUpdated(onUpdate: () => void) {
  useEffect(() => {
    const run = () => onUpdate();
    window.addEventListener('jsjb-mock-updated', run);
    return () => window.removeEventListener('jsjb-mock-updated', run);
  }, [onUpdate]);
}
