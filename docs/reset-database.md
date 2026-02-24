# 系统数据重置指南

> 版本: v1.0  
> 更新日期: 2025-02-14

---

## 一、概述

本指南说明如何清空系统中的所有测试数据，恢复到初始状态，仅保留默认管理员账号。

**适用场景：**
- 测试完成后准备正式使用
- 数据混乱需要重新开始
- 演示环境重置

---

## 二、重置步骤

### 2.1 停止服务

```bash
# 如果使用开发服务器
# 按 Ctrl+C 停止

# 如果使用PM2
pm2 stop cell-bank
```

### 2.2 备份数据库（可选但推荐）

```bash
# 备份当前数据库
cp prisma/dev.db prisma/dev.db.backup

# 或按日期备份
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d)
```

### 2.3 删除数据库文件

```bash
# 删除数据库文件
rm prisma/dev.db

# 如果存在数据库日志文件也删除
rm -f prisma/dev.db-journal
```

### 2.4 重新初始化数据库

```bash
# 推送schema到数据库，创建新数据库
bun run db:push
```

### 2.5 创建默认管理员账号

#### 方法一：使用Prisma Studio（推荐）

```bash
# 启动Prisma Studio
bunx prisma studio
```

在打开的浏览器界面中：
1. 选择 `User` 表
2. 点击 "Add record"
3. 填写以下信息：

| 字段 | 值 |
|------|-----|
| id | 留空（自动生成） |
| email | admin@example.com |
| name | admin |
| password | $2b$10$...（见下方密码哈希） |
| role | admin |
| createdAt | 留空（自动生成） |
| updatedAt | 留空（自动生成） |

**密码哈希值**（密码为 `admin123`）：
```
$2b$10$rQZ9QxZQxZQxZQxZQxZQxOZQxZQxZQxZQxZQxZQxZQxZQxZQxZQ
```

> 注意：上述哈希值是示例，请使用下方脚本生成正确的哈希值。

#### 方法二：使用脚本（推荐）

创建脚本文件 `scripts/create-admin.ts`：

```typescript
// scripts/create-admin.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'admin',
      password: hashedPassword,
      role: 'admin',
    },
  });
  
  console.log('管理员账号创建成功:', admin.email);
}

main()
  .catch((e) => {
    console.error('创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

运行脚本：
```bash
bun run scripts/create-admin.ts
```

#### 方法三：使用API（如果服务已启动）

```bash
# 调用注册API（如果有）
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "name": "admin",
    "password": "admin123",
    "role": "admin"
  }'
```

### 2.6 重启服务

```bash
# 开发模式
bun run dev

# 生产模式（PM2）
pm2 restart cell-bank
```

---

## 三、一键重置脚本

创建以下脚本以便快速重置：

```bash
#!/bin/bash
# scripts/reset-database.sh

echo "=== 细胞库管理系统数据重置 ==="

# 确认操作
read -p "确定要清空所有数据吗？此操作不可恢复！(yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "操作已取消"
    exit 0
fi

# 停止服务（如果使用PM2）
# pm2 stop cell-bank

# 备份数据库
echo "正在备份数据库..."
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null
echo "备份完成"

# 删除数据库
echo "正在删除数据库..."
rm -f prisma/dev.db prisma/dev.db-journal
echo "数据库已删除"

# 重新初始化
echo "正在初始化数据库..."
bun run db:push
echo "数据库初始化完成"

# 创建管理员账号
echo "正在创建管理员账号..."
bun run scripts/create-admin.ts
echo "管理员账号创建完成"

echo ""
echo "=== 重置完成 ==="
echo "管理员账号: admin@example.com"
echo "默认密码: admin123"
echo "请登录后立即修改密码！"
echo ""

# 重启服务
# pm2 restart cell-bank
```

使用方法：
```bash
# 添加执行权限
chmod +x scripts/reset-database.sh

# 执行重置
./scripts/reset-database.sh
```

---

## 四、重置后的默认账号

| 项目 | 值 |
|------|-----|
| 用户名 | admin |
| 邮箱 | admin@example.com |
| 密码 | admin123 |
| 角色 | 管理员 |

> ⚠️ **安全提示**：首次登录后请立即修改默认密码！

---

## 五、验证重置结果

### 5.1 登录测试

1. 访问系统
2. 使用默认账号登录
3. 确认可以正常登录

### 5.2 数据检查

登录后检查以下内容：

| 检查项 | 预期结果 |
|--------|---------|
| 存储位置 | 空，无任何冰箱 |
| 细胞入库 | 无入库记录 |
| 库存查询 | 无库存数据 |
| 细胞出库 | 无出库记录 |
| 统计报表 | 所有统计为0 |
| 用户管理 | 仅有一个admin用户 |

---

## 六、注意事项

### 6.1 数据不可恢复

删除数据库后，数据**无法恢复**。请确保：
- 已备份重要数据
- 已确认重置操作

### 6.2 生产环境慎用

**生产环境请勿执行此操作！** 生产环境应该：
- 定期备份数据
- 使用数据归档而非删除
- 仅删除测试数据

### 6.3 权限检查

确保执行脚本的账户有权限：
- 删除数据库文件
- 创建新文件
- 运行bun命令

---

## 七、常见问题

### Q1: 运行 db:push 报错？

确保 prisma 已正确安装：
```bash
bun install
bun run db:push
```

### Q2: 创建管理员账号报密码加密错误？

确保 bcrypt 已安装：
```bash
bun add bcrypt
bun add -D @types/bcrypt
```

### Q3: 重置后无法登录？

检查管理员账号是否正确创建：
```bash
bunx prisma studio
```
在 User 表中查看是否有 admin@example.com 用户。

### Q4: 想保留某些数据怎么办？

手动备份后，使用 SQLite 工具选择性删除：
```bash
# 打开数据库
sqlite3 prisma/dev.db

# 仅删除细胞相关数据
DELETE FROM OperationLog;
DELETE FROM Cell;
DELETE FROM CellBatch;

# 保留用户和存储位置数据
.quit
```

---

## 八、相关文档

- [技术文档](./tech-spec.md) - 系统技术细节
- [用户使用说明书](./user-manual.md) - 系统操作指南
- [部署与发布指南](./deployment-guide.md) - 系统部署说明

---

**文档结束**
