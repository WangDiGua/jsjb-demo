import { useNavigate } from 'react-router-dom';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { PortalButton } from './ui';

const items = [
  { title: '统一身份认证', desc: 'OAuth2 / CAS 单点登录与账号打通', icon: 'link' as const },
  { title: '融合门户 / 待办', desc: '待办推送与门户单点跳转', icon: 'cloud' as const },
  { title: '企业微信 / H5', desc: '企业微信与 H5 消息触达', icon: 'smartphone' as const },
  { title: '数据中心 API', desc: '统计数据与指标同步接口', icon: 'hub' as const },
];

export default function IntegrationsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();

  const body = (
    <>
      {!isMobile ? (
        <>
          <h1 className="font-headline text-3xl font-bold text-on-surface">系统对接</h1>
          <p className="mt-2 text-on-surface-variant">以下为常见对接能力说明，具体实施方案以校方信息化规划为准。</p>
        </>
      ) : (
        <p className="mb-4 text-sm leading-relaxed text-on-surface-variant">
          以下为常见对接能力说明，具体实施方案以校方信息化规划为准。
        </p>
      )}

      <div
        className={`space-y-0 rounded-2xl border border-outline-variant/15 bg-surface-container-lowest shadow-sm ${isMobile ? 'mt-0' : 'mt-10'}`}
      >
        {items.map((item, i) => (
          <div
            key={item.title}
            className={`flex gap-4 ${isMobile ? 'px-4 py-4' : 'px-6 py-5'} ${i > 0 ? 'border-t border-outline-variant/15' : ''}`}
          >
            <span className="material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-12 sm:w-12">
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-on-surface">{item.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="系统对接" contentClassName="pt-2 pb-10">
        {body}
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PortalButton variant="link" size="md" className="mb-6 p-0 text-sm" onClick={() => navigate(-1)}>
        ← 返回
      </PortalButton>
      {body}
    </div>
  );
}
