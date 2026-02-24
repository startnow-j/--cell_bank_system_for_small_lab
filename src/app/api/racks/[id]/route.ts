import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 更新架子
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const rack = await db.rack.update({
      where: { id },
      data: {
        name: data.name,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        remark: data.remark || null,
      },
    });
    return NextResponse.json(rack);
  } catch (error) {
    console.error('更新架子失败:', error);
    return NextResponse.json({ error: '更新架子失败' }, { status: 500 });
  }
}

// 删除架子
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取该架子下所有盒子
    const boxes = await db.box.findMany({
      where: { rackId: id },
      select: { id: true },
    });

    const boxIds = boxes.map(b => b.id);

    if (boxIds.length > 0) {
      // 检查这些盒子中是否有在库细胞
      const storedCellsCount = await db.cell.count({
        where: {
          boxId: { in: boxIds },
          status: 'stored',
        },
      });

      if (storedCellsCount > 0) {
        return NextResponse.json(
          { 
            error: `该架子下的盒子中存在 ${storedCellsCount} 个在库细胞，请先取出所有细胞后再删除`,
            cellsCount: storedCellsCount 
          },
          { status: 400 }
        );
      }

      // 删除已取出的细胞记录
      await db.cell.deleteMany({
        where: {
          boxId: { in: boxIds },
          status: 'removed',
        },
      });

      // 删除所有盒子
      await db.box.deleteMany({
        where: { rackId: id },
      });
    }

    await db.rack.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除架子失败:', error);
    return NextResponse.json({ error: '删除架子失败' }, { status: 500 });
  }
}
