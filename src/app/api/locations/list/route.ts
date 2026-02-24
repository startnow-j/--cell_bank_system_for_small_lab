import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取所有存储位置列表（用于模板下载）
export async function GET() {
  try {
    const freezers = await db.freezer.findMany({
      include: {
        racks: {
          include: {
            boxes: {
              include: {
                _count: {
                  select: { cells: { where: { status: 'stored' } } },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 构建位置列表
    const locations: Array<{
      freezerName: string;
      rackName: string;
      boxName: string;
      boxSize: string;
      storedCount: number;
      path: string;
    }> = [];

    for (const freezer of freezers) {
      for (const rack of freezer.racks) {
        for (const box of rack.boxes) {
          locations.push({
            freezerName: freezer.name,
            rackName: rack.name,
            boxName: box.name,
            boxSize: `${box.rows}×${box.cols}`,
            storedCount: box._count.cells,
            path: `${freezer.name} → ${rack.name} → ${box.name}`,
          });
        }
      }
    }

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('获取位置列表失败:', error);
    return NextResponse.json({ error: '获取位置列表失败' }, { status: 500 });
  }
}
