'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Construction className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">功能开发中</h3>
            <p className="text-muted-foreground">
              该功能模块正在开发中，请稍后再来查看
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 存储位置页面
export function LocationsPage() {
  return <PlaceholderPage title="存储位置管理" description="管理冰箱、架子、盒子的层级结构" />;
}

// 细胞入库页面
export function InboundPage() {
  return <PlaceholderPage title="细胞入库登记" description="登记新入库的冻存细胞信息" />;
}

// 细胞列表页面
export function CellsPage() {
  return <PlaceholderPage title="细胞列表" description="查看和搜索所有冻存细胞" />;
}

// 取出记录页面
export function OutboundPage() {
  return <PlaceholderPage title="取出记录" description="查看细胞取出历史记录" />;
}

// 统计报表页面
export function ReportsPage() {
  return <PlaceholderPage title="统计报表" description="查看库存统计和数据报表" />;
}

// 用户管理页面
export function UsersPage() {
  return <PlaceholderPage title="用户管理" description="管理系统用户和权限" />;
}
