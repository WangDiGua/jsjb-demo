import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from 'antd';
import { adminConfigService } from '@/mock';
import {
  appealService,
  departmentService,
  noticeService,
  questionTypeService,
  statisticsService,
} from '@/mock/services';
import type { Appeal, Department, Notice, QuestionType } from '@/mock/types';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';
import {
  resolveAppealTypeLabel,
  resolveDepartmentI18n,
  resolveNoticeI18n,
  resolvePortalBrandingI18n,
  resolveQuestionTypeLabel,
} from '@/lib/metadataLocale';
import { useAppStore } from '@/store';
import { usePreferencesStore } from '@/store/preferencesStore';
import { NoticeCoverImage } from '@/utils/coverImage';
import { portalToast } from './shell/portalFeedbackStore';
import { PortalButton } from './ui';

const SERVICE_ICONS = ['countertops', 'home_work', 'verified_user', 'restaurant', 'hub', 'psychology'] as const;

const statusLabel: Record<string, string> = {
  pending: '待受理',
  accepted: '已受理',
  processing: '处理中',
  reply_draft: '答复审核中',
  replied: '已解决',
  returned: '已退回',
  withdrawn: '已撤销',
  closed: '已关闭',
};

function relTime(iso: string) {
  return iso.length > 10 ? iso.slice(5, 16) : iso;
}

const PORTAL_FULL_BLEED = 'w-screen max-w-[100vw] ml-[calc(50%-50vw)]';
const PORTAL_CONTENT = 'mx-auto w-full max-w-[var(--layout-max,1600px)] px-[var(--layout-px,2rem)]';

export default function HomePage() {
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const metadataDisplayLocale = usePreferencesStore((s) => s.metadataDisplayLocale);
  const [metaTick, setMetaTick] = useState(0);
  useMockDbUpdated(useCallback(() => setMetaTick((n) => n + 1), []));
  const [stats, setStats] = useState<{ total: number; rate: number; avgH: number } | null>(null);
  const [stream, setStream] = useState<Appeal[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [types, setTypes] = useState<QuestionType[]>([]);
  const [mySlice, setMySlice] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiQ, setAiQ] = useState('');
  const [homeMotto, setHomeMotto] = useState(
    '打破沟通边界，让每一份师生诉求都可见、可追踪、可评价。智能辅助、数据可看板，共建高效共治门户。',
  );

  useEffect(() => {
    void adminConfigService.getPortalBrandingPublic().then((b) => {
      const r = resolvePortalBrandingI18n(b, metadataDisplayLocale);
      if (r.homeMotto?.trim()) setHomeMotto(r.homeMotto.trim());
    });
  }, [metadataDisplayLocale, metaTick]);

  useEffect(() => {
    const load = async () => {
      try {
        const [s, appeals, d, n, t] = await Promise.all([
          statisticsService.getStatistics(),
          appealService.getPublicAppeals({ pageSize: 6 }),
          departmentService.getDepartments(),
          noticeService.getNoticesForPublic(),
          questionTypeService.getQuestionTypes(),
        ]);
        setStats({
          total: s.诉求总量,
          rate: s.办结率,
          avgH: s.平均响应时长 || 1.8,
        });
        setStream(appeals.data);
        setDepts([...d].sort((a, b) => b.评分 - a.评分).slice(0, 3));
        setNotices(n);
        setTypes(t);
        if (currentUser?.id) {
          const mine = await appealService.getMyAppeals(currentUser.id);
          setMySlice(mine.slice(0, 3));
        } else {
          setMySlice([]);
        }
      } catch (e) {
        portalToast.error(e instanceof Error ? e.message : '首页数据加载失败');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [currentUser?.id]);

  useEffect(() => {
    const fn = () => {
      void statisticsService.getStatistics().then((s) =>
        setStats({ total: s.诉求总量, rate: s.办结率, avgH: s.平均响应时长 || 1.8 }),
      );
    };
    window.addEventListener('jsjb-mock-updated', fn);
    return () => window.removeEventListener('jsjb-mock-updated', fn);
  }, []);

  const noticesResolved = useMemo(
    () => notices.map((n) => resolveNoticeI18n(n, metadataDisplayLocale)),
    [notices, metadataDisplayLocale],
  );
  const featured = noticesResolved[0];
  const sideNews = noticesResolved.slice(1, 4);
  const deptsResolved = useMemo(
    () => depts.map((d) => resolveDepartmentI18n(d, metadataDisplayLocale)),
    [depts, metadataDisplayLocale],
  );
  const services = useMemo(() => {
    const t = types.slice(0, 6);
    while (t.length < 6) {
      t.push({ id: `p${t.length}`, name: '更多服务', count: 0, order: 0 });
    }
    return t.slice(0, 6).map((x, i) => ({
      ...x,
      name: resolveQuestionTypeLabel(x, metadataDisplayLocale),
      icon: SERVICE_ICONS[i % SERVICE_ICONS.length],
    }));
  }, [types, metadataDisplayLocale]);

  const openAi = () => {
    navigate(aiQ.trim() ? `/user/ai-assistant?q=${encodeURIComponent(aiQ)}` : '/user/ai-assistant');
  };

  return (
    <>
      <section className={`relative overflow-hidden py-12 lg:py-16 ${PORTAL_FULL_BLEED}`}>
        <div className={`grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)] ${PORTAL_CONTENT}`}>
          <div className="hall-wayfinding relative overflow-hidden rounded-[2rem] p-8 shadow-[0_26px_70px_-30px_rgba(29,79,113,0.5)] lg:p-10">
            <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div>
                <p className="mb-5 inline-flex rounded-full bg-white/18 px-4 py-1.5 text-xs font-bold tracking-[0.18em] text-white/86">
                  ONLINE SERVICE HALL
                </p>
                <h1 className="font-headline text-4xl font-black leading-[1.08] tracking-tight text-white lg:text-6xl">
                  一站式诉求服务大厅
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/86 lg:text-lg">{homeMotto}</p>
                <div className="mt-8 grid gap-3 rounded-[1.6rem] bg-white/16 p-2 backdrop-blur sm:grid-cols-[1fr_auto_auto]">
                  <div className="flex items-center gap-3 rounded-[1.1rem] bg-white/92 px-4 py-3 text-on-surface">
                    <span className="material-symbols-outlined text-primary">support_agent</span>
                    <input
                      className="w-full border-none bg-transparent text-sm font-semibold placeholder:text-on-surface-variant/60 focus:ring-0"
                      placeholder="向咨询台提问，或描述要办理的事项"
                      value={aiQ}
                      onChange={(e) => setAiQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') openAi();
                      }}
                    />
                  </div>
                  <PortalButton variant="secondary" size="hero" className="rounded-[1.1rem] bg-white text-primary" onClick={openAi}>
                    咨询台
                  </PortalButton>
                  <PortalButton variant="dark" size="hero" className="rounded-[1.1rem] bg-on-surface text-white" onClick={() => navigate('/user/appeal/create')}>
                    去取号办理
                  </PortalButton>
                </div>
              </div>

              <div className="relative z-10 rounded-[1.6rem] border border-white/20 bg-white/14 p-5 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/76">Today Counter</p>
                <div className="mt-5 grid grid-cols-3 gap-3 lg:grid-cols-1">
                  {[
                    ['累计受理', stats?.total != null ? stats.total.toLocaleString() : '...'],
                    ['办结率', `${stats?.rate ?? 0}%`],
                    ['平均响应', `${stats?.avgH ?? 1.8}h`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white/18 p-4">
                      <p className="text-[11px] font-bold text-white/68">{label}</p>
                      <p className="mt-1 font-headline text-2xl font-black tabular-nums text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <aside className="hall-panel hall-guide-line rounded-[2rem] p-6">
            <p className="hall-section-label text-xs font-black">办事动线</p>
            <div className="mt-5 space-y-5">
              {[
                ['01', '描述问题', '先写标题与正文，可让智能助手辅助整理。'],
                ['02', '分派柜台', '系统推荐类型和部门，也可自行选择。'],
                ['03', '追踪进度', '提交后在我的办件查看状态与消息。'],
              ].map(([num, title, desc]) => (
                <div key={num} className="relative flex gap-4 pl-1">
                  <span className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-xs font-black text-white">
                    {num}
                  </span>
                  <span>
                    <span className="block font-headline text-base font-bold text-on-surface">{title}</span>
                    <span className="mt-1 block text-sm leading-relaxed text-on-surface-variant">{desc}</span>
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-7 flex w-full items-center justify-between rounded-2xl border border-primary/20 bg-primary/8 px-4 py-3 text-left text-sm font-bold text-primary"
              onClick={() => navigate('/user/appeal/list')}
            >
              查看公开办件
              <span className="material-symbols-outlined">east</span>
            </button>
          </aside>
        </div>
      </section>

      <section className={`py-12 ${PORTAL_FULL_BLEED}`}>
        <div className={PORTAL_CONTENT}>
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="hall-section-label text-xs font-black">SERVICE COUNTERS</p>
              <h2 className="mt-2 font-headline text-3xl font-black text-on-surface">业务柜台分区</h2>
            </div>
            <PortalButton variant="outline" size="md" className="rounded-2xl px-5 font-bold" onClick={() => navigate('/user/appeal/list')}>
              浏览全部公示
            </PortalButton>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {services.map((s, index) => (
              <button
                key={s.id}
                type="button"
                className="hall-counter-card flex min-h-[10rem] items-start gap-4 rounded-[1.7rem] p-6 pt-7 text-left"
                onClick={() => navigate(`/user/appeal/list?type=${encodeURIComponent(s.name)}`)}
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[30px]">{s.icon}</span>
                </span>
                <span className="min-w-0">
                  <span className="text-[11px] font-black tracking-[0.16em] text-on-surface-variant">
                    COUNTER {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-2 block font-headline text-xl font-black text-on-surface">{s.name}</span>
                  <span className="mt-3 block text-sm leading-relaxed text-on-surface-variant">
                    进入该类事项公示区，查看已办案例或继续发起新的诉求。
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={`py-12 ${PORTAL_FULL_BLEED}`}>
        <div className={`grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] ${PORTAL_CONTENT}`}>
          <div className="hall-panel rounded-[2rem] p-6 lg:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="hall-section-label text-xs font-black">LIVE CASE BOARD</p>
                <h2 className="mt-2 font-headline text-2xl font-black text-on-surface">实时办件看板</h2>
              </div>
              <span className="flex items-center gap-2 rounded-full bg-secondary/12 px-3 py-1 text-xs font-bold text-secondary">
                <span className="h-2 w-2 animate-pulse rounded-full bg-secondary" />
                Live
              </span>
            </div>
            {loading ? (
              <Skeleton active paragraph={{ rows: 5 }} />
            ) : (
              <div className="space-y-3">
                {stream.slice(0, 4).map((a) => {
                  const done = a.status === 'replied';
                  const pct = done ? 100 : a.status === 'processing' ? 66 : 34;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className="flex w-full gap-4 rounded-2xl border border-outline-variant/35 bg-surface-container-lowest/72 p-4 text-left transition hover:border-primary/35 hover:bg-surface-container-lowest"
                      onClick={() => navigate(`/user/appeal/detail/${a.id}`)}
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <span className="material-symbols-outlined">receipt_long</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="line-clamp-1 font-bold text-on-surface">{a.title}</span>
                          <span className="shrink-0 text-[11px] font-semibold text-on-surface-variant">{relTime(a.createTime)}</span>
                        </span>
                        <span className="mt-1 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                          <span>{resolveAppealTypeLabel(a.type, types, metadataDisplayLocale)}</span>
                          <span>{statusLabel[a.status] ?? a.status}</span>
                        </span>
                        <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-surface-container-high">
                          <span
                            className={`block h-full rounded-full ${done ? 'bg-secondary' : 'bg-primary'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="hall-panel rounded-[2rem] p-6 lg:p-8">
              <p className="hall-section-label text-xs font-black">DEPARTMENT DESK</p>
              <h2 className="mt-2 font-headline text-2xl font-black text-on-surface">高效服务柜台</h2>
              <div className="mt-6 space-y-4">
                {loading
                  ? [0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface-container-low" />)
                  : deptsResolved.map((d, idx) => (
                      <button
                        key={d.id}
                        type="button"
                        className="flex w-full items-center gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/68 p-4 text-left hover:border-primary/30"
                        onClick={() => navigate('/user/departments')}
                      >
                        <span className="font-headline text-2xl font-black text-primary/70">{idx + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold text-on-surface">{d.name}</span>
                          <span className="mt-1 block truncate text-xs text-on-surface-variant">{d.description}</span>
                        </span>
                        <span className="rounded-full bg-secondary/12 px-3 py-1 text-xs font-black text-secondary">
                          {d.评分.toFixed(1)}
                        </span>
                      </button>
                    ))}
              </div>
            </div>

            <div className="hall-panel rounded-[2rem] p-6 lg:p-8">
              <p className="hall-section-label text-xs font-black">MY DOCKET</p>
              <h2 className="mt-2 font-headline text-2xl font-black text-on-surface">我的办件台账</h2>
              <div className="mt-6 space-y-4">
                {currentUser && mySlice.length > 0 ? (
                  mySlice.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      className="block w-full rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/72 p-4 text-left hover:border-primary/30"
                      onClick={() => navigate(`/user/appeal/detail/${a.id}`)}
                    >
                      <span className="text-xs font-bold text-primary">{statusLabel[a.status] ?? a.status}</span>
                      <span className="mt-1 block line-clamp-2 font-bold text-on-surface">{a.title}</span>
                      <span className="mt-2 block text-xs text-on-surface-variant">{a.createTime}</span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-outline-variant/45 p-6 text-sm leading-relaxed text-on-surface-variant">
                    登录后可在这里查看您提交的诉求状态、回复和消息提醒。
                  </div>
                )}
              </div>
              <PortalButton
                variant="outline"
                fullWidth
                size="md"
                className="mt-6 rounded-2xl font-bold"
                onClick={() => navigate(currentUser ? '/user/appeal/my' : '/user/login')}
              >
                查看我的办件
              </PortalButton>
            </div>
          </div>
        </div>
      </section>

      <section className={`py-12 pb-20 ${PORTAL_FULL_BLEED}`}>
        <div className={`grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] ${PORTAL_CONTENT}`}>
          {featured ? (
            <article className="hall-panel group overflow-hidden rounded-[2rem]">
              <div className="grid md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <div className="min-h-[18rem] overflow-hidden bg-surface-container-low">
                  <NoticeCoverImage
                    noticeId={featured.id}
                    preferredUrl={featured.attachments?.[0]?.url}
                    width={960}
                    height={680}
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="p-7 lg:p-9">
                  <p className="hall-section-label text-xs font-black">ANNOUNCEMENT</p>
                  <h2
                    className="mt-3 cursor-pointer font-headline text-2xl font-black leading-tight text-on-surface transition-colors group-hover:text-primary lg:text-3xl"
                    onClick={() => navigate(`/user/notice/${featured.id}`)}
                  >
                    {featured.title}
                  </h2>
                  <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-on-surface-variant">{featured.content}</p>
                  <p className="mt-6 text-xs font-bold text-on-surface-variant">{featured.createTime.split(' ')[0]}</p>
                </div>
              </div>
            </article>
          ) : (
            <div className="hall-panel rounded-[2rem] p-8">
              <Skeleton active paragraph={{ rows: 4 }} />
            </div>
          )}

          <aside className="hall-panel rounded-[2rem] p-6 lg:p-8">
            <p className="hall-section-label text-xs font-black">NOTICE STREAM</p>
            <h2 className="mt-2 font-headline text-2xl font-black text-on-surface">大厅公告</h2>
            <div className="mt-6 space-y-4">
              {sideNews.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="flex w-full gap-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/72 p-3 text-left hover:border-primary/30"
                  onClick={() => navigate(`/user/notice/${n.id}`)}
                >
                  <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-container-low">
                    <NoticeCoverImage
                      noticeId={n.id}
                      preferredUrl={n.attachments?.[0]?.url}
                      width={160}
                      height={160}
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-sm font-bold text-on-surface">{n.title}</span>
                    <span className="mt-2 block text-xs text-on-surface-variant">{n.createTime.split(' ')[0]}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
