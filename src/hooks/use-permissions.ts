import { useAppStore } from '@/lib/store';
import { 
  hasPermission, 
  hasAnyPermission, 
  canAccessMenu,
  UserRole,
  Permission,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
} from '@/lib/permissions';

// 权限 Hook
export function usePermissions() {
  const { user } = useAppStore();
  const role = user?.role;

  return {
    // 当前用户角色
    role: role as UserRole | undefined,
    
    // 角色信息
    roleLabel: role ? ROLE_LABELS[role as UserRole] : undefined,
    roleDescription: role ? ROLE_DESCRIPTIONS[role as UserRole] : undefined,
    
    // 权限检查方法
    hasPermission: (permission: Permission) => hasPermission(role, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    canAccessMenu: (menu: string) => canAccessMenu(role, menu),
    
    // 常用权限快捷检查
    isAdmin: role === 'admin',
    isOperator: role === 'operator',
    isViewer: role === 'viewer',
    
    // 具体功能权限
    canBatchInbound: hasPermission(role, 'inbound:batch'),
    canBoxOutbound: hasPermission(role, 'outbound:box'),
    canManageUsers: hasPermission(role, 'users:manage'),
    canManageStorage: hasPermission(role, 'storage:manage'),
    canCreateInbound: hasPermission(role, 'inbound:create'),
    canCreateOutbound: hasPermission(role, 'outbound:create'),
  };
}
