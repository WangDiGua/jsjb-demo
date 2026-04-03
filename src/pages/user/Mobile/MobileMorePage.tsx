import { useNavigate } from 'react-router-dom';
import { canAccessAdmin } from '@/mock';
import { useAppStore } from '@/store';
import { usePreferencesStore } from '@/store/preferencesStore';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';

const services: {
  to: string;
  title: string;
  desc: string;
  icon: string;
}[] = [
  {
    to: '/user/departments',
    title: '部门风采',
    desc: '对接部门、服务电话与办事指引',
    icon: 'domain',
  },
  {
    to: '/user/ai-assistant',
    title: '智能问答',
    desc: '政策咨询与常见问题引导',
    icon: 'smart_toy',
  },
  {
    to: '/user/search',
    title: '搜索',
    desc: '检索公开诉求与公告',
    icon: 'search',
  },
  {
    to: '/user/integrations',
    title: '系统对接',
    desc: '企业微信、统一身份等说明',
    icon: 'hub',
  },
];

export default function MobileMorePage() {
  const navigate = useNavigate();
  const currentUser = useAppStore((s) => s.currentUser);
  const openPreferences = usePreferencesStore((s) => s.openPreferences);

  return (
    <MobileSubPageScaffold title="服务与工具" showBack={false} contentClassName="pt-2">
      <p className="mb-4 text-sm text-on-surface-variant">与 PC 门户同源能力，移动端便捷入口</p>

      <div className="grid grid-cols-1 gap-3">
        {services.map((s) => (
          <button
            key={s.to}
            type="button"
            className="m-portal-tap-clear flex w-full min-h-[4.5rem] items-start gap-4 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 text-left shadow-sm active:scale-[0.99] active:shadow-md"
            onClick={() => navigate(s.to)}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <span className="material-symbols-outlined text-[26px] leading-none">{s.icon}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <span className="font-headline text-base font-bold text-on-surface">{s.title}</span>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant/60">chevron_right</span>
              </span>
              <span className="mt-1 block text-[13px] leading-snug text-on-surface-variant">{s.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="m-portal-tap-clear mt-4 flex w-full min-h-[3.25rem] items-center justify-between rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-4 py-3 text-left shadow-sm"
        onClick={openPreferences}
      >
        <span className="flex items-center gap-2 font-headline text-sm font-bold text-on-surface">
          <span className="material-symbols-outlined text-primary">tune</span>
          外观与偏好设置
        </span>
        <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
      </button>

      <section className="mt-6 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-4 shadow-sm">
        <h2 className="font-headline text-sm font-bold text-on-surface-variant">账号</h2>
        <div className="mt-3 flex flex-col gap-2">
          {currentUser ? (
            <>
              <button
                type="button"
                className="m-portal-tap-clear flex min-h-12 w-full items-center justify-between rounded-xl bg-surface-container-high/60 px-4 py-3 text-left text-sm font-semibold active:opacity-90  "
                onClick={() => navigate('/user/appeal/my')}
              >
                <span>我的诉求与消息</span>
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              </button>
              {canAccessAdmin(currentUser.role) ? (
                <button
                  type="button"
                  className="m-portal-tap-clear flex min-h-12 w-full items-center justify-between rounded-xl border border-primary/25 bg-primary/8 px-4 py-3 text-left text-sm font-bold text-primary active:opacity-90"
                  onClick={() => navigate('/admin')}
                >
                  <span>后台管理</span>
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                </button>
              ) : null}
            </>
          ) : (
            <>
              <button
                type="button"
                className="m-portal-tap-clear w-full min-h-12 rounded-xl bg-primary py-3 text-center text-sm font-bold text-white shadow-md"
                onClick={() => navigate('/user/login')}
              >
                登录
              </button>
              <button
                type="button"
                className="m-portal-tap-clear w-full min-h-12 rounded-xl border border-outline-variant/20 py-3 text-center text-sm font-bold text-primary"
                onClick={() => navigate('/user/register')}
              >
                注册账号
              </button>
            </>
          )}
        </div>
      </section>
    </MobileSubPageScaffold>
  );
}
