'use client';

import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Snowflake, Package, ArrowRightLeft, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

interface StatsData {
  totalCells: number;
  storedCells: number;
  removedCells: number;
  freezerCount: number;
  userCount: number;
}

async function getStats(): Promise<StatsData> {
  const res = await fetch('/api/stats');
  return res.json();
}

export function DashboardPage() {
  const { user } = useAppStore();
  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  });

  return (
    <div className="space-y-6">
      {/* 欢迎信息 */}
      <div>
        <h1 className="text-2xl font-bold">欢迎回来，{user?.name || '用户'}！</h1>
        <p className="text-muted-foreground">这是您的细胞库管理概览</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              冰箱数量
            </CardTitle>
            <Snowflake className="w-5 h-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.freezerCount ?? '--'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              在库细胞
            </CardTitle>
            <Package className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.storedCells ?? '--'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              已取出
            </CardTitle>
            <ArrowRightLeft className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.removedCells ?? '--'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              用户数量
            </CardTitle>
            <MapPin className="w-5 h-5 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.userCount ?? '--'}</div>
          </CardContent>
        </Card>
      </div>

      {/* 快捷操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快捷操作</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => useAppStore.getState().setCurrentMenu('inbound')}
              className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
              <span className="text-sm font-medium">细胞入库</span>
            </button>
            <button
              onClick={() => useAppStore.getState().setCurrentMenu('inventory')}
              className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <Snowflake className="w-8 h-8 mx-auto mb-2 text-cyan-500" />
              <span className="text-sm font-medium">查看库存</span>
            </button>
            <button
              onClick={() => useAppStore.getState().setCurrentMenu('outbound')}
              className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 text-orange-500" />
              <span className="text-sm font-medium">细胞出库</span>
            </button>
            <button
              onClick={() => useAppStore.getState().setCurrentMenu('reports')}
              className="p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-center"
            >
              <MapPin className="w-8 h-8 mx-auto mb-2 text-purple-500" />
              <span className="text-sm font-medium">统计报表</span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
