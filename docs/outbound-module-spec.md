# 细胞出库模块技术说明文档

> 文档版本: v1.0  
> 更新日期: 2025-02-23  
> 模块路径: `/src/components/pages/outbound-page.tsx`

---

## 一、功能概述

细胞出库模块提供三种出库相关功能：

| 功能 | 描述 | 权限 |
|------|------|------|
| 取出细胞 | 按批次选择单个或多个细胞进行出库 | admin, user |
| 整盒出库 | 一次性将盒子中所有在库细胞出库 | 仅 admin |
| 出库记录 | 查看历史出库记录，支持搜索和导出 | 所有用户 |

---

## 二、前端组件结构

### 2.1 组件层次

```
OutboundPage (主页面)
├── 头部 (标题)
├── Tabs (标签切换)
│   ├── TabsList
│   │   ├── TabsTrigger "取出细胞" (需权限)
│   │   ├── TabsTrigger "整盒出库" (需admin权限)
│   │   └── TabsTrigger "出库记录"
│   │
│   ├── TabsContent "取出细胞"
│   │   └── TakeOutCells
│   │       ├── 搜索和操作栏
│   │       ├── 批次卡片列表 (可展开)
│   │       │   ├── 批次基本信息
│   │       │   ├── 批次详细信息 (展开后)
│   │       │   └── 位置列表 (可勾选)
│   │       ├── 分页控件
│   │       └── 出库确认弹窗
│   │
│   ├── TabsContent "整盒出库"
│   │   └── BoxOutbound
│   │       ├── 三级选择器 (冰箱→架子→盒子)
│   │       ├── 盒子信息卡片
│   │       │   ├── 盒子基本信息
│   │       │   ├── 细胞列表表格
│   │       │   └── 出库表单
│   │       └── 危险确认弹窗
│   │
│   └── TabsContent "出库记录"
│       └── OutboundRecordsList
│           ├── 搜索和操作栏
│           ├── 记录表格
│           └── 分页控件
```

### 2.2 状态管理

```typescript
// Tab 状态
const [activeTab, setActiveTab] = useState('takeout');

// 取出细胞状态
const [search, setSearch] = useState('');
const [page, setPage] = useState(1);
const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
const [outboundDialog, setOutboundDialog] = useState(false);
const [outboundReason, setOutboundReason] = useState('');
const [outboundOperator, setOutboundOperator] = useState('');

// 整盒出库状态
const [selectedFreezer, setSelectedFreezer] = useState('');
const [selectedRack, setSelectedRack] = useState('');
const [selectedBox, setSelectedBox] = useState('');
const [confirmDialog, setConfirmDialog] = useState(false);
```

---

## 三、数据结构

### 3.1 细胞批次 (CellBatch)

```typescript
interface CellBatch {
  id: string;
  batchCode: string | null;      // 批次编号
  name: string;                   // 细胞名称
  cellType: string;               // 细胞类型
  passage: string;                // 代次
  totalQuantity: number;          // 总数量
  freezeDate: string;             // 冻存日期
  freezeMedium: string | null;    // 冻存液
  donorInfo: string | null;       // 供体信息
  operator: string | null;        // 操作人（冻存人）
  remark: string | null;          // 备注
  cells: Cell[];                  // 包含的细胞样本
  storedCount: number;            // 在库数量
}
```

### 3.2 细胞样本 (Cell)

```typescript
interface Cell {
  id: string;
  code: string | null;            // 细胞编号
  positionRow: number;            // 位置行号 (1-26, 对应A-Z)
  positionCol: number;            // 位置列号
  status: string;                 // 状态: "stored" | "removed"
  box: {
    id: string;
    name: string;
    rack: {
      name: string;
      freezer: {
        name: string;
      };
    };
  };
}
```

### 3.3 出库记录 (OutboundRecord)

```typescript
interface OutboundRecord {
  id: string;
  createdAt: string;              // 出库日期
  cellName: string;               // 细胞名称
  cellType: string;               // 细胞类型
  passage: string;                // 代次
  position: string;               // 位置 (如 A1)
  location: string;               // 存储位置路径
  reason: string;                 // 取出原因
  operator: string;               // 操作人
}
```

### 3.4 盒子详情 (BoxDetail)

```typescript
interface BoxDetail {
  id: string;
  name: string;
  rows: number;
  cols: number;
  rack: {
    name: string;
    freezer: {
      name: string;
    };
  };
  cells: BoxCell[];
}
```

---

## 四、API接口

### 4.1 获取批次列表

**接口**: `GET /api/batches`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | 状态筛选: "stored" (有在库细胞的批次) |
| search | string | 搜索关键词 |
| cellType | string | 细胞类型筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应**:
```json
{
  "batches": [...],
  "total": 15,
  "page": 1,
  "pageSize": 20
}
```

### 4.2 执行出库

**接口**: `POST /api/outbound`

**请求体**:
```json
{
  "cellIds": ["id1", "id2", ...],
  "reason": "实验使用",
  "operator": "张三"
}
```

**响应**:
```json
{
  "success": true,
  "count": 5
}
```

### 4.3 获取出库记录

**接口**: `GET /api/outbound`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| search | string | 搜索关键词 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

### 4.4 获取冰箱/盒子数据

- `GET /api/freezers` - 获取冰箱列表
- `GET /api/boxes/[id]` - 获取盒子详情

---

## 五、关键功能实现

### 5.1 批次选择与展开

```typescript
// 切换批次展开状态
const toggleBatch = (batchId: string) => {
  const newSet = new Set(expandedBatches);
  if (newSet.has(batchId)) {
    newSet.delete(batchId);
  } else {
    newSet.add(batchId);
  }
  setExpandedBatches(newSet);
};

// 切换单个细胞选择
const toggleCell = (cellId: string) => {
  const newSet = new Set(selectedCells);
  if (newSet.has(cellId)) {
    newSet.delete(cellId);
  } else {
    newSet.add(cellId);
  }
  setSelectedCells(newSet);
};

// 全选/取消全选批次内所有细胞
const toggleAllInBatch = (batch: CellBatch) => {
  const storedCells = batch.cells.filter((c) => c.status === 'stored');
  const storedIds = storedCells.map((c) => c.id);
  const allSelected = storedIds.every((id) => selectedCells.has(id));
  // ...
};
```

### 5.2 出库提交

```typescript
const handleOutbound = () => {
  if (selectedCells.size === 0) {
    toast({ title: '请选择要取出的细胞', variant: 'destructive' });
    return;
  }
  if (!outboundReason.trim()) {
    toast({ title: '请填写取出原因', variant: 'destructive' });
    return;
  }
  outboundMutation.mutate({
    cellIds: Array.from(selectedCells),
    reason: outboundReason,
    operator: outboundOperator || user?.name || '',
  });
};
```

### 5.3 整盒出库

```typescript
// 确认整盒出库
const handleConfirmOutbound = () => {
  if (!boxDetail) return;
  
  outboundMutation.mutate({
    cellIds: boxDetail.cells.map((c) => c.id),
    reason: outboundReason,
    operator: outboundOperator || user?.name || '',
  });
};
```

### 5.4 三级联动选择器

```typescript
// 冰箱改变时重置架子和盒子
const handleFreezerChange = (freezerId: string) => {
  setSelectedFreezer(freezerId);
  setSelectedRack('');
  setSelectedBox('');
};

// 架子改变时重置盒子
const handleRackChange = (rackId: string) => {
  setSelectedRack(rackId);
  setSelectedBox('');
};
```

---

## 六、UI设计

### 6.1 批次卡片

**收起状态显示**:
- 细胞名称（加粗大字体）
- 细胞类型 Badge
- 代次 Badge
- 在库数量
- 冻存日期
- 冻存人（如有）
- 冻存液（如有）

**展开状态新增**:
- 批次详细信息区域（网格布局）
  - 批次编号
  - 冻存日期
  - 冻存人
  - 冻存液
  - 供体信息
  - 总数量
  - 备注
- 位置列表（可勾选）
  - 位置编号
  - 存储位置路径
  - 状态 Badge

### 6.2 状态颜色

| 状态 | Badge 样式 |
|------|-----------|
| 在库 | `bg-green-100 text-green-700` |
| 已取出 | `secondary` (灰色) |

### 6.3 危险操作确认

整盒出库使用 AlertDialog 进行二次确认：
- 显示盒子路径
- 显示将出库的细胞数量
- 显示取出原因
- 警告提示 "此操作不可撤销"

---

## 七、权限控制

### 7.1 权限定义

```typescript
// src/lib/auth.ts
type Permission = 
  | 'users:manage'
  | 'inbound:create'
  | 'outbound:create'   // 取出细胞
  | 'outbound:box';     // 整盒出库

const PERMISSION_CONFIG = {
  'outbound:create': { roles: ['admin', 'user'] },
  'outbound:box': { roles: ['admin'] },
};
```

### 7.2 前端权限控制

```typescript
// src/hooks/use-permissions.ts
export function usePermissions() {
  const { user } = useAppStore();
  return {
    canCreateOutbound: canCreateOutbound(user?.role),  // admin, user
    canBoxOutbound: canBoxOutbound(user?.role),        // admin only
  };
}

// 根据权限动态显示Tab
const tabCount = [
  canCreateOutbound,
  canBoxOutbound,
  true,  // 出库记录始终显示
].filter(Boolean).length;
```

---

## 八、分页问题修复

### 8.1 问题描述

原逻辑：
1. 先计算 total（筛选前的总数）
2. 先分页获取数据
3. 再进行状态筛选

导致：total=21 但第二页筛选后可能无数据

### 8.2 解决方案

修复后的逻辑：
```typescript
// 1. 获取所有符合条件的批次
const allBatches = await db.cellBatch.findMany({ where, ... });

// 2. 计算每个批次的 storedCount/removedCount
const batchesWithStats = allBatches.map((batch) => ({...}));

// 3. 根据状态筛选
let filteredBatches = batchesWithStats;
if (status === 'stored') {
  filteredBatches = batchesWithStats.filter((b) => b.storedCount > 0);
}

// 4. 计算筛选后的正确总数
const total = filteredBatches.length;

// 5. 应用分页
const paginatedBatches = filteredBatches.slice(
  (page - 1) * pageSize,
  page * pageSize
);
```

---

## 九、导出功能

### 9.1 出库记录导出

```typescript
function exportOutboundRecords(records: OutboundRecord[]) {
  const headers = [
    '出库日期', '细胞名称', '细胞类型', '代次',
    '位置', '存储位置', '取出原因', '操作人',
  ];

  const csvContent = '\uFEFF' + [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');
  
  // 下载文件: 出库记录_日期.csv
}
```

---

## 十、文件依赖

### 10.1 前端文件

```
src/components/pages/outbound-page.tsx    # 主组件 (约1150行)
src/hooks/use-permissions.ts              # 权限Hook
src/lib/store.ts                          # 全局状态管理
```

### 10.2 后端API

```
src/app/api/batches/route.ts              # 批次列表
src/app/api/outbound/route.ts             # 出库操作和记录
src/app/api/freezers/route.ts             # 冰箱列表
src/app/api/boxes/[id]/route.ts           # 盒子详情
src/lib/auth.ts                           # 后端权限验证
```

### 10.3 UI组件依赖

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, ... } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
```

---

## 十一、注意事项

### 11.1 数据安全

- 整盒出库需要管理员权限
- 二次确认弹窗防止误操作
- 出库操作不可撤销

### 11.2 用户体验

- 批次卡片显示完整信息（冻存人、冻存液、备注等）
- 选中状态在多个批次间保持
- 支持批量选择和取消
- 分页数据正确显示

### 11.3 性能考虑

- 使用 Set 管理选中状态，O(1) 查找
- TanStack Query 缓存减少重复请求
- 出库后自动刷新相关缓存

---

## 十二、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2025-02-23 | 初始版本，完成文档编写 |

---

## 十三、相关文档

- [入库模块技术说明](./inbound-module-spec.md)
- [库存查询模块技术说明](./inventory-module-spec.md)
- [Prisma Schema](../prisma/schema.prisma)
