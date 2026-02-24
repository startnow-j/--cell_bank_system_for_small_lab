# 细胞入库模块技术说明文档

> 文档版本: v1.0  
> 更新日期: 2025-02-13  
> 模块路径: `/src/components/pages/inbound-page.tsx`

---

## 一、功能概述

细胞入库模块是冻存细胞库管理系统的核心功能之一，提供三种入库方式：

| 功能 | 描述 | 权限 |
|------|------|------|
| 新增入库 | 单个细胞的入库操作，手动填写信息并选择存储位置 | 所有用户 |
| 批次入库 | 通过上传Excel/CSV文件批量导入细胞数据 | 仅管理员 |
| 入库记录 | 查看历史入库记录，支持搜索和导出 | 所有用户 |

---

## 二、数据结构

### 2.1 细胞批次 (CellBatch)

```prisma
model CellBatch {
  id           String   @id @default(cuid())
  batchCode    String?  // 批次编号（可选）
  name         String   // 细胞名称（必填）
  cellType     String   // 细胞类型（必填）
  passage      String   // 代次（必填）
  totalQuantity Int     // 总数量（管）
  freezeDate   DateTime // 冻存日期
  freezeMedium String?  // 冻存液
  donorInfo    String?  // 供体信息
  cultureInfo  String?  // 培养条件
  remark       String?  // 备注
  operator     String?  // 操作人
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  cells        Cell[]   // 包含的细胞样本
}
```

### 2.2 细胞样本 (Cell)

```prisma
model Cell {
  id           String   @id @default(cuid())
  code         String?  // 细胞编号（可选）
  positionRow  Int      // 位置行号（1-26，对应A-Z）
  positionCol  Int      // 位置列号（1-...）
  status       String   @default("stored") // "stored" 或 "removed"
  remark       String?  // 备注
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  batchId      String   // 所属批次
  batch        CellBatch @relation(...)
  boxId        String   // 所属盒子
  box          Box      @relation(...)
  logs         OperationLog[] // 操作记录
}
```

### 2.3 存储位置层级

```
冰箱(Freezer) → 架子(Rack) → 盒子(Box) → 位置(Cell)
```

---

## 三、前端组件结构

### 3.1 组件层次

```
InboundPage (主页面)
├── Tabs (标签切换)
│   ├── TabsList
│   │   ├── TabsTrigger "新增入库"
│   │   ├── TabsTrigger "批次入库" (adminOnly)
│   │   └── TabsTrigger "入库记录"
│   │
│   ├── TabsContent "新增入库"
│   │   └── NewInboundForm
│   │       ├── 细胞信息表单 (左侧)
│   │       └── 存储位置选择 (右侧)
│   │
│   ├── TabsContent "批次入库"
│   │   └── BatchInboundForm
│   │       ├── 说明卡片
│   │       ├── 文件上传区域
│   │       ├── 校验结果统计
│   │       ├── 校验错误详情表格
│   │       └── 数据预览表格
│   │
│   └── TabsContent "入库记录"
│       └── InboundRecordsList
│           ├── 搜索栏
│           ├── 记录表格
│           ├── 分页控件
│           └── 详情弹窗
```

### 3.2 状态管理

使用 Zustand 进行全局状态管理：

```typescript
// src/lib/store.ts
interface AppState {
  currentMenu: MenuItem;
  setCurrentMenu: (menu: MenuItem) => void;
  user: { id, email, name, role } | null;
  setUser: (user) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}
```

使用 TanStack Query 进行服务器状态管理：

```typescript
// 查询键
['freezers']           // 冰箱列表
['box', boxId]         // 盒子详情
['inbound-records']    // 入库记录
['stats']              // 统计数据
```

---

## 四、API接口

### 4.1 新增入库

**接口**: `POST /api/cells`

**请求体**:
```json
{
  "code": "CELL-001",          // 可选
  "name": "HEK293",            // 必填
  "cellType": "贴壁细胞",       // 必填
  "passage": "P5",             // 必填
  "totalQuantity": "3",        // 必填
  "freezeDate": "2025-01-15",  // 必填
  "freezeMedium": "...",       // 可选
  "donorInfo": "...",          // 可选
  "cultureInfo": "...",        // 可选
  "operator": "张三",          // 可选
  "remark": "...",             // 可选
  "boxId": "xxx",              // 必填
  "positions": [               // 必填，数量需与totalQuantity一致
    { "row": 1, "col": 1 },
    { "row": 2, "col": 2 }
  ]
}
```

**权限**: `inbound:create` (admin, user)

### 4.2 批次入库预览

**接口**: `POST /api/inbound/batch/preview`

**请求**: `FormData` (multipart/form-data)
- `file`: CSV/XLSX/XLS文件

**响应**:
```json
{
  "preview": [...],      // 校验通过的数据
  "errors": [...],       // 校验错误列表
  "total": 10,           // 总行数
  "valid": 8             // 有效行数
}
```

### 4.3 批次入库执行

**接口**: `POST /api/inbound/batch`

**请求体**:
```json
{
  "data": [...],         // 预览接口返回的有效数据
  "operator": "张三"
}
```

**响应**:
```json
{
  "successCount": 8,
  "errorCount": 0,
  "errors": [...]        // 执行时的错误（如有）
}
```

### 4.4 入库记录查询

**接口**: `GET /api/batches`

**查询参数**:
- `search`: 搜索关键词
- `page`: 页码 (默认1)
- `pageSize`: 每页数量 (默认20)

---

## 五、批次入库模板

### 5.1 模板字段

| 字段名 | 是否必填 | 说明 |
|--------|---------|------|
| 细胞编号 | 可选 | 如 CELL-001 |
| 细胞名称* | 必填 | 如 HEK293 |
| 细胞类型* | 必填 | 如 贴壁细胞 |
| 代次* | 必填 | 如 P5 或 未知 |
| 冻存数量(管)* | 必填 | 整数，需与位置数量一致 |
| 冻存日期* | 必填 | 格式: YYYY-MM-DD |
| 冻存液 | 可选 | 如 10% DMSO + 90% FBS |
| 供体信息 | 可选 | 如 小鼠源 |
| 操作人 | 可选 | 操作者姓名 |
| 备注 | 可选 | 其他备注 |
| 冰箱名称* | 必填 | 需与系统中名称完全一致 |
| 架子名称* | 必填 | 需与系统中名称完全一致 |
| 盒子名称* | 必填 | 需与系统中名称完全一致 |
| 位置* | 必填 | 多个用逗号分隔，如 A1,B2,C3 |

### 5.2 后端列名映射

```typescript
// src/app/api/inbound/batch/preview/route.ts
const columnMapping: Record<string, string> = {
  '细胞编号': 'code',
  '细胞名称': 'name',
  '细胞名称*': 'name',          // 支持带星号
  '细胞类型': 'cellType',
  '细胞类型*': 'cellType',
  '代次': 'passage',
  '代次*': 'passage',
  '冻存数量(管)': 'quantity',
  '冻存数量(管)*': 'quantity',
  '冻存数量（管）': 'quantity',  // 支持全角括号
  '冻存数量（管）*': 'quantity',
  '冻存日期': 'freezeDate',
  '冻存日期*': 'freezeDate',
  '冻存液': 'freezeMedium',
  '供体信息': 'donorInfo',
  '操作人': 'operator',
  '备注': 'remark',
  '冰箱名称': 'freezerName',
  '冰箱名称*': 'freezerName',
  '架子名称': 'rackName',
  '架子名称*': 'rackName',
  '盒子名称': 'boxName',
  '盒子名称*': 'boxName',
  '位置': 'positions',
  '位置*': 'positions',
};
```

### 5.3 校验逻辑

```typescript
// 必填字段校验
const requiredFields = [
  { key: 'name', label: '细胞名称' },
  { key: 'cellType', label: '细胞类型' },
  { key: 'passage', label: '代次' },
  { key: 'quantity', label: '冻存数量(管)' },
  { key: 'freezeDate', label: '冻存日期' },
  { key: 'freezerName', label: '冰箱名称' },
  { key: 'rackName', label: '架子名称' },
  { key: 'boxName', label: '盒子名称' },
  { key: 'positions', label: '位置' },
];

// 位置数量校验
if (positions.length !== quantity) {
  return `位置数量(${positions.length})与冻存数量(${quantity})不一致`;
}

// 日期格式校验
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// 位置格式校验 (如 A1,B2,C3)
const positionRegex = /^([A-Za-z])(\d+)$/;
```

---

## 六、权限控制

### 6.1 权限定义

```typescript
// src/lib/auth.ts
type Permission = 
  | 'users:manage'    // 用户管理
  | 'inbound:create'  // 入库权限
  | 'outbound:create' // 普通出库
  | 'outbound:box';   // 整盒出库

const PERMISSION_CONFIG = {
  'users:manage': { roles: ['admin'] },
  'inbound:create': { roles: ['admin', 'user'] },
  'outbound:create': { roles: ['admin', 'user'] },
  'outbound:box': { roles: ['admin'] },
};
```

### 6.2 前端权限控制

```typescript
// src/hooks/use-permissions.ts
export function usePermissions() {
  const { user } = useAppStore();
  return {
    isAdmin: isAdmin(user?.role),
    canManageUsers: canManageUsers(user?.role),
    canBoxOutbound: canBoxOutbound(user?.role),
  };
}

// 批次入库Tab仅管理员可见
const allMenuItems = [
  // ...
  { id: 'inbound', label: '细胞入库', icon: ..., adminOnly: false },
  // 批次入库在Tab内部通过isAdmin控制
];
```

### 6.3 后端权限验证

```typescript
// 通过请求头传递用户ID
const userId = request.headers.get('x-user-id');

// 验证权限
const auth = await requirePermission(request, 'inbound:create');
if (!auth.authorized) {
  return auth.response; // 返回401/403错误
}
```

---

## 七、关键功能实现

### 7.1 位置选择器

```typescript
// 位置状态
const [selectedPositions, setSelectedPositions] = useState<Array<{ row: number; col: number }>>([]);

// 切换位置选择
const togglePosition = (row: number, col: number) => {
  const index = selectedPositions.findIndex(p => p.row === row && p.col === col);
  if (index >= 0) {
    // 取消选择
    setSelectedPositions(selectedPositions.filter((_, i) => i !== index));
  } else if (selectedPositions.length < targetQuantity) {
    // 添加选择
    setSelectedPositions([...selectedPositions, { row, col }]);
  }
};

// 行号转字母 (1 → A, 2 → B, ...)
const rowToLetter = (n: number) => String.fromCharCode(64 + n);
```

### 7.2 已占用位置检测

```typescript
// 获取盒子中已存储的细胞
const occupiedMap = new Map<string, { code, name, cellType }>();
if (boxDetail?.cells) {
  boxDetail.cells.forEach(cell => {
    occupiedMap.set(`${cell.positionRow}-${cell.positionCol}`, {
      code: cell.code,
      name: cell.batch.name,
      cellType: cell.batch.cellType,
    });
  });
}

// 渲染时检查
const occupied = occupiedMap.get(`${rowIndex + 1}-${colIndex + 1}`);
// occupied则禁用按钮
```

### 7.3 CSV模板生成

```typescript
const downloadTemplate = () => {
  const headers = ['细胞编号', '细胞名称*', ...];
  const exampleRow = ['CELL-001', 'HEK293', ...];
  
  // 添加BOM头确保中文正确显示
  const csvContent = '\uFEFF' + 
    [headers, exampleRow]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  // ...下载逻辑
};
```

### 7.4 批次入库流程

```
用户上传文件
    ↓
前端发送到 /api/inbound/batch/preview
    ↓
后端解析文件 (xlsx库)
    ↓
列名映射转换
    ↓
逐行校验 (必填、格式、数量一致性)
    ↓
返回预览数据 + 错误列表
    ↓
前端显示预览和错误
    ↓
用户点击"开始入库"
    ↓
前端发送到 /api/inbound/batch
    ↓
后端验证位置、创建批次和细胞
    ↓
返回成功/失败数量
```

---

## 八、文件依赖

### 8.1 前端文件

```
src/components/pages/inbound-page.tsx    # 主组件 (约1100行)
src/components/app-sidebar.tsx           # 侧边栏(权限控制)
src/hooks/use-permissions.ts             # 权限Hook
src/lib/permissions.ts                   # 权限工具函数
src/lib/store.ts                         # 状态管理
src/lib/auth.ts                          # 后端权限验证
```

### 8.2 后端API

```
src/app/api/cells/route.ts               # 新增入库
src/app/api/inbound/batch/preview/route.ts  # 批次预览
src/app/api/inbound/batch/route.ts       # 批次入库
src/app/api/batches/route.ts             # 入库记录查询
src/app/api/freezers/route.ts            # 冰箱列表
src/app/api/boxes/[id]/route.ts          # 盒子详情
```

### 8.3 外部依赖

```json
{
  "xlsx": "^0.18.5",           // Excel文件解析
  "@tanstack/react-query": "^5.82.0",  // 数据请求
  "zustand": "^5.0.6"          // 状态管理
}
```

---

## 九、注意事项

### 9.1 数据一致性
- 冻存数量必须与位置数量一致
- 冰箱/架子/盒子名称必须与系统中的完全匹配

### 9.2 性能优化
- 批量入库时使用事务确保数据一致性
- 位置查找使用Map缓存减少数据库查询

### 9.3 用户体验
- 错误信息包含行号便于定位
- 支持部分成功入库（跳过错误行）
- 入库成功后自动刷新列表

### 9.4 安全考虑
- 批次入库需要管理员权限
- API通过x-user-id头传递用户身份
- 后端进行权限二次验证

---

## 十、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2025-02-13 | 初始版本，完成文档编写 |

---

## 十一、相关文档

- [Prisma Schema](../prisma/schema.prisma)
- [数据库配置](../.env)
