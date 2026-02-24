import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取批次列表（包含位置详情）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'stored' | 'removed' | 'all'
    const search = searchParams.get('search');
    const cellType = searchParams.get('cellType'); // 按细胞类型筛选
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 构建搜索条件
    const where: {
      OR?: Array<{
        name?: { contains: string };
        cellType?: { contains: string };
        batchCode?: { contains: string };
      }>;
      cellType?: { equals: string };
    } = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { cellType: { contains: search } },
        { batchCode: { contains: search } },
      ];
    }

    if (cellType && cellType !== 'all') {
      where.cellType = { equals: cellType };
    }

    // 获取所有批次（需要先获取全部再筛选，因为状态筛选需要计算cells）
    const allBatches = await db.cellBatch.findMany({
      where,
      include: {
        cells: {
          include: {
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
          orderBy: [{ positionRow: 'asc' }, { positionCol: 'asc' }],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 计算每个批次的状态统计
    const batchesWithStats = allBatches.map((batch) => {
      const storedCount = batch.cells.filter((c) => c.status === 'stored').length;
      const removedCount = batch.cells.filter((c) => c.status === 'removed').length;
      
      return {
        ...batch,
        storedCount,
        removedCount,
        // 位置列表字符串
        positionsStr: batch.cells
          .map((c) => `${String.fromCharCode(64 + c.positionRow)}${c.positionCol}`)
          .join(', '),
      };
    });

    // 根据状态筛选
    let filteredBatches = batchesWithStats;
    if (status === 'stored') {
      filteredBatches = batchesWithStats.filter((b) => b.storedCount > 0);
    } else if (status === 'removed') {
      filteredBatches = batchesWithStats.filter((b) => b.storedCount === 0);
    }

    // 计算筛选后的总数（这才是正确的total）
    const total = filteredBatches.length;

    // 应用分页（在筛选之后）
    const paginatedBatches = filteredBatches.slice(
      (page - 1) * pageSize,
      page * pageSize
    );

    return NextResponse.json({
      batches: paginatedBatches,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('获取批次列表失败:', error);
    return NextResponse.json({ error: '获取批次列表失败' }, { status: 500 });
  }
}
