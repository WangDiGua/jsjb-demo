import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';
import { aiService, getDb } from '@/mock';
import { isGlmConfigured } from '@/lib/glmClient';
import type { Appeal } from '@/mock/types';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { useAiStreamPhase } from '@/components/AI/AiTaskProgress';
import { PortalButton } from './ui';
import { portalToast } from './shell/portalFeedbackStore';
import { setAppealPrefill, firstLineTitle } from '@/lib/appealPrefill';

function aiErr(e: unknown) {
  if (e instanceof DOMException && e.name === 'AbortError') return;
  portalToast.error(e instanceof Error ? e.message : '请求失败');
}

function StreamCursor() {
  return (
    <span
      className="ml-0.5 inline-block h-[1.1em] w-0.5 translate-y-px animate-pulse rounded-sm bg-primary align-[-2px]"
      aria-hidden
    />
  );
}

type ChatMsg = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  pending?: boolean;
};

const WELCOME_ASSISTANT_TEXT =
  '你好，我是接诉即办智能助理。你可以像使用对话应用一样多轮提问，我会尽量引用通用高校办事常识作答；涉及具体校规请以职能部门答复为准。\n\n试试问我：图书馆开放时间、奖学金流程、后勤报修渠道等。\n\n若需要**提交工单**：请前往「发起诉求」页，在那里可以使用判重、帮写、翻译等与表单一体的辅助功能。';

function loadHotPublicAppeals(): Appeal[] {
  const list = getDb().appeals.filter((a) => a.isPublic && a.status === 'replied');
  return [...list].sort((a, b) => (b.浏览量 ?? 0) - (a.浏览量 ?? 0));
}

export default function AIDemoPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const [searchParams] = useSearchParams();
  const configured = isGlmConfigured();
  const [hotAppeals, setHotAppeals] = useState<Appeal[]>([]);

  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'welcome', role: 'assistant', text: WELCOME_ASSISTANT_TEXT },
  ]);
  const [composerText, setComposerText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatAbortRef = useRef<AbortController | null>(null);
  const chatStream = useAiStreamPhase();
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const urlChatBootRef = useRef(false);

  const goFillAppeal = useCallback(
    (p: { title: string; content: string; type?: string; departmentId?: string }) => {
      const rawTitle = p.title.trim() || firstLineTitle(p.content);
      const title = (rawTitle || '诉求').slice(0, 100);
      const content = (p.content.trim().slice(0, 2000) || title).slice(0, 2000);
      if (!content.trim()) {
        portalToast.warning('当前没有可带入的正文');
        return;
      }
      setAppealPrefill({
        title,
        content,
        type: p.type?.trim() || undefined,
        departmentId: p.departmentId?.trim() || undefined,
      });
      navigate('/user/appeal/create');
      portalToast.success('已打开发起诉求，表单已预填');
    },
    [navigate],
  );

  useEffect(() => {
    void chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, chatLoading]);

  const refreshHotAppeals = useCallback(() => {
    try {
      setHotAppeals(loadHotPublicAppeals().slice(0, 20));
    } catch {
      void 0;
    }
  }, []);

  useEffect(() => {
    refreshHotAppeals();
    const fn = () => refreshHotAppeals();
    window.addEventListener('jsjb-mock-updated', fn);
    return () => window.removeEventListener('jsjb-mock-updated', fn);
  }, [refreshHotAppeals]);

  const runChatStream = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || chatLoading) return;
      const userId = `u_${Date.now()}`;
      const botId = `a_${Date.now() + 1}`;
      setMessages((prev) => [
        ...prev,
        { id: userId, role: 'user', text: q },
        { id: botId, role: 'assistant', text: '', pending: true },
      ]);

      chatAbortRef.current?.abort();
      const ac = new AbortController();
      chatAbortRef.current = ac;
      chatStream.start();
      setChatLoading(true);

      try {
        const r = await aiService.aiChatStream(
          q,
          (delta) => {
            chatStream.onFirstChunk();
            setMessages((prev) => {
              const i = prev.findIndex((m) => m.id === botId);
              if (i < 0) return prev;
              const next = [...prev];
              const prevText = next[i].text;
              next[i] = { ...next[i], text: prevText + delta };
              return next;
            });
          },
          ac.signal,
        );
        setMessages((prev) => {
          const i = prev.findIndex((m) => m.id === botId);
          if (i < 0) return prev;
          const next = [...prev];
          next[i] = { id: botId, role: 'assistant', text: r.answer, sources: r.sources, pending: false };
          return next;
        });
        chatStream.finish();
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
          chatStream.reset();
          setMessages((prev) => prev.filter((m) => m.id !== botId));
        } else {
          aiErr(e);
          chatStream.reset();
          setMessages((prev) => {
            const i = prev.findIndex((m) => m.id === botId);
            if (i < 0) return prev;
            const next = [...prev];
            next[i] = {
              ...next[i],
              text: `暂时无法完成回答：${e instanceof Error ? e.message : '请稍后重试'}`,
              pending: false,
            };
            return next;
          });
        }
      } finally {
        if (chatAbortRef.current === ac) chatAbortRef.current = null;
        setChatLoading(false);
      }
    },
    [chatLoading, chatStream],
  );

  useEffect(() => {
    const raw = searchParams.get('q');
    if (!raw || urlChatBootRef.current) return;
    urlChatBootRef.current = true;
    const q = decodeURIComponent(raw);
    setComposerText(q);
    void runChatStream(q);
  }, [searchParams, runChatStream]);

  const hotSuggestTitles = useMemo(() => hotAppeals.slice(0, 8).map((a) => a.title), [hotAppeals]);

  const statusPill = (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${
        configured
          ? 'border-emerald-600/35 bg-emerald-600/12 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-100'
          : 'border-amber-600/40 bg-amber-500/15 text-amber-950 dark:border-amber-500/45 dark:bg-amber-950/40 dark:text-amber-50'
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${configured ? 'bg-emerald-500' : 'bg-amber-500'}`}
        />
        <span className={`relative inline-flex h-2 w-2 rounded-full ${configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      </span>
      {configured ? '大模型服务已就绪' : '智能服务降级 · 部分能力由本地规则引擎提供'}
    </div>
  );

  const suggestChip = (title: string) => (
    <button
      key={title}
      type="button"
      className="max-w-[14rem] shrink-0 truncate rounded-lg border border-outline-variant/40 bg-surface-container-low px-2.5 py-1.5 text-left text-xs font-semibold text-on-surface transition-colors hover:border-primary/45 hover:bg-primary/[0.08] dark:border-outline-variant/50 dark:bg-surface/80"
      onClick={() => void runChatStream(title)}
    >
      {title.length > 22 ? `${title.slice(0, 21)}…` : title}
    </button>
  );

  const pageIntro = (
    <div
      className={`rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4 shadow-sm dark:border-outline-variant/45 ${isMobile ? 'mb-3' : 'mb-6'}`}
    >
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <PortalButton variant="link" size="md" className="shrink-0 p-0 text-sm font-bold text-primary" onClick={() => navigate(-1)}>
          ← 返回
        </PortalButton>
        <div className="h-10 w-px shrink-0 bg-outline-variant/40" aria-hidden />
        <span className="material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-[26px] text-white shadow-md">
          chat
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-headline text-lg font-extrabold text-on-surface sm:text-xl">智能问答</h1>
          <p className="mt-0.5 text-sm leading-snug text-on-surface-variant">
            政策与办事指引咨询。提交诉求时的<strong className="font-semibold text-on-surface">判重、帮写、翻译</strong>等请在
            <Link to="/user/appeal/create" className="mx-0.5 font-bold text-primary underline-offset-2 hover:underline">
              发起诉求
            </Link>
            使用。
          </p>
        </div>
        <div className="w-full shrink-0 sm:ml-auto sm:w-auto">{statusPill}</div>
      </div>
    </div>
  );

  const chatPanel = (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-3xl border border-outline-variant/20 bg-surface shadow-[0_24px_80px_-32px_rgba(15,35,52,0.35)] dark:shadow-[0_24px_80px_-32px_rgba(0,0,0,0.5)] ${isMobile ? 'h-[min(72vh,540px)]' : 'h-[min(76vh,640px)]'}`}
    >
      <div className="shrink-0 border-b border-outline-variant/20 bg-surface-container-low/60 px-4 py-2.5 sm:px-5 dark:bg-surface-container/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
              <span className="material-symbols-outlined text-[22px] leading-none">smart_toy</span>
            </span>
            <div className="min-w-0">
              <p className="font-headline text-sm font-extrabold text-on-surface">对话</p>
            </div>
          </div>
          <PortalButton
            variant="ghost"
            size="sm"
            className="shrink-0 rounded-lg text-xs font-bold text-on-surface ring-1 ring-outline-variant/30"
            onClick={() => {
              chatAbortRef.current?.abort();
              setMessages([{ id: 'welcome', role: 'assistant', text: WELCOME_ASSISTANT_TEXT }]);
              chatStream.reset();
              setChatLoading(false);
            }}
          >
            新对话
          </PortalButton>
        </div>
      </div>

      <div className="m-ai-chat-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-surface-container-lowest/40 px-3 py-4 sm:px-5">
        {messages.map((m, idx) => {
          const prevUserForAssistant =
            m.role === 'assistant'
              ? (() => {
                  for (let i = idx - 1; i >= 0; i--) {
                    const msg = messages[i];
                    if (msg?.role === 'user') return msg.text;
                  }
                  return '';
                })()
              : '';
          const showAppealFromChat =
            m.role === 'assistant' && m.id !== 'welcome' && !m.pending && m.text.trim().length > 0;

          return (
            <div key={m.id} className={`flex w-full gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' ? (
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <span className="material-symbols-outlined text-[18px] leading-none">smart_toy</span>
                </span>
              ) : null}
              <div
                className={`max-w-[min(100%,36rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'rounded-tr-sm bg-primary text-white'
                    : 'rounded-tl-sm border border-outline-variant/15 bg-surface text-on-surface'
                }`}
              >
                {m.role === 'assistant' && m.pending && !m.text ? (
                  <span className="inline-flex items-center gap-2 text-on-surface-variant">
                    <Spin size="small" />
                    正在思考…
                  </span>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{m.text}</p>
                    {m.pending && m.text ? <StreamCursor /> : null}
                    {m.sources && m.sources.length > 0 ? (
                      <div className="mt-3 border-t border-outline-variant/15 pt-2 text-xs text-on-surface-variant">
                        <span className="font-semibold text-on-surface">参考来源</span>：{m.sources.join('；')}
                      </div>
                    ) : null}
                    {showAppealFromChat ? (
                      <div className="mt-3 border-t border-outline-variant/15 pt-3">
                        <PortalButton
                          type="button"
                          variant="outline"
                          size="sm"
                          className="font-bold"
                          onClick={() => {
                            const q = prevUserForAssistant.trim();
                            const a = m.text.trim();
                            const body = q
                              ? `【我的提问】\n${q}\n\n【智能助理回答（请自行核实）】\n${a}`
                              : `${a}\n\n（摘自智能助理回答，请核对事实与校规后再提交。）`;
                            goFillAppeal({
                              title: firstLineTitle(q) || firstLineTitle(a) || '咨询纪要',
                              content: body.slice(0, 2000),
                            });
                          }}
                        >
                          用本条回答发起诉求
                        </PortalButton>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <div className="shrink-0 border-t border-outline-variant/20 bg-surface-container-low/40 p-3 sm:p-4 dark:bg-surface-container/30">
        <div className="mx-auto max-w-3xl space-y-2">
          <div className="relative">
            <textarea
              rows={2}
              className="m-ai-composer max-h-40 min-h-[3.25rem] w-full resize-y rounded-xl border border-outline-variant/40 bg-surface px-3.5 py-3 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-outline-variant/55"
              placeholder="输入问题，Enter 发送，Shift+Enter 换行"
              value={composerText}
              disabled={chatLoading}
              onChange={(e) => setComposerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void runChatStream(composerText);
                  setComposerText('');
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="order-2 text-[11px] text-on-surface-variant sm:order-1">Enter 发送 · Shift+Enter 换行</p>
            <PortalButton
              type="button"
              variant="primary"
              size="lg"
              disabled={chatLoading || !composerText.trim()}
              className="order-1 w-full rounded-xl px-6 font-extrabold shadow-md shadow-primary/20 sm:order-2 sm:w-auto sm:min-w-[6.5rem]"
              onClick={() => {
                void runChatStream(composerText);
                setComposerText('');
              }}
            >
              {chatLoading ? <Spin size="small" /> : <span className="material-symbols-outlined text-[20px]">send</span>}
              {chatLoading ? '生成中…' : '发送'}
            </PortalButton>
          </div>
          {hotSuggestTitles.length > 0 ? (
            <details className="group mt-1 rounded-lg border border-outline-variant/25 bg-surface/80 px-2 py-1.5 dark:border-outline-variant/40 dark:bg-surface/50">
              <summary className="cursor-pointer list-none py-1 text-xs font-bold text-on-surface marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  <span>热门公开诉求（点击带入问答）</span>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant transition-transform group-open:rotate-180">
                    expand_more
                  </span>
                </span>
              </summary>
              <div className="flex gap-2 overflow-x-auto pb-2 pt-1 [scrollbar-width:thin]">
                {hotSuggestTitles.slice(0, 8).map((t) => suggestChip(t))}
              </div>
            </details>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="智能问答" contentClassName="pt-2 pb-10">
        {pageIntro}
        <div className="relative z-10 w-full font-body">{chatPanel}</div>
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="relative z-10 w-full font-body">
      {pageIntro}
      {chatPanel}
    </div>
  );
}
