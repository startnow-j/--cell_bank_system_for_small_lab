import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取出库记录列表
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 构建查询条件
    const where: {
      operation: string;
      OR?: Array<{
        cell?: {
          batch?: {
            name?: { contains: string };
            cellType?: { contains: string };
          };
        };
      }>;
    } = {
      operation: 'outbound',
    };

    // 搜索条件（通过关联的细胞批次搜索）
    let logs = await db.operationLog.findMany({
      where,
      include: {
        cell: {
          include: {
            batch: true,
            box: {
              include: {
                rack: {
                  include: {
                    freezer: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 如果有搜索条件，在内存中过滤
    if (search) {
      logs = logs.filter((log) => {
        const batch = log.cell?.batch;
        return (
          batch?.name.toLowerCase().includes(search.toLowerCase()) ||
          batch?.cellType.toLowerCase().includes(search.toLowerCase())
        );
      });
    }

    // 计算总数
    const total = logs.length;

    // 分页
    const paginatedLogs = logs.slice((page - 1) * pageSize, page * pageSize);

    // 格式化返回数据
    const records = paginatedLogs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt,
      cellName: log.cell?.batch?.name || '-',
      cellType: log.cell?.batch?.cellType || '-',
      passage: log.cell?.batch?.passage || '-',
      position: log.cell
        ? `${String.fromCharCode(64 + log.cell.positionRow)}${log.cell.positionCol}`
        : '-',
      location: log.cell
        ? `${log.cell.box.rack.freezer.name} → ${log.cell.box.rack.name} → ${log.cell.box.name}`
        : '-',
      reason: log.reason || '-',
      operator: log.operator || '-',
    }));

    return NextResponse.json({
      records,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('获取出库记录失败:', error);
    return NextResponse.json({ error: '获取出库记录失败' }, { status: 500 });
  }
}

// 批量出库
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { cellIds, reason, operator } = data;

    if (!cellIds || !Array.isArray(cellIds) || cellIds.length === 0) {
      return NextResponse.json({ error: '请选择要取出的细胞' }, { status: 400 });
    }

    // 检查这些细胞是否都是"在库"状态
    const cells = await db.cell.findMany({
      where: {
        id: { in: cellIds },
        status: 'stored',
      },
    });

    if (cells.length !== cellIds.length) {
      return NextResponse.json(
        { error: '部分细胞已被取出或不存在' },
        { status: 400 }
      );
    }

    // 批量更新细胞状态
    await db.cell.updateMany({
      where: {
        id: { in: cellIds },
      },
      data: {
        status: 'removed',
      },
    });

    // 创建操作日志
    await db.operationLog.createMany({
      data: cells.map((cell) => ({
        cellId: cell.id,
        batchId: cell.batchId,
        operation: 'outbound',
        quantity: 1,
        reason: reason || null,
        operator: operator || null,
        remark: '细胞取出',
      })),
    });

    return NextResponse.json({
      success: true,
      count: cells.length,
    });
  } catch (error) {
    console.error('批量出库失败:', error);
    return NextResponse.json({ error: '批量出库失败' }, { status: 500 });
  }
}
