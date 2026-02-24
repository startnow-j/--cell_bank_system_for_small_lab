import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 创建新盒子
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const box = await db.box.create({
      data: {
        name: data.name,
        rackId: data.rackId,
        rows: parseInt(data.rows) || 10,
        cols: parseInt(data.cols) || 10,
        remark: data.remark || null,
      },
      include: {
        rack: {
          include: {
            freezer: true,
          },
        },
      },
    });
    return NextResponse.json(box);
  } catch (error) {
    console.error('创建盒子失败:', error);
    return NextResponse.json({ error: '创建盒子失败' }, { status: 500 });
  }
}
