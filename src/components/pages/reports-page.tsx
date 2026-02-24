'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import {
  Snowflake,
  Package,
  PackageMinus,
  Users,
  PackagePlus,
  Loader2,
  Layers,
  Refrigerator,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 颜色配置
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// 响应式断点检测 - SSR安全
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 在客户端挂载前返回false，避免hydration不匹配
  return isMobile;
}

// 快捷时间选项
const QUICK_OPTIONS = [
  { label: '本月', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
  { label: '上月', getValue: () => ({ start: startOfMonth(subMonths(new Date(), 1)), end: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: '近3个月', getValue: () => ({ start: subMonths(new Date(), 2), end: new Date() }) },
  { label: '今年', getValue: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) }) },
  { label: '去年', getValue: () => ({ start: startOfYear(subYears(new Date(), 1)), end: endOfYear(subYears(new Date(), 1)) }) },
];

interface StatsData {
  freezerCount: number;
  storedCells: number;
  removedCells: number;
  userCount: number;
  totalCells: number;
  batchCount: number;
  inboundThisMonth: number;
  inboundCellsThisMonth: number;
  outboundThisMonth: number;
  cellTypeStats: Array<{ type: string; count: number }>;
  monthlyInbound: Array<{ month: string; count: number }>;
  monthlyOutbound: Array<{ month: string; count: number }>;
  freezerMonthStats: Array<{ freezerName: string; inbound: number; outbound: number }>;
  userMonthStats: Array<{ userName: string; inbound: number; outbound: number }>;
}

interface TimeRangeStats {
  freezerStats: Array<{ freezerName: string; inbound: number; outbound: number }>;
  userStats: Array<{ userName: string; inbound: number; outbound: number }>;
}

async function getStats(): Promise<StatsData> {
  const res = await fetch('/api/stats');
  return res.json();
}

async function getTimeRangeStats(startDate: Date, endDate: Date): Promise<TimeRangeStats> {
  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  const res = await fetch(`/api/stats/time-range?${params}`);
  return res.json();
}

// 日期范围选择器组件
function DateRangePicker({
  dateRange,
  onDateRangeChange,
}: {
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (range: { start: Date; end: Date }) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleQuickSelect = (option: typeof QUICK_OPTIONS[0]) => {
    const { start, end } = option.getValue();
    onDateRangeChange({ start, end });
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
          <Calendar className="w-3.5 h-3.5" />
          {format(dateRange.start, 'yyyy/MM/dd', { locale: zhCN })} - {format(dateRange.end, 'yyyy/MM/dd', { locale: zhCN })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="end">
        <div className="space-y-3">
          {/* 快捷选项 */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_OPTIONS.map((option) => (
              <Button
                key={option.label}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => handleQuickSelect(option)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {/* 日期选择 */}
          <div className="flex gap-2">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">开始日期</p>
              <CalendarComponent
                mode="single"
                selected={dateRange.start}
                onSelect={(date) => date && onDateRangeChange({ ...dateRange, start: date })}
                locale={zhCN}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">结束日期</p>
              <CalendarComponent
                mode="single"
                selected={dateRange.end}
                onSelect={(date) => date && onDateRangeChange({ ...dateRange, end: date })}
                locale={zhCN}
              />
            </div>
          </div>
          <Button
            size="sm"
            className="w-full"
            onClick={() => setIsOpen(false)}
          >
            确定
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ReportsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
  });
  const isMobile = useIsMobile();

  // 时间范围状态 - 默认当月
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => ({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  }));

  // 获取时间范围内的统计数据
  const { data: timeRangeStats, isLoading: isLoadingTimeRange } = useQuery({
    queryKey: ['timeRangeStats', dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: () => getTimeRangeStats(dateRange.start, dateRange.end),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // 合并入库出库趋势数据，缩短月份标签
  const trendData = stats?.monthlyInbound.map((item, index) => {
    const monthNum = item.month.split('-')[1];
    const monthLabel = `${parseInt(monthNum)}月`;
    return {
      month: monthLabel,
      入库: stats.monthlyOutbound[index]?.count || 0,
      出库: item.count,
    };
  }) || [];

  // 图表配置
  const barChartConfig = {
    count: {
      label: '数量',
    },
  };

  const lineChartConfig = {
    入库: {
      label: '入库',
      color: '#22c55e',
    },
    出库: {
      label: '出库',
      color: '#ef4444',
    },
  };

  const freezerChartConfig = {
    inbound: {
      label: '入库',
      color: '#22c55e',
    },
    outbound: {
      label: '出库',
      color: '#f59e0b',
    },
  };

  const userChartConfig = {
    inbound: {
      label: '入库',
      color: '#3b82f6',
    },
    outbound: {
      label: '出库',
      color: '#8b5cf6',
    },
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div>
        <h1 className="text-2xl font-bold">统计报表</h1>
        <p className="text-muted-foreground">查看库存统计和数据报表</p>
      </div>

      {/* 统计卡片 - 移动端和PC端都显示 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              总库存
            </CardTitle>
            <Package className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
          </CardHeader>
          <CardContent className="pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats?.storedCells ?? '--'}</div>
            <p className="text-xs text-muted-foreground mt-1">管</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              批次总数
            </CardTitle>
            <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
          </CardHeader>
          <CardContent className="pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats?.batchCount ?? '--'}</div>
            <p className="text-xs text-muted-foreground mt-1">批次</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              本月入库
            </CardTitle>
            <PackagePlus className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
          </CardHeader>
          <CardContent className="pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats?.inboundThisMonth ?? '--'}</div>
            <p className="text-xs text-muted-foreground mt-1">管</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              本月出库
            </CardTitle>
            <PackageMinus className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
          </CardHeader>
          <CardContent className="pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats?.outboundThisMonth ?? '--'}</div>
            <p className="text-xs text-muted-foreground mt-1">管</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              冰箱数量
            </CardTitle>
            <Snowflake className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
          </CardHeader>
          <CardContent className="pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats?.freezerCount ?? '--'}</div>
            <p className="text-xs text-muted-foreground mt-1">台</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              用户数量
            </CardTitle>
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
          </CardHeader>
          <CardContent className="pb-3 sm:pb-4">
            <div className="text-xl sm:text-2xl font-bold">{stats?.userCount ?? '--'}</div>
            <p className="text-xs text-muted-foreground mt-1">人</p>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 - 仅PC端显示 */}
      {!isMobile && (
        <>
          {/* 图表区域 - 第一行 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* 按细胞类型统计 */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">按细胞类型统计</CardTitle>
                <CardDescription className="text-xs sm:text-sm">当前在库细胞按类型分布</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.cellTypeStats && stats.cellTypeStats.length > 0 ? (
                  <div className="w-full">
                    <ChartContainer config={barChartConfig} className="h-[280px]">
                      <ResponsiveContainer>
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
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    <p>暂无数据</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 入库/出库趋势 */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <CardTitle className="text-base sm:text-lg">入库/出库趋势</CardTitle>
                <CardDescription className="text-xs sm:text-sm">近6个月的入库和出库批次数量</CardDescription>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <ChartContainer config={lineChartConfig} className="h-[300px]">
                    <ResponsiveContainer>
                      <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="month" 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          tickLine={false}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          width={30}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="入库"
                          stroke="#22c55e"
                          strokeWidth={2}
                          dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="出库"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Legend 
                          wrapperStyle={{ fontSize: '12px' }}
                          iconSize={10}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    <p>暂无数据</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 图表区域 - 第二行：按冰箱和按用户统计 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* 按冰箱统计 */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">按冰箱统计出入库</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">各冰箱入库和出库的细胞管数</CardDescription>
                  </div>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTimeRange ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : timeRangeStats?.freezerStats && timeRangeStats.freezerStats.length > 0 ? (
                  <ChartContainer config={freezerChartConfig} className="h-[300px]">
                    <ResponsiveContainer>
                      <BarChart 
                        data={timeRangeStats.freezerStats} 
                        margin={{ top: 25, right: 10, left: 0, bottom: 5 }}
                        barCategoryGap="20%"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis 
                          dataKey="freezerName" 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          width={35}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend 
                          wrapperStyle={{ fontSize: '12px' }}
                          iconSize={10}
                        />
                        <Bar 
                          dataKey="inbound" 
                          name="入库" 
                          fill="#22c55e" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                          label={{ position: 'top', fill: '#22c55e', fontSize: 11, fontWeight: 500 }}
                        />
                        <Bar 
                          dataKey="outbound" 
                          name="出库" 
                          fill="#f59e0b" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                          label={{ position: 'top', fill: '#f59e0b', fontSize: 11, fontWeight: 500 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <Refrigerator className="w-12 h-12 mb-2 opacity-50" />
                    <p>所选时间段暂无冰箱出入库数据</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 按用户统计 */}
            <Card>
              <CardHeader className="pb-2 sm:pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">按用户统计出入库</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">各用户入库和出库的细胞管数</CardDescription>
                  </div>
                  <DateRangePicker
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTimeRange ? (
                  <div className="flex items-center justify-center h-[200px]">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : timeRangeStats?.userStats && timeRangeStats.userStats.length > 0 ? (
                  <ChartContainer config={userChartConfig} className="h-[300px]">
                    <ResponsiveContainer>
                      <BarChart 
                        data={timeRangeStats.userStats} 
                        margin={{ top: 25, right: 10, left: 0, bottom: 5 }}
                        barCategoryGap="20%"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                        <XAxis 
                          dataKey="userName" 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          interval={0}
                          angle={-15}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          width={35}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend 
                          wrapperStyle={{ fontSize: '12px' }}
                          iconSize={10}
                        />
                        <Bar 
                          dataKey="inbound" 
                          name="入库" 
                          fill="#3b82f6" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                          label={{ position: 'top', fill: '#3b82f6', fontSize: 11, fontWeight: 500 }}
                        />
                        <Bar 
                          dataKey="outbound" 
                          name="出库" 
                          fill="#8b5cf6" 
                          radius={[4, 4, 0, 0]}
                          maxBarSize={40}
                          label={{ position: 'top', fill: '#8b5cf6', fontSize: 11, fontWeight: 500 }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
                    <Users className="w-12 h-12 mb-2 opacity-50" />
                    <p>所选时间段暂无用户操作数据</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* 移动端提示 */}
      {isMobile && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              详细图表请使用电脑端查看
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
