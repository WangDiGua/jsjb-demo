import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import type { Appeal, Notice } from '@/mock/types';
import { adminConfigService, canAccessAdmin } from '@/mock';
import { appealService, noticeService } from '@/mock/services';
import { useAppStore } from '@/store';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';
import { resolveNoticeI18n, resolvePortalBrandingI18n } from '@/lib/metadataLocale';
import { usePortalInbox } from '@/pages/user/PC/shell/usePortalInbox';
import { NoticeCoverImage } from '@/utils/coverImage';

function timeAgo(iso: string): string {
  const t = new Date(iso.replace(/-/g, '/')).getTime();
  if (Number.isNaN(t)) return '';
  const d = Date.now() - t;
  const m = Math.floor(d / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m}分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}小时前`;
  const day = Math.floor(h / 24);
  return `${day}天前`;
}

function hotspotMeta(status: Appeal['status']) {
  switch (status) {
    case 'pending':
      return { cls: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-100', label: '待受理' };
    case 'reply_draft':
      return { cls: 'bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-100', label: '审核中' };
    case 'accepted':
    case 'processing':
      return { cls: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100', label: '进行中' };
    case 'replied':
      return { cls: 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-100', label: '已答复' };
    case 'returned':
      return { cls: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-100', label: '已退回' };
    default:
      return { cls: 'bg-surface-container-high text-on-surface-variant', label: '动态' };
  }
}

function supportHint(appeal: Appeal): { icon: string; text: string } {
  const n = 180 + (appeal.id.charCodeAt(Math.max(0, appeal.id.length - 1)) % 920);
  const icons = ['trending_up', 'group', 'equalizer'] as const;
  const idx = appeal.id.length % 3;
  return { icon: icons[idx], text: `${n.toLocaleString()}人 关注` };
}

export default function MobileHomePage() {
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const metadataDisplayLocale = usePreferencesStore((s) => s.metadataDisplayLocale);
  const [metaTick, setMetaTick] = useState(0);
  useMockDbUpdated(useCallback(() => setMetaTick((n) => n + 1), []));
  const { unread } = usePortalInbox();
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');
  const [hot, setHot] = useState<Appeal[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [mySummary, setMySummary] = useState({ pending: 0, replied: 0, withdrawn: 0 });
  const [heroSub, setHeroSub] = useState('让透明治理触手可及，您的声音对我们至关重要。');

  useEffect(() => {
    void adminConfigService.getPortalBrandingPublic().then((b) => {
      const r = resolvePortalBrandingI18n(b, metadataDisplayLocale);
      if (r.homeMotto?.trim()) {
        const m = r.homeMotto.trim();
        setHeroSub(m.length > 120 ? `${m.slice(0, 118)}…` : m);
      }
    });
  }, [metadataDisplayLocale, metaTick]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [pub, n] = await Promise.all([
          appealService.getPublicAppeals({ pageSize: 10 }),
          noticeService.getNotices(),
        ]);
        setHot(pub.data);
        setNotices(n.slice(0, 6));

        if (currentUser?.id) {
          const mine = await appealService.getMyAppeals(currentUser.id);
          const pending = mine.filter((a) =>
            ['pending', 'accepted', 'processing', 'reply_draft'].includes(a.status),
          ).length;
          const replied = mine.filter((a) => a.status === 'replied').length;
          const withdrawn = mine.filter((a) => a.status === 'withdrawn').length;
          setMySummary({ pending, replied, withdrawn });
        } else {
          setMySummary({ pending: 0, replied: 0, withdrawn: 0 });
        }
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [currentUser?.id]);

  const noticesResolved = useMemo(
    () => notices.map((n) => resolveNoticeI18n(n, metadataDisplayLocale)),
    [notices, metadataDisplayLocale, metaTick],
  );

  useEffect(() => {
    const fn = () => {
      if (!currentUser?.id) return;
      void appealService.getMyAppeals(currentUser.id).then((mine) => {
        const pending = mine.filter((a) =>
          ['pending', 'accepted', 'processing', 'reply_draft'].includes(a.status),
        ).length;
        const replied = mine.filter((a) => a.status === 'replied').length;
        const withdrawn = mine.filter((a) => a.status === 'withdrawn').length;
        setMySummary({ pending, replied, withdrawn });
      });
    };
    window.addEventListener('jsjb-mock-updated', fn);
    return () => window.removeEventListener('jsjb-mock-updated', fn);
  }, [currentUser?.id]);

  const submitSearch = () => {
    const q = searchQ.trim();
    navigate(q ? `/user/search?q=${encodeURIComponent(q)}` : '/user/search');
  };

  const showMessageHint =
    Boolean(currentUser) && (unread > 0 || mySummary.pending > 0);

  return (
    <div className="min-h-full bg-surface font-body text-on-surface antialiased">
      <header className="sticky top-0 z-40 border-b border-outline-variant/20 bg-surface/90 shadow-[0_1px_0_rgba(15,35,52,0.06)] backdrop-blur-xl m-portal-glass-header dark:border-outline-variant/25 dark:shadow-[0_1px_0_rgba(0,0,0,0.2)]">
        <div className="flex min-h-[3.5rem] w-full max-w-full items-center justify-between pb-1.5 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-0.5">
          <span className="font-headline text-[1.05rem] font-bold tracking-tight text-primary">
            兰途接诉即办
          </span>
          <div className="flex items-center gap-2">
            {currentUser && canAccessAdmin(currentUser.role) ? (
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-primary transition-colors active:bg-surface-container-high/80"
                aria-label="后台管理"
                onClick={() => navigate('/admin')}
              >
                <span className="material-symbols-outlined text-[22px] leading-none">admin_panel_settings</span>
              </button>
            ) : null}
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant transition-colors active:bg-surface-container-high/80"
              aria-label="消息"
              onClick={() => navigate(currentUser ? '/user/appeal/my' : '/user/login')}
            >
              <span className="material-symbols-outlined text-[22px] leading-none">notifications</span>
              {showMessageHint ? (
                <span
                  className="pointer-events-none absolute -right-0.5 -top-0.5 h-2.5 min-w-2.5 rounded-full bg-red-500 shadow-sm ring-2 ring-surface-container-high dark:ring-surface-container-high"
                  aria-hidden
                />
              ) : null}
            </button>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-surface-container-high ring-2 ring-outline-variant/15 shadow-sm"
              aria-label="账户"
              onClick={() => navigate(currentUser ? '/user/appeal/my' : '/user/login')}
            >
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-headline text-sm font-bold text-primary">
                  {currentUser?.nickname?.[0] ?? '访'}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="pb-1 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-4">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined pointer-events-none absolute left-3.5 text-[20px] text-on-surface-variant/55">
            search
          </span>
          <input
            type="search"
            enterKeyHint="search"
            className="w-full rounded-2xl border border-outline-variant/25 bg-surface-container-lowest py-3.5 pl-11 pr-4 text-[15px] text-on-surface shadow-sm placeholder:text-on-surface-variant/50 focus:border-primary/35 focus:outline-none focus:ring-2 focus:ring-primary/20"
            placeholder="搜索法规或诉求..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitSearch();
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-surface-container-lowest px-3 py-1.5 text-xs font-bold text-primary shadow-sm ring-1 ring-outline-variant/20"
            onClick={() => navigate('/user/more')}
          >
            <span className="material-symbols-outlined text-[16px] leading-none">apps</span>
            服务与工具
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-on-surface-variant shadow-sm ring-1 ring-outline-variant/20"
            onClick={() => navigate('/user/departments')}
          >
            部门风采
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-surface-container-lowest px-3 py-1.5 text-xs font-semibold text-on-surface-variant shadow-sm ring-1 ring-outline-variant/20"
            onClick={() => navigate('/user/ai-assistant')}
          >
            智能问答
          </button>
        </div>
      </div>

      <section className="pb-2 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pt-4">
        <div className="m-portal-signature-gradient relative overflow-hidden rounded-2xl px-5 py-6 text-white shadow-[0_20px_48px_-16px_rgba(0,71,144,0.45)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, white 1px, transparent 0)',
              backgroundSize: '20px 20px',
            }}
          />
          <div
            className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
            aria-hidden
          />
          <div className="relative z-10 max-w-[min(100%,280px)]">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/75">校园共治</p>
            <h1 className="mb-2 font-headline text-[1.35rem] font-bold leading-snug">欢迎使用即诉即办</h1>
            <p className="mb-5 text-[13px] leading-relaxed text-white/88">{heroSub}</p>
            <button
              type="button"
              className="inline-flex w-full max-w-[220px] items-center justify-center gap-2 rounded-2xl bg-surface-container-lowest px-5 py-3.5 text-sm font-bold text-primary shadow-[0_8px_24px_rgba(15,35,52,0.15)] transition-[transform,box-shadow] active:scale-[0.98] active:shadow-md dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:w-auto"
              onClick={() => navigate('/user/appeal/create')}
            >
              <span
                className="material-symbols-outlined text-[22px] leading-none text-primary"
                style={{ fontVariationSettings: "'FILL' 1, 'wght' 500" }}
              >
                add_circle
              </span>
              发起诉求
            </button>
          </div>
          <div className="pointer-events-none absolute bottom-[-24px] right-[-28px] opacity-[0.14]" aria-hidden>
            <span className="material-symbols-outlined text-[140px] leading-none">gavel</span>
          </div>
        </div>
      </section>

      <section className="py-5 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
        <h2 className="mb-3 font-headline text-base font-bold text-on-surface">我的诉求概览</h2>
        {loading ? (
          <div className="grid grid-cols-3 gap-2.5" aria-busy="true">
            {[0, 1, 2].map((k) => (
              <div
                key={k}
                className="flex flex-col items-center rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm"
              >
                <Skeleton active paragraph={false} title={{ width: '48%' }} className="w-full" />
                <Skeleton.Button active size="small" className="mt-3 w-16" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              className="flex flex-col items-center rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 text-center shadow-sm transition-[transform,box-shadow] active:scale-[0.98] active:shadow-md"
              onClick={() => navigate(currentUser ? '/user/appeal/my' : '/user/login')}
            >
              <span className="font-headline text-2xl font-bold tabular-nums text-primary">{mySummary.pending}</span>
              <span className="mt-1.5 text-xs font-semibold text-on-surface-variant">待处理</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 text-center shadow-sm transition-[transform,box-shadow] active:scale-[0.98] active:shadow-md"
              onClick={() => navigate(currentUser ? '/user/appeal/my' : '/user/login')}
            >
              <span className="font-headline text-2xl font-bold tabular-nums text-secondary">
                {mySummary.replied}
              </span>
              <span className="mt-1.5 text-xs font-semibold text-on-surface-variant">已答复</span>
            </button>
            <button
              type="button"
              className="flex flex-col items-center rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 text-center shadow-sm transition-[transform,box-shadow] active:scale-[0.98] active:shadow-md"
              onClick={() => navigate(currentUser ? '/user/appeal/my' : '/user/login')}
            >
              <span className="font-headline text-2xl font-bold tabular-nums text-on-surface-variant">
                {mySummary.withdrawn > 0 && mySummary.withdrawn < 10
                  ? String(mySummary.withdrawn).padStart(2, '0')
                  : String(mySummary.withdrawn)}
              </span>
              <span className="mt-1.5 text-xs font-semibold text-on-surface-variant">已撤销</span>
            </button>
          </div>
        )}
      </section>

      <section className="py-5">
        <div className="mb-3 flex items-center justify-between pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
          <h2 className="font-headline text-base font-bold text-on-surface">诉求热点</h2>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-sm font-bold text-primary active:bg-primary/10"
            onClick={() => navigate('/user/appeal/list')}
          >
            查看全部
            <span className="material-symbols-outlined text-[18px] leading-none">chevron_right</span>
          </button>
        </div>
        <div className="m-portal-hide-scrollbar flex gap-3 overflow-x-auto scroll-pl-[max(1rem,env(safe-area-inset-left,0px))] pb-2 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]">
          {loading
            ? [0, 1, 2].map((k) => (
                <div
                  key={k}
                  className="min-w-[280px] shrink-0 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm"
                >
                  <Skeleton active paragraph={{ rows: 3 }} title={{ width: '40%' }} />
                </div>
              ))
            : hot.map((item) => {
                const tag = hotspotMeta(item.status);
                const hint = supportHint(item);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="min-w-[280px] shrink-0 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 text-left shadow-sm transition-[transform,box-shadow] active:scale-[0.99] active:shadow-md"
                    onClick={() => navigate(`/user/appeal/detail/${item.id}`)}
                  >
                    <div className="mb-2.5 flex items-start justify-between gap-2">
                      <span
                        className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold ${tag.cls}`}
                      >
                        {tag.label}
                      </span>
                      <span className="whitespace-nowrap text-[11px] font-medium text-on-surface-variant/85">
                        {timeAgo(item.createTime)}
                      </span>
                    </div>
                    <h3 className="font-headline mb-3 line-clamp-2 text-[15px] font-bold leading-snug text-on-surface">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 border-t border-outline-variant/15 pt-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                        <span className="material-symbols-outlined text-primary text-[17px] leading-none">
                          {hint.icon}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-on-surface-variant">{hint.text}</span>
                    </div>
                  </button>
                );
              })}
        </div>
      </section>

      <section className="py-6 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] pb-12">
        <h2 className="mb-4 font-headline text-base font-bold text-on-surface">最近动态</h2>
        <div className="space-y-6">
          {loading ? (
            <Skeleton active paragraph={{ rows: 6 }} title={{ width: '50%' }} className="mt-2" />
          ) : (
            noticesResolved.map((n) => {
              return (
                <button
                  key={n.id}
                  type="button"
                  className="group -m-2 flex w-full gap-4 rounded-2xl border border-transparent p-2 text-left transition-all duration-200 active:scale-[0.99] hover:border-outline-variant/20 hover:bg-surface-container-low hover:shadow-sm"
                  onClick={() => navigate(`/user/notice/${n.id}`)}
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container-low ring-1 ring-outline-variant/20">
                    <NoticeCoverImage
                      noticeId={n.id}
                      preferredUrl={n.attachments?.[0]?.url}
                      width={128}
                      height={128}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 py-0.5">
                    <h4 className="font-headline text-sm font-bold leading-snug text-on-surface">{n.title}</h4>
                    <p className="mt-1 line-clamp-1 text-xs text-on-surface-variant">
                      {n.content?.slice(0, 56) || '点击查看详情'}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/65">
                      <span>{n.publisher}</span>
                      <span className="h-1 w-1 rounded-full bg-outline-variant" />
                      <span>{n.createTime?.split(' ')[0]}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
