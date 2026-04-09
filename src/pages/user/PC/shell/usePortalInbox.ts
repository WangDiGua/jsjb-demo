import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { InboxItem } from '@/mock/types';
import { notificationService } from '@/mock/services';
import { useAppStore } from '@/store';
import { portalToast } from './portalFeedbackStore';

export function usePortalInbox() {
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [unread, setUnread] = useState(0);

  const refreshInbox = useCallback(async () => {
    if (!currentUser?.id) {
      setInbox([]);
      setUnread(0);
      return;
    }
    try {
      const [list, n] = await Promise.all([
        notificationService.list(currentUser),
        notificationService.unreadCount(currentUser),
      ]);
      setInbox(list);
      setUnread(n);
    } catch (e) {
      portalToast.error(e instanceof Error ? e.message : '消息加载失败');
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void refreshInbox();
    const fn = () => void refreshInbox();
    window.addEventListener('jsjb-mock-updated', fn);
    return () => window.removeEventListener('jsjb-mock-updated', fn);
  }, [refreshInbox]);

  const openInboxItem = async (item: InboxItem) => {
    try {
      await notificationService.markRead(item.id, currentUser);
      await refreshInbox();
      if (item.href) navigate(item.href);
    } catch (e) {
      portalToast.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  return { inbox, unread, refreshInbox, openInboxItem, currentUser };
}
