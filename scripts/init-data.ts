import { db } from '../src/lib/db';

async function main() {
  // 检查是否已存在管理员账户
  let admin = await db.user.findUnique({
    where: { email: 'admin@example.com' },
  });

  if (!admin) {
    admin = await db.user.create({
      data: {
        email: 'admin@example.com',
        name: '管理员',
        password: 'admin123',
        role: 'admin',
      },
    });
    console.log('✅ 创建管理员账户:', admin.email);
  } else {
    console.log('ℹ️ 管理员账户已存在:', admin.email);
  }

  // 检查是否已存在冰箱
  let freezer = await db.freezer.findFirst();

  if (!freezer) {
    // 创建示例冰箱
    freezer = await db.freezer.create({
      data: {
        name: '1号冰箱',
        location: '实验室A',
        temperature: '-80°C',
        capacity: 5,
        remark: '主冰箱',
      },
    });
    console.log('✅ 创建示例冰箱:', freezer.name);

    // 创建示例架子
    const rack = await db.rack.create({
      data: {
        name: 'A架',
        freezerId: freezer.id,
        capacity: 10,
      },
    });
    console.log('✅ 创建示例架子:', rack.name);

    // 创建示例盒子
    const box = await db.box.create({
      data: {
        name: '盒子1',
        rackId: rack.id,
        rows: 10,
        cols: 10,
      },
    });
    console.log('✅ 创建示例盒子:', box.name);
  } else {
    console.log('ℹ️ 示例数据已存在');
  }

  console.log('\n🎉 初始化完成！');
  console.log('📧 管理员邮箱: admin@example.com');
  console.log('🔑 默认密码: admin123');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
