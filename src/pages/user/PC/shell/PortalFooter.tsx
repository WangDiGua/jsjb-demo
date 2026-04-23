import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminConfigService } from '@/mock';

export default function PortalFooter() {
  const [platformTitle, setPlatformTitle] = useState('接诉即办');
  const [slogan, setSlogan] = useState('让每一次发声都有回响，让每一份职责都有迹可循。透明、可追溯的校园接诉即办共治平台。');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      void adminConfigService.getPlatformIdentityPublic().then((b) => {
        if (b.platformName?.trim()) setPlatformTitle(b.platformName.trim());
        if (b.slogan?.trim()) setSlogan(b.slogan.trim());
        setLogoUrl(b.logoDataUrl?.trim() ? b.logoDataUrl.trim() : null);
      });
    };
    load();
    window.addEventListener('jsjb-mock-updated', load);
    return () => window.removeEventListener('jsjb-mock-updated', load);
  }, []);

  return (
    <footer className="border-t border-outline-variant/45 bg-surface-container-lowest/72 pb-10 pt-20 dark:border-outline-variant/35">
      <div className="mx-auto w-full max-w-[var(--layout-max,1600px)] px-[var(--layout-px,2rem)]">
        <div className="mb-20 grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="mb-6 flex items-center gap-3">
              <div className="gov-seal-icon flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-sm">account_balance</span>
                )}
              </div>
              <span className="font-headline text-lg font-black text-on-surface">{platformTitle}</span>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-on-surface-variant">{slogan}</p>
            <div className="flex gap-4">
              <button
                type="button"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant ring-1 ring-outline-variant/40 transition-all hover:bg-primary hover:text-white"
                aria-label="分享"
              >
                <span className="material-symbols-outlined text-sm">share</span>
              </button>
              <button
                type="button"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant ring-1 ring-outline-variant/40 transition-all hover:bg-primary hover:text-white"
                aria-label="站点"
              >
                <span className="material-symbols-outlined text-sm">language</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-3 lg:grid-cols-4">
            <div>
              <h5 className="mb-6 font-bold text-on-surface">关于门户</h5>
              <ul className="space-y-4 text-sm text-on-surface-variant">
                <li>
                  <Link to="/user/home" className="transition-colors hover:text-primary">
                    共治首页
                  </Link>
                </li>
                <li>
                  <Link to="/user/appeal/list" className="transition-colors hover:text-primary">
                    诉求公开
                  </Link>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-primary">
                    隐私声明
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="mb-6 font-bold text-on-surface">师生服务</h5>
              <ul className="space-y-4 text-sm text-on-surface-variant">
                <li>
                  <Link to="/user/appeal/create" className="transition-colors hover:text-primary">
                    发起诉求
                  </Link>
                </li>
                <li>
                  <Link to="/user/appeal/my" className="transition-colors hover:text-primary">
                    我的诉求
                  </Link>
                </li>
                <li>
                  <Link to="/user/search" className="transition-colors hover:text-primary">
                    搜索与看板
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="mb-6 font-bold text-on-surface">技术支持</h5>
              <ul className="space-y-4 text-sm text-on-surface-variant">
                <li>
                  <Link to="/user/ai-assistant" className="transition-colors hover:text-primary">
                    智能问答
                  </Link>
                </li>
                <li>
                  <Link to="/user/integrations" className="transition-colors hover:text-primary">
                    系统对接说明
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="mb-6 font-bold text-on-surface">快速链接</h5>
              <ul className="space-y-4 text-sm text-on-surface-variant">
                <li>
                  <Link to="/user/departments" className="transition-colors hover:text-primary">
                    部门风采
                  </Link>
                </li>
                <li>
                  <a href="/mobile-frame" className="transition-colors hover:text-primary">
                    移动端视窗
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-outline-variant/30 pt-10 text-xs font-medium text-on-surface-variant/60 md:flex-row">
          <p>
            © {new Date().getFullYear()} {platformTitle}
          </p>
          <div className="flex gap-8">
            <a href="#" className="transition-colors hover:text-on-surface">
              无障碍说明
            </a>
            <a href="#" className="transition-colors hover:text-on-surface">
              联系支持
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
