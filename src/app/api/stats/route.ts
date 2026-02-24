import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // 基础统计
    const [freezerCount, storedCells, removedCells, userCount] = await Promise.all([
      db.freezer.count(),
      db.cell.count({ where: { status: 'stored' } }),
      db.cell.count({ where: { status: 'removed' } }),
      db.user.count(),
    ]);

    // 本月起止日期
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 本月入库细胞管数（根据 CellBatch 的 createdAt）
    const inboundCellsThisMonth = await db.cellBatch.aggregate({
      where: {
        createdAt: { gte: monthStart },
      },
      _sum: {
        totalQuantity: true,
      },
    });

    // 本月出库数量（根据 OperationLog 的 createdAt）
    const outboundThisMonth = await db.operationLog.aggregate({
      where: {
        operation: 'outbound',
        createdAt: { gte: monthStart },
      },
      _sum: {
        quantity: true,
      },
    });

    // 按细胞类型统计（在库细胞）
    const cellsByType = await db.cell.findMany({
      where: { status: 'stored' },
      include: {
        batch: {
          select: { cellType: true },
        },
      },
    });

    // 聚合细胞类型
    const typeStats: Record<string, number> = {};
    cellsByType.forEach((cell) => {
      const type = cell.batch.cellType;
      typeStats[type] = (typeStats[type] || 0) + 1;
    });

    const cellTypeStats = Object.entries(typeStats)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // 近6个月的入库趋势
    const monthlyInbound = [];
    const monthlyOutbound = [];

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

      // 该月入库数量
      const inbound = await db.cellBatch.count({
        where: {
          createdAt: {
            gte: monthDate,
            lte: monthEnd,
          },
        },
      });

      // 该月出库数量
      const outbound = await db.operationLog.count({
        where: {
          operation: 'outbound',
          createdAt: {
            gte: monthDate,
            lte: monthEnd,
          },
        },
      });

      monthlyInbound.push({ month: monthLabel, count: inbound });
      monthlyOutbound.push({ month: monthLabel, count: outbound });
    }

    // 批次总数
    const batchCount = await db.cellBatch.count();

    // ==================== 新增：按冰箱统计本月出入库 ====================
    // 获取所有冰箱
    const freezers = await db.freezer.findMany({
      select: { id: true, name: true },
    });

    // 本月入库的细胞（通过批次创建时间）
    const inboundCellsThisMonthData = await db.cell.findMany({
      where: {
        batch: {
          createdAt: { gte: monthStart },
        },
      },
      include: {
        box: {
          include: {
            rack: {
              include: {
                freezer: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    // 本月出库的操作记录
    const outboundLogsThisMonth = await db.operationLog.findMany({
      where: {
        operation: 'outbound',
        createdAt: { gte: monthStart },
      },
      include: {
        cell: {
          include: {
            box: {
              include: {
                rack: {
                  include: {
                    freezer: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // 按冰箱聚合入库数据
    const freezerInboundStats: Record<string, number> = {};
    inboundCellsThisMonthData.forEach((cell) => {
      const freezerId = cell.box.rack.freezer.id;
      const freezerName = cell.box.rack.freezer.name;
      const key = `${freezerId}|||${freezerName}`;
      freezerInboundStats[key] = (freezerInboundStats[key] || 0) + 1;
    });

    // 按冰箱聚合出库数据
    const freezerOutboundStats: Record<string, number> = {};
    outboundLogsThisMonth.forEach((log) => {
      if (log.cell) {
        const freezerId = log.cell.box.rack.freezer.id;
        const freezerName = log.cell.box.rack.freezer.name;
        const key = `${freezerId}|||${freezerName}`;
        freezerOutboundStats[key] = (freezerOutboundStats[key] || 0) + (log.quantity || 1);
      }
    });

    // 合并冰箱统计数据
    const freezerMonthStats = freezers.map((freezer) => {
      const key = `${freezer.id}|||${freezer.name}`;
      return {
        freezerName: freezer.name,
        inbound: freezerInboundStats[key] || 0,
        outbound: freezerOutboundStats[key] || 0,
      };
    }).filter((stat) => stat.inbound > 0 || stat.outbound > 0);

    // ==================== 新增：按用户统计本月出入库 ====================
    // 本月入库批次（按操作人）
    const inboundBatchesThisMonth = await db.cellBatch.findMany({
      where: {
        createdAt: { gte: monthStart },
        operator: { not: null },
      },
      select: {
        operator: true,
        totalQuantity: true,
      },
    });

    // 本月出库记录（按操作人）
    const outboundLogsByUser = await db.operationLog.findMany({
      where: {
        operation: 'outbound',
        createdAt: { gte: monthStart },
        operator: { not: null },
      },
      select: {
        operator: true,
        quantity: true,
      },
    });

    // 按用户聚合入库数据
    const userInboundStats: Record<string, number> = {};
    inboundBatchesThisMonth.forEach((batch) => {
      if (batch.operator) {
        userInboundStats[batch.operator] = (userInboundStats[batch.operator] || 0) + batch.totalQuantity;
      }
    });

    // 按用户聚合出库数据
    const userOutboundStats: Record<string, number> = {};
    outboundLogsByUser.forEach((log) => {
      if (log.operator) {
        userOutboundStats[log.operator] = (userOutboundStats[log.operator] || 0) + (log.quantity || 1);
      }
    });

    // 合并用户统计数据
    const allUsers = new Set([
      ...Object.keys(userInboundStats),
      ...Object.keys(userOutboundStats),
    ]);

    const userMonthStats = Array.from(allUsers).map((userName) => ({
      userName,
      inbound: userInboundStats[userName] || 0,
      outbound: userOutboundStats[userName] || 0,
    })).sort((a, b) => (b.inbound + b.outbound) - (a.inbound + a.outbound));

    return NextResponse.json({
      // 基础统计
      freezerCount,
      storedCells,
      removedCells,
      userCount,
      totalCells: storedCells + removedCells,
      batchCount,
      // 本月统计
      inboundThisMonth: inboundCellsThisMonth._sum.totalQuantity || 0, // 改为管数
      inboundCellsThisMonth: inboundCellsThisMonth._sum.totalQuantity || 0,
      outboundThisMonth: outboundThisMonth._sum.quantity || 0,
      // 类型统计
      cellTypeStats,
      // 趋势数据
      monthlyInbound,
      monthlyOutbound,
      // 新增：冰箱和用户统计
      freezerMonthStats,
      userMonthStats,
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
