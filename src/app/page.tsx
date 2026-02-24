'use client';

import { useAppStore } from '@/lib/store';
import { AppSidebar, MobileMenuButton } from '@/components/app-sidebar';
import { LoginPage } from '@/components/pages/login-page';
import { DashboardPage } from '@/components/pages/dashboard-page';
import { LocationsPage } from '@/components/pages/locations-page';
import { InboundPage } from '@/components/pages/inbound-page';
import { InventoryPage } from '@/components/pages/inventory-page';
import { OutboundPage } from '@/components/pages/outbound-page';
import { ReportsPage } from '@/components/pages/reports-page';
import { UsersPage } from '@/components/pages/users-page';

function MainContent() {
  const { currentMenu } = useAppStore();

  switch (currentMenu) {
    case 'dashboard':
      return <DashboardPage />;
    case 'locations':
      return <LocationsPage />;
    case 'inbound':
      return <InboundPage />;
    case 'inventory':
      return <InventoryPage />;
    case 'outbound':
      return <OutboundPage />;
    case 'reports':
      return <ReportsPage />;
    case 'users':
      return <UsersPage />;
    default:
      return <DashboardPage />;
  }
}

function AppLayout() {
  return (
    <div className="min-h-screen flex">
      {/* 侧边栏 */}
      <AppSidebar />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-card">
          <MobileMenuButton />
          <h1 className="text-lg font-semibold truncate">细胞库管理系统</h1>
        </header>

        {/* 内容区域 */}
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-muted/30">
          <MainContent />
        </main>

        {/* 页脚 */}
        <footer className="h-10 border-t border-border flex items-center justify-center text-xs text-muted-foreground bg-card">
          © 2026 细胞库管理系统
        </footer>
      </div>
    </div>
  );
}

export default function Home() {
  const { user } = useAppStore();

  // 未登录显示登录页面
  if (!user) {
    return <LoginPage />;
  }

  // 已登录显示主应用
  return <AppLayout />;
}
