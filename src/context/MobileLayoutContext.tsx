import { createContext, useContext } from 'react';

/** 为 true 时表示当前处于移动端壳（含 iframe 窄屏或强制 viewport） */
export const MobileLayoutContext = createContext(false);

export function useIsMobileLayout() {
  return useContext(MobileLayoutContext);
}
