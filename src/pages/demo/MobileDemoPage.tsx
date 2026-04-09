import { useLayoutEffect } from 'react';
import { Link } from 'react-router-dom';
import 'devices.css/dist/devices.css';

/**
 * 桌面端：常用手机尺寸设备框与 iframe，内嵌门户移动布局（窄视口）。
 */
export default function MobileDemoPage() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const iframeSrc = `${origin}/user/home`;

  /** 首帧即遮住 body 的浅色 surface，避免预览页「透出」门户/管理端的页面底色 */
  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevHtmlBg = html.style.backgroundColor;
    const prevBodyBg = body.style.backgroundColor;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    const shellBg = '#06080d';
    html.style.backgroundColor = shellBg;
    body.style.backgroundColor = shellBg;
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      html.style.backgroundColor = prevHtmlBg;
      body.style.backgroundColor = prevBodyBg;
    };
  }, []);

  return (
    <div className="jsjb-mobile-demo">
      <header className="jsjb-mobile-demo-header">
        <Link to="/user/home" className="jsjb-mobile-demo-back">
          <svg
            className="jsjb-mobile-demo-back-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M17 7l-7 7 7 7M3 12h14" />
          </svg>
          <span>返回 PC 首页</span>
        </Link>
        <div className="jsjb-mobile-demo-header-copy">
          <h1 className="jsjb-mobile-demo-title">移动端视窗</h1>
          <p className="jsjb-mobile-demo-desc">标准手机外观参考（银 · 窄屏布局）</p>
        </div>
      </header>

      <div className="jsjb-mobile-demo-stage">
        <div className="device device-iphone-14-pro device-silver jsjb-device-scale">
          <div className="device-frame">
            <iframe
              className="device-screen jsjb-device-iframe"
              title="接诉即办 移动端"
              src={iframeSrc}
            />
          </div>
          <div className="device-stripe" />
          <div className="device-header" />
          <div className="device-sensors" />
          <div className="device-btns" />
          <div className="device-power" />
          <div className="device-home" />
        </div>
      </div>

      <style>{`
        .jsjb-mobile-demo {
          --demo-fg: #f8fafc;
          --demo-fg-muted: rgba(248, 250, 252, 0.68);
          --demo-edge: rgba(255, 255, 255, 0.32);
          --demo-surface: rgba(255, 255, 255, 0.08);
          position: fixed;
          inset: 0;
          z-index: 2;
          width: 100vw;
          min-height: 100vh;
          min-height: 100dvh;
          max-height: 100dvh;
          background-color: #06080d;
          background-image: radial-gradient(ellipse 120% 80% at 50% 0%, #1a2744 0%, #0a0f18 45%, #06080d 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 16px 24px;
          box-sizing: border-box;
          overflow: hidden;
          isolation: isolate;
        }
        .jsjb-mobile-demo-header {
          flex-shrink: 0;
          width: 100%;
          max-width: 1200px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px 20px;
          margin-bottom: 12px;
          color: var(--demo-fg);
        }
        .jsjb-mobile-demo-back {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: var(--demo-fg) !important;
          text-decoration: none !important;
          border: 1px solid var(--demo-edge);
          background: var(--demo-surface);
          box-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
        }
        .jsjb-mobile-demo-back:hover {
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.14);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.08);
        }
        .jsjb-mobile-demo-back:focus-visible {
          outline: 2px solid rgba(147, 197, 253, 0.95);
          outline-offset: 2px;
        }
        .jsjb-mobile-demo-back-icon {
          flex-shrink: 0;
          opacity: 0.95;
        }
        .jsjb-mobile-demo-header-copy {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 6px 14px;
          min-width: 0;
        }
        .jsjb-mobile-demo-title {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--demo-fg);
          line-height: 1.3;
        }
        .jsjb-mobile-demo-desc {
          margin: 0;
          font-size: 13px;
          font-weight: 500;
          color: var(--demo-fg-muted);
          line-height: 1.4;
        }
        .jsjb-mobile-demo-stage {
          flex: 1;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 0;
          width: 100%;
          overflow: hidden;
        }
        .jsjb-device-scale {
          transform: scale(0.82);
          transform-origin: center center;
        }
        @media (max-height: 960px) {
          .jsjb-device-scale {
            transform: scale(0.74);
          }
        }
        @media (max-height: 820px) {
          .jsjb-device-scale {
            transform: scale(0.66);
          }
        }
        @media (max-height: 720px) {
          .jsjb-device-scale {
            transform: scale(0.58);
          }
        }
        @media (max-height: 640px) {
          .jsjb-device-scale {
            transform: scale(0.52);
          }
        }
        .jsjb-device-iframe {
          border: none;
          display: block;
          width: 390px;
          height: 830px;
          background: #fff;
          border-radius: inherit;
        }
      `}</style>
    </div>
  );
}
