import type { InboxItem, User } from './types';
import { canAccessAdmin } from './roles';

/**
 * 管理端账号：可查看派发到本人 userId 下的全部分组站内信。
 * 门户师生：仅可查看与本人诉求进度相关的消息，不包含「新诉求待处理」、待审核/督办等办理端站内信。
 */
export function isInboxItemVisibleToViewer(item: InboxItem, viewer: User): boolean {
  if (item.userId !== viewer.id) return false;
  if (canAccessAdmin(viewer.role)) return true;

  switch (item.type) {
    case 'appeal_reply':
    case 'appeal_return':
      return true;
    case 'appeal_pending':
      return false;
    case 'system': {
      const h = item.href?.trim() ?? '';
      return !h || h.startsWith('/user/');
    }
    default:
      return false;
  }
}

export function filterInboxForViewer(items: InboxItem[], viewer: User): InboxItem[] {
  return items.filter((i) => isInboxItemVisibleToViewer(i, viewer));
}
