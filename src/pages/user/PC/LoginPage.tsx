import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminConfigService, userService } from '@/mock';
import { useAppStore } from '@/store';
import { usePreferencesStore } from '@/store/preferencesStore';
import { resolvePortalBrandingI18n } from '@/lib/metadataLocale';
import { useMockDbUpdated } from '@/hooks/useMockDbUpdated';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import { PortalButton } from './ui';
import { portalToast } from './shell/portalFeedbackStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const login = useAppStore((s) => s.login);
  const metadataDisplayLocale = usePreferencesStore((s) => s.metadataDisplayLocale);
  const [brandingTick, setBrandingTick] = useState(0);
  useMockDbUpdated(useCallback(() => setBrandingTick((n) => n + 1), []));
  const [mode, setMode] = useState<'account' | 'phone' | 'external'>('account');
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [phone, setPhone] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [loginWelcome, setLoginWelcome] = useState('接诉即办');
  const [loginSubtitle, setLoginSubtitle] = useState('登录校园共治门户');

  useEffect(() => {
    void adminConfigService.getPortalBrandingPublic().then((b) => {
      const r = resolvePortalBrandingI18n(b, metadataDisplayLocale);
      if (r.loginWelcome) setLoginWelcome(r.loginWelcome);
      if (r.loginSubtitle) setLoginSubtitle(r.loginSubtitle);
    });
  }, [metadataDisplayLocale, brandingTick]);

  const accountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await userService.login(username, password);
      if (res.success && res.data) {
        login(res.data);
        portalToast.success('登录成功');
        navigate('/user/home');
      } else {
        portalToast.error(res.message || '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const phoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      portalToast.error('手机号格式不正确');
      return;
    }
    setLoading(true);
    try {
      const res = await userService.phoneLogin(phone, captcha);
      if (res.success && res.data) {
        login(res.data);
        portalToast.success('登录成功');
        navigate('/user/home');
      } else {
        portalToast.error('登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`portal-skin min-h-screen bg-gradient-to-br from-on-surface via-primary/80 to-secondary/90 font-body ${
        isMobile ? 'py-6 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]' : 'py-10'
      }`}
    >
      <div className="mx-auto flex min-h-[min(100dvh,100vh)] max-w-md items-center px-6">
        <div className="w-full rounded-2xl border border-white/20 bg-surface-container-lowest/95 p-8 shadow-2xl backdrop-blur-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
              <span className="material-symbols-outlined text-3xl">account_balance</span>
            </div>
            <h1 className="font-headline text-2xl font-extrabold text-primary">{loginWelcome}</h1>
            <p className="mt-1 text-sm text-on-surface-variant">{loginSubtitle}</p>
            <p className="mx-auto mt-3 max-w-[280px] text-center text-[11px] leading-snug text-on-surface-variant/80">
              门户与后台管理各自独立登录；手机与网页可分别操作，诉求数据多端互通。
            </p>
          </div>

          <div className="mb-6 flex rounded-xl bg-surface p-1 text-sm font-bold">
            {(['account', 'phone', 'external'] as const).map((m) => (
              <PortalButton
                key={m}
                type="button"
                variant="ghost"
                className={`flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
                  mode === m ? 'bg-surface-container-lowest text-primary shadow-sm hover:bg-surface-container-lowest' : 'text-on-surface-variant'
                }`}
                onClick={() => {
                  setMode(m);
                }}
              >
                {m === 'account' ? '账号' : m === 'phone' ? '手机' : '校外'}
              </PortalButton>
            ))}
          </div>

          {mode === 'account' ? (
            <form onSubmit={accountLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-on-surface-variant">用户名</label>
                <input
                  className="w-full rounded-xl border border-outline-variant/40 px-4 py-3 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="用户名"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-on-surface-variant">密码</label>
                <input
                  type="password"
                  className="w-full rounded-xl border border-outline-variant/40 px-4 py-3 text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                />
              </div>
              <label className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded text-primary" />
                  记住我
                </span>
                <Link to="/user/forgot-password" className="font-semibold text-primary">
                  忘记密码？
                </Link>
              </label>
              <PortalButton type="submit" variant="primary" fullWidth size="lg" disabled={loading} className="shadow-lg shadow-primary/30">
                {loading ? '登录中…' : '登录'}
              </PortalButton>
              <p className="text-center text-[11px] leading-relaxed text-on-surface-variant/75">
                自助注册用户请使用注册时的密码；校方开通的初始账号默认密码为 <span className="font-mono">123456</span>，登录后请尽快修改
              </p>
            </form>
          ) : (
            <form onSubmit={phoneLogin} className="space-y-4">
              {mode === 'external' ? (
                <div className="rounded-xl bg-success/10 px-3 py-2 text-center text-sm font-medium text-success">校外用户请使用手机号登录</div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-bold text-on-surface-variant">手机号</label>
                <input
                  className="w-full rounded-xl border border-outline-variant/40 px-4 py-3"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="11 位手机号"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-on-surface-variant">验证码</label>
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-xl border border-outline-variant/40 px-4 py-3"
                    value={captcha}
                    onChange={(e) => setCaptcha(e.target.value)}
                    placeholder="请输入验证码"
                    required
                  />
                  <PortalButton type="button" variant="outline" size="md" className="flex-shrink-0 px-4 font-bold">
                    获取验证码
                  </PortalButton>
                </div>
              </div>
              <PortalButton type="submit" variant="primary" fullWidth size="lg" disabled={loading}>
                {loading ? '…' : '登录'}
              </PortalButton>
            </form>
          )}

          <p className="mt-8 border-t border-outline-variant/20 pt-6 text-center text-sm text-on-surface-variant">
            没有账号？
            <Link to="/user/register" className="ml-1 font-bold text-primary">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
