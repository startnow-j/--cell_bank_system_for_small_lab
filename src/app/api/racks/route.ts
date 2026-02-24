import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 创建新架子
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const rack = await db.rack.create({
      data: {
        name: data.name,
        freezerId: data.freezerId,
        capacity: data.capacity ? parseInt(data.capacity) : null,
        remark: data.remark || null,
      },
      include: {
        freezer: true,
      },
    });
    return NextResponse.json(rack);
  } catch (error) {
    console.error('创建架子失败:', error);
    return NextResponse.json({ error: '创建架子失败' }, { status: 500 });
  }
}
