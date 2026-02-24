import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare, hash } from 'bcryptjs';

// 修改密码
export async function POST(request: Request) {
  try {
    const { userId, oldPassword, newPassword } = await request.json();

    // 验证必填字段
    if (!userId || !oldPassword || !newPassword) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    // 验证新密码长度
    if (newPassword.length < 6) {
      return NextResponse.json({ error: '新密码长度至少6位' }, { status: 400 });
    }

    // 获取用户
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 验证旧密码
    const isHashed = user.password.startsWith('$2');
    let isValidPassword = false;

    if (isHashed) {
      isValidPassword = await compare(oldPassword, user.password);
    } else {
      // 兼容明文密码
      isValidPassword = user.password === oldPassword;
    }

    if (!isValidPassword) {
      return NextResponse.json({ error: '旧密码错误' }, { status: 401 });
    }

    // 加密新密码
    const hashedPassword = await hash(newPassword, 10);

    // 更新密码
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json({ error: '修改密码失败' }, { status: 500 });
  }
}
