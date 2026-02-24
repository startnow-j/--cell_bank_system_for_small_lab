'use client';

import { useState, Fragment, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  RefreshCw,
  Download,
  Package,
  Loader2,
  ChevronDown,
  ChevronRight,
  PackagePlus,
  Grid3X3,
  List,
  Box,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';

// 行号转字母
const rowToLetter = (n: number): string => String.fromCharCode(64 + n);

// 字母转行号
const letterToRow = (letter: string): number => letter.charCodeAt(0) - 64;

// 格式化日期
const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('zh-CN');
};

interface Cell {
  id: string;
  code: string | null;
  positionRow: number;
  positionCol: number;
  status: string;
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

interface CellBatch {
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
  cells: Cell[];
  storedCount: number;
  removedCount: number;
  positionsStr: string;
}

interface BatchesResponse {
  batches: CellBatch[];
  total: number;
  page: number;
  pageSize: number;
}

// 盒子中的细胞信息
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

// 盒子详情
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

// 冰箱信息
interface Freezer {
  id: string;
  name: string;
  racks: {
    id: string;
    name: string;
    boxes: {
      id: string;
      name: string;
    }[];
  }[];
}

// 获取批次列表（只获取有在库细胞的批次）
async function getBatches(params: {
  search?: string;
  cellType?: string;
  page?: number;
  pageSize?: number;
}): Promise<BatchesResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('status', 'stored');
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.cellType && params.cellType !== 'all') {
    searchParams.set('cellType', params.cellType);
  }
  if (params.page) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  const res = await fetch(`/api/batches?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error('获取批次列表失败');
  }
  return res.json();
}

// 获取细胞类型列表
async function getCellTypes(): Promise<string[]> {
  const res = await fetch('/api/cell-types');
  if (!res.ok) {
    throw new Error('获取细胞类型列表失败');
  }
  const data = await res.json();
  return data.cellTypes;
}

// 获取所有冰箱（包含架子和盒子）
async function getFreezers(): Promise<Freezer[]> {
  const res = await fetch('/api/freezers');
  if (!res.ok) {
    throw new Error('获取冰箱列表失败');
  }
  return res.json();
}

// 获取盒子详情
async function getBoxDetail(boxId: string): Promise<BoxDetail> {
  const res = await fetch(`/api/boxes/${boxId}`);
  if (!res.ok) {
    throw new Error('获取盒子详情失败');
  }
  return res.json();
}

// 导出 CSV（包含完整信息）
function exportToCSV(batches: CellBatch[]) {
  const headers = [
    '批次编号',
    '名称',
    '细胞类型',
    '代次',
    '在库数量',
    '总数量',
    '冻存日期',
    '冻存液',
    '供体信息',
    '操作人',
    '备注',
    '存储位置',
  ];

  const rows = batches.map((batch) => {
    const storedCells = batch.cells.filter((c) => c.status === 'stored');
    const boxGroups = new Map<string, { positions: string[]; boxInfo: string }>();
    
    storedCells.forEach((cell) => {
      const boxKey = cell.box.id;
      const position = `${rowToLetter(cell.positionRow)}${cell.positionCol}`;
      const boxInfo = `${cell.box.rack.freezer.name} → ${cell.box.rack.name} → ${cell.box.name}`;
      
      if (!boxGroups.has(boxKey)) {
        boxGroups.set(boxKey, { positions: [], boxInfo });
      }
      boxGroups.get(boxKey)!.positions.push(position);
    });
    
    const positionsStr = Array.from(boxGroups.values())
      .map((group) => `${group.positions.join(', ')} (${group.boxInfo})`)
      .join('; ');

    return [
      batch.batchCode || '-',
      batch.name,
      batch.cellType,
      batch.passage,
      batch.storedCount,
      batch.totalQuantity,
      formatDate(batch.freezeDate),
      batch.freezeMedium || '-',
      batch.donorInfo || '-',
      batch.operator || '-',
      batch.remark || '-',
      positionsStr,
    ];
  });

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `库存列表_${new Date().toLocaleDateString('zh-CN')}.csv`;
  link.click();
}

// 导出盒子细胞 CSV（与批次查询表格格式一致）
function exportBoxToCSV(box: BoxDetail) {
  const headers = [
    '批次编号',
    '名称',
    '细胞类型',
    '代次',
    '在库数量',
    '总数量',
    '冻存日期',
    '冻存液',
    '供体信息',
    '操作人',
    '备注',
    '存储位置',
  ];

  // 按批次分组统计
  const batchMap = new Map<string, {
    batch: BoxCell['batch'];
    positions: string[];
  }>();

  box.cells.forEach((cell) => {
    const batchId = cell.batch.id;
    const position = `${rowToLetter(cell.positionRow)}${cell.positionCol}`;
    
    if (!batchMap.has(batchId)) {
      batchMap.set(batchId, {
        batch: cell.batch,
        positions: [],
      });
    }
    batchMap.get(batchId)!.positions.push(position);
  });

  const rows = Array.from(batchMap.values()).map(({ batch, positions }) => [
    batch.batchCode || '-',
    batch.name,
    batch.cellType,
    batch.passage,
    positions.length, // 在库数量 = 该盒子中该批次的细胞数
    batch.totalQuantity,
    formatDate(batch.freezeDate),
    batch.freezeMedium || '-',
    batch.donorInfo || '-',
    batch.operator || '-',
    batch.remark || '-',
    `${positions.join(', ')} (${box.rack.freezer.name} → ${box.rack.name} → ${box.name})`,
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${box.rack.freezer.name}-${box.rack.name}-${box.name}_${new Date().toLocaleDateString('zh-CN')}.csv`;
  link.click();
}

// 盒子布局组件
function BoxLayout({ box }: { box: BoxDetail }) {
  // 创建位置矩阵
  const positionMap = useMemo(() => {
    const map = new Map<string, BoxCell>();
    box.cells.forEach((cell) => {
      map.set(`${cell.positionRow}-${cell.positionCol}`, cell);
    });
    return map;
  }, [box.cells]);

  // 生成颜色（基于细胞名称）
  const getColor = (name: string) => {
    const colors = [
      'bg-emerald-500',
      'bg-amber-500',
      'bg-rose-500',
      'bg-sky-500',
      'bg-violet-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-lime-500',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-4">
      {/* 图例 */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600" />
          <span className="text-muted-foreground">空位</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500" />
          <span className="text-muted-foreground">已占用</span>
        </div>
        <div className="text-muted-foreground ml-auto">
          共 {box.rows * box.cols} 个位置，已占用 {box.cells.length} 个
        </div>
      </div>

      {/* 布局网格 */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* 列号 */}
          <div className="flex mb-1">
            <div className="w-7 h-6 flex-shrink-0" /> {/* 左上角空白，对应行号列 */}
            {Array.from({ length: box.cols }, (_, i) => (
              <div
                key={i}
                className="w-8 h-6 flex items-center justify-center text-xs font-medium text-muted-foreground"
                style={{ margin: '0 2px' }}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* 行 */}
          {Array.from({ length: box.rows }, (_, rowIndex) => (
            <div key={rowIndex} className="flex">
              {/* 行号 */}
              <div className="w-7 h-9 flex-shrink-0 flex items-center justify-center text-xs font-medium text-muted-foreground">
                {rowToLetter(rowIndex + 1)}
              </div>
              {/* 单元格 */}
              {Array.from({ length: box.cols }, (_, colIndex) => {
                const cell = positionMap.get(`${rowIndex + 1}-${colIndex + 1}`);
                return (
                  <TooltipProvider key={colIndex}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-8 h-8 rounded text-xs flex items-center justify-center cursor-pointer transition-all ${
                            cell
                              ? `${getColor(cell.batch.name)} text-white font-medium shadow-sm hover:scale-110`
                              : 'border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
                          }`}
                          style={{ margin: '2px' }}
                        >
                          {cell && '●'}
                        </div>
                      </TooltipTrigger>
                      {cell && (
                        <TooltipContent side="top" className="max-w-xs">
                          <div className="space-y-1">
                            <div className="font-semibold">{cell.batch.name}</div>
                            <div className="text-xs text-muted-foreground">
                              类型: {cell.batch.cellType}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              位置: {rowToLetter(cell.positionRow)}{cell.positionCol}
                            </div>
                            {cell.code && (
                              <div className="text-xs text-muted-foreground">
                                编号: {cell.code}
                              </div>
                            )}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 细胞列表 */}
      {box.cells.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium mb-3">细胞列表</h4>
          <div className="max-h-64 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">位置</TableHead>
                  <TableHead>细胞名称</TableHead>
                  <TableHead className="w-24">类型</TableHead>
                  <TableHead className="w-16">代次</TableHead>
                  <TableHead className="w-28">冻存日期</TableHead>
                  <TableHead className="w-28">编号</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {box.cells.map((cell) => (
                  <TableRow key={cell.id}>
                    <TableCell className="font-mono font-medium">
                      {rowToLetter(cell.positionRow)}{cell.positionCol}
                    </TableCell>
                    <TableCell>{cell.batch.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cell.batch.cellType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cell.batch.passage}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(cell.batch.freezeDate)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cell.code || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

export function InventoryPage() {
  const [activeTab, setActiveTab] = useState('batch');
  
  // 批次查询状态
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [cellType, setCellType] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  // 盒子查询状态
  const [selectedFreezer, setSelectedFreezer] = useState('');
  const [selectedRack, setSelectedRack] = useState('');
  const [selectedBox, setSelectedBox] = useState('');

  const { setCurrentMenu } = useAppStore();

  // 获取批次列表
  const { data: batchData, isLoading: isLoadingBatches, refetch: refetchBatches, isRefetching: isRefetchingBatches } = useQuery({
    queryKey: ['inventory', search, cellType, page],
    queryFn: () => getBatches({ search, cellType, page, pageSize }),
  });

  // 获取细胞类型列表
  const { data: cellTypes = [] } = useQuery({
    queryKey: ['cellTypes'],
    queryFn: getCellTypes,
  });

  // 获取冰箱列表
  const { data: freezers = [], isLoading: isLoadingFreezers } = useQuery({
    queryKey: ['freezers'],
    queryFn: getFreezers,
  });

  // 获取当前选中的架子
  const selectedRackData = useMemo(() => {
    if (!selectedFreezer || !selectedRack) return null;
    const freezer = freezers.find((f) => f.id === selectedFreezer);
    return freezer?.racks.find((r) => r.id === selectedRack) || null;
  }, [freezers, selectedFreezer, selectedRack]);

  // 获取盒子详情
  const { data: boxDetail, isLoading: isLoadingBox, refetch: refetchBox, isRefetching: isRefetchingBox } = useQuery({
    queryKey: ['boxDetail', selectedBox],
    queryFn: () => getBoxDetail(selectedBox),
    enabled: !!selectedBox,
  });

  // 重置架子选择（当冰箱改变时）
  const handleFreezerChange = (freezerId: string) => {
    setSelectedFreezer(freezerId);
    setSelectedRack('');
    setSelectedBox('');
  };

  // 重置盒子选择（当架子改变时）
  const handleRackChange = (rackId: string) => {
    setSelectedRack(rackId);
    setSelectedBox('');
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleExport = () => {
    if (batchData?.batches && batchData.batches.length > 0) {
      exportToCSV(batchData.batches);
    }
  };

  const handleExportBox = () => {
    if (boxDetail) {
      exportBoxToCSV(boxDetail);
    }
  };

  const toggleBatch = (batchId: string) => {
    const newSet = new Set(expandedBatches);
    if (newSet.has(batchId)) {
      newSet.delete(batchId);
    } else {
      newSet.add(batchId);
    }
    setExpandedBatches(newSet);
  };

  const totalPages = batchData ? Math.ceil(batchData.total / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">库存查询</h1>
          <p className="text-muted-foreground">查看当前在库细胞的完整信息</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setCurrentMenu('inbound')}>
            <PackagePlus className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">入库</span>
          </Button>
        </div>
      </div>

      {/* Tab 切换 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="batch">
            <List className="w-4 h-4 mr-2" />
            按批次查询
          </TabsTrigger>
          <TabsTrigger value="box">
            <Grid3X3 className="w-4 h-4 mr-2" />
            按盒子查询
          </TabsTrigger>
        </TabsList>

        {/* 按批次查询 */}
        <TabsContent value="batch" className="space-y-4">
          {/* 搜索和筛选 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="搜索细胞名称、类型或编号..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch}>
                    <Search className="w-4 h-4 mr-2" />
                    搜索
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="whitespace-nowrap">细胞类型：</Label>
                  <Select
                    value={cellType}
                    onValueChange={(v) => {
                      setCellType(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部</SelectItem>
                      {cellTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchBatches()}
              disabled={isRefetchingBatches}
            >
              {isRefetchingBatches ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-2">刷新</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!batchData?.batches?.length}
            >
              <Download className="w-4 h-4" />
              <span className="ml-2">导出</span>
            </Button>
          </div>

          {/* 表格 */}
          <Card>
            <CardContent className="p-0">
              {isLoadingBatches ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : batchData?.batches && batchData.batches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead className="w-20">类型</TableHead>
                      <TableHead className="w-16">代次</TableHead>
                      <TableHead className="w-16 text-center">在库</TableHead>
                      <TableHead className="w-24">冻存日期</TableHead>
                      <TableHead className="w-28">冻存液</TableHead>
                      <TableHead className="w-24">供体信息</TableHead>
                      <TableHead className="w-20">操作人</TableHead>
                      <TableHead className="w-20 text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchData.batches.map((batch) => (
                      <Fragment key={batch.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleBatch(batch.id)}
                        >
                          <TableCell className="w-10">
                            {expandedBatches.has(batch.id) ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{batch.name}</span>
                              {batch.batchCode && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  ({batch.batchCode})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{batch.cellType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{batch.passage}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-green-600">
                              {batch.storedCount}
                            </span>
                            {batch.removedCount > 0 && (
                              <span className="text-muted-foreground text-xs ml-1">
                                /{batch.totalQuantity}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(batch.freezeDate)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {batch.freezeMedium || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {batch.donorInfo || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {batch.operator || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBatch(batch.id);
                              }}
                            >
                              {expandedBatches.has(batch.id) ? '收起' : '展开'}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {/* 展开的行 - 位置详情 */}
                        {expandedBatches.has(batch.id) && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={10} className="p-4">
                              <div className="space-y-2">
                                <div className="text-sm font-medium text-muted-foreground mb-2">
                                  存储位置明细：
                                </div>
                                {(() => {
                                  const storedCells = batch.cells.filter((c) => c.status === 'stored');
                                  const boxGroups = new Map<string, { positions: string[]; box: Cell['box'] }>();
                                  
                                  storedCells.forEach((cell) => {
                                    const boxKey = cell.box.id;
                                    const position = `${rowToLetter(cell.positionRow)}${cell.positionCol}`;
                                    
                                    if (!boxGroups.has(boxKey)) {
                                      boxGroups.set(boxKey, { positions: [], box: cell.box });
                                    }
                                    boxGroups.get(boxKey)!.positions.push(position);
                                  });
                                  
                                  return Array.from(boxGroups.values()).map((group, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                                    >
                                      <span className="font-mono font-semibold text-green-700 dark:text-green-400">
                                        {group.positions.join(', ')}
                                      </span>
                                      <span className="text-muted-foreground">|</span>
                                      <span className="text-sm text-muted-foreground">
                                        {group.box.rack.freezer.name} → {group.box.rack.name} → {group.box.name}
                                      </span>
                                    </div>
                                  ));
                                })()}
                                {batch.remark && (
                                  <div className="mt-3 pt-3 border-t">
                                    <span className="text-sm text-muted-foreground">
                                      备注：{batch.remark}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mb-4 opacity-50" />
                  <p>暂无在库细胞</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setCurrentMenu('inbound')}
                  >
                    前往入库
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 分页 */}
          {totalPages > 1 && (
            <Card>
              <CardContent className="flex items-center justify-between py-3">
                <div className="text-sm text-muted-foreground">
                  共 {batchData?.total} 条记录，第 {page} / {totalPages} 页
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 按盒子查询 */}
        <TabsContent value="box" className="space-y-4">
          {/* 选择器 */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* 冰箱选择 */}
                  <div className="space-y-2">
                    <Label>冰箱</Label>
                    <Select
                      value={selectedFreezer}
                      onValueChange={handleFreezerChange}
                      disabled={isLoadingFreezers}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择冰箱" />
                      </SelectTrigger>
                      <SelectContent>
                        {freezers.map((freezer) => (
                          <SelectItem key={freezer.id} value={freezer.id}>
                            {freezer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 架子选择 */}
                  <div className="space-y-2">
                    <Label>架子</Label>
                    <Select
                      value={selectedRack}
                      onValueChange={handleRackChange}
                      disabled={!selectedFreezer}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择架子" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedFreezer && freezers
                          .find((f) => f.id === selectedFreezer)
                          ?.racks.map((rack) => (
                            <SelectItem key={rack.id} value={rack.id}>
                              {rack.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 盒子选择 */}
                  <div className="space-y-2">
                    <Label>盒子</Label>
                    <Select
                      value={selectedBox}
                      onValueChange={setSelectedBox}
                      disabled={!selectedRack}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择盒子" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedRackData?.boxes.map((box) => (
                          <SelectItem key={box.id} value={box.id}>
                            {box.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 盒子详情 */}
          {selectedBox && (
            <>
              {/* 操作按钮 */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchBox()}
                  disabled={isRefetchingBox}
                >
                  {isRefetchingBox ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="ml-2">刷新</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportBox}
                  disabled={!boxDetail?.cells?.length}
                >
                  <Download className="w-4 h-4" />
                  <span className="ml-2">导出</span>
                </Button>
              </div>

              {/* 盒子布局 */}
              {isLoadingBox ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </CardContent>
                </Card>
              ) : boxDetail ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Box className="w-5 h-5" />
                      {boxDetail.rack.freezer.name} → {boxDetail.rack.name} → {boxDetail.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      布局大小: {boxDetail.rows}行 × {boxDetail.cols}列
                    </p>
                  </CardHeader>
                  <CardContent>
                    <BoxLayout box={boxDetail} />
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}

          {/* 未选择盒子时的提示 */}
          {!selectedBox && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Grid3X3 className="w-12 h-12 mb-4 opacity-50" />
                <p>请选择冰箱、架子和盒子来查看细胞布局</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
