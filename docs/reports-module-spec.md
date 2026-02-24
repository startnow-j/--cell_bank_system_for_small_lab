# 统计报表模块技术说明文档

> 文档版本: v1.0  
> 更新日期: 2025-02-14  
> 模块路径: `/src/components/pages/reports-page.tsx`

---

## 一、功能概述

统计报表模块提供库存数据的可视化展示和统计分析功能，帮助用户了解库存情况和操作趋势。

| 功能 | 描述 | 平台适配 |
|------|------|---------|
| 统计卡片 | 展示核心数据指标（库存、批次、用户等） | PC端 + 移动端 |
| 细胞类型分布 | 饼图展示各类型细胞占比 | 仅PC端 |
| 入库/出库趋势 | 折线图展示近6个月操作趋势 | 仅PC端 |
| 按冰箱统计 | 柱状图展示各冰箱出入库数量 | 仅PC端 |
| 按用户统计 | 柱状图展示各用户操作数量 | 仅PC端 |
| 时间范围筛选 | 自定义日期范围查询统计数据 | 仅PC端 |

---

## 二、响应式设计

### 2.1 平台适配策略

```
PC端 (>=768px):
├── 显示全部统计卡片
├── 显示所有图表
└── 支持时间范围筛选

移动端 (<768px):
├── 显示全部统计卡片
├── 隐藏所有图表
└── 显示提示信息
```

### 2.2 移动端隐藏图表原因

1. **性能考虑**：图表库（recharts）在移动端渲染性能较差
2. **体验优化**：移动端屏幕空间有限，图表难以有效展示
3. **避免复杂适配**：饼图/柱状图的自适应需要大量额外代码

### 2.3 useIsMobile Hook

```typescript
// SSR安全的响应式断点检测
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
```

---

## 三、数据结构

### 3.1 基础统计数据 (StatsData)

```typescript
interface StatsData {
  // 基础统计
  freezerCount: number;       // 冰箱数量
  storedCells: number;        // 在库细胞数
  removedCells: number;       // 已出库细胞数
  userCount: number;          // 用户数量
  totalCells: number;         // 细胞总数
  batchCount: number;         // 批次总数
  
  // 本月统计
  inboundThisMonth: number;       // 本月入库管数
  inboundCellsThisMonth: number;  // 本月入库细胞数
  outboundThisMonth: number;      // 本月出库管数
  
  // 图表数据
  cellTypeStats: Array<{ type: string; count: number }>;
  monthlyInbound: Array<{ month: string; count: number }>;
  monthlyOutbound: Array<{ month: string; count: number }>;
  freezerMonthStats: Array<{ freezerName: string; inbound: number; outbound: number }>;
  userMonthStats: Array<{ userName: string; inbound: number; outbound: number }>;
}
```

### 3.2 时间范围统计数据 (TimeRangeStats)

```typescript
interface TimeRangeStats {
  freezerStats: Array<{ 
    freezerName: string; 
    inbound: number; 
    outbound: number 
  }>;
  userStats: Array<{ 
    userName: string; 
    inbound: number; 
    outbound: number 
  }>;
}
```

---

## 四、API接口

### 4.1 基础统计数据

**接口**: `GET /api/stats`

**响应**:
```json
{
  "freezerCount": 5,
  "storedCells": 1200,
  "removedCells": 300,
  "userCount": 10,
  "totalCells": 1500,
  "batchCount": 85,
  "inboundThisMonth": 150,
  "outboundThisMonth": 50,
  "cellTypeStats": [
    { "type": "贴壁细胞", "count": 500 },
    { "type": "悬浮细胞", "count": 400 }
  ],
  "monthlyInbound": [
    { "month": "2025-01", "count": 20 }
  ],
  "monthlyOutbound": [
    { "month": "2025-01", "count": 15 }
  ],
  "freezerMonthStats": [
    { "freezerName": "冰箱A", "inbound": 50, "outbound": 20 }
  ],
  "userMonthStats": [
    { "userName": "张三", "inbound": 30, "outbound": 10 }
  ]
}
```

### 4.2 时间范围统计数据

**接口**: `GET /api/stats/time-range`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | ISO日期字符串 | 是 | 开始日期 |
| endDate | ISO日期字符串 | 是 | 结束日期 |

**请求示例**:
```
GET /api/stats/time-range?startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.999Z
```

**响应**:
```json
{
  "freezerStats": [
    { "freezerName": "冰箱A", "inbound": 50, "outbound": 20 },
    { "freezerName": "冰箱B", "inbound": 30, "outbound": 15 }
  ],
  "userStats": [
    { "userName": "张三", "inbound": 60, "outbound": 25 },
    { "userName": "李四", "inbound": 20, "outbound": 10 }
  ]
}
```

---

## 五、前端组件结构

### 5.1 组件层次

```
ReportsPage (主页面)
├── 头部标题区
├── 统计卡片区 (移动端 + PC端)
│   ├── Card "总库存"
│   ├── Card "批次总数"
│   ├── Card "本月入库"
│   ├── Card "本月出库"
│   ├── Card "冰箱数量"
│   └── Card "用户数量"
│
└── 图表区域 (仅PC端)
    ├── 第一行 (lg:grid-cols-2)
    │   ├── Card "按细胞类型统计"
    │   │   └── PieChart (饼图)
    │   └── Card "入库/出库趋势"
    │       └── LineChart (折线图)
    │
    └── 第二行 (lg:grid-cols-2)
        ├── Card "按冰箱统计出入库"
        │   ├── DateRangePicker
        │   └── BarChart (柱状图)
        └── Card "按用户统计出入库"
            ├── DateRangePicker
            └── BarChart (柱状图)
```

### 5.2 DateRangePicker 组件

```typescript
interface DateRangePickerProps {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
}

// 快捷选项
const QUICK_OPTIONS = [
  { label: '本月', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: '上月', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: '近3个月', getValue: () => ({ start: subMonths(new Date(), 2), end: new Date() }) },
  { label: '今年', getValue: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) }) },
  { label: '去年', getValue: () => ({ start: startOfYear(subYears(new Date(), 1)), end: endOfYear(subYears(new Date(), 1)) }) },
];
```

### 5.3 数据请求流程

```
页面加载
    ↓
useQuery ['stats'] → GET /api/stats
    ↓
渲染统计卡片 + 图表
    ↓
用户选择时间范围
    ↓
setDateRange() 触发重渲染
    ↓
useQuery ['timeRangeStats', startDate, endDate] → GET /api/stats/time-range
    ↓
更新按冰箱/按用户图表
```

---

## 六、图表配置

### 6.1 颜色方案

```typescript
// 统一颜色配置
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// 图表颜色映射
const lineChartConfig = {
  入库: { label: '入库', color: '#22c55e' },  // 绿色
  出库: { label: '出库', color: '#ef4444' },  // 红色
};

const freezerChartConfig = {
  inbound: { label: '入库', color: '#22c55e' },   // 绿色
  outbound: { label: '出库', color: '#f59e0b' },  // 橙色
};

const userChartConfig = {
  inbound: { label: '入库', color: '#3b82f6' },   // 蓝色
  outbound: { label: '出库', color: '#8b5cf6' },  // 紫色
};
```

### 6.2 饼图配置

```tsx
<PieChart>
  <Pie
    data={stats.cellTypeStats}
    dataKey="count"
    nameKey="type"
    cx="50%"
    cy="50%"
    outerRadius={80}
    innerRadius={30}
    paddingAngle={2}
    label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
    labelLine
  >
    {stats.cellTypeStats.map((_, index) => (
      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
    ))}
  </Pie>
  <ChartTooltip content={<ChartTooltipContent />} />
</PieChart>
```

### 6.3 柱状图配置

```tsx
<BarChart data={freezerStats} barCategoryGap="20%">
  <CartesianGrid strokeDasharray="3 3" vertical={false} />
  <XAxis 
    dataKey="freezerName" 
    angle={-15}
    textAnchor="end"
    height={50}
  />
  <YAxis allowDecimals={false} width={35} />
  <ChartTooltip content={<ChartTooltipContent />} />
  <Legend />
  <Bar 
    dataKey="inbound" 
    name="入库" 
    fill="#22c55e" 
    radius={[4, 4, 0, 0]}
    maxBarSize={40}
    label={{ position: 'top', fontSize: 11 }}
  />
  <Bar 
    dataKey="outbound" 
    name="出库" 
    fill="#f59e0b" 
    radius={[4, 4, 0, 0]}
    maxBarSize={40}
    label={{ position: 'top', fontSize: 11 }}
  />
</BarChart>
```

---

## 七、后端实现

### 7.1 基础统计 API (`/api/stats/route.ts`)

```typescript
export async function GET() {
  // 1. 基础计数
  const [freezerCount, storedCells, removedCells, userCount] = await Promise.all([
    db.freezer.count(),
    db.cell.count({ where: { status: 'stored' } }),
    db.cell.count({ where: { status: 'removed' } }),
    db.user.count(),
  ]);

  // 2. 本月统计
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const inboundCellsThisMonth = await db.cellBatch.aggregate({
    where: { createdAt: { gte: monthStart } },
    _sum: { totalQuantity: true },
  });

  // 3. 按类型统计
  const cellsByType = await db.cell.findMany({
    where: { status: 'stored' },
    include: { batch: { select: { cellType: true } } },
  });
  // 聚合统计...

  // 4. 近6个月趋势
  for (let i = 5; i >= 0; i--) {
    // 循环查询每月数据...
  }

  // 5. 按冰箱/用户统计
  // 查询并聚合...
}
```

### 7.2 时间范围统计 API (`/api/stats/time-range/route.ts`)

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = new Date(searchParams.get('startDate')!);
  const endDate = new Date(searchParams.get('endDate')!);
  endDate.setHours(23, 59, 59, 999);

  // 1. 按冰箱统计
  const inboundCellsData = await db.cell.findMany({
    where: { batch: { createdAt: { gte: startDate, lte: endDate } } },
    include: { box: { include: { rack: { include: { freezer } } } } },
  });
  // 聚合入库数据...

  const outboundLogsData = await db.operationLog.findMany({
    where: { operation: 'outbound', createdAt: { gte: startDate, lte: endDate } },
    include: { cell: { include: { box: { include: { rack: { include: { freezer } } } } } } },
  });
  // 聚合出库数据...

  // 2. 按用户统计
  const inboundBatches = await db.cellBatch.findMany({
    where: { createdAt: { gte: startDate, lte: endDate }, operator: { not: null } },
    select: { operator: true, totalQuantity: true },
  });
  // 聚合用户入库数据...

  const outboundLogsByUser = await db.operationLog.findMany({
    where: { operation: 'outbound', createdAt: { gte: startDate, lte: endDate }, operator: { not: null } },
    select: { operator: true, quantity: true },
  });
  // 聚合用户出库数据...

  return NextResponse.json({ freezerStats, userStats });
}
```

---

## 八、文件依赖

### 8.1 前端文件

```
src/components/pages/reports-page.tsx    # 主组件 (约500行)
src/components/ui/card.tsx               # 卡片组件
src/components/ui/chart.tsx              # 图表组件
src/components/ui/calendar.tsx           # 日历组件
src/components/ui/popover.tsx            # 弹出框组件
src/components/ui/button.tsx             # 按钮组件
```

### 8.2 后端API

```
src/app/api/stats/route.ts              # 基础统计数据
src/app/api/stats/time-range/route.ts   # 时间范围统计数据
```

### 8.3 外部依赖

```json
{
  "recharts": "^2.15.0",              // 图表库
  "@tanstack/react-query": "^5.82.0", // 数据请求
  "date-fns": "^4.1.0"                // 日期处理
}
```

---

## 九、注意事项

### 9.1 性能优化

1. **并行查询**：基础统计使用 `Promise.all` 并行执行
2. **缓存策略**：TanStack Query 自动缓存统计数据
3. **延迟加载**：时间范围统计仅在用户选择时请求

### 9.2 数据一致性

1. 入库统计基于 `CellBatch.createdAt`
2. 出库统计基于 `OperationLog.createdAt` 且 `operation: 'outbound'`
3. 时间范围查询结束日期自动设置为当天最后一秒

### 9.3 移动端限制

- 移动端不显示图表，仅显示统计卡片
- 如需在移动端查看详细数据，提示用户使用电脑端

### 9.4 空数据处理

每个图表区域都有空数据提示：
```tsx
{data && data.length > 0 ? (
  <ChartContainer>...</ChartContainer>
) : (
  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
    <Icon className="w-12 h-12 mb-2 opacity-50" />
    <p>暂无数据</p>
  </div>
)}
```

---

## 十、后续优化建议

### 10.1 功能增强

- [ ] 添加导出报表功能（PDF/Excel）
- [ ] 支持更多维度统计（按代次、按冻存液等）
- [ ] 添加数据对比功能（同比/环比）

### 10.2 性能优化

- [ ] 使用 Redis 缓存统计数据
- [ ] 添加数据预聚合定时任务
- [ ] 图表懒加载优化

### 10.3 移动端增强

- [ ] 添加简化版图表（进度条/数字展示）
- [ ] 支持时间范围筛选查看数字统计

---

## 十一、更新日志

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2025-02-14 | 初始版本，完成统计报表模块文档 |

---

## 十二、相关文档

- [入库模块说明](./inbound-module-spec.md)
- [出库模块说明](./outbound-module-spec.md)
- [库存查询模块说明](./inventory-module-spec.md)
- [用户管理模块说明](./user-management-spec.md)
