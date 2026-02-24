'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Badge } from '@/components/ui/badge';
import {
  Snowflake,
  Plus,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Box,
  Layers,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// 类型定义
interface BoxType {
  id: string;
  name: string;
  rows: number;
  cols: number;
  remark: string | null;
}

interface Rack {
  id: string;
  name: string;
  capacity: number | null;
  remark: string | null;
  boxes: BoxType[];
}

interface Freezer {
  id: string;
  name: string;
  location: string | null;
  temperature: string | null;
  capacity: number | null;
  remark: string | null;
  racks: Rack[];
}

// 获取冰箱列表
async function getFreezers(): Promise<Freezer[]> {
  const res = await fetch('/api/freezers');
  return res.json();
}

// 创建冰箱
async function createFreezer(data: Record<string, unknown>) {
  const res = await fetch('/api/freezers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// 更新冰箱
async function updateFreezer(id: string, data: Record<string, unknown>) {
  const res = await fetch(`/api/freezers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// 删除冰箱
async function deleteFreezer(id: string) {
  const res = await fetch(`/api/freezers/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '删除失败');
  }
  return data;
}

// 创建架子
async function createRack(data: Record<string, unknown>) {
  const res = await fetch('/api/racks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// 删除架子
async function deleteRack(id: string) {
  const res = await fetch(`/api/racks/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '删除失败');
  }
  return data;
}

// 创建盒子
async function createBox(data: Record<string, unknown>) {
  const res = await fetch('/api/boxes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

// 删除盒子
async function deleteBox(id: string) {
  const res = await fetch(`/api/boxes/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '删除失败');
  }
  return data;
}

export function LocationsPage() {
  const queryClient = useQueryClient();
  const { data: freezers, isLoading } = useQuery({
    queryKey: ['freezers'],
    queryFn: getFreezers,
  });

  // 展开状态
  const [expandedFreezers, setExpandedFreezers] = useState<Set<string>>(new Set());
  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(new Set());

  // 弹窗状态
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'freezer' | 'rack' | 'box'>('freezer');
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [dialogData, setDialogData] = useState<Record<string, string>>({});
  const [editId, setEditId] = useState<string>('');
  const [parentId, setParentId] = useState<string>('');

  // 删除确认弹窗
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    type: 'freezer' | 'rack' | 'box';
    id: string;
    name: string;
  }>({ open: false, type: 'freezer', id: '', name: '' });

  // Mutations
  const createFreezerMutation = useMutation({
    mutationFn: createFreezer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freezers'] });
      setDialogOpen(false);
      toast({ title: '创建成功', description: '冰箱已创建' });
    },
    onError: () => {
      toast({ title: '创建失败', description: '请重试', variant: 'destructive' });
    },
  });

  const updateFreezerMutation = useMutation({
    mutationFn: (data: { id: string; data: Record<string, unknown> }) =>
      updateFreezer(data.id, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freezers'] });
      setDialogOpen(false);
      toast({ title: '更新成功', description: '冰箱信息已更新' });
    },
    onError: () => {
      toast({ title: '更新失败', description: '请重试', variant: 'destructive' });
    },
  });

  const deleteFreezerMutation = useMutation({
    mutationFn: deleteFreezer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freezers'] });
      setDeleteDialog({ ...deleteDialog, open: false });
      toast({ title: '删除成功', description: '冰箱已删除' });
    },
    onError: (error: Error) => {
      toast({ title: '无法删除', description: error.message, variant: 'destructive' });
    },
  });

  const createRackMutation = useMutation({
    mutationFn: createRack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freezers'] });
      setDialogOpen(false);
      toast({ title: '创建成功', description: '架子已创建' });
    },
    onError: () => {
      toast({ title: '创建失败', description: '请重试', variant: 'destructive' });
    },
  });

  const deleteRackMutation = useMutation({
    mutationFn: deleteRack,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freezers'] });
      setDeleteDialog({ ...deleteDialog, open: false });
      toast({ title: '删除成功', description: '架子已删除' });
    },
    onError: (error: Error) => {
      toast({ title: '无法删除', description: error.message, variant: 'destructive' });
    },
  });

  const createBoxMutation = useMutation({
    mutationFn: createBox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freezers'] });
      setDialogOpen(false);
      toast({ title: '创建成功', description: '盒子已创建' });
    },
    onError: () => {
      toast({ title: '创建失败', description: '请重试', variant: 'destructive' });
    },
  });

  const deleteBoxMutation = useMutation({
    mutationFn: deleteBox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freezers'] });
      setDeleteDialog({ ...deleteDialog, open: false });
      toast({ title: '删除成功', description: '盒子已删除' });
    },
    onError: (error: Error) => {
      toast({ title: '无法删除', description: error.message, variant: 'destructive' });
    },
  });

  // 打开添加弹窗
  const openAddDialog = (type: 'freezer' | 'rack' | 'box', parent: string = '') => {
    setDialogType(type);
    setDialogMode('add');
    setParentId(parent);
    setDialogData({});
    setDialogOpen(true);
  };

  // 打开编辑弹窗
  const openEditDialog = (
    type: 'freezer' | 'rack' | 'box',
    item: { id: string; name: string; [key: string]: unknown }
  ) => {
    setDialogType(type);
    setDialogMode('edit');
    setEditId(item.id);
    setDialogData({
      name: item.name,
      location: (item.location as string) || '',
      temperature: (item.temperature as string) || '',
      capacity: String(item.capacity || ''),
      rows: String((item as { rows?: number }).rows || 10),
      cols: String((item as { cols?: number }).cols || 10),
      remark: (item.remark as string) || '',
    });
    setDialogOpen(true);
  };

  // 提交表单
  const handleSubmit = () => {
    if (!dialogData.name?.trim()) {
      toast({ title: '请输入名称', variant: 'destructive' });
      return;
    }

    if (dialogMode === 'add') {
      if (dialogType === 'freezer') {
        createFreezerMutation.mutate(dialogData);
      } else if (dialogType === 'rack') {
        createRackMutation.mutate({ ...dialogData, freezerId: parentId });
      } else {
        createBoxMutation.mutate({ ...dialogData, rackId: parentId });
      }
    } else {
      if (dialogType === 'freezer') {
        updateFreezerMutation.mutate({ id: editId, data: dialogData });
      }
    }
  };

  // 执行删除
  const handleDelete = () => {
    if (deleteDialog.type === 'freezer') {
      deleteFreezerMutation.mutate(deleteDialog.id);
    } else if (deleteDialog.type === 'rack') {
      deleteRackMutation.mutate(deleteDialog.id);
    } else {
      deleteBoxMutation.mutate(deleteDialog.id);
    }
  };

  // 切换展开状态
  const toggleFreezer = (id: string) => {
    const newSet = new Set(expandedFreezers);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedFreezers(newSet);
  };

  const toggleRack = (id: string) => {
    const newSet = new Set(expandedRacks);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedRacks(newSet);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">存储位置管理</h1>
            <p className="text-muted-foreground">管理冰箱、架子、盒子的层级结构</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            加载中...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">存储位置管理</h1>
          <p className="text-muted-foreground">管理冰箱、架子、盒子的层级结构</p>
        </div>
        <Button onClick={() => openAddDialog('freezer')} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          添加冰箱
        </Button>
      </div>

      {/* 位置树 */}
      <Card>
        <CardContent className="p-4">
          {freezers && freezers.length > 0 ? (
            <div className="space-y-2">
              {freezers.map((freezer) => (
                <div key={freezer.id} className="border rounded-lg overflow-hidden">
                  {/* 冰箱行 */}
                  <div
                    className="flex items-center gap-2 p-3 bg-cyan-50 dark:bg-cyan-950/30 cursor-pointer hover:bg-cyan-100 dark:hover:bg-cyan-900/30"
                    onClick={() => toggleFreezer(freezer.id)}
                  >
                    {expandedFreezers.has(freezer.id) ? (
                      <ChevronDown className="w-5 h-5 text-cyan-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-cyan-600" />
                    )}
                    <Snowflake className="w-5 h-5 text-cyan-600" />
                    <span className="font-medium">{freezer.name}</span>
                    {freezer.location && (
                      <Badge variant="secondary" className="ml-2">
                        <MapPin className="w-3 h-3 mr-1" />
                        {freezer.location}
                      </Badge>
                    )}
                    {freezer.temperature && (
                      <Badge variant="outline" className="ml-2">
                        {freezer.temperature}
                      </Badge>
                    )}
                    <span className="ml-auto text-sm text-muted-foreground">
                      {freezer.racks.length} 个架子
                    </span>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAddDialog('rack', freezer.id)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog('freezer', freezer)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeleteDialog({
                            open: true,
                            type: 'freezer',
                            id: freezer.id,
                            name: freezer.name,
                          })
                        }
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* 架子列表 */}
                  {expandedFreezers.has(freezer.id) && freezer.racks.length > 0 && (
                    <div className="border-t">
                      {freezer.racks.map((rack) => (
                        <div key={rack.id}>
                          <div
                            className="flex items-center gap-2 p-3 pl-10 bg-orange-50 dark:bg-orange-950/30 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30"
                            onClick={() => toggleRack(rack.id)}
                          >
                            {expandedRacks.has(rack.id) ? (
                              <ChevronDown className="w-4 h-4 text-orange-600" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-orange-600" />
                            )}
                            <Layers className="w-4 h-4 text-orange-600" />
                            <span className="font-medium">{rack.name}</span>
                            <span className="ml-auto text-sm text-muted-foreground">
                              {rack.boxes.length} 个盒子
                            </span>
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAddDialog('box', rack.id)}
                              >
                                <Plus className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setDeleteDialog({
                                    open: true,
                                    type: 'rack',
                                    id: rack.id,
                                    name: `${freezer.name} / ${rack.name}`,
                                  })
                                }
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>

                          {/* 盒子列表 */}
                          {expandedRacks.has(rack.id) && rack.boxes.length > 0 && (
                            <div className="border-t bg-muted/30">
                              {rack.boxes.map((box) => (
                                <div
                                  key={box.id}
                                  className="flex items-center gap-2 p-3 pl-16 hover:bg-muted/50"
                                >
                                  <Box className="w-4 h-4 text-purple-600" />
                                  <span>{box.name}</span>
                                  <Badge variant="outline" className="ml-2">
                                    {box.rows}×{box.cols}
                                  </Badge>
                                  <div className="ml-auto flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        setDeleteDialog({
                                          open: true,
                                          type: 'box',
                                          id: box.id,
                                          name: `${freezer.name} / ${rack.name} / ${box.name}`,
                                        })
                                      }
                                    >
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Snowflake className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无冰箱，点击上方按钮添加</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'add'
                ? dialogType === 'freezer'
                  ? '添加冰箱'
                  : dialogType === 'rack'
                  ? '添加架子'
                  : '添加盒子'
                : '编辑冰箱'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                {dialogType === 'freezer' ? '冰箱名称' : dialogType === 'rack' ? '架子名称' : '盒子名称'}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={dialogData.name || ''}
                onChange={(e) => setDialogData({ ...dialogData, name: e.target.value })}
                placeholder={
                  dialogType === 'freezer'
                    ? '如：1号冰箱'
                    : dialogType === 'rack'
                    ? '如：A架'
                    : '如：盒子1'
                }
              />
            </div>

            {dialogType === 'freezer' && (
              <>
                <div className="space-y-2">
                  <Label>存放位置</Label>
                  <Input
                    value={dialogData.location || ''}
                    onChange={(e) => setDialogData({ ...dialogData, location: e.target.value })}
                    placeholder="如：实验室A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>温度</Label>
                  <Input
                    value={dialogData.temperature || ''}
                    onChange={(e) => setDialogData({ ...dialogData, temperature: e.target.value })}
                    placeholder="如：-80°C"
                  />
                </div>
              </>
            )}

            {dialogType === 'box' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>行数</Label>
                  <Input
                    type="number"
                    value={dialogData.rows || '10'}
                    onChange={(e) => setDialogData({ ...dialogData, rows: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>列数</Label>
                  <Input
                    type="number"
                    value={dialogData.cols || '10'}
                    onChange={(e) => setDialogData({ ...dialogData, cols: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                value={dialogData.remark || ''}
                onChange={(e) => setDialogData({ ...dialogData, remark: e.target.value })}
                placeholder="可选备注信息"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSubmit}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 "{deleteDialog.name}" 吗？
              {deleteDialog.type === 'freezer' && '这将同时删除其下所有架子和盒子。'}
              {deleteDialog.type === 'rack' && '这将同时删除其下所有盒子。'}
              此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
