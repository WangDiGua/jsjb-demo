/** 智能助理 → 发起诉求：用 sessionStorage 传递预填字段（避免 URL 长度限制） */

export const APPEAL_PREFILL_STORAGE_KEY = 'jsjb_appeal_prefill_v1';

export type AppealPrefillPayload = {
  title: string;
  content: string;
  type?: string;
  departmentId?: string;
};

export function setAppealPrefill(p: AppealPrefillPayload): void {
  try {
    sessionStorage.setItem(
      APPEAL_PREFILL_STORAGE_KEY,
      JSON.stringify({
        title: p.title,
        content: p.content,
        type: p.type,
        departmentId: p.departmentId,
        ts: Date.now(),
      }),
    );
  } catch {
    /* quota / 隐私模式等 */
  }
}

/** 读取并清除，避免返回页面时重复应用 */
export function consumeAppealPrefill(): AppealPrefillPayload | null {
  try {
    const raw = sessionStorage.getItem(APPEAL_PREFILL_STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(APPEAL_PREFILL_STORAGE_KEY);
    const o = JSON.parse(raw) as AppealPrefillPayload & { ts?: number };
    const title = typeof o.title === 'string' ? o.title : '';
    const content = typeof o.content === 'string' ? o.content : '';
    if (!title.trim() && !content.trim()) return null;
    return {
      title,
      content,
      type: typeof o.type === 'string' ? o.type : undefined,
      departmentId: typeof o.departmentId === 'string' ? o.departmentId : undefined,
    };
  } catch {
    return null;
  }
}

export function firstLineTitle(text: string, max = 100): string {
  const line = text.trim().split(/\n/)[0]?.trim() ?? '';
  if (!line) return '';
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}
