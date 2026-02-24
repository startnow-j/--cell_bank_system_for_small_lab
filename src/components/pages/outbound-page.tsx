'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  RefreshCw,
  Package,
  PackageX,
  Loader2,
  ChevronDown,
  ChevronRight,
  PackageMinus,
  History,
  Download,
  Box,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { usePermissions } from '@/hooks/use-permissions';

// ==================== 工具函数 ====================
const rowToLetter = (n: number): string => String.fromCharCode(64 + n);

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('zh-CN');
};

// ==================== 类型定义 ====================
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
  freezeMedium: string | null;    // 冻存液
  donorInfo: string | null;       // 供体信息
  operator: string | null;        // 操作人（冻存人）
  remark: string | null;          // 备注
  cells: Cell[];
  storedCount: number;
}

interface BatchesResponse {
  batches: CellBatch[];
  total: number;
  page: number;
  pageSize: number;
}

interface OutboundRecord {
  id: string;
  createdAt: string;
  cellName: string;
  cellType: string;
  passage: string;
  position: string;
  location: string;
  reason: string;
  operator: string;
}

interface OutboundRecordsResponse {
  records: OutboundRecord[];
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
    name: string;
    cellType: string;
    passage: string;
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

// ==================== API 函数 ====================
async function getBatches(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<BatchesResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('status', 'stored');
  if (params.search) {
    searchParams.set('search', params.search);
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

async function batchOutbound(data: {
  cellIds: string[];
  reason: string;
  operator: string;
}) {
  const res = await fetch('/api/outbound', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '出库失败');
  }
  return res.json();
}

async function getOutboundRecords(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<OutboundRecordsResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.page) {
    searchParams.set('page', String(params.page));
  }
  if (params.pageSize) {
    searchParams.set('pageSize', String(params.pageSize));
  }

  const res = await fetch(`/api/outbound?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error('获取出库记录失败');
  }
  return res.json();
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

// ==================== 导出函数 ====================
function exportOutboundRecords(records: OutboundRecord[]) {
  const headers = [
    '出库日期',
    '细胞名称',
    '细胞类型',
    '代次',
    '位置',
    '存储位置',
    '取出原因',
    '操作人',
  ];

  const rows = records.map((record) => [
    formatDate(record.createdAt),
    record.cellName,
    record.cellType,
    record.passage,
    record.position,
    record.location,
    record.reason,
    record.operator,
  ]);

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `出库记录_${new Date().toLocaleDateString('zh-CN')}.csv`;
  link.click();
}

// ==================== 取出细胞组件 ====================
function TakeOutCells() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [outboundDialog, setOutboundDialog] = useState(false);
  const [outboundReason, setOutboundReason] = useState('');
  const [outboundOperator, setOutboundOperator] = useState('');

  const { user } = useAppStore();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['batches-outbound', search, page],
    queryFn: () => getBatches({ search, page, pageSize }),
  });

  const outboundMutation = useMutation({
    mutationFn: batchOutbound,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches-outbound'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-records'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setOutboundDialog(false);
      setSelectedCells(new Set());
      setOutboundReason('');
      setOutboundOperator('');
      toast({ title: '出库成功', description: '细胞已标记为取出' });
    },
    onError: (error: Error) => {
      toast({ title: '出库失败', description: error.message, variant: 'destructive' });
    },
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
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

  const toggleCell = (cellId: string) => {
    const newSet = new Set(selectedCells);
    if (newSet.has(cellId)) {
      newSet.delete(cellId);
    } else {
      newSet.add(cellId);
    }
    setSelectedCells(newSet);
  };

  const toggleAllInBatch = (batch: CellBatch) => {
    const storedCells = batch.cells.filter((c) => c.status === 'stored');
    const storedIds = storedCells.map((c) => c.id);
    const allSelected = storedIds.every((id) => selectedCells.has(id));

    const newSet = new Set(selectedCells);
    if (allSelected) {
      storedIds.forEach((id) => newSet.delete(id));
    } else {
      storedIds.forEach((id) => newSet.add(id));
    }
    setSelectedCells(newSet);
  };

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

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* 搜索和操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="搜索细胞名称或类型..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>
            <Search className="w-4 h-4 mr-2" />
            搜索
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2 hidden sm:inline">刷新</span>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={selectedCells.size === 0}
            onClick={() => {
              setOutboundOperator(user?.name || '');
              setOutboundDialog(true);
            }}
          >
            <PackageMinus className="w-4 h-4" />
            <span className="ml-2">
              取出 {selectedCells.size > 0 && `(${selectedCells.size})`}
            </span>
          </Button>
        </div>
      </div>

      {/* 批次列表 */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : data?.batches && data.batches.length > 0 ? (
          data.batches.map((batch) => (
            <Card key={batch.id} className="overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleBatch(batch.id)}
              >
                <div className="flex-shrink-0">
                  {expandedBatches.has(batch.id) ? (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-lg">{batch.name}</span>
                    <Badge variant="outline">{batch.cellType}</Badge>
                    <Badge variant="secondary">{batch.passage}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                    <span>
                      <strong>{batch.storedCount}</strong> 管在库
                    </span>
                    <span>冻存: {formatDate(batch.freezeDate)}</span>
                    {batch.operator && (
                      <span>冻存人: {batch.operator}</span>
                    )}
                    {batch.freezeMedium && (
                      <span>冻存液: {batch.freezeMedium}</span>
                    )}
                  </div>
                </div>

                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  <Package className="w-3 h-3 mr-1" />
                  在库 {batch.storedCount}
                </Badge>
              </div>

              {expandedBatches.has(batch.id) && (
                <div className="border-t bg-muted/30">
                  {/* 批次详细信息 */}
                  <div className="px-4 py-3 border-b bg-muted/20 text-sm space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {batch.batchCode && (
                        <div>
                          <span className="text-muted-foreground">批次编号：</span>
                          <span className="font-mono">{batch.batchCode}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">冻存日期：</span>
                        <span>{formatDate(batch.freezeDate)}</span>
                      </div>
                      {batch.operator && (
                        <div>
                          <span className="text-muted-foreground">冻存人：</span>
                          <span>{batch.operator}</span>
                        </div>
                      )}
                      {batch.freezeMedium && (
                        <div>
                          <span className="text-muted-foreground">冻存液：</span>
                          <span>{batch.freezeMedium}</span>
                        </div>
                      )}
                      {batch.donorInfo && (
                        <div>
                          <span className="text-muted-foreground">供体信息：</span>
                          <span>{batch.donorInfo}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">总数量：</span>
                        <span>{batch.totalQuantity} 管</span>
                      </div>
                    </div>
                    {batch.remark && (
                      <div className="pt-2 border-t mt-2">
                        <span className="text-muted-foreground">备注：</span>
                        <span>{batch.remark}</span>
                      </div>
                    )}
                  </div>

                  {/* 位置列表 */}
                  <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/50 text-sm font-medium text-muted-foreground">
                    <Checkbox
                      checked={batch.cells
                        .filter((c) => c.status === 'stored')
                        .every((c) => selectedCells.has(c.id))}
                      onCheckedChange={() => toggleAllInBatch(batch)}
                    />
                    <span className="w-10">位置</span>
                    <span className="flex-1">存储位置</span>
                    <span className="w-16 text-center">状态</span>
                  </div>

                  <div className="p-2 space-y-1">
                    {batch.cells.map((cell) => (
                      <div
                        key={cell.id}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg transition-colors',
                          cell.status === 'stored' ? 'hover:bg-muted cursor-pointer' : 'opacity-60'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (cell.status === 'stored') {
                            toggleCell(cell.id);
                          }
                        }}
                      >
                        <Checkbox
                          checked={selectedCells.has(cell.id)}
                          disabled={cell.status !== 'stored'}
                          onCheckedChange={() => toggleCell(cell.id)}
                        />
                        <span className="font-mono font-medium w-10">
                          {rowToLetter(cell.positionRow)}
                          {cell.positionCol}
                        </span>
                        <span className="text-sm text-muted-foreground flex-1">
                          {cell.box.rack.freezer.name} → {cell.box.rack.name} → {cell.box.name}
                        </span>
                        <Badge
                          variant={cell.status === 'stored' ? 'default' : 'secondary'}
                          className={
                            cell.status === 'stored'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : ''
                          }
                        >
                          {cell.status === 'stored' ? '在库' : '已取出'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PackageX className="w-12 h-12 mb-4 opacity-50" />
              <p>暂无可取出的细胞</p>
              <p className="text-sm mt-1">所有细胞已取出或无入库记录</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <div className="text-sm text-muted-foreground">
              共 {data?.total} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                上一页
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                下一页
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 出库弹窗 */}
      <Dialog open={outboundDialog} onOpenChange={setOutboundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认取出细胞</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              您将取出 <strong>{selectedCells.size}</strong> 管细胞
            </p>
            <div className="space-y-2">
              <Label>
                取出原因 <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={outboundReason}
                onChange={(e) => setOutboundReason(e.target.value)}
                placeholder="请填写取出原因（如：实验使用、转移、销毁等）"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>操作人</Label>
              <Input
                value={outboundOperator}
                onChange={(e) => setOutboundOperator(e.target.value)}
                placeholder="操作人姓名"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutboundDialog(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleOutbound} disabled={outboundMutation.isPending}>
              {outboundMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              确认取出
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 整盒出库组件 ====================
function BoxOutbound() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  const [selectedFreezer, setSelectedFreezer] = useState('');
  const [selectedRack, setSelectedRack] = useState('');
  const [selectedBox, setSelectedBox] = useState('');
  const [outboundReason, setOutboundReason] = useState('');
  const [outboundOperator, setOutboundOperator] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);

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

  // 出库 mutation
  const outboundMutation = useMutation({
    mutationFn: batchOutbound,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['batches-outbound'] });
      queryClient.invalidateQueries({ queryKey: ['outbound-records'] });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['boxDetail'] });
      setConfirmDialog(false);
      setSelectedBox('');
      setOutboundReason('');
      setOutboundOperator('');
      toast({ title: '整盒出库成功', description: '该盒子中所有细胞已标记为取出' });
    },
    onError: (error: Error) => {
      toast({ title: '出库失败', description: error.message, variant: 'destructive' });
    },
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

  // 打开确认弹窗
  const handleOpenConfirm = () => {
    if (!boxDetail || boxDetail.cells.length === 0) {
      toast({ title: '该盒子中没有在库细胞', variant: 'destructive' });
      return;
    }
    if (!outboundReason.trim()) {
      toast({ title: '请填写取出原因', variant: 'destructive' });
      return;
    }
    setOutboundOperator(user?.name || '');
    setConfirmDialog(true);
  };

  // 确认整盒出库
  const handleConfirmOutbound = () => {
    if (!boxDetail) return;
    
    outboundMutation.mutate({
      cellIds: boxDetail.cells.map((c) => c.id),
      reason: outboundReason,
      operator: outboundOperator || user?.name || '',
    });
  };

  return (
    <div className="space-y-4">
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

      {/* 盒子详情和出库操作 */}
      {selectedBox && (
        <>
          {isLoadingBox ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : boxDetail ? (
            <>
              {/* 盒子信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Box className="w-5 h-5" />
                    {boxDetail.rack.freezer.name} → {boxDetail.rack.name} → {boxDetail.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    布局大小: {boxDetail.rows}行 × {boxDetail.cols}列 | 
                    在库细胞: <span className="font-semibold text-green-600">{boxDetail.cells.length}</span> 管
                  </p>
                </CardHeader>
                <CardContent>
                  {boxDetail.cells.length > 0 ? (
                    <div className="space-y-4">
                      {/* 细胞列表 */}
                      <div className="max-h-64 overflow-y-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-20">位置</TableHead>
                              <TableHead>细胞名称</TableHead>
                              <TableHead className="w-24">类型</TableHead>
                              <TableHead className="w-16">代次</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {boxDetail.cells.map((cell) => (
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
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* 出库表单 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                        <div className="space-y-2">
                          <Label>
                            取出原因 <span className="text-destructive">*</span>
                          </Label>
                          <Textarea
                            value={outboundReason}
                            onChange={(e) => setOutboundReason(e.target.value)}
                            placeholder="请填写取出原因（如：整盒转移、实验使用等）"
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>操作人</Label>
                          <Input
                            value={outboundOperator}
                            onChange={(e) => setOutboundOperator(e.target.value)}
                            placeholder="操作人姓名"
                          />
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex justify-end gap-2 pt-4">
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
                          variant="destructive"
                          onClick={handleOpenConfirm}
                        >
                          <PackageMinus className="w-4 h-4 mr-2" />
                          整盒出库 ({boxDetail.cells.length} 管)
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <PackageX className="w-12 h-12 mb-4 opacity-50" />
                      <p>该盒子中没有在库细胞</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}

      {/* 未选择盒子时的提示 */}
      {!selectedBox && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Box className="w-12 h-12 mb-4 opacity-50" />
            <p>请选择冰箱、架子和盒子来进行整盒出库</p>
          </CardContent>
        </Card>
      )}

      {/* 危险确认弹窗 */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              危险操作确认
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p className="font-semibold text-foreground">
                  您即将进行整盒出库操作！
                </p>
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                  <p>
                    <strong>盒子：</strong>
                    {boxDetail?.rack.freezer.name} → {boxDetail?.rack.name} → {boxDetail?.name}
                  </p>
                  <p>
                    <strong>将一次性出库：</strong>
                    <span className="text-destructive font-bold text-lg ml-2">
                      {boxDetail?.cells.length} 管细胞
                    </span>
                  </p>
                  <p>
                    <strong>取出原因：</strong>
                    {outboundReason}
                  </p>
                </div>
                <p className="text-destructive font-medium">
                  ⚠️ 此操作不可撤销，请确认是否继续？
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={outboundMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmOutbound}
              disabled={outboundMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {outboundMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              确认出库
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== 出库记录组件 ====================
function OutboundRecordsList() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['outbound-records', search, page],
    queryFn: () => getOutboundRecords({ search, page, pageSize }),
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleExport = () => {
    if (data?.records && data.records.length > 0) {
      exportOutboundRecords(data.records);
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* 搜索和操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <Input
            placeholder="搜索细胞名称或类型..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>
            <Search className="w-4 h-4 mr-2" />
            搜索
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2 hidden sm:inline">刷新</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.records?.length}>
            <Download className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">导出</span>
          </Button>
        </div>
      </div>

      {/* 表格 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.records && data.records.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">出库日期</TableHead>
                  <TableHead>细胞名称</TableHead>
                  <TableHead className="w-20">类型</TableHead>
                  <TableHead className="w-16">代次</TableHead>
                  <TableHead className="w-16">位置</TableHead>
                  <TableHead>存储位置</TableHead>
                  <TableHead>取出原因</TableHead>
                  <TableHead className="w-20">操作人</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm">{formatDate(record.createdAt)}</TableCell>
                    <TableCell className="font-medium">{record.cellName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.cellType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{record.passage}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{record.position}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{record.location}</TableCell>
                    <TableCell className="text-sm">{record.reason}</TableCell>
                    <TableCell className="text-sm">{record.operator}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mb-4 opacity-50" />
              <p>暂无出库记录</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <div className="text-sm text-muted-foreground">
              共 {data?.total} 条记录，第 {page} / {totalPages} 页
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                上一页
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                下一页
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== 主组件 ====================
export function OutboundPage() {
  const [activeTab, setActiveTab] = useState('takeout');
  const { canBoxOutbound, canCreateOutbound } = usePermissions();

  // 如果没有创建权限，默认显示记录页
  const defaultTab = canCreateOutbound ? 'takeout' : 'records';
  const currentTab = canCreateOutbound ? activeTab : 'records';

  // 计算Tab数量
  const tabCount = [
    canCreateOutbound, // 取出细胞
    canBoxOutbound,    // 整盒出库
    true,              // 出库记录（始终显示）
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <h1 className="text-2xl font-bold">细胞出库</h1>
        <p className="text-muted-foreground">选择细胞并取出</p>
      </div>

      {/* Tab 切换 */}
      <Tabs value={currentTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full max-w-md`} style={{ gridTemplateColumns: `repeat(${tabCount}, 1fr)` }}>
          {canCreateOutbound && (
            <TabsTrigger value="takeout" className="flex items-center gap-2">
              <PackageMinus className="w-4 h-4" />
              取出细胞
            </TabsTrigger>
          )}
          {canBoxOutbound && (
            <TabsTrigger value="box" className="flex items-center gap-2">
              <Box className="w-4 h-4" />
              整盒出库
            </TabsTrigger>
          )}
          <TabsTrigger value="records" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            出库记录
          </TabsTrigger>
        </TabsList>

        {canCreateOutbound && (
          <TabsContent value="takeout" className="mt-6">
            <TakeOutCells />
          </TabsContent>
        )}

        {canBoxOutbound && (
          <TabsContent value="box" className="mt-6">
            <BoxOutbound />
          </TabsContent>
        )}

        <TabsContent value="records" className="mt-6">
          <OutboundRecordsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
