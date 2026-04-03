import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

type ScrollToTopProps = {
  /** 若页面滚动容器不是 window（如移动端 .mobile-content），传入该元素 */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
};

/**
 * 路由切换时将窗口或指定容器滚回顶部，避免「从长页底部进入新页仍在底部」
 */
export default function ScrollToTop({ scrollContainerRef }: ScrollToTopProps) {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    const el = scrollContainerRef?.current;
    if (el) {
      el.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
  }, [pathname, search]);

  return null;
}
