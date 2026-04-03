import { create } from 'zustand';
import type { User, Appeal } from '@/mock/types';
import { currentStorageSurface, writeStoredUser } from './sessionSplit';

interface AppState {
  currentUser: User | null;
  isLoggedIn: boolean;
  isMobile: boolean;
  setCurrentUser: (user: User | null) => void;
  setLoggedIn: (loggedIn: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
  /** @deprecated 会话由 SessionRoot 按路由同步；保留空实现以免旧引用报错 */
  hydrateFromStorage: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  isLoggedIn: false,
  isMobile: typeof window !== 'undefined' && window.innerWidth < 768,
  setCurrentUser: (user) => set({ currentUser: user }),
  setLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
  setIsMobile: (isMobile) => set({ isMobile }),
  login: (user) => {
    writeStoredUser(currentStorageSurface(), user);
    set({ currentUser: user, isLoggedIn: true });
  },
  logout: () => {
    writeStoredUser(currentStorageSurface(), null);
    set({ currentUser: null, isLoggedIn: false });
  },
  hydrateFromStorage: () => {},
}));

interface AppealState {
  appeals: Appeal[];
  currentAppeal: Appeal | null;
  myAppeals: Appeal[];
  setAppeals: (appeals: Appeal[]) => void;
  setCurrentAppeal: (appeal: Appeal | null) => void;
  setMyAppeals: (appeals: Appeal[]) => void;
  addAppeal: (appeal: Appeal) => void;
  updateAppeal: (id: string, updates: Partial<Appeal>) => void;
  removeAppeal: (id: string) => void;
}

export const useAppealStore = create<AppealState>((set) => ({
  appeals: [],
  currentAppeal: null,
  myAppeals: [],
  setAppeals: (appeals) => set({ appeals }),
  setCurrentAppeal: (appeal) => set({ currentAppeal: appeal }),
  setMyAppeals: (appeals) => set({ myAppeals: appeals }),
  addAppeal: (appeal) => set((state) => ({ appeals: [appeal, ...state.appeals] })),
  updateAppeal: (id, updates) => set((state) => ({
    appeals: state.appeals.map(a => a.id === id ? { ...a, ...updates } : a),
  })),
  removeAppeal: (id) => set((state) => ({
    appeals: state.appeals.filter(a => a.id !== id),
  })),
}));
