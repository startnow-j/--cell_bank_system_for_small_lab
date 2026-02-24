import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 更新冰箱
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const freezer = await db.freezer.update({
      where: { id },
      data: {
        name: data.name,
        location: data.location || null,
        temperature: data.temperature || null,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        remark: data.remark || null,
      },
    });
    return NextResponse.json(freezer);
  } catch (error) {
    console.error('更新冰箱失败:', error);
    return NextResponse.json({ error: '更新冰箱失败' }, { status: 500 });
  }
}

// 删除冰箱
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取该冰箱下所有架子
    const racks = await db.rack.findMany({
      where: { freezerId: id },
      select: { id: true },
    });

    const rackIds = racks.map(r => r.id);

    if (rackIds.length > 0) {
      // 获取所有架子下的盒子
      const boxes = await db.box.findMany({
        where: { rackId: { in: rackIds } },
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
              error: `该冰箱下的存储位置中存在 ${storedCellsCount} 个在库细胞，请先取出所有细胞后再删除`,
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
          where: { rackId: { in: rackIds } },
        });
      }

      // 删除所有架子
      await db.rack.deleteMany({
        where: { freezerId: id },
      });
    }

    await db.freezer.delete({
      where: { id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除冰箱失败:', error);
    return NextResponse.json({ error: '删除冰箱失败' }, { status: 500 });
  }
}
