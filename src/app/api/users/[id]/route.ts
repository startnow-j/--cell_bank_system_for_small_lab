import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

// 获取单个用户
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('获取用户失败:', error);
    return NextResponse.json({ error: '获取用户失败' }, { status: 500 });
  }
}

// 更新用户
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    const { email, name, password, role } = data;

    // 检查用户是否存在
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 如果修改了邮箱，检查新邮箱是否已被使用
    if (email && email !== existingUser.email) {
      const emailUser = await db.user.findUnique({
        where: { email },
      });
      if (emailUser) {
        return NextResponse.json({ error: '该邮箱已被其他用户使用' }, { status: 400 });
      }
    }

    // 构建更新数据
    const updateData: {
      email?: string;
      name?: string;
      password?: string;
      role?: string;
    } = {};

    if (email) updateData.email = email;
    if (name) updateData.name = name;
    if (password) {
      updateData.password = await hash(password, 10);
    }
    if (role) updateData.role = role;

    // 更新用户
    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error('更新用户失败:', error);
    return NextResponse.json({ error: '更新用户失败' }, { status: 500 });
  }
}

// 删除用户
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查用户是否存在
    const existingUser = await db.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 不允许删除自己
    const { searchParams } = new URL(request.url);
    const currentUserId = searchParams.get('currentUserId');
    if (currentUserId === id) {
      return NextResponse.json({ error: '不能删除当前登录用户' }, { status: 400 });
    }

    // 删除用户
    await db.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json({ error: '删除用户失败' }, { status: 500 });
  }
}
