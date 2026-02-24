import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取所有细胞类型列表
export async function GET() {
  try {
    const batches = await db.cellBatch.findMany({
      select: { cellType: true },
      distinct: ['cellType'],
    });

    const cellTypes = batches.map((b) => b.cellType).filter(Boolean).sort();

    return NextResponse.json({ cellTypes });
  } catch (error) {
    console.error('获取细胞类型列表失败:', error);
    return NextResponse.json({ error: '获取细胞类型列表失败' }, { status: 500 });
  }
}
