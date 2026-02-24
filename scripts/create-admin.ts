import { db } from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('=== 创建默认管理员账号 ===\n');

  // 检查是否已存在管理员
  const existingAdmin = await db.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (existingAdmin) {
    console.log('⚠️  管理员账号已存在');
    console.log('   邮箱: admin@example.com');
    console.log('   如需重置密码，请在用户管理中操作\n');
    return;
  }

  // 使用bcrypt加密密码
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // 创建管理员账号
  const admin = await db.user.create({
    data: {
      email: 'admin@example.com',
      name: 'admin',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('✅ 管理员账号创建成功！\n');
  console.log('   邮箱: admin@example.com');
  console.log('   密码: admin123');
  console.log('   角色: 管理员\n');
  console.log('⚠️  请登录后立即修改默认密码！\n');
}

main()
  .catch((e) => {
    console.error('❌ 创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
