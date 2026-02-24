# 用户管理与密码修改模块技术说明文档

> 文档版本: v1.0  
> 更新日期: 2025-02-14  
> 模块路径: 
> - 用户管理: `/src/components/pages/users-page.tsx`
> - 密码修改: `/src/components/app-sidebar.tsx`

---

## 一、功能概述

用户管理模块是冻存细胞库管理系统的权限控制核心，提供用户CRUD操作和角色权限管理功能。

| 功能 | 描述 | 权限 |
|------|------|------|
| 用户列表 | 查看、搜索系统用户 | 仅管理员 |
| 新增用户 | 创建新用户并分配角色 | 仅管理员 |
| 编辑用户 | 修改用户信息和角色 | 仅管理员 |
| 删除用户 | 删除系统用户（不可删除自己） | 仅管理员 |
| 修改密码 | 用户修改自己的登录密码 | 所有用户 |

---

## 二、数据结构

### 2.1 用户模型 (User)

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique     // 邮箱（唯一）
  name      String               // 用户名
  password  String               // 密码（bcrypt加密）
  role      String   @default("viewer") // 角色: admin/operator/viewer
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### 2.2 角色体系

系统定义了三种角色，权限从高到低：

| 角色 | 标识 | 描述 | 权限范围 |
|------|------|------|---------|
| 管理员 | `admin` | 最高权限 | 全部功能，包括用户管理、批量入库、整盒出库 |
| 细胞操作员 | `operator` | 操作权限 | 库存查询、单个入库、单个出库、查看报表 |
| 观察员 | `viewer` | 只读权限 | 仅查看库存和记录，无操作权限 |

### 2.3 权限定义

```typescript
// src/lib/permissions.ts
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
```

### 2.4 角色权限映射

```typescript
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
```

---

## 三、前端组件结构

### 3.1 用户管理页面

```
UsersPage (主页面)
├── 头部区域
│   ├── 标题和描述
│   └── 操作按钮（刷新、新增用户）
├── 搜索区域
│   └── 搜索输入框 + 搜索按钮
├── 用户列表表格
│   ├── 表头（用户名、邮箱、角色、创建时间、操作）
│   └── 用户行
│       ├── 用户头像（首字母）
│       ├── 用户名 + 当前用户标记
│       ├── 邮箱
│       ├── 角色Badge
│       ├── 创建时间
│       └── 操作按钮（编辑、删除）
├── 分页控件
├── 新增/编辑用户弹窗
│   ├── 邮箱输入
│   ├── 姓名输入
│   ├── 密码输入（新增必填，编辑可选）
│   └── 角色选择（带说明）
└── 删除确认弹窗
```

### 3.2 修改密码功能

```
AppSidebar (侧边栏)
├── 用户信息区域
│   ├── 用户头像
│   ├── 用户名和邮箱
│   └── 修改密码按钮（钥匙图标）
└── 修改密码弹窗
    ├── 旧密码输入
    ├── 新密码输入
    ├── 确认新密码输入
    └── 确认/取消按钮
```

### 3.3 状态管理

```typescript
// 用户管理页面状态
const [search, setSearch] = useState('');
const [page, setPage] = useState(1);
const [editDialog, setEditDialog] = useState(false);
const [deleteDialog, setDeleteDialog] = useState(false);
const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
const [isCreating, setIsCreating] = useState(false);
const [formData, setFormData] = useState({
  email: '',
  name: '',
  password: '',
  role: 'viewer' as UserRole,
});

// 修改密码状态
const [passwordDialog, setPasswordDialog] = useState(false);
const [passwordForm, setPasswordForm] = useState({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});
```

---

## 四、API接口

### 4.1 用户列表查询

**接口**: `GET /api/users`

**查询参数**:
- `search`: 搜索关键词（匹配用户名或邮箱）
- `page`: 页码（默认1）
- `pageSize`: 每页数量（默认20）

**响应**:
```json
{
  "users": [
    {
      "id": "xxx",
      "email": "admin@example.com",
      "name": "管理员",
      "role": "admin",
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 20
}
```

**权限**: `users:manage`（仅管理员）

### 4.2 创建用户

**接口**: `POST /api/users`

**请求体**:
```json
{
  "email": "user@example.com",
  "name": "新用户",
  "password": "password123",
  "role": "operator"
}
```

**响应**:
```json
{
  "id": "xxx",
  "email": "user@example.com",
  "name": "新用户",
  "role": "operator",
  "createdAt": "2025-02-14T00:00:00.000Z"
}
```

**验证规则**:
- 邮箱必填且唯一
- 姓名必填
- 密码必填
- 角色值必须是 `admin`、`operator` 或 `viewer`

**密码处理**: 使用 `bcryptjs` 加密存储
```typescript
const hashedPassword = await hash(password, 10);
```

### 4.3 更新用户

**接口**: `PUT /api/users/[id]`

**请求体**:
```json
{
  "email": "newemail@example.com",
  "name": "新名称",
  "password": "newpassword",  // 可选，留空则不修改
  "role": "admin"
}
```

**响应**: 返回更新后的用户信息

### 4.4 删除用户

**接口**: `DELETE /api/users/[id]?currentUserId=xxx`

**验证规则**:
- 不能删除自己（currentUserId校验）
- 用户必须存在

**响应**:
```json
{
  "message": "用户已删除"
}
```

### 4.5 修改密码

**接口**: `POST /api/users/change-password`

**请求体**:
```json
{
  "userId": "xxx",
  "oldPassword": "oldpass123",
  "newPassword": "newpass456"
}
```

**验证规则**:
- 所有字段必填
- 新密码长度至少6位
- 旧密码必须正确

**密码兼容处理**:
```typescript
// 兼容明文密码和加密密码
const isHashed = user.password.startsWith('$2');
let isValidPassword = false;

if (isHashed) {
  isValidPassword = await compare(oldPassword, user.password);
} else {
  // 兼容明文密码（旧数据）
  isValidPassword = user.password === oldPassword;
}
```

**响应**:
```json
{
  "message": "密码修改成功"
}
```

---

## 五、权限控制实现

### 5.1 权限工具函数

```typescript
// src/lib/permissions.ts

// 检查是否有某个权限
export function hasPermission(role: string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role as UserRole];
  return permissions?.includes(permission) ?? false;
}

// 检查是否有任意一个权限
export function hasAnyPermission(role: string | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
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
```

### 5.2 权限Hook

```typescript
// src/hooks/use-permissions.ts
export function usePermissions() {
  const { user } = useAppStore();
  const role = user?.role as UserRole | undefined;

  return {
    role,
    isAdmin: role === 'admin',
    isOperator: role === 'operator',
    isViewer: role === 'viewer',
    canManageUsers: hasPermission(role, 'users:manage'),
    canBatchInbound: hasPermission(role, 'inbound:batch'),
    canBoxOutbound: hasPermission(role, 'outbound:box'),
    canInbound: hasPermission(role, 'inbound:create'),
    canOutbound: hasPermission(role, 'outbound:create'),
  };
}
```

### 5.3 菜单过滤

```typescript
// src/components/app-sidebar.tsx
const menuItems = allMenuItems.filter((item) => {
  // 仪表盘所有人都能看
  if (item.permissionKey === 'dashboard') return true;
  // 其他菜单根据权限判断
  const permissions = MENU_PERMISSIONS[item.permissionKey];
  if (!permissions) return true;
  return hasAnyPermission(role, permissions);
});
```

---

## 六、关键功能实现

### 6.1 密码加密

```typescript
import { hash, compare } from 'bcryptjs';

// 创建用户时加密密码
const hashedPassword = await hash(password, 10);

// 验证密码（兼容明文和加密）
const isHashed = user.password.startsWith('$2');
if (isHashed) {
  isValid = await compare(inputPassword, user.password);
} else {
  isValid = inputPassword === user.password;
  // 自动升级为加密密码
  if (isValid) {
    await db.user.update({
      where: { id: user.id },
      data: { password: await hash(inputPassword, 10) }
    });
  }
}
```

### 6.2 登录验证

```typescript
// src/app/api/login/route.ts
export async function POST(request: Request) {
  const { email, password } = await request.json();
  
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 401 });
  }

  // 兼容明文和加密密码
  const isHashed = user.password.startsWith('$2');
  let isValid = false;
  
  if (isHashed) {
    isValid = await compare(password, user.password);
  } else {
    isValid = password === user.password;
    // 自动升级密码
    if (isValid) {
      await db.user.update({
        where: { id: user.id },
        data: { password: await hash(password, 10) }
      });
    }
  }

  if (!isValid) {
    return NextResponse.json({ error: '密码错误' }, { status: 401 });
  }

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
}
```

### 6.3 表单验证

```typescript
// 用户表单验证
const handleSubmit = () => {
  if (!formData.email.trim()) {
    toast({ title: '请输入邮箱', variant: 'destructive' });
    return;
  }
  if (!formData.name.trim()) {
    toast({ title: '请输入姓名', variant: 'destructive' });
    return;
  }
  if (isCreating && !formData.password.trim()) {
    toast({ title: '请输入密码', variant: 'destructive' });
    return;
  }
  // ... 提交逻辑
};

// 修改密码表单验证
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
  // ... 提交逻辑
};
```

### 6.4 防止自我删除

```typescript
// 前端：禁用删除自己的按钮
<Button
  variant="ghost"
  size="sm"
  onClick={() => openDeleteDialog(user)}
  disabled={user.id === currentUser?.id}  // 禁用当前用户
  className="text-destructive hover:text-destructive"
>
  <Trash2 className="w-4 h-4" />
</Button>

// 后端：二次验证
const currentUserId = url.searchParams.get('currentUserId');
if (id === currentUserId) {
  return NextResponse.json({ error: '不能删除自己' }, { status: 400 });
}
```

---

## 七、用户界面设计

### 7.1 角色Badge样式

```tsx
<Badge
  variant={user.role === 'admin' ? 'default' : 'secondary'}
  className={
    user.role === 'admin' 
      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' 
      : user.role === 'operator'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
  }
>
  {/* 角色图标和文字 */}
</Badge>
```

### 7.2 角色选择器

```tsx
<Select value={formData.role} onValueChange={...}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="admin">
      <Shield className="w-4 h-4 text-purple-500" />
      管理员
    </SelectItem>
    <SelectItem value="operator">
      <User className="w-4 h-4 text-blue-500" />
      细胞操作员
    </SelectItem>
    <SelectItem value="viewer">
      <User className="w-4 h-4 text-gray-500" />
      观察员
    </SelectItem>
  </SelectContent>
</Select>

{/* 角色说明 */}
<div className="space-y-1 text-xs text-muted-foreground">
  <p><Shield /> <strong>管理员：</strong>{ROLE_DESCRIPTIONS.admin}</p>
  <p><User /> <strong>细胞操作员：</strong>{ROLE_DESCRIPTIONS.operator}</p>
  <p><User /> <strong>观察员：</strong>{ROLE_DESCRIPTIONS.viewer}</p>
</div>
```

---

## 八、文件依赖

### 8.1 前端文件

```
src/components/pages/users-page.tsx    # 用户管理页面 (约610行)
src/components/app-sidebar.tsx         # 侧边栏（含修改密码功能）
src/hooks/use-permissions.ts           # 权限Hook
src/lib/permissions.ts                 # 权限工具函数
src/lib/store.ts                       # 全局状态管理
```

### 8.2 后端API

```
src/app/api/users/route.ts             # 用户列表、创建用户
src/app/api/users/[id]/route.ts        # 更新、删除用户
src/app/api/users/change-password/route.ts  # 修改密码
src/app/api/login/route.ts             # 登录验证
```

### 8.3 外部依赖

```json
{
  "bcryptjs": "^2.4.3",              // 密码加密
  "@tanstack/react-query": "^5.82.0", // 数据请求
  "zustand": "^5.0.6"                // 状态管理
}
```

---

## 九、注意事项

### 9.1 安全考虑

- 密码使用bcrypt加密存储，salt rounds = 10
- 支持从明文密码自动升级到加密密码
- 用户不能删除自己
- 编辑用户时密码可选（留空不修改）

### 9.2 数据一致性

- 邮箱唯一性约束
- 角色值必须是预定义的三种之一
- 新密码长度至少6位

### 9.3 用户体验

- 当前用户显示"当前用户"标记
- 删除操作需要二次确认
- 角色选择器包含权限说明
- 表单错误即时反馈

### 9.4 密码修改入口

- 入口位置：侧边栏用户信息区域，钥匙图标按钮
- 所有登录用户都可以修改自己的密码
- 修改成功后提示用户使用新密码登录

---

## 十、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2025-02-14 | 初始版本，完成用户管理和密码修改功能文档 |

---

## 十一、相关文档

- [入库模块说明](./inbound-module-spec.md)
- [出库模块说明](./outbound-module-spec.md)
- [库存查询模块说明](./inventory-module-spec.md)
- [Prisma Schema](../prisma/schema.prisma)
