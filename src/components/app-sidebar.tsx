'use client';

import { useAppStore, type MenuItem } from '@/lib/store';
import { usePermissions } from '@/hooks/use-permissions';
import { hasAnyPermission, MENU_PERMISSIONS } from '@/lib/permissions';
import {
  LayoutDashboard,
  MapPin,
  PackagePlus,
  Search,
  LogOut,
  PackageMinus,
  BarChart3,
  Users,
  Menu,
  X,
  Snowflake,
  KeyRound,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

const allMenuItems: { id: MenuItem; label: string; icon: React.ReactNode; permissionKey: string }[] = [
  { id: 'dashboard', label: '仪表盘', icon: <LayoutDashboard className="w-5 h-5" />, permissionKey: 'dashboard' },
  { id: 'locations', label: '存储位置', icon: <MapPin className="w-5 h-5" />, permissionKey: 'storage' },
  { id: 'inbound', label: '细胞入库', icon: <PackagePlus className="w-5 h-5" />, permissionKey: 'inbound' },
  { id: 'inventory', label: '库存查询', icon: <Search className="w-5 h-5" />, permissionKey: 'inventory' },
  { id: 'outbound', label: '细胞出库', icon: <PackageMinus className="w-5 h-5" />, permissionKey: 'outbound' },
  { id: 'reports', label: '统计报表', icon: <BarChart3 className="w-5 h-5" />, permissionKey: 'reports' },
  { id: 'users', label: '用户管理', icon: <Users className="w-5 h-5" />, permissionKey: 'users' },
];

export function AppSidebar() {
  const { currentMenu, setCurrentMenu, user, sidebarOpen, setSidebarOpen } = useAppStore();
  const { role } = usePermissions();

  // 修改密码相关状态
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 根据角色过滤菜单
  const menuItems = allMenuItems.filter((item) => {
    // 仪表盘所有人都能看
    if (item.permissionKey === 'dashboard') return true;
    // 其他菜单根据权限判断
    const permissions = MENU_PERMISSIONS[item.permissionKey];
    if (!permissions) return true;
    return hasAnyPermission(role, permissions);
  });

  // 修改密码 mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { userId: string; oldPassword: string; newPassword: string }) => {
      const res = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || '修改密码失败');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: '密码修改成功', description: '请使用新密码登录' });
      setPasswordDialog(false);
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (error: Error) => {
      toast({ title: '修改失败', description: error.message, variant: 'destructive' });
    },
  });

  // 处理修改密码
  const handleChangePassword = () => {
    if (!passwordForm.oldPassword) {
      toast({ title: '请输入旧密码', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: '新密码至少6位', variant: 'destructive' });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: '两次密码不一致', variant: 'destructive' });
      return;
    }
    if (!user?.id) return;

    changePasswordMutation.mutate({
      userId: user.id,
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <>
      {/* 移动端遮罩层 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0 lg:static lg:z-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Snowflake className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">细胞库</h1>
            <p className="text-xs text-muted-foreground">管理系统</p>
          </div>
          {/* 移动端关闭按钮 */}
          <button
            className="lg:hidden ml-auto p-1 hover:bg-accent rounded"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 用户信息 */}
        {user && (
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-accent/50">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => setPasswordDialog(true)}
                title="修改密码"
              >
                <KeyRound className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* 导航菜单 */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setCurrentMenu(item.id);
                setSidebarOpen(false);
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                currentMenu === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* 底部 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={() => {
              useAppStore.getState().setUser(null);
              useAppStore.getState().setCurrentMenu('dashboard');
            }}
          >
            <LogOut className="w-5 h-5" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* 修改密码弹窗 */}
      <Dialog open={passwordDialog} onOpenChange={setPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>旧密码</Label>
              <Input
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                placeholder="请输入旧密码"
              />
            </div>
            <div className="space-y-2">
              <Label>新密码</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="至少6位"
              />
            </div>
            <div className="space-y-2">
              <Label>确认新密码</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="再次输入新密码"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialog(false)}>
              取消
            </Button>
            <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              确认修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// 移动端菜单按钮
export function MobileMenuButton() {
  const { setSidebarOpen } = useAppStore();

  return (
    <button
      className="lg:hidden p-2 hover:bg-accent rounded-lg"
      onClick={() => setSidebarOpen(true)}
    >
      <Menu className="w-6 h-6" />
    </button>
  );
}
