import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { noticeService } from '@/mock';
import type { Notice } from '@/mock/types';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { PortalButton } from './ui';

export default function NoticeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      if (!id) return;
      setLoading(true);
      try {
        setNotice(await noticeService.getNotice(id));
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const attachments = (n: Notice) =>
    n.attachments?.length ? (
      <div className="mt-8">
        <h3 className="mb-3 font-bold">附件</h3>
        <div className="flex flex-wrap gap-3">
          {n.attachments.map((att, i) => (
            <a
              key={i}
              href={att.url}
              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-surface px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5"
            >
              <span className="material-symbols-outlined text-base">download</span>
              {att.name}
            </a>
          ))}
        </div>
      </div>
    ) : null;

  if (loading) {
    const spin = (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
    if (isMobile) {
      return (
        <MobileSubPageScaffold title="公告" contentClassName="pt-2">
          {spin}
        </MobileSubPageScaffold>
      );
    }
    return spin;
  }

  if (!notice) {
    const empty = (
      <div className="py-16 text-center">
        <p className="text-on-surface-variant">公告不存在</p>
        {!isMobile ? (
          <PortalButton variant="primary" size="md" className="mt-6" onClick={() => navigate(-1)}>
            返回
          </PortalButton>
        ) : null}
      </div>
    );
    if (isMobile) {
      return (
        <MobileSubPageScaffold title="公告" onBack={() => navigate('/user/home')} contentClassName="pt-2">
          {empty}
        </MobileSubPageScaffold>
      );
    }
    return empty;
  }

  if (isMobile) {
    return (
      <MobileSubPageScaffold title={notice.title} contentClassName="pt-3 pb-10">
        <h1 className="sr-only">{notice.title}</h1>
        <article className="hall-panel rounded-[2rem] p-5">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-on-surface-variant">
            <span className="font-medium text-on-surface">{notice.publisher}</span>
            <span className="tabular-nums">{notice.createTime}</span>
          </div>
          <hr className="my-6 border-outline-variant/30" />
          <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-on-surface">
            {notice.content}
          </div>
          {attachments(notice)}
        </article>
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PortalButton variant="link" size="md" className="mb-6 p-0 text-sm" onClick={() => navigate(-1)}>
        ← 返回
      </PortalButton>
      <article className="hall-panel rounded-[2rem] p-8">
        <p className="hall-section-label text-xs font-black">NOTICE DESK</p>
        <h1 className="mt-2 font-headline text-3xl font-black text-on-surface">{notice.title}</h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-on-surface-variant">
          <span>{notice.publisher}</span>
          <span>{notice.createTime}</span>
        </div>
        <hr className="my-8 border-outline-variant/30" />
        <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-on-surface">
          {notice.content}
        </div>
        {attachments(notice)}
      </article>
    </div>
  );
}
