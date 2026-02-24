// 角色类型定义
export type UserRole = 'admin' | 'operator' | 'viewer';

// 权限类型定义
export type Permission = 
  | 'inventory:read'      // 库存查询
  | 'inbound:create'      // 新增入库
  | 'inbound:batch'       // 批量入库
  | 'inbound:read'        // 入库记录
  | 'outbound:create'     // 取出细胞
  | 'outbound:box'        // 整盒出库
  | 'outbound:read'       // 出库记录
  | 'reports:read'        // 统计报表
  | 'users:manage'        // 用户管理
  | 'storage:manage';     // 存储管理

// 角色权限映射
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'inventory:read',
    'inbound:create',
    'inbound:batch',
    'inbound:read',
    'outbound:create',
    'outbound:box',
    'outbound:read',
    'reports:read',
    'users:manage',
    'storage:manage',
  ],
  operator: [
    'inventory:read',
    'inbound:create',
    'inbound:read',
    'outbound:create',
    'outbound:read',
    'reports:read',
  ],
  viewer: [
    'inventory:read',
    'inbound:read',
    'outbound:read',
    'reports:read',
  ],
};

// 角色显示名称
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '管理员',
  operator: '细胞操作员',
  viewer: '观察员',
};

// 角色描述
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: '最高权限，可进行全部操作，包括用户管理',
  operator: '可查询库存、单个入库、单个出库，不能批量入库和整盒出库',
  viewer: '仅可查询库存和查看记录，无操作权限',
};

// 检查用户是否有某个权限
export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions?.includes(permission) ?? false;
}

// 检查用户是否有多个权限中的任意一个
export function hasAnyPermission(role: string | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

// 检查用户是否有所有权限
export function hasAllPermissions(role: string | undefined, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

// 获取用户所有权限
export function getUserPermissions(role: string | undefined): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role as UserRole] ?? [];
}

// 菜单权限映射
export const MENU_PERMISSIONS: Record<string, Permission[]> = {
  inventory: ['inventory:read'],
  inbound: ['inbound:create', 'inbound:read'],
  outbound: ['outbound:create', 'outbound:read'],
  reports: ['reports:read'],
  users: ['users:manage'],
  storage: ['storage:manage'],
};

// 检查是否可以访问某个菜单
export function canAccessMenu(role: string | undefined, menu: string): boolean {
  const permissions = MENU_PERMISSIONS[menu];
  if (!permissions) return false;
  return hasAnyPermission(role, permissions);
}
