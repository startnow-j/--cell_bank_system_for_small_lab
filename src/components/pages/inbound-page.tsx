'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as xlsx from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  Upload,
  Loader2,
  PackagePlus,
  History,
  Search,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Snowflake,
  Layers,
  Box,
  Grid3X3,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { usePermissions } from '@/hooks/use-permissions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// ==================== 类型定义 ====================
interface Freezer {
  id: string;
  name: string;
  location: string | null;
  temperature: string | null;
  racks: Rack[];
}

interface Rack {
  id: string;
  name: string;
  boxes: BoxType[];
}

interface BoxType {
  id: string;
  name: string;
  rows: number;
  cols: number;
}

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
  cells: Array<{
    id: string;
    code: string | null;
    positionRow: number;
    positionCol: number;
    batch: {
      name: string;
      cellType: string;
    };
  }>;
}

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

interface InboundRecord {
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
  createdAt: string;
  cells: Cell[];
  storedCount: number;
  removedCount: number;
}

interface InboundRecordsResponse {
  batches: InboundRecord[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== 工具函数 ====================
const rowToLetter = (n: number): string => String.fromCharCode(64 + n);

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('zh-CN');
};

// ==================== API 函数 ====================
async function getFreezers(): Promise<Freezer[]> {
  const res = await fetch('/api/freezers');
  return res.json();
}

async function getBoxDetail(boxId: string): Promise<BoxDetail> {
  const res = await fetch(`/api/boxes/${boxId}`);
  return res.json();
}

async function createCellBatch(data: Record<string, unknown>) {
  const res = await fetch('/api/cells', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '创建失败');
  }
  return res.json();
}

async function getInboundRecords(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<InboundRecordsResponse> {
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

  const res = await fetch(`/api/batches?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error('获取入库记录失败');
  }
  return res.json();
}

async function validateBatchInbound(data: unknown) {
  const res = await fetch('/api/inbound/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// ==================== Excel模板下载 ====================
async function downloadTemplate() {
  try {
    const res = await fetch('/api/inbound/template');
    if (!res.ok) {
      throw new Error('下载模板失败');
    }
    
    const blob = await res.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `批量入库模板_${new Date().toLocaleDateString('zh-CN')}.xlsx`;
    link.click();
  } catch (error) {
    console.error('下载模板失败:', error);
    // 降级到CSV模板
    const headers = [
      '细胞名称*',
      '细胞类型*',
      '代次*',
      '数量*',
      '冻存日期*',
      '冰箱名称*',
      '架子名称*',
      '盒子名称*',
      '位置*',
      '冻存液',
      '供体信息',
      '操作人',
      '备注',
    ];

    const example = [
      'HEK293',
      '贴壁细胞',
      'P5',
      '3',
      '2024-01-15',
      '请参考存储位置参考表',
      '请参考存储位置参考表',
      '请参考存储位置参考表',
      'A1,A2,A3',
      '10% DMSO + 90% FBS',
      '人源',
      '张医生',
      '示例备注',
    ];

    const csvContent =
      '\uFEFF' +
      [headers, example]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `批量入库模板_${new Date().toLocaleDateString('zh-CN')}.csv`;
    link.click();
  }
}

// ==================== 入库记录导出 ====================
function exportInboundRecords(records: InboundRecord[]) {
  const headers = [
    '入库日期',
    '批次编号',
    '名称',
    '细胞类型',
    '代次',
    '数量',
    '冻存日期',
    '冻存液',
    '供体信息',
    '操作人',
    '备注',
    '存储位置',
  ];

  const rows = records.map((record) => {
    const boxGroups = new Map<string, { positions: string[]; boxInfo: string }>();
    record.cells.forEach((cell) => {
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
      formatDate(record.createdAt),
      record.batchCode || '-',
      record.name,
      record.cellType,
      record.passage,
      record.totalQuantity,
      formatDate(record.freezeDate),
      record.freezeMedium || '-',
      record.donorInfo || '-',
      record.operator || '-',
      record.remark || '-',
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
  link.download = `入库记录_${new Date().toLocaleDateString('zh-CN')}.csv`;
  link.click();
}

// ==================== 新增入库组件 ====================
function NewInboundForm() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    cellType: '',
    passage: '',
    totalQuantity: '1',
    freezeDate: new Date().toISOString().split('T')[0],
    freezeMedium: '',
    donorInfo: '',
    cultureInfo: '',
    operator: user?.name || '',
    remark: '',
  });

  const [selectedFreezerId, setSelectedFreezerId] = useState('');
  const [selectedRackId, setSelectedRackId] = useState('');
  const [selectedBoxId, setSelectedBoxId] = useState('');
  const [selectedPositions, setSelectedPositions] = useState<Array<{ row: number; col: number }>>([]);

  const { data: freezers, isLoading: loadingFreezers } = useQuery({
    queryKey: ['freezers'],
    queryFn: getFreezers,
  });

  const selectedFreezer = freezers?.find((f) => f.id === selectedFreezerId);
  const selectedRack = selectedFreezer?.racks.find((r) => r.id === selectedRackId);

  const { data: boxDetail, isLoading: loadingBox } = useQuery({
    queryKey: ['box', selectedBoxId],
    queryFn: () => getBoxDetail(selectedBoxId),
    enabled: !!selectedBoxId,
  });

  const occupiedMap = new Map<string, { code: string | null; name: string; cellType: string }>();
  if (boxDetail?.cells) {
    boxDetail.cells.forEach((cell) => {
      occupiedMap.set(`${cell.positionRow}-${cell.positionCol}`, {
        code: cell.code,
        name: cell.batch.name,
        cellType: cell.batch.cellType,
      });
    });
  }

  const createMutation = useMutation({
    mutationFn: createCellBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound-records'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['box', selectedBoxId] });
      toast({ title: '入库成功', description: `已入库 ${formData.totalQuantity} 管细胞` });
      setFormData({
        code: '',
        name: '',
        cellType: '',
        passage: '',
        totalQuantity: '1',
        freezeDate: new Date().toISOString().split('T')[0],
        freezeMedium: '',
        donorInfo: '',
        cultureInfo: '',
        operator: user?.name || '',
        remark: '',
      });
      setSelectedPositions([]);
    },
    onError: (error: Error) => {
      toast({ title: '入库失败', description: error.message, variant: 'destructive' });
    },
  });

  const handleFreezerChange = (value: string) => {
    setSelectedFreezerId(value);
    setSelectedRackId('');
    setSelectedBoxId('');
    setSelectedPositions([]);
  };

  const handleRackChange = (value: string) => {
    setSelectedRackId(value);
    setSelectedBoxId('');
    setSelectedPositions([]);
  };

  const handleBoxChange = (value: string) => {
    setSelectedBoxId(value);
    setSelectedPositions([]);
  };

  const togglePosition = (row: number, col: number) => {
    const index = selectedPositions.findIndex((p) => p.row === row && p.col === col);
    if (index >= 0) {
      setSelectedPositions(selectedPositions.filter((_, i) => i !== index));
    } else {
      const targetQuantity = parseInt(formData.totalQuantity) || 1;
      if (selectedPositions.length < targetQuantity) {
        setSelectedPositions([...selectedPositions, { row, col }]);
      } else {
        toast({
          title: '已达到选择上限',
          description: `您选择的是 ${formData.totalQuantity} 管，已选够位置`,
          variant: 'destructive',
        });
      }
    }
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: '请输入细胞名称', variant: 'destructive' });
      return;
    }
    if (!formData.cellType.trim()) {
      toast({ title: '请输入细胞类型', variant: 'destructive' });
      return;
    }
    if (!formData.passage.trim()) {
      toast({ title: '请输入代次', variant: 'destructive' });
      return;
    }
    if (!selectedBoxId) {
      toast({ title: '请选择存储盒子', variant: 'destructive' });
      return;
    }

    const targetQuantity = parseInt(formData.totalQuantity) || 1;
    if (selectedPositions.length !== targetQuantity) {
      toast({
        title: '位置数量不匹配',
        description: `需要选择 ${targetQuantity} 个位置，当前已选 ${selectedPositions.length} 个`,
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      ...formData,
      totalQuantity: formData.totalQuantity,
      boxId: selectedBoxId,
      positions: selectedPositions,
    });
  };

  const targetQuantity = parseInt(formData.totalQuantity) || 1;
  const remainingSelections = targetQuantity - selectedPositions.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 左侧：细胞信息表单 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">细胞信息</CardTitle>
          <CardDescription>填写细胞的基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>细胞编号（可选）</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="如：CELL-001"
              />
            </div>
            <div className="space-y-2">
              <Label>
                细胞名称 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="如：HEK293"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                细胞类型 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.cellType}
                onChange={(e) => setFormData({ ...formData, cellType: e.target.value })}
                placeholder="如：贴壁细胞"
              />
            </div>
            <div className="space-y-2">
              <Label>
                代次 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={formData.passage}
                onChange={(e) => setFormData({ ...formData, passage: e.target.value })}
                placeholder="如：P5 或 未知"
              />
              <p className="text-xs text-muted-foreground">可输入数字或"未知"</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                冻存数量（管） <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                value={formData.totalQuantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setFormData({ ...formData, totalQuantity: String(Math.max(1, val)) });
                }}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>
                冻存日期 <span className="text-destructive">*</span>
              </Label>
              <Input
                type="date"
                value={formData.freezeDate}
                onChange={(e) => setFormData({ ...formData, freezeDate: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>冻存液</Label>
            <Input
              value={formData.freezeMedium}
              onChange={(e) => setFormData({ ...formData, freezeMedium: e.target.value })}
              placeholder="如：10% DMSO + 90% FBS"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>供体信息</Label>
              <Input
                value={formData.donorInfo}
                onChange={(e) => setFormData({ ...formData, donorInfo: e.target.value })}
                placeholder="如：小鼠源"
              />
            </div>
            <div className="space-y-2">
              <Label>培养条件</Label>
              <Input
                value={formData.cultureInfo}
                onChange={(e) => setFormData({ ...formData, cultureInfo: e.target.value })}
                placeholder="如：DMEM + 10% FBS"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>操作人</Label>
            <Input
              value={formData.operator}
              onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
              placeholder="操作人姓名"
            />
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="其他备注信息"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* 右侧：位置选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">存储位置</CardTitle>
          <CardDescription>选择细胞的存储位置（需选择 {targetQuantity} 个位置）</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-cyan-500" />
              选择冰箱
            </Label>
            <Select value={selectedFreezerId} onValueChange={handleFreezerChange}>
              <SelectTrigger>
                <SelectValue placeholder="请选择冰箱" />
              </SelectTrigger>
              <SelectContent>
                {freezers?.map((freezer) => (
                  <SelectItem key={freezer.id} value={freezer.id}>
                    {freezer.name}
                    {freezer.location && ` (${freezer.location})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-orange-500" />
              选择架子
            </Label>
            <Select value={selectedRackId} onValueChange={handleRackChange} disabled={!selectedFreezerId}>
              <SelectTrigger>
                <SelectValue placeholder={selectedFreezerId ? '请选择架子' : '请先选择冰箱'} />
              </SelectTrigger>
              <SelectContent>
                {selectedFreezer?.racks.map((rack) => (
                  <SelectItem key={rack.id} value={rack.id}>
                    {rack.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Box className="w-4 h-4 text-purple-500" />
              选择盒子
            </Label>
            <Select value={selectedBoxId} onValueChange={handleBoxChange} disabled={!selectedRackId}>
              <SelectTrigger>
                <SelectValue placeholder={selectedRackId ? '请选择盒子' : '请先选择架子'} />
              </SelectTrigger>
              <SelectContent>
                {selectedRack?.boxes.map((box) => (
                  <SelectItem key={box.id} value={box.id}>
                    {box.name} ({box.rows}×{box.cols})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBoxId && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-green-500" />
                选择位置
              </Label>

              <div className="flex items-center gap-2 text-sm">
                <Badge variant={remainingSelections === 0 ? 'default' : 'secondary'}>
                  已选 {selectedPositions.length} / {targetQuantity}
                </Badge>
                {remainingSelections > 0 && (
                  <span className="text-muted-foreground">还需选择 {remainingSelections} 个位置</span>
                )}
              </div>

              {selectedPositions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedPositions.map((pos, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {rowToLetter(pos.row)}{pos.col}
                    </Badge>
                  ))}
                </div>
              )}

              {loadingBox ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : boxDetail ? (
                <div className="border rounded-lg p-3 overflow-auto">
                  <div className="min-w-fit">
                    <div className="flex gap-1 mb-1">
                      <div className="w-8 h-6" />
                      {Array.from({ length: boxDetail.cols }, (_, i) => (
                        <div key={i} className="w-8 h-6 flex items-center justify-center text-xs text-muted-foreground">
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    {Array.from({ length: boxDetail.rows }, (_, rowIndex) => (
                      <div key={rowIndex} className="flex gap-1 mb-1">
                        <div className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground font-medium">
                          {rowToLetter(rowIndex + 1)}
                        </div>
                        {Array.from({ length: boxDetail.cols }, (_, colIndex) => {
                          const key = `${rowIndex + 1}-${colIndex + 1}`;
                          const occupied = occupiedMap.get(key);
                          const isSelected = selectedPositions.some(
                            (p) => p.row === rowIndex + 1 && p.col === colIndex + 1
                          );

                          return (
                            <button
                              key={colIndex}
                              type="button"
                              disabled={!!occupied}
                              onClick={() => togglePosition(rowIndex + 1, colIndex + 1)}
                              className={cn(
                                'w-8 h-8 rounded text-xs font-medium transition-colors',
                                occupied
                                  ? 'bg-red-100 text-red-600 cursor-not-allowed dark:bg-red-900/30'
                                  : isSelected
                                  ? 'bg-green-500 text-white'
                                  : 'bg-muted hover:bg-green-100 dark:hover:bg-green-900/30'
                              )}
                              title={occupied ? `${occupied.name} (${occupied.cellType})` : `位置 ${rowToLetter(rowIndex + 1)}${colIndex + 1}`}
                            >
                              {occupied ? (
                                <XCircle className="w-4 h-4 mx-auto" />
                              ) : isSelected ? (
                                <CheckCircle2 className="w-4 h-4 mx-auto" />
                              ) : (
                                ''
                              )}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-green-500" />
                      已选择
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/30" />
                      已占用
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 rounded bg-muted" />
                      可用
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {boxDetail && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              <span className="text-muted-foreground">存储路径：</span>
              <span className="font-medium">
                {boxDetail.rack.freezer.name} → {boxDetail.rack.name} → {boxDetail.name}
              </span>
            </div>
          )}

          <Separator />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              `确认入库 (${selectedPositions.length}/${targetQuantity} 位置)`
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== 批量入库组件（文件上传） ====================
interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ParsedRow {
  rowNum: number;
  name: string;
  cellType: string;
  passage: string;
  quantity: number;
  freezeDate: string;
  freezerName: string;
  rackName: string;
  boxName: string;
  positions: string[];
  freezeMedium?: string;
  donorInfo?: string;
  operator?: string;
  remark?: string;
}

// 入库结果类型
interface InboundResult {
  row: number;
  name: string;
  success: boolean;
  message: string;
}

function BatchInboundForm() {
  const queryClient = useQueryClient();
  const { user } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [uploading, setUploading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedRow[] | null>(null);
  const [inboundResults, setInboundResults] = useState<InboundResult[]>([]);

  // 解析数据行（通用方法）
  const parseRows = (rows: Array<{ [key: string]: unknown }>): ParsedRow[] => {
    const results: ParsedRow[] = [];
    
    rows.forEach((row, index) => {
      // 跳过空行
      if (!row || Object.values(row).every(v => !v)) return;
      
      // 获取字段值（兼容不同格式）
      const getValue = (keys: string[]): string => {
        for (const key of keys) {
          const val = row[key];
          if (val !== undefined && val !== null) {
            // 处理日期对象
            if (val instanceof Date) {
              return val.toISOString().split('T')[0];
            }
            const strVal = String(val).trim();
            if (strVal) {
              return strVal;
            }
          }
        }
        return '';
      };

      // 专门处理日期字段（Excel 日期可能是数字序列号或 Date 对象）
      const getDateValue = (keys: string[]): string => {
        for (const key of keys) {
          const val = row[key];
          if (val !== undefined && val !== null) {
            // 如果是 Date 对象
            if (val instanceof Date && !isNaN(val.getTime())) {
              return val.toISOString().split('T')[0];
            }
            // 如果是数字（Excel 日期序列号）
            if (typeof val === 'number' && val > 0) {
              // Excel 日期序列号转换 (Excel epoch: 1899-12-30)
              const excelEpoch = new Date(1899, 11, 30);
              const date = new Date(excelEpoch.getTime() + val * 86400000);
              if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
              }
            }
            // 如果是字符串
            const strVal = String(val).trim();
            if (strVal) {
              // 尝试解析日期字符串
              const parsed = new Date(strVal);
              if (!isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
              }
              return strVal;
            }
          }
        }
        return '';
      };

      const name = getValue(['细胞名称', '细胞名称*', 'name']);
      const cellType = getValue(['细胞类型', '细胞类型*', 'cellType']);
      const passage = getValue(['代次', '代次*', 'passage']);
      const quantityStr = getValue(['数量', '数量*', '冻存数量(管)', '冻存数量(管)*', 'quantity']);
      const freezeDate = getDateValue(['冻存日期', '冻存日期*', 'freezeDate']);
      const freezerName = getValue(['冰箱名称', '冰箱名称*', 'freezerName']);
      const rackName = getValue(['架子名称', '架子名称*', 'rackName']);
      const boxName = getValue(['盒子名称', '盒子名称*', 'boxName']);
      const positionsStr = getValue(['位置', '位置*', 'positions']);
      const freezeMedium = getValue(['冻存液', 'freezeMedium']);
      const donorInfo = getValue(['供体信息', 'donorInfo']);
      const operator = getValue(['操作人', 'operator']);
      const remark = getValue(['备注', 'remark']);

      // 跳过表头行（如果第一列是"细胞名称"说明是表头）
      if (name === '细胞名称' || name === '细胞名称*') return;

      const quantity = parseInt(quantityStr) || 0;
      const positions = positionsStr 
        ? positionsStr.split(/[,，;；\s]+/).map(p => p.trim().toUpperCase()).filter(p => p)
        : [];

      results.push({
        rowNum: index + 2,
        name,
        cellType,
        passage,
        quantity,
        freezeDate,
        freezerName,
        rackName,
        boxName,
        positions,
        freezeMedium: freezeMedium || undefined,
        donorInfo: donorInfo || undefined,
        operator: operator || undefined,
        remark: remark || undefined,
      });
    });

    return results;
  };

  // 处理文件选择
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setParsedData([]);
    setPreviewData(null);
    setInboundResults([]);

    const fileName = selectedFile.name.toLowerCase();

    try {
      let data: ParsedRow[] = [];

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // 解析 Excel 文件
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = xlsx.read(arrayBuffer, { type: 'array' });
        
        // 获取第一个工作表（入库模板）
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // 转换为JSON
        const jsonData = xlsx.utils.sheet_to_json<Array<{ [key: string]: unknown }>>(worksheet);
        
        data = parseRows(jsonData);
      } else if (fileName.endsWith('.csv')) {
        // 解析 CSV 文件
        const content = await selectedFile.text();
        const lines = content.trim().split('\n');
        
        if (lines.length < 2) {
          throw new Error('文件内容为空或格式错误');
        }

        // 解析表头
        const headerLine = lines[0];
        const headers: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (const char of headerLine) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            headers.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        headers.push(current.trim());

        // 解析数据行
        const rows: Array<{ [key: string]: unknown }> = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          if (!line.trim()) continue;

          const values: string[] = [];
          current = '';
          inQuotes = false;

          for (const char of line) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          const row: { [key: string]: unknown } = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });
          rows.push(row);
        }

        data = parseRows(rows);
      } else {
        throw new Error('不支持的文件格式，请使用 .xlsx, .xls 或 .csv 文件');
      }

      // 过滤掉完全空的行
      const validData = data.filter(row => row.name || row.cellType || row.freezerName);

      if (validData.length === 0) {
        throw new Error('未找到有效数据，请检查文件格式');
      }

      setParsedData(validData);
      toast({ title: '文件已解析', description: `共解析 ${validData.length} 条记录` });
    } catch (error) {
      console.error('文件解析失败:', error);
      toast({
        title: '文件解析失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    }
  };

  // 校验数据
  const handleValidate = async () => {
    if (parsedData.length === 0) {
      toast({ title: '请先上传文件', variant: 'destructive' });
      return;
    }

    setValidating(true);
    setErrors([]);

    try {
      const result = await validateBatchInbound({ rows: parsedData });

      if (result.success) {
        setPreviewData(parsedData);
        toast({ title: '校验通过', description: '数据格式正确，可以提交入库' });
      } else {
        setErrors(result.errors || []);
        toast({
          title: `发现 ${result.errors?.length || 0} 个错误`,
          description: '请修正后重新上传',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: '校验失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  // 批量入库
  const handleSubmit = async () => {
    if (parsedData.length === 0) {
      toast({ title: '请先上传文件', variant: 'destructive' });
      return;
    }

    // 必须先校验通过才能入库
    if (!previewData) {
      toast({ title: '请先校验数据', description: '点击"校验数据"按钮检查数据格式和位置是否可用', variant: 'destructive' });
      return;
    }

    // 如果有错误，不允许入库
    if (errors.length > 0) {
      toast({ title: '存在错误，请修正后重新上传', variant: 'destructive' });
      return;
    }

    setUploading(true);
    setInboundResults([]);
    const results: InboundResult[] = [];

    for (const row of parsedData) {
      try {
        await createCellBatch({
          name: row.name,
          cellType: row.cellType,
          passage: row.passage,
          totalQuantity: row.quantity,
          freezeDate: row.freezeDate,
          freezerName: row.freezerName,
          rackName: row.rackName,
          boxName: row.boxName,
          positions: row.positions,
          freezeMedium: row.freezeMedium,
          donorInfo: row.donorInfo,
          operator: row.operator || user?.name || '',
          remark: row.remark,
        });
        results.push({
          row: row.rowNum,
          name: row.name,
          success: true,
          message: '入库成功'
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : '未知错误';
        results.push({
          row: row.rowNum,
          name: row.name,
          success: false,
          message: errorMsg
        });
      }
    }

    setInboundResults(results);
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ['inbound-records'] });
    queryClient.invalidateQueries({ queryKey: ['stats'] });

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (failCount === 0) {
      toast({ title: '批量入库成功', description: `成功入库 ${successCount} 批细胞` });
      // 重置
      setFile(null);
      setParsedData([]);
      setErrors([]);
      setPreviewData(null);
      setInboundResults([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      toast({
        title: '部分入库成功',
        description: `成功 ${successCount} 批，失败 ${failCount} 批，请查看下方详情`,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 步骤说明 */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <FileSpreadsheet className="w-8 h-8 text-primary flex-shrink-0" />
            <div className="space-y-2">
              <h3 className="font-semibold">批量入库说明</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>下载模板文件，按照格式填写细胞信息</li>
                <li>上传填写好的 CSV 文件，系统将自动解析</li>
                <li>点击「校验数据」检查格式和位置是否可用</li>
                <li>校验通过后，点击「批量入库」完成操作</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 操作区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">上传文件</CardTitle>
          <CardDescription>
            支持 Excel (.xlsx) 和 CSV 格式，文件编码建议使用 UTF-8
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              下载模板（含位置参考）
            </Button>
            <div className="flex-1 min-w-[200px]">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            模板包含两个Sheet：入库模板和存储位置参考，请按照参考表中的名称填写
          </p>

          {file && (
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary">{file.name}</Badge>
              <span className="text-muted-foreground">
                {parsedData.length > 0 && `${parsedData.length} 条记录`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 校验错误 */}
      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <CardTitle className="text-lg">发现 {errors.length} 个错误</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-sm"
                >
                  <Badge variant="destructive" className="flex-shrink-0">
                    第 {error.row} 行
                  </Badge>
                  <span>{error.message}</span>
                  {error.value && (
                    <span className="text-muted-foreground">({error.value})</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 入库结果 */}
      {inboundResults.length > 0 && (
        <Card className={inboundResults.some(r => !r.success) ? 'border-destructive' : 'border-green-500'}>
          <CardHeader className="pb-3">
            <div className={cn('flex items-center gap-2', inboundResults.some(r => !r.success) ? 'text-destructive' : 'text-green-600')}>
              {inboundResults.some(r => !r.success) ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
              <CardTitle className="text-lg">
                入库结果：成功 {inboundResults.filter(r => r.success).length} 批，
                失败 {inboundResults.filter(r => !r.success).length} 批
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-auto">
              {inboundResults.map((result, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-2 p-2 rounded text-sm',
                    result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-destructive/10'
                  )}
                >
                  <Badge 
                    variant={result.success ? 'default' : 'destructive'} 
                    className={cn('flex-shrink-0', result.success && 'bg-green-600')}
                  >
                    第 {result.row} 行
                  </Badge>
                  <span className="font-medium">{result.name}</span>
                  <span className={result.success ? 'text-green-600' : 'text-destructive'}>
                    {result.message}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据预览 */}
      {parsedData.length > 0 && errors.length === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <CardTitle className="text-lg">数据预览</CardTitle>
            </div>
            <CardDescription>
              共 {parsedData.length} 条记录待入库
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>细胞名称</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>代次</TableHead>
                    <TableHead>数量</TableHead>
                    <TableHead>冻存日期</TableHead>
                    <TableHead>冰箱</TableHead>
                    <TableHead>架子</TableHead>
                    <TableHead>盒子</TableHead>
                    <TableHead>位置</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row) => (
                    <TableRow key={row.rowNum}>
                      <TableCell>{row.rowNum}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.cellType}</TableCell>
                      <TableCell>{row.passage}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>{row.freezeDate}</TableCell>
                      <TableCell>{row.freezerName}</TableCell>
                      <TableCell>{row.rackName}</TableCell>
                      <TableCell>{row.boxName}</TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{row.positions.join(', ')}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsedData.length > 10 && (
                <div className="text-center py-2 text-sm text-muted-foreground">
                  还有 {parsedData.length - 10} 条记录未显示...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleValidate}
          disabled={parsedData.length === 0 || validating}
        >
          {validating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              校验中...
            </>
          ) : (
            '校验数据'
          )}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={parsedData.length === 0 || uploading || errors.length > 0 || !previewData}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              入库中...
            </>
          ) : (
            <>
              <PackagePlus className="w-4 h-4 mr-2" />
              批量入库 ({parsedData.length} 批)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ==================== 入库记录列表组件 ====================
function InboundRecordsList() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<InboundRecord | null>(null);
  const pageSize = 20;

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['inbound-records', search, page],
    queryFn: () => getInboundRecords({ search, page, pageSize }),
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleExport = () => {
    if (data?.batches && data.batches.length > 0) {
      exportInboundRecords(data.batches);
    }
  };

  const openDetail = (record: InboundRecord) => {
    setSelectedRecord(record);
    setDetailDialog(true);
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      {/* 搜索和操作栏 */}
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2 hidden sm:inline">刷新</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.batches?.length}>
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
          ) : data?.batches && data.batches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">入库日期</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead className="w-20">类型</TableHead>
                  <TableHead className="w-16">代次</TableHead>
                  <TableHead className="w-16 text-center">数量</TableHead>
                  <TableHead className="w-24">冻存日期</TableHead>
                  <TableHead className="w-20">操作人</TableHead>
                  <TableHead className="w-16 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.batches.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm">{formatDate(record.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{record.name}</span>
                        {record.batchCode && (
                          <span className="text-xs text-muted-foreground font-mono">
                            ({record.batchCode})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.cellType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{record.passage}</Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">{record.totalQuantity}</TableCell>
                    <TableCell className="text-sm">{formatDate(record.freezeDate)}</TableCell>
                    <TableCell className="text-sm">{record.operator || '-'}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => openDetail(record)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mb-4 opacity-50" />
              <p>暂无入库记录</p>
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

      {/* 详情弹窗 */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>入库详情</DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">入库日期</Label>
                  <p className="font-medium">{formatDate(selectedRecord.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">批次编号</Label>
                  <p className="font-medium">{selectedRecord.batchCode || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">名称</Label>
                  <p className="font-medium">{selectedRecord.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">细胞类型</Label>
                  <p className="font-medium">{selectedRecord.cellType}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">代次</Label>
                  <p className="font-medium">{selectedRecord.passage}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">数量</Label>
                  <p className="font-medium">{selectedRecord.totalQuantity} 管</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">冻存日期</Label>
                  <p className="font-medium">{formatDate(selectedRecord.freezeDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">操作人</Label>
                  <p className="font-medium">{selectedRecord.operator || '-'}</p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t">
                <div>
                  <Label className="text-muted-foreground text-sm">冻存液</Label>
                  <p className="font-medium">{selectedRecord.freezeMedium || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">供体信息</Label>
                  <p className="font-medium">{selectedRecord.donorInfo || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">备注</Label>
                  <p className="font-medium">{selectedRecord.remark || '-'}</p>
                </div>
              </div>

              {/* 存储位置 */}
              <div className="pt-3 border-t">
                <Label className="text-muted-foreground text-sm">存储位置</Label>
                <div className="mt-2 space-y-2">
                  {(() => {
                    const boxGroups = new Map<string, { positions: string[]; box: Cell['box'] }>();
                    selectedRecord.cells.forEach((cell) => {
                      const boxKey = cell.box.id;
                      const position = `${rowToLetter(cell.positionRow)}${cell.positionCol}`;
                      if (!boxGroups.has(boxKey)) {
                        boxGroups.set(boxKey, { positions: [], box: cell.box });
                      }
                      boxGroups.get(boxKey)!.positions.push(position);
                    });

                    return Array.from(boxGroups.values()).map((group, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-muted text-sm">
                        <span className="font-mono font-medium">{group.positions.join(', ')}</span>
                        <span className="text-muted-foreground ml-2">
                          | {group.box.rack.freezer.name} → {group.box.rack.name} → {group.box.name}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== 主组件 ====================
export function InboundPage() {
  const [activeTab, setActiveTab] = useState('new');
  const { canBatchInbound, canCreateInbound } = usePermissions();

  // 如果没有创建权限，默认显示记录页
  const defaultTab = canCreateInbound ? 'new' : 'records';
  const currentTab = canCreateInbound ? activeTab : 'records';

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <h1 className="text-2xl font-bold">细胞入库</h1>
        <p className="text-muted-foreground">登记新入库的冻存细胞信息</p>
      </div>

      {/* Tab 切换 */}
      <div className="border-b">
        <div className="flex gap-4">
          {canCreateInbound && (
            <button
              onClick={() => setActiveTab('new')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'new'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <PackagePlus className="w-4 h-4 inline mr-2" />
              新增入库
            </button>
          )}
          {canBatchInbound && (
            <button
              onClick={() => setActiveTab('batch')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                currentTab === 'batch'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              批量入库
            </button>
          )}
          <button
            onClick={() => setActiveTab('records')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              currentTab === 'records'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <History className="w-4 h-4 inline mr-2" />
            入库记录
          </button>
        </div>
      </div>

      {/* 内容区 */}
      {currentTab === 'new' && <NewInboundForm />}
      {currentTab === 'batch' && <BatchInboundForm />}
      {currentTab === 'records' && <InboundRecordsList />}
    </div>
  );
}
