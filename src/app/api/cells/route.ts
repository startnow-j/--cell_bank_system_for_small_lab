import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取批次列表（包含位置信息）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // 'stored' | 'removed' | 'partial' | 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // 构建搜索条件
    const where: {
      OR?: Array<{
        name?: { contains: string };
        cellType?: { contains: string };
        batchCode?: { contains: string };
      }>;
    } = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { cellType: { contains: search } },
        { batchCode: { contains: search } },
      ];
    }

    // 获取批次总数
    const total = await db.cellBatch.count({ where });

    // 获取批次列表
    const batches = await db.cellBatch.findMany({
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // 计算每个批次的状态
    const batchesWithStatus = batches.map((batch) => {
      const totalCells = batch.cells.length;
      const storedCells = batch.cells.filter((c) => c.status === 'stored').length;
      const removedCells = totalCells - storedCells;

      let batchStatus: 'stored' | 'partial' | 'removed';
      if (storedCells === 0) {
        batchStatus = 'removed';
      } else if (storedCells === totalCells) {
        batchStatus = 'stored';
      } else {
        batchStatus = 'partial';
      }

      // 获取存储位置概览
      const locations = new Set<string>();
      batch.cells.forEach((cell) => {
        locations.add(
          `${cell.box.rack.freezer.name}/${cell.box.rack.name}/${cell.box.name}`
        );
      });

      // 行号转字母
      const rowToLetter = (n: number) => String.fromCharCode(64 + n);
      const positions = batch.cells.map((c) => `${rowToLetter(c.positionRow)}${c.positionCol}`);

      return {
        ...batch,
        totalCells,
        storedCells,
        removedCells,
        batchStatus,
        locationOverview: Array.from(locations).join('; '),
        positionsOverview: positions.join(', '),
      };
    });

    // 根据状态过滤
    let filteredBatches = batchesWithStatus;
    if (status && status !== 'all') {
      filteredBatches = batchesWithStatus.filter((b) => b.batchStatus === status);
    }

    return NextResponse.json({
      batches: filteredBatches,
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('获取批次列表失败:', error);
    return NextResponse.json({ error: '获取批次列表失败' }, { status: 500 });
  }
}

// 创建细胞批次（入库）
export async function POST(request: Request) {
  try {
    const data = await request.json();
    let positions = data.positions as Array<{ row: number; col: number }>;
    let boxId = data.boxId as string | undefined;

    // 支持通过名称查找位置（批量入库时使用）
    if (!boxId && data.freezerName && data.rackName && data.boxName) {
      const freezer = await db.freezer.findFirst({
        where: { name: data.freezerName },
        include: {
          racks: {
            where: { name: data.rackName },
            include: {
              boxes: {
                where: { name: data.boxName },
              },
            },
          },
        },
      });

      if (!freezer) {
        return NextResponse.json({ error: `冰箱"${data.freezerName}"不存在` }, { status: 400 });
      }
      if (freezer.racks.length === 0) {
        return NextResponse.json({ error: `架子"${data.rackName}"不存在或不属于冰箱"${data.freezerName}"` }, { status: 400 });
      }
      if (freezer.racks[0].boxes.length === 0) {
        return NextResponse.json({ error: `盒子"${data.boxName}"不存在或不属于架子"${data.rackName}"` }, { status: 400 });
      }

      boxId = freezer.racks[0].boxes[0].id;

      // 解析位置字符串（批量入库时位置是字符串数组）
      if (data.positions && typeof data.positions[0] === 'string') {
        positions = (data.positions as string[]).map((pos) => {
          const match = pos.trim().toUpperCase().match(/^([A-Z])(\d+)$/);
          if (!match) throw new Error(`位置格式错误: ${pos}`);
          return {
            row: match[1].charCodeAt(0) - 64,
            col: parseInt(match[2]),
          };
        });
      }
    }

    if (!boxId) {
      return NextResponse.json({ error: '请选择存储位置' }, { status: 400 });
    }

    if (!positions || positions.length === 0) {
      return NextResponse.json({ error: '请选择存储位置' }, { status: 400 });
    }

    if (positions.length !== parseInt(data.totalQuantity)) {
      return NextResponse.json(
        { error: `请选择 ${data.totalQuantity} 个位置，当前已选 ${positions.length} 个` },
        { status: 400 }
      );
    }

    // 检查位置是否已被占用
    const occupiedPositions = await Promise.all(
      positions.map((pos) =>
        db.cell.findFirst({
          where: {
            boxId: boxId,
            positionRow: pos.row,
            positionCol: pos.col,
            status: 'stored',
          },
        })
      )
    );

    const occupied = occupiedPositions.filter(Boolean);
    if (occupied.length > 0) {
      const rowToLetter = (n: number) => String.fromCharCode(64 + n);
      const occupiedStr = occupied
        .map((c) => `${rowToLetter(c!.positionRow)}${c!.positionCol}`)
        .join(', ');
      return NextResponse.json({ error: `以下位置已被占用: ${occupiedStr}` }, { status: 400 });
    }

    // 创建细胞批次
    const batch = await db.cellBatch.create({
      data: {
        batchCode: data.batchCode || null,
        name: data.name,
        cellType: data.cellType,
        passage: data.passage,
        totalQuantity: parseInt(data.totalQuantity),
        freezeDate: new Date(data.freezeDate),
        freezeMedium: data.freezeMedium || null,
        donorInfo: data.donorInfo || null,
        cultureInfo: data.cultureInfo || null,
        remark: data.remark || null,
        operator: data.operator || null,
      },
    });

    // 为每个位置创建细胞样本
    const cells = await Promise.all(
      positions.map((pos, index) =>
        db.cell.create({
          data: {
            code: data.code ? `${data.code}-${index + 1}` : null,
            positionRow: pos.row,
            positionCol: pos.col,
            status: 'stored',
            batchId: batch.id,
            boxId: boxId,
          },
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
        })
      )
    );

    // 创建入库日志
    await db.operationLog.create({
      data: {
        batchId: batch.id,
        operation: 'inbound',
        quantity: batch.totalQuantity,
        operator: data.operator || null,
        remark: '细胞入库',
      },
    });

    return NextResponse.json({ batch, cells });
  } catch (error) {
    console.error('创建细胞失败:', error);
    return NextResponse.json({ error: '创建细胞失败' }, { status: 500 });
  }
}
