import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { compare, hash } from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: '请输入邮箱和密码' }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }

    // 检查密码是否已经是加密格式（bcrypt hash 以 $2 开头）
    const isHashed = user.password.startsWith('$2');
    
    let isValidPassword = false;
    
    if (isHashed) {
      // 加密密码：使用 bcrypt 验证
      isValidPassword = await compare(password, user.password);
    } else {
      // 明文密码：直接比较
      isValidPassword = user.password === password;
      
      // 如果验证成功，自动升级为加密密码
      if (isValidPassword) {
        const hashedPassword = await hash(password, 10);
        await db.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });
      }
    }

    if (!isValidPassword) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json({ error: '登录失败' }, { status: 500 });
  }
}
