import { create } from 'zustand';

// 导航菜单项
export type MenuItem = 
  | 'dashboard'    // 仪表盘
  | 'locations'    // 存储位置
  | 'inbound'      // 细胞入库
  | 'inventory'    // 库存查询
  | 'outbound'     // 细胞出库
  | 'reports'      // 统计报表
  | 'users';       // 用户管理

// 应用状态
interface AppState {
  currentMenu: MenuItem;
  setCurrentMenu: (menu: MenuItem) => void;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
  setUser: (user: AppState['user']) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentMenu: 'dashboard',
  setCurrentMenu: (menu) => set({ currentMenu: menu }),
  user: null,
  setUser: (user) => set({ user }),
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
