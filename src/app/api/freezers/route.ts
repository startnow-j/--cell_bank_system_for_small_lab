import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取所有冰箱（包含架子和盒子）
export async function GET() {
  try {
    const freezers = await db.freezer.findMany({
      include: {
        racks: {
          include: {
            boxes: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(freezers);
  } catch (error) {
    console.error('获取冰箱列表失败:', error);
    return NextResponse.json({ error: '获取冰箱列表失败' }, { status: 500 });
  }
}

// 创建新冰箱
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const freezer = await db.freezer.create({
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
    console.error('创建冰箱失败:', error);
    return NextResponse.json({ error: '创建冰箱失败' }, { status: 500 });
  }
}
