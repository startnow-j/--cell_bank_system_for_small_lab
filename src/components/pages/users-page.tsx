'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Loader2,
  UserPlus,
  Pencil,
  Trash2,
  Users,
  Shield,
  User,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import { usePermissions } from '@/hooks/use-permissions';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, type UserRole } from '@/lib/permissions';

// 格式化日期
const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('zh-CN');
};

interface UserItem {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  users: UserItem[];
  total: number;
  page: number;
  pageSize: number;
}

// 获取用户列表
async function getUsers(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<UsersResponse> {
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

  const res = await fetch(`/api/users?${searchParams.toString()}`);
  if (!res.ok) {
    throw new Error('获取用户列表失败');
  }
  return res.json();
}

// 创建用户
async function createUser(data: {
  email: string;
  name: string;
  password: string;
  role: string;
}): Promise<UserItem> {
  const res = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '创建用户失败');
  }
  return res.json();
}

// 更新用户
async function updateUser(id: string, data: {
  email?: string;
  name?: string;
  password?: string;
  role?: string;
}): Promise<UserItem> {
  const res = await fetch(`/api/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '更新用户失败');
  }
  return res.json();
}

// 删除用户
async function deleteUser(id: string, currentUserId: string): Promise<void> {
  const res = await fetch(`/api/users/${id}?currentUserId=${currentUserId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || '删除用户失败');
  }
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // 弹窗状态
  const [editDialog, setEditDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 表单数据
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'viewer' as UserRole,
  });

  const { user: currentUser } = useAppStore();
  const { canManageUsers } = usePermissions();

  // 获取用户列表
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['users', search, page],
    queryFn: () => getUsers({ search, page, pageSize }),
  });

  // 创建用户 mutation
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setEditDialog(false);
      resetForm();
      toast({ title: '创建成功', description: '用户已创建' });
    },
    onError: (error: Error) => {
      toast({ title: '创建失败', description: error.message, variant: 'destructive' });
    },
  });

  // 更新用户 mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: string; data: Parameters<typeof updateUser>[1] }) =>
      updateUser(data.id, data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditDialog(false);
      resetForm();
      toast({ title: '更新成功', description: '用户信息已更新' });
    },
    onError: (error: Error) => {
      toast({ title: '更新失败', description: error.message, variant: 'destructive' });
    },
  });

  // 删除用户 mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id, currentUser?.id || ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setDeleteDialog(false);
      setSelectedUser(null);
      toast({ title: '删除成功', description: '用户已删除' });
    },
    onError: (error: Error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    },
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      password: '',
      role: 'viewer',
    });
    setSelectedUser(null);
    setIsCreating(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsCreating(true);
    setEditDialog(true);
  };

  const openEditDialog = (user: UserItem) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      password: '',
      role: user.role,
    });
    setIsCreating(false);
    setEditDialog(true);
  };

  const openDeleteDialog = (user: UserItem) => {
    setSelectedUser(user);
    setDeleteDialog(true);
  };

  const handleSubmit = () => {
    // 验证
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

    if (isCreating) {
      createMutation.mutate({
        email: formData.email,
        name: formData.name,
        password: formData.password,
        role: formData.role,
      });
    } else if (selectedUser) {
      const updateData: Parameters<typeof updateUser>[1] = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      updateMutation.mutate({ id: selectedUser.id, data: updateData });
    }
  };

  const handleDelete = () => {
    if (selectedUser) {
      deleteMutation.mutate(selectedUser.id);
    }
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-muted-foreground">管理系统用户和权限</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span className="ml-2 hidden sm:inline">刷新</span>
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <UserPlus className="w-4 h-4" />
            <span className="ml-2 hidden sm:inline">新增用户</span>
          </Button>
        </div>
      </div>

      {/* 搜索 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="搜索用户名或邮箱..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              搜索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 用户列表 */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.users && data.users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户名</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead className="w-24">角色</TableHead>
                  <TableHead className="w-32">创建时间</TableHead>
                  <TableHead className="w-28 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                          {user.name.charAt(0)}
                        </div>
                        {user.name}
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">当前用户</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
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
                        {user.role === 'admin' ? (
                          <>
                            <Shield className="w-3 h-3 mr-1" />
                            管理员
                          </>
                        ) : user.role === 'operator' ? (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            细胞操作员
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            观察员
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(user)}
                          disabled={user.id === currentUser?.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-50" />
              <p>暂无用户数据</p>
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

      {/* 新增/编辑用户弹窗 */}
      <Dialog open={editDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setEditDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isCreating ? '新增用户' : '编辑用户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>邮箱 <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>姓名 <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="用户姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>
                密码 {isCreating && <span className="text-destructive">*</span>}
                {!isCreating && <span className="text-muted-foreground text-xs ml-1">（留空则不修改）</span>}
              </Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="请输入密码"
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData({ ...formData, role: v as UserRole })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-purple-500" />
                      管理员
                    </div>
                  </SelectItem>
                  <SelectItem value="operator">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-blue-500" />
                      细胞操作员
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-500" />
                      观察员
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-purple-500" />
                  <strong>管理员：</strong>{ROLE_DESCRIPTIONS.admin}
                </p>
                <p className="flex items-center gap-1">
                  <User className="w-3 h-3 text-blue-500" />
                  <strong>细胞操作员：</strong>{ROLE_DESCRIPTIONS.operator}
                </p>
                <p className="flex items-center gap-1">
                  <User className="w-3 h-3 text-gray-500" />
                  <strong>观察员：</strong>{ROLE_DESCRIPTIONS.viewer}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isCreating ? '创建' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除用户 <strong>{selectedUser?.name}</strong> 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
