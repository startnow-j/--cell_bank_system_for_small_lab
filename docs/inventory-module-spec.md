# 库存查询模块技术说明文档

> 文档版本: v1.0  
> 更新日期: 2025-02-23  
> 模块路径: `/src/components/pages/inventory-page.tsx`

---

## 一、功能概述

库存查询模块提供两种查询方式，方便用户查看当前在库细胞的完整信息：

| 功能 | 描述 | 适用场景 |
|------|------|---------|
| 按批次查询 | 以细胞批次为单位展示在库信息 | 查看特定细胞的详细信息和存储位置 |
| 按盒子查询 | 以盒子为单位展示细胞布局 | 直观查看盒子内位置占用情况 |

---

## 二、前端组件结构

### 2.1 组件层次

```
InventoryPage (主页面)
├── 头部 (标题 + 入库按钮)
├── Tabs (标签切换)
│   ├── TabsList
│   │   ├── TabsTrigger "按批次查询"
│   │   └── TabsTrigger "按盒子查询"
│   │
│   ├── TabsContent "按批次查询"
│   │   ├── 搜索筛选卡片
│   │   │   ├── 搜索框
│   │   │   └── 细胞类型筛选
│   │   ├── 操作按钮 (刷新、导出)
│   │   ├── 批次表格 (可展开查看位置详情)
│   │   └── 分页控件
│   │
│   └── TabsContent "按盒子查询"
│       ├── 三级选择器 (冰箱→架子→盒子)
│       ├── 操作按钮 (刷新、导出)
│       └── 盒子布局卡片
│           ├── BoxLayout 组件
│           │   ├── 图例说明
│           │   ├── 位置网格 (行号+列号+格子)
│           │   └── 细胞列表表格
│           └── 盒子信息头部
```

### 2.2 状态管理

```typescript
// Tab 状态
const [activeTab, setActiveTab] = useState('batch');

// 批次查询状态
const [search, setSearch] = useState('');           // 搜索关键词
const [searchInput, setSearchInput] = useState(''); // 输入框值
const [cellType, setCellType] = useState('all');    // 细胞类型筛选
const [page, setPage] = useState(1);                // 当前页码
const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set()); // 展开的批次

// 盒子查询状态
const [selectedFreezer, setSelectedFreezer] = useState('');  // 选中的冰箱
const [selectedRack, setSelectedRack] = useState('');        // 选中的架子
const [selectedBox, setSelectedBox] = useState('');          // 选中的盒子
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
  operator: string | null;        // 操作人
  remark: string | null;          // 备注
  cells: Cell[];                  // 包含的细胞样本
  storedCount: number;            // 在库数量
  removedCount: number;           // 已取出数量
  positionsStr: string;           // 位置字符串
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

### 3.3 盒子详情 (BoxDetail)

```typescript
interface BoxDetail {
  id: string;
  name: string;
  rows: number;                   // 行数
  cols: number;                   // 列数
  rack: {
    name: string;
    freezer: {
      name: string;
    };
  };
  cells: BoxCell[];               // 盒子内的细胞
}
```

### 3.4 盒子细胞 (BoxCell)

```typescript
interface BoxCell {
  id: string;
  code: string | null;
  positionRow: number;
  positionCol: number;
  batch: {
    id: string;
    batchCode: string | null;
    name: string;
    cellType: string;
    passage: string;
    totalQuantity: number;
    freezeDate: string;
    freezeMedium: string | null;
    donorInfo: string | null;
    operator: string | null;
    remark: string | null;
  };
}
```

---

## 四、API接口

### 4.1 获取批次列表

**接口**: `GET /api/batches`

**查询参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| search | string | 搜索关键词 |
| status | string | 状态筛选 (stored) |
| cellType | string | 细胞类型筛选 |
| page | number | 页码 |
| pageSize | number | 每页数量 |

**响应**:
```json
{
  "batches": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20
}
```

### 4.2 获取细胞类型列表

**接口**: `GET /api/cell-types`

**响应**:
```json
{
  "cellTypes": ["贴壁细胞", "悬浮细胞", ...]
}
```

### 4.3 获取冰箱列表

**接口**: `GET /api/freezers`

**响应**:
```json
[
  {
    "id": "xxx",
    "name": "1号冰箱",
    "racks": [
      {
        "id": "xxx",
        "name": "A架",
        "boxes": [
          { "id": "xxx", "name": "盒子1" }
        ]
      }
    ]
  }
]
```

### 4.4 获取盒子详情

**接口**: `GET /api/boxes/[id]`

**响应**: 返回 `BoxDetail` 对象

---

## 五、关键功能实现

### 5.1 位置行列转换

```typescript
// 行号转字母 (1 → A, 2 → B, ..., 26 → Z)
const rowToLetter = (n: number): string => String.fromCharCode(64 + n);

// 字母转行号 (A → 1, B → 2, ..., Z → 26)
const letterToRow = (letter: string): number => letter.charCodeAt(0) - 64;
```

### 5.2 盒子布局网格

```typescript
// 创建位置矩阵
const positionMap = useMemo(() => {
  const map = new Map<string, BoxCell>();
  box.cells.forEach((cell) => {
    map.set(`${cell.positionRow}-${cell.positionCol}`, cell);
  });
  return map;
}, [box.cells]);

// 渲染网格
{Array.from({ length: box.rows }, (_, rowIndex) => (
  <div key={rowIndex} className="flex">
    {/* 行号 */}
    <div className="w-7 h-9 flex-shrink-0 flex items-center justify-center">
      {rowToLetter(rowIndex + 1)}
    </div>
    {/* 格子 */}
    {Array.from({ length: box.cols }, (_, colIndex) => {
      const cell = positionMap.get(`${rowIndex + 1}-${colIndex + 1}`);
      return <div key={colIndex}>...</div>;
    })}
  </div>
))}
```

### 5.3 颜色生成算法

```typescript
// 基于细胞名称生成一致的颜色
const getColor = (name: string) => {
  const colors = [
    'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
    'bg-sky-500', 'bg-violet-500', 'bg-orange-500',
    'bg-teal-500', 'bg-pink-500', 'bg-indigo-500', 'bg-lime-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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

### 5.5 批次表格展开/收起

```typescript
const toggleBatch = (batchId: string) => {
  const newSet = new Set(expandedBatches);
  if (newSet.has(batchId)) {
    newSet.delete(batchId);
  } else {
    newSet.add(batchId);
  }
  setExpandedBatches(newSet);
};
```

---

## 六、导出功能

### 6.1 批次查询导出

```typescript
function exportToCSV(batches: CellBatch[]) {
  const headers = [
    '批次编号', '名称', '细胞类型', '代次', '在库数量', '总数量',
    '冻存日期', '冻存液', '供体信息', '操作人', '备注', '存储位置',
  ];
  
  // 按盒子分组位置
  const boxGroups = new Map<string, { positions: string[]; boxInfo: string }>();
  storedCells.forEach((cell) => {
    const position = `${rowToLetter(cell.positionRow)}${cell.positionCol}`;
    const boxInfo = `${cell.box.rack.freezer.name} → ${cell.box.rack.name} → ${cell.box.name}`;
    // ...分组逻辑
  });
  
  // 生成CSV (添加BOM头确保中文正确)
  const csvContent = '\uFEFF' + [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');
}
```

### 6.2 盒子查询导出

```typescript
function exportBoxToCSV(box: BoxDetail) {
  // 按批次分组统计
  const batchMap = new Map<string, { batch, positions: string[] }>();
  
  // 生成与批次查询相同格式的CSV
  // 文件名: 冰箱-架子-盒子_日期.csv
}
```

---

## 七、UI组件

### 7.1 盒子布局组件 (BoxLayout)

```typescript
function BoxLayout({ box }: { box: BoxDetail }) {
  return (
    <div className="space-y-4">
      {/* 图例 */}
      <div className="flex items-center gap-4 text-sm">
        <div>空位</div>
        <div>已占用</div>
        <div>统计信息</div>
      </div>

      {/* 布局网格 */}
      <div className="overflow-x-auto">
        {/* 列号 */}
        <div className="flex mb-1">...</div>
        {/* 行 + 格子 */}
        {Array.from({ length: box.rows }, ...)}
      </div>

      {/* 细胞列表 */}
      <Table>...</Table>
    </div>
  );
}
```

### 7.2 位置格子样式

| 状态 | 样式 |
|------|------|
| 空位 | `border-2 border-dashed border-gray-300 bg-gray-50` |
| 已占用 | `{colorClass} text-white font-medium shadow-sm hover:scale-110` |

### 7.3 网格对齐规格

| 元素 | 宽度 | 高度 | 间距 |
|------|------|------|------|
| 左上角空白 | 28px (w-7) | 24px (h-6) | - |
| 列号 | 32px (w-8) | 24px (h-6) | 左右各2px |
| 行号 | 28px (w-7) | 36px (h-9) | - |
| 格子 | 32px (w-8) | 32px (h-8) | 4px (2px*2) |

---

## 八、数据查询策略

### 8.1 TanStack Query 配置

```typescript
// 批次列表查询
const { data: batchData, isLoading, refetch, isRefetching } = useQuery({
  queryKey: ['inventory', search, cellType, page],
  queryFn: () => getBatches({ search, cellType, page, pageSize }),
});

// 细胞类型查询
const { data: cellTypes = [] } = useQuery({
  queryKey: ['cellTypes'],
  queryFn: getCellTypes,
});

// 冰箱列表查询
const { data: freezers = [], isLoading: isLoadingFreezers } = useQuery({
  queryKey: ['freezers'],
  queryFn: getFreezers,
});

// 盒子详情查询 (条件启用)
const { data: boxDetail, isLoading: isLoadingBox } = useQuery({
  queryKey: ['boxDetail', selectedBox],
  queryFn: () => getBoxDetail(selectedBox),
  enabled: !!selectedBox,  // 仅在选择盒子后启用
});
```

### 8.2 查询缓存

- 批次列表: 根据搜索条件自动缓存
- 细胞类型: 全局缓存
- 冰箱列表: 全局缓存
- 盒子详情: 按盒子ID缓存

---

## 九、用户体验优化

### 9.1 交互反馈

- 加载状态: 显示 Loader2 动画
- 刷新按钮: 刷新时显示旋转动画
- 展开动画: 点击批次行展开位置详情
- 悬停效果: 格子 hover:scale-110 放大

### 9.2 提示信息

- Tooltip: 鼠标悬停格子显示细胞详情
- 空状态: 无数据时显示提示和操作引导
- 分页信息: 显示总记录数和当前页码

### 9.3 响应式设计

- 搜索区域: 移动端垂直排列，桌面端水平排列
- 表格: 支持水平滚动
- 选择器: 移动端单列，桌面端三列

---

## 十、文件依赖

### 10.1 前端文件

```
src/components/pages/inventory-page.tsx    # 主组件 (约1020行)
src/lib/store.ts                           # 全局状态管理
```

### 10.2 后端API

```
src/app/api/batches/route.ts               # 批次列表
src/app/api/cell-types/route.ts            # 细胞类型列表
src/app/api/freezers/route.ts              # 冰箱列表
src/app/api/boxes/[id]/route.ts            # 盒子详情
```

### 10.3 UI组件依赖

```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
```

---

## 十一、注意事项

### 11.1 性能优化

- 使用 `useMemo` 缓存位置矩阵计算
- 盒子详情查询使用条件启用 (`enabled`)
- 分页加载减少数据量

### 11.2 数据一致性

- 仅显示 `status === 'stored'` 的细胞
- 统计数据 (storedCount, removedCount) 由后端计算

### 11.3 导出功能

- CSV 文件添加 BOM 头确保中文正确显示
- 文件名包含日期便于归档

---

## 十二、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2025-02-23 | 初始版本，完成文档编写 |

---

## 十三、相关文档

- [入库模块技术说明](./inbound-module-spec.md)
- [Prisma Schema](../prisma/schema.prisma)
