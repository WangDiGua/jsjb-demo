import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Appeal, Department, Notice, QuestionType } from '@/mock/types';
import { adminConfigService } from '@/mock';
import {
  statisticsService,
  departmentService,
  noticeService,
  questionTypeService,
  appealService,
} from '@/mock/services';
import { useAppStore } from '@/store';
import { portalToast } from './shell/portalFeedbackStore';
import { usePreferencesStore } from '@/store/preferencesStore';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';
import {
  resolveAppealTypeLabel,
  resolveDepartmentI18n,
  resolveNoticeI18n,
  resolvePortalBrandingI18n,
  resolveQuestionTypeLabel,
} from '@/lib/metadataLocale';
import { PortalButton } from './ui';
import { Skeleton } from 'antd';
import { NoticeCoverImage } from '@/utils/coverImage';

const SERVICE_ICONS = ['menu_book', 'home_work', 'security', 'restaurant', 'network_check', 'psychology'] as const;

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

/** 通栏铺满视口宽度，避免外壳 max-w 两侧灰边造成区块背景「被截断」 */
const PORTAL_FULL_BLEED = 'w-screen max-w-[100vw] ml-[calc(50%-50vw)]';
/** 与顶栏/页脚一致的内容宽度与水平留白 */
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
    [notices, metadataDisplayLocale, metaTick],
  );
  const featured = noticesResolved[0];
  const sideNews = noticesResolved.slice(1, 4);
  const deptsResolved = useMemo(
    () => depts.map((d) => resolveDepartmentI18n(d, metadataDisplayLocale)),
    [depts, metadataDisplayLocale, metaTick],
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
  }, [types, metadataDisplayLocale, metaTick]);

  const streamPair = stream.slice(0, 2);

  return (
    <>
      {/* Hero：full-bleed 背景与顶栏同宽，避免网格在 max-w 容器两侧「突然截断」 */}
      <section className="relative -mt-24 flex min-h-[700px] items-center overflow-hidden bg-surface-container-lowest pt-24 smart-grid-bg w-screen max-w-[100vw] ml-[calc(50%-50vw)]">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            className="tech-path text-primary"
            d="M0,200 Q250,150 500,200 T1000,200"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
          <path
            className="tech-path text-secondary"
            d="M0,800 Q300,850 600,800 T1000,800"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
          />
          <circle className="text-primary" cx="250" cy="175" r="3" fill="currentColor" />
          <circle className="text-secondary" cx="600" cy="825" r="3" fill="currentColor" />
        </svg>
        <div className={`relative z-10 grid items-center gap-12 lg:grid-cols-12 ${PORTAL_CONTENT}`}>
          <div className="lg:col-span-7">
            {loading ? (
              <div className="min-h-[380px] space-y-6 lg:min-h-[420px]" aria-busy="true" aria-label="内容加载中">
                <Skeleton.Input active size="small" style={{ width: 220, height: 32, borderRadius: 9999 }} />
                <Skeleton active title={{ width: '75%' }} paragraph={{ rows: 3, width: ['100%', '90%', '60%'] }} />
                <Skeleton.Node active style={{ width: '100%', maxWidth: 768, height: 64, borderRadius: 16 }} />
                <div className="grid max-w-2xl grid-cols-3 gap-8 pt-2">
                  {[0, 1, 2].map((k) => (
                    <div key={k} className="space-y-2">
                      <Skeleton.Input active style={{ width: '80%', height: 36 }} />
                      <Skeleton active paragraph={false} title={{ width: '60%' }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-success/10 px-4 py-1.5 text-xs font-bold text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  <span>接诉即办：实时受理中</span>
                </div>
                <h1 className="mb-8 font-headline text-5xl font-extrabold leading-[1.1] text-on-surface lg:text-7xl">
                  透明校园
                  <br />
                  <span className="text-primary">你我共建</span>
                </h1>
                <p className="mb-12 max-w-2xl text-xl leading-relaxed text-on-surface-variant">{homeMotto}</p>
                <div className="mb-16 flex max-w-3xl flex-col gap-4 rounded-2xl border border-outline-variant/30 bg-surface p-2 shadow-sm sm:flex-row">
                  <div className="flex flex-1 items-center gap-3 px-4">
                    <span className="material-symbols-outlined text-primary">smart_toy</span>
                    <input
                      className="w-full border-none bg-transparent font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0"
                      placeholder="向智能助理提问：如何办理校区业务？"
                      value={aiQ}
                      onChange={(e) => setAiQ(e.target.value)}
                    />
                  </div>
                  <PortalButton
                    variant="primary"
                    size="hero"
                    className="flex flex-1 sm:flex-initial"
                    onClick={() =>
                      navigate(aiQ.trim() ? `/user/ai-assistant?q=${encodeURIComponent(aiQ)}` : '/user/ai-assistant')
                    }
                  >
                    <span className="material-symbols-outlined">send</span>
                    咨询助理
                  </PortalButton>
                  <PortalButton
                    variant="secondary"
                    size="hero"
                    className="flex flex-1 sm:flex-initial"
                    onClick={() => navigate('/user/appeal/create')}
                  >
                    <span className="material-symbols-outlined">edit_square</span>
                    发起诉求
                  </PortalButton>
                </div>
                <p className="mb-10 max-w-3xl text-sm leading-relaxed text-on-surface-variant" role="note">
                  <span className="font-semibold text-on-surface">操作说明：</span>
                  输入问题后点「咨询助理」会进入智能助理并开始回答问题（连接模型 → 流式输出 → 完成）；点「发起诉求」进入工单填写，途中会经过「撰写正文 → AI
                  推荐部门/类型 → 提交」等步骤；敏感词在点击提交时检测，命中后请先修改正文再提交。
                </p>
                <div className="grid max-w-2xl grid-cols-3 gap-8">
                  <div className="group">
                    <div className="mb-1 text-3xl font-black text-on-surface transition-colors group-hover:text-primary">
                      {stats?.total != null ? stats.total.toLocaleString() : '—'}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">累计受理诉求</div>
                  </div>
                  <div className="group border-l border-outline-variant pl-8">
                    <div className="mb-1 text-3xl font-black text-on-surface transition-colors group-hover:text-primary">
                      {`${stats?.rate ?? 0}%`}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">办结满意率</div>
                  </div>
                  <div className="group border-l border-outline-variant pl-8">
                    <div className="mb-1 text-3xl font-black text-on-surface transition-colors group-hover:text-primary">
                      {`${stats?.avgH ?? 1.8}h`}
                    </div>
                    <div className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">平均响应时长</div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative hidden lg:col-span-5 lg:block">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-secondary p-1 shadow-2xl group">
              <div className="relative min-h-[420px] overflow-hidden rounded-[1.4rem] bg-surface-container-lowest p-8 lg:min-h-[480px]">
                <div className="mb-8 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-bold">
                    <span className="material-symbols-outlined text-primary">data_exploration</span>
                    实时诉求流
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">LIVE</span>
                </div>
                <div className="space-y-4">
                  {loading ? (
                    <div className="space-y-4" aria-busy="true">
                      {[0, 1].map((k) => (
                        <Skeleton key={k} active className="rounded-xl p-1" paragraph={{ rows: 3 }} />
                      ))}
                    </div>
                  ) : (
                    streamPair.map((a) => {
                      const done = a.status === 'replied';
                      const pct = done ? 100 : a.status === 'processing' ? 65 : 35;
                      return (
                        <div
                          key={a.id}
                          role="button"
                          tabIndex={0}
                          className="cursor-pointer rounded-xl border border-outline-variant/20 bg-surface p-4 transition-all hover:border-primary/30"
                          onClick={() => navigate(`/user/appeal/detail/${a.id}`)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') navigate(`/user/appeal/detail/${a.id}`);
                          }}
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                              {resolveAppealTypeLabel(a.type, types, metadataDisplayLocale)}
                            </span>
                            <span className="text-[10px] text-on-surface-variant">{relTime(a.createTime)}</span>
                          </div>
                          <p className="mb-3 text-sm font-semibold line-clamp-2">{a.title}</p>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-outline-variant/30">
                              <div
                                className={`h-full rounded-full ${done ? 'bg-success' : 'animate-pulse bg-primary'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-bold ${done ? 'text-success' : 'text-primary'}`}>
                              {statusLabel[a.status] ?? a.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {!loading ? (
                  <div className="mt-6 rounded-xl border border-outline-variant/25 bg-surface-container-high/40 px-3 py-2.5 dark:bg-surface-container/50">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <span className="text-[11px] font-semibold text-on-surface-variant">
                        浏览实时动态时也可直接：
                      </span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold">
                        <button
                          type="button"
                          className="text-primary transition-colors hover:text-primary/80 hover:underline"
                          onClick={() =>
                            navigate(aiQ.trim() ? `/user/ai-assistant?q=${encodeURIComponent(aiQ)}` : '/user/ai-assistant')
                          }
                        >
                          打开智能助理
                        </button>
                        <span className="text-on-surface-variant/35" aria-hidden>
                          |
                        </span>
                        <button
                          type="button"
                          className="text-primary transition-colors hover:text-primary/80 hover:underline"
                          onClick={() => navigate('/user/appeal/create')}
                        >
                          发起诉求
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                {!loading ? (
                  <div className="mt-8 border-t border-outline-variant/30 pt-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/5">
                        <span className="material-symbols-outlined text-primary">groups</span>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface-variant">本周共治参与者</div>
                        <div className="mt-1 flex -space-x-2">
                          <div className="h-6 w-6 rounded-full border-2 border-white bg-surface-container-high" />
                        <div className="h-6 w-6 rounded-full border-2 border-white bg-surface-container" />
                        <div className="h-6 w-6 rounded-full border-2 border-white bg-surface-container-low" />
                          <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-primary text-[8px] font-bold text-white">
                            +{Math.min(120, stats?.total ?? 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 职能效能看板 */}
      <section className={`relative overflow-hidden bg-surface py-24 ${PORTAL_FULL_BLEED}`}>
        <div className={PORTAL_CONTENT}>
          <div className="mb-12 flex flex-col items-end justify-between gap-6 md:flex-row">
            <div className="max-w-2xl">
              <h2 className="mb-4 font-headline text-4xl font-bold text-on-surface">职能效能看板</h2>
              <p className="text-lg text-on-surface-variant">基于受理数据与师生反馈的部门服务响应排行。</p>
            </div>
            <div className="flex gap-3">
              <PortalButton variant="outline" size="md" className="rounded-full border-outline-variant px-6 font-bold hover:bg-surface-container-lowest">
                周排行
              </PortalButton>
              <PortalButton variant="dark" size="md" className="rounded-full px-6 font-bold shadow-sm">
                月排行
              </PortalButton>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {loading
                ? [1, 2, 3].map((i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-container-lowest/60" />
                  ))
                : deptsResolved.map((d, idx) => {
                    const rank = String(idx + 1).padStart(2, '0');
                    const barPct = [97, 89, 78][idx] ?? 70;
                    const hours = [1.5, 2.8, 4.2][idx] ?? 3;
                    const strong = idx === 0;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        className="group flex w-full items-center gap-6 rounded-2xl border border-outline-variant/10 bg-surface-container-lowest p-6 text-left shadow-sm transition-all hover:shadow-md"
                        onClick={() => navigate('/user/departments')}
                      >
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-black italic ${
                            strong ? 'bg-primary/5 text-primary' : 'bg-surface text-on-surface-variant/30'
                          }`}
                        >
                          {rank}
                        </div>
                        <div className="flex-1">
                          <div className="mb-3 flex items-end justify-between">
                            <div>
                              <h4 className="mb-0.5 text-lg font-bold">{d.name}</h4>
                              <p className="text-xs text-on-surface-variant line-clamp-1">{d.description}</p>
                            </div>
                            <div className="text-right">
                              <div className={`text-2xl font-black ${strong ? 'text-primary' : 'text-on-surface'}`}>
                                {d.评分.toFixed(2)}
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">
                                综合指数
                              </div>
                            </div>
                          </div>
                          <div className="relative h-2 overflow-hidden rounded-full bg-surface">
                            <div
                              className={`absolute inset-0 rounded-full ${strong ? 'bg-gradient-to-r from-primary to-secondary' : 'bg-primary/60'}`}
                              style={{ width: `${barPct}%` }}
                            />
                          </div>
                        </div>
                        <div className="hidden border-l border-outline-variant/30 pl-6 text-center sm:block">
                          <div className="mb-1 text-xs font-bold text-on-surface-variant">响应参考</div>
                          <div className="text-sm font-bold">{hours}h</div>
                        </div>
                      </button>
                    );
                  })}
            </div>
            <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-on-surface p-8 text-white dark:bg-surface-container-low dark:text-on-surface dark:ring-1 dark:ring-outline-variant/35">
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-primary/20 blur-3xl transition-transform duration-1000 group-hover:scale-150 dark:bg-primary/25" />
              <div className="relative z-10">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                  <span className="material-symbols-outlined text-white">handshake</span>
                </div>
                <h3 className="mb-4 text-2xl font-bold">参与校园共治</h3>
                <p className="mb-8 text-sm leading-relaxed text-white/60 dark:text-on-surface-variant">
                  提交诉求、查看公示、评价服务，共建透明高效的接诉即办流程。
                </p>
                <ul className="mb-8 space-y-4 text-sm font-medium">
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-success">check_circle</span>
                    诉求进度可追踪
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-success">check_circle</span>
                    部门服务多维度展示
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-success">check_circle</span>
                    智能助理辅助问答
                  </li>
                </ul>
              </div>
              <PortalButton
                variant="secondary"
                fullWidth
                size="hero"
                className="relative z-10 border-0 bg-surface-container-lowest py-4 font-bold shadow-none hover:bg-surface-container-lowest/90 dark:bg-surface-container-high dark:hover:bg-surface-container-high/90"
                onClick={() => navigate('/user/appeal/create')}
              >
                立即发起诉求
              </PortalButton>
            </div>
          </div>
        </div>
      </section>

      {/* 快捷共治入口 */}
      <section className={`bg-surface-container-lowest py-24 ${PORTAL_FULL_BLEED}`}>
        <div className={PORTAL_CONTENT}>
          <div className="mb-16 flex items-end justify-between">
            <div>
              <h2 className="mb-4 font-headline text-3xl font-bold text-on-surface">快捷共治入口</h2>
              <p className="text-on-surface-variant">快速分类，触达相关服务</p>
            </div>
            <PortalButton
              variant="link"
              size="sm"
              className="group gap-2 transition-all hover:gap-3"
              onClick={() => navigate('/user/appeal/list')}
            >
              查看完整目录 <span className="material-symbols-outlined text-base">east</span>
            </PortalButton>
          </div>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-6">
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                className="group cursor-pointer text-center"
                onClick={() => navigate(`/user/appeal/list?type=${encodeURIComponent(s.name)}`)}
              >
                <div className="mb-4 flex aspect-square items-center justify-center rounded-3xl border border-outline-variant/10 bg-surface transition-all group-hover:border-primary/20 group-hover:bg-primary/5">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant transition-all group-hover:scale-110 group-hover:text-primary">
                    {s.icon}
                  </span>
                </div>
                <h4 className="text-center text-sm font-bold">{s.name}</h4>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 公示 + 我的动态 */}
      <section className={`border-t border-outline-variant/30 bg-surface py-24 ${PORTAL_FULL_BLEED}`}>
        <div className={`grid w-full grid-cols-1 gap-12 lg:grid-cols-12 ${PORTAL_CONTENT}`}>
          <div className="lg:col-span-8">
            <h3 className="mb-8 flex items-center gap-2 font-headline text-2xl font-bold text-on-surface">
              <span className="material-symbols-outlined text-primary">visibility</span>
              共治公示区
            </h3>
            <div className="grid gap-8 md:grid-cols-2">
              {featured ? (
                <article className="group overflow-hidden rounded-3xl border border-outline-variant/10 bg-surface-container-lowest transition-all hover:shadow-xl hover:shadow-black/5">
                  <div className="aspect-[16/9] overflow-hidden bg-surface">
                    <NoticeCoverImage
                      noticeId={featured.id}
                      preferredUrl={featured.attachments?.[0]?.url}
                      width={960}
                      height={540}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <span className="mb-4 inline-block rounded bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                      通知公告
                    </span>
                    <h4
                      className="mb-3 cursor-pointer text-lg font-bold leading-snug transition-colors group-hover:text-primary"
                      role="presentation"
                      onClick={() => navigate(`/user/notice/${featured.id}`)}
                    >
                      {featured.title}
                    </h4>
                    <p className="mb-4 line-clamp-2 text-sm text-on-surface-variant">{featured.content}</p>
                    <div className="flex items-center justify-between text-[11px] font-bold text-on-surface-variant/50">
                      <span>{featured.createTime.split(' ')[0]}</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">forum</span>
                        公示
                      </span>
                    </div>
                  </div>
                </article>
              ) : null}
              <div className="space-y-6">
                {sideNews.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className="group flex w-full gap-4 text-left"
                    onClick={() => navigate(`/user/notice/${n.id}`)}
                  >
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl border border-outline-variant/10 bg-surface-container-lowest">
                      <NoticeCoverImage
                        noticeId={n.id}
                        preferredUrl={n.attachments?.[0]?.url}
                        width={384}
                        height={384}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <h5 className="mb-2 text-sm font-bold transition-colors group-hover:text-primary">{n.title}</h5>
                      <p className="text-xs text-on-surface-variant/60">{n.createTime.split(' ')[0]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            <h3 className="mb-8 flex items-center gap-2 font-headline text-2xl font-bold text-on-surface">
              <span className="material-symbols-outlined text-primary">timeline</span>
              我的参与动态
            </h3>
            <div className="relative rounded-3xl border border-outline-variant/10 bg-surface-container-lowest p-8 shadow-sm">
              <div className="relative flex flex-col gap-8 before:absolute before:bottom-4 before:left-3 before:top-4 before:w-px before:bg-outline-variant/50 before:content-['']">
                {currentUser && mySlice.length > 0 ? (
                  mySlice.map((a, idx) => (
                    <div key={a.id} className="relative pl-10">
                      <div
                        className={`absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white ${
                          idx === 0 ? 'bg-primary' : a.status === 'replied' ? 'bg-success' : 'border border-outline-variant bg-surface'
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-[14px] ${idx === 0 || a.status === 'replied' ? 'text-white' : 'text-on-surface-variant'}`}
                        >
                          {a.status === 'replied' ? 'check' : 'edit'}
                        </span>
                      </div>
                      <div className={`mb-1 text-xs font-bold ${idx === 0 ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {statusLabel[a.status]}
                      </div>
                      <h6 className="mb-1 text-sm font-bold line-clamp-2">{a.title}</h6>
                      <p className="text-[11px] text-on-surface-variant">{a.createTime}</p>
                    </div>
                  ))
                ) : (
                  <p className="pl-4 text-sm text-on-surface-variant">
                    登录后可在此查看您的诉求进度。
                    <PortalButton variant="link" size="sm" className="ml-2 inline p-0 font-bold" onClick={() => navigate('/user/login')}>
                      去登录
                    </PortalButton>
                  </p>
                )}
              </div>
              <PortalButton
                variant="outline"
                fullWidth
                size="sm"
                className="mt-10 border-outline-variant/30 bg-surface py-3 text-xs font-bold hover:bg-on-surface/5"
                onClick={() => navigate('/user/appeal/my')}
              >
                查看全部诉求记录
              </PortalButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
