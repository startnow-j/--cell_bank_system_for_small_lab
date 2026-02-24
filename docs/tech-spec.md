# 细胞库管理系统技术文档

> 版本: v1.0  
> 更新日期: 2025-02-14  
> 文档类型: 技术部署文档

---

## 一、系统概述

### 1.1 系统名称

**细胞库管理系统** (Cell Bank Management System)

### 1.2 系统简介

细胞库管理系统是一个专业的生物样本库管理平台，采用现代化的Web技术栈开发，支持细胞的入库、存储、出库和统计等全流程管理。系统具备响应式设计，支持PC端和移动端访问。

### 1.3 主要功能

- 存储位置管理（冰箱→架子→盒子三级结构）
- 细胞入库（单个入库、批量入库）
- 库存查询与可视化
- 细胞出库（单个出库、整盒出库）
- 统计报表与数据可视化
- 用户管理与权限控制

---

## 二、开发者信息

### 2.1 开发团队

| 项目 | 信息 |
|------|------|
| 开发者 | Z.ai Code |
| 开发时间 | 2025年2月 |
| 技术支持 | 通过系统界面反馈 |

### 2.2 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2025-02-14 | 初始版本发布 |

---

## 三、默认账户信息

### 3.1 管理员账户

系统初始化后，默认创建的管理员账户如下：

| 项目 | 值 |
|------|-----|
| **用户名** | admin |
| **邮箱** | admin@example.com |
| **密码** | admin123 |
| **角色** | 管理员 (admin) |

### 3.2 账户安全建议

> ⚠️ **重要提示**：首次登录后，请立即修改默认密码！

修改密码方法：
1. 登录系统
2. 点击左侧边栏用户信息旁的🔑图标
3. 输入旧密码和新密码
4. 点击「确认修改」

### 3.3 角色权限说明

系统提供三种角色：

| 角色 | 角色代码 | 权限范围 |
|------|---------|---------|
| 管理员 | admin | 全部功能，包括用户管理、批量入库、整盒出库 |
| 操作员 | operator | 单个入库/出库、库存查询、统计报表 |
| 观察员 | viewer | 仅查看数据，无操作权限 |

---

## 四、技术栈

### 4.1 前端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.x | React全栈框架 |
| React | 19.x | UI组件库 |
| TypeScript | 5.x | 类型安全的JavaScript |
| Tailwind CSS | 4.x | 原子化CSS框架 |
| shadcn/ui | latest | UI组件库 |
| TanStack Query | 5.x | 数据请求与缓存 |
| Zustand | 5.x | 全局状态管理 |
| Recharts | 2.x | 图表可视化 |
| date-fns | 4.x | 日期处理 |
| xlsx | 0.18.x | Excel文件解析 |
| Lucide React | latest | 图标库 |

### 4.2 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js API Routes | 16.x | 后端API服务 |
| Prisma | 6.x | ORM数据库工具 |
| SQLite | 3.x | 嵌入式数据库 |
| bcrypt | latest | 密码加密 |

### 4.3 开发工具

| 工具 | 用途 |
|------|------|
| Bun | JavaScript运行时与包管理器 |
| ESLint | 代码质量检查 |
| TypeScript | 类型检查 |

---

## 五、系统架构

### 5.1 项目结构

```
/home/z/my-project/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API路由
│   │   │   ├── batches/        # 批次相关API
│   │   │   ├── boxes/          # 盒子相关API
│   │   │   ├── cells/          # 细胞相关API
│   │   │   ├── freezers/       # 冰箱相关API
│   │   │   ├── inbound/        # 入库相关API
│   │   │   ├── login/          # 登录API
│   │   │   ├── outbound/       # 出库相关API
│   │   │   ├── racks/          # 架子相关API
│   │   │   ├── stats/          # 统计相关API
│   │   │   └── users/          # 用户相关API
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 主页面
│   │   └── globals.css         # 全局样式
│   │
│   ├── components/             # React组件
│   │   ├── pages/              # 页面组件
│   │   ├── ui/                 # UI基础组件
│   │   ├── app-sidebar.tsx     # 侧边栏
│   │   └── providers.tsx       # 上下文提供者
│   │
│   ├── hooks/                  # 自定义Hooks
│   ├── lib/                    # 工具函数
│   │   ├── auth.ts             # 权限验证
│   │   ├── db.ts               # 数据库连接
│   │   ├── permissions.ts      # 权限定义
│   │   ├── store.ts            # 状态管理
│   │   └── utils.ts            # 工具函数
│   │
│   └── types/                  # TypeScript类型定义
│
├── prisma/
│   ├── schema.prisma           # 数据库模型定义
│   └── dev.db                  # SQLite数据库文件
│
├── docs/                       # 文档目录
│   ├── user-manual.md          # 用户使用说明书
│   ├── tech-spec.md            # 技术文档（本文档）
│   ├── inbound-module-spec.md  # 入库模块技术文档
│   ├── outbound-module-spec.md # 出库模块技术文档
│   ├── inventory-module-spec.md# 库存查询技术文档
│   ├── reports-module-spec.md  # 统计报表技术文档
│   └── user-management-spec.md # 用户管理技术文档
│
├── public/                     # 静态资源
├── package.json                # 项目配置
├── tsconfig.json               # TypeScript配置
├── tailwind.config.ts          # Tailwind配置
└── bun.lockb                   # 依赖锁定文件
```

### 5.2 数据库模型

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Freezer   │────→│    Rack     │────→│    Box      │
│  (冰箱)      │     │   (架子)     │     │   (盒子)     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ OperationLog│←────│    Cell     │←────│  CellBatch  │
│  (操作日志)  │     │   (细胞)     │     │   (批次)     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    User     │
                    │   (用户)     │
                    └─────────────┘
```

### 5.3 API路由一览

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/login` | POST | 用户登录 |
| `/api/users` | GET, POST | 用户列表/创建 |
| `/api/users/[id]` | PUT, DELETE | 用户更新/删除 |
| `/api/users/change-password` | POST | 修改密码 |
| `/api/freezers` | GET, POST | 冰箱列表/创建 |
| `/api/freezers/[id]` | PUT, DELETE | 冰箱更新/删除 |
| `/api/racks` | GET, POST | 架子列表/创建 |
| `/api/racks/[id]` | PUT, DELETE | 架子更新/删除 |
| `/api/boxes` | GET, POST | 盒子列表/创建 |
| `/api/boxes/[id]` | GET, PUT, DELETE | 盒子详情/更新/删除 |
| `/api/cells` | POST | 创建细胞（入库） |
| `/api/batches` | GET | 批次列表 |
| `/api/batches/[id]` | GET | 批次详情 |
| `/api/inbound/batch/preview` | POST | 批量入库预览 |
| `/api/inbound/batch` | POST | 批量入库执行 |
| `/api/inbound/template` | GET | 下载入库模板 |
| `/api/outbound` | POST | 细胞出库 |
| `/api/outbound/box` | POST | 整盒出库 |
| `/api/outbound/records` | GET | 出库记录 |
| `/api/stats` | GET | 基础统计数据 |
| `/api/stats/time-range` | GET | 时间范围统计 |

---

## 六、部署说明

### 6.1 环境要求

| 项目 | 要求 |
|------|------|
| Node.js | >= 18.x 或 Bun >= 1.x |
| 操作系统 | Linux / macOS / Windows |
| 内存 | >= 512MB |
| 存储 | >= 100MB |

### 6.2 安装步骤

```bash
# 1. 克隆项目（如适用）
git clone <repository-url>
cd my-project

# 2. 安装依赖
bun install

# 3. 初始化数据库
bun run db:push

# 4. 启动开发服务器
bun run dev

# 5. 生产构建
bun run build
bun run start
```

### 6.3 环境变量

创建 `.env` 文件（如需自定义）：

```env
# 数据库路径（可选，默认为 prisma/dev.db）
DATABASE_URL="file:./prisma/dev.db"
```

### 6.4 端口配置

- **开发模式**: 默认端口 3000
- **生产模式**: 可通过 `PORT` 环境变量配置

---

## 七、数据库配置

### 7.1 数据库类型

系统使用 **SQLite** 嵌入式数据库，数据文件位于 `prisma/dev.db`。

### 7.2 数据模型

```prisma
// 用户模型
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  role      String   @default("viewer")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// 冰箱模型
model Freezer {
  id        String   @id @default(cuid())
  name      String   @unique
  remark    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  racks     Rack[]
}

// 架子模型
model Rack {
  id         String   @id @default(cuid())
  name       String
  freezerId  String
  capacity   Int?
  remark     String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  freezer    Freezer  @relation(...)
  boxes      Box[]
}

// 盒子模型
model Box {
  id        String   @id @default(cuid())
  name      String
  rackId    String
  rows      Int      @default(10)
  cols      Int      @default(10)
  remark    String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  rack      Rack     @relation(...)
  cells     Cell[]
}

// 细胞批次模型
model CellBatch {
  id            String   @id @default(cuid())
  batchCode     String?
  name          String
  cellType      String
  passage       String
  totalQuantity Int
  freezeDate    DateTime
  freezeMedium  String?
  donorInfo     String?
  cultureInfo   String?
  remark        String?
  operator      String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  cells         Cell[]
}

// 细胞样本模型
model Cell {
  id           String   @id @default(cuid())
  code         String?
  positionRow  Int
  positionCol  Int
  status       String   @default("stored")
  remark       String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  batchId      String
  batch        CellBatch @relation(...)
  boxId        String
  box          Box      @relation(...)
  logs         OperationLog[]
}

// 操作日志模型
model OperationLog {
  id         String   @id @default(cuid())
  operation  String
  quantity   Int?
  reason     String?
  operator   String?
  remark     String?
  createdAt  DateTime @default(now())
  cellId     String?
  cell       Cell?    @relation(...)
  batchId    String?
}
```

### 7.3 数据备份

```bash
# 备份数据库
cp prisma/dev.db prisma/dev.db.backup

# 或导出SQL
sqlite3 prisma/dev.db .dump > backup.sql
```

---

## 八、安全配置

### 8.1 密码安全

- 密码使用 **bcrypt** 加密存储
- 密码最小长度：6位
- 建议首次登录后立即修改默认密码

### 8.2 权限控制

- 前端：菜单可见性控制
- 后端：API权限验证
- 所有操作记录日志

### 8.3 安全建议

1. 修改默认管理员密码
2. 定期备份数据库
3. 生产环境使用HTTPS
4. 限制服务器访问IP（如适用）

---

## 九、维护与故障排除

### 9.1 日志查看

开发服务器日志位于 `/home/z/my-project/dev.log`

```bash
# 查看最近日志
tail -100 dev.log
```

### 9.2 常见问题

| 问题 | 解决方案 |
|------|---------|
| 数据库连接失败 | 检查 `prisma/dev.db` 文件是否存在 |
| 登录失败 | 确认用户存在且密码正确 |
| 批量入库失败 | 检查Excel格式和位置是否可用 |
| 图表不显示 | 检查是否有数据，移动端不显示图表 |

### 9.3 重置系统

```bash
# 重置数据库
rm prisma/dev.db
bun run db:push

# 重启服务
bun run dev
```

---

## 十、相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 用户使用说明书 | `/docs/user-manual.md` | 面向用户的操作指南 |
| 入库模块技术文档 | `/docs/inbound-module-spec.md` | 入库功能技术细节 |
| 出库模块技术文档 | `/docs/outbound-module-spec.md` | 出库功能技术细节 |
| 库存查询技术文档 | `/docs/inventory-module-spec.md` | 库存查询技术细节 |
| 统计报表技术文档 | `/docs/reports-module-spec.md` | 统计报表技术细节 |
| 用户管理技术文档 | `/docs/user-management-spec.md` | 用户管理技术细节 |

---

## 十一、联系方式

如有技术问题或建议，请通过以下方式联系：

- **系统反馈**：通过系统界面提交反馈
- **技术文档**：查阅 `/docs` 目录下的相关文档

---

**文档结束**
