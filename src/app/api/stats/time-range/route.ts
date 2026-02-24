import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    if (!startDateStr || !endDateStr) {
      return NextResponse.json({ error: '缺少日期参数' }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    
    // 设置结束日期为当天的最后一秒
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: '日期格式无效' }, { status: 400 });
    }

    // 获取所有冰箱
    const freezers = await db.freezer.findMany({
      select: { id: true, name: true },
    });

    // ==================== 按冰箱统计 ====================
    // 时间范围内入库的细胞
    const inboundCellsData = await db.cell.findMany({
      where: {
        batch: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
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

    // 时间范围内出库的操作记录
    const outboundLogsData = await db.operationLog.findMany({
      where: {
        operation: 'outbound',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
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
    inboundCellsData.forEach((cell) => {
      const freezerId = cell.box.rack.freezer.id;
      const freezerName = cell.box.rack.freezer.name;
      const key = `${freezerId}|||${freezerName}`;
      freezerInboundStats[key] = (freezerInboundStats[key] || 0) + 1;
    });

    // 按冰箱聚合出库数据
    const freezerOutboundStats: Record<string, number> = {};
    outboundLogsData.forEach((log) => {
      if (log.cell) {
        const freezerId = log.cell.box.rack.freezer.id;
        const freezerName = log.cell.box.rack.freezer.name;
        const key = `${freezerId}|||${freezerName}`;
        freezerOutboundStats[key] = (freezerOutboundStats[key] || 0) + (log.quantity || 1);
      }
    });

    // 合并冰箱统计数据
    const freezerStats = freezers.map((freezer) => {
      const key = `${freezer.id}|||${freezer.name}`;
      return {
        freezerName: freezer.name,
        inbound: freezerInboundStats[key] || 0,
        outbound: freezerOutboundStats[key] || 0,
      };
    }).filter((stat) => stat.inbound > 0 || stat.outbound > 0);

    // ==================== 按用户统计 ====================
    // 时间范围内入库批次（按操作人）
    const inboundBatches = await db.cellBatch.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        operator: { not: null },
      },
      select: {
        operator: true,
        totalQuantity: true,
      },
    });

    // 时间范围内出库记录（按操作人）
    const outboundLogsByUser = await db.operationLog.findMany({
      where: {
        operation: 'outbound',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        operator: { not: null },
      },
      select: {
        operator: true,
        quantity: true,
      },
    });

    // 按用户聚合入库数据
    const userInboundStats: Record<string, number> = {};
    inboundBatches.forEach((batch) => {
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

    const userStats = Array.from(allUsers).map((userName) => ({
      userName,
      inbound: userInboundStats[userName] || 0,
      outbound: userOutboundStats[userName] || 0,
    })).sort((a, b) => (b.inbound + b.outbound) - (a.inbound + a.outbound));

    return NextResponse.json({
      freezerStats,
      userStats,
    });
  } catch (error) {
    console.error('获取时间范围统计数据失败:', error);
    return NextResponse.json({ error: '获取统计数据失败' }, { status: 500 });
  }
}
