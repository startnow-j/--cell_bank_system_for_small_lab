import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取盒子详情（包含已占用的位置）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const box = await db.box.findUnique({
      where: { id },
      include: {
        rack: {
          include: {
            freezer: true,
          },
        },
        cells: {
          where: { status: 'stored' },
          select: {
            id: true,
            code: true,
            positionRow: true,
            positionCol: true,
            batch: {
              select: {
                id: true,
                batchCode: true,
                name: true,
                cellType: true,
                passage: true,
                totalQuantity: true,
                freezeDate: true,
                freezeMedium: true,
                donorInfo: true,
                operator: true,
                remark: true,
              },
            },
          },
        },
      },
    });

    if (!box) {
      return NextResponse.json({ error: '盒子不存在' }, { status: 404 });
    }

    return NextResponse.json(box);
  } catch (error) {
    console.error('获取盒子详情失败:', error);
    return NextResponse.json({ error: '获取盒子详情失败' }, { status: 500 });
  }
}

// 更新盒子
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const box = await db.box.update({
      where: { id },
      data: {
        name: data.name,
        rows: parseInt(data.rows) || 10,
        cols: parseInt(data.cols) || 10,
        remark: data.remark || null,
      },
    });
    return NextResponse.json(box);
  } catch (error) {
    console.error('更新盒子失败:', error);
    return NextResponse.json({ error: '更新盒子失败' }, { status: 500 });
  }
}

// 删除盒子
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查盒子中是否有在库细胞
    const storedCellsCount = await db.cell.count({
      where: {
        boxId: id,
        status: 'stored',
      },
    });

    if (storedCellsCount > 0) {
      return NextResponse.json(
        { 
          error: `该盒子中存在 ${storedCellsCount} 个在库细胞，请先取出所有细胞后再删除`,
          cellsCount: storedCellsCount 
        },
        { status: 400 }
      );
    }

    // 检查盒子中是否有已取出的细胞记录
    const removedCellsCount = await db.cell.count({
      where: {
        boxId: id,
        status: 'removed',
      },
    });

    if (removedCellsCount > 0) {
      // 如果有已取出的细胞记录，先删除这些记录
      await db.cell.deleteMany({
        where: {
          boxId: id,
          status: 'removed',
        },
      });
    }

    await db.box.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除盒子失败:', error);
    return NextResponse.json({ error: '删除盒子失败' }, { status: 500 });
  }
}
