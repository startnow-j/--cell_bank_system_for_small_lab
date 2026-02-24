#!/bin/bash
# 细胞库管理系统 - 数据重置脚本
# 使用方法: bun run reset

echo ""
echo "=========================================="
echo "     细胞库管理系统 - 数据重置工具"
echo "=========================================="
echo ""

# 数据库路径（支持开发和生产环境）
if [ -f "db/custom.db" ]; then
    DB_PATH="db/custom.db"
else
    DB_PATH="prisma/dev.db"
fi

# 确认操作
read -p "⚠️  此操作将清空所有数据，仅保留默认管理员账号！\n    确定继续吗？(输入 yes 确认): " confirm
echo ""

if [ "$confirm" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

# 备份数据库
echo "📦 正在备份数据库..."
if [ -f "$DB_PATH" ]; then
    cp "$DB_PATH" "${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
    echo "   ✅ 备份完成"
else
    echo "   ℹ️  数据库文件不存在，跳过备份"
fi
echo ""

# 删除数据库
echo "🗑️  正在删除数据库..."
rm -f "$DB_PATH" "${DB_PATH}-journal" 2>/dev/null
echo "   ✅ 数据库已删除"
echo ""

# 重新初始化数据库
echo "🔧 正在初始化数据库..."
bun run db:push > /dev/null 2>&1
echo "   ✅ 数据库初始化完成"
echo ""

# 创建管理员账号
echo "👤 正在创建管理员账号..."
bun run scripts/create-admin.ts
echo ""

echo "=========================================="
echo "           ✅ 重置完成！"
echo "=========================================="
echo ""
echo "登录信息："
echo "  📧 邮箱: admin@example.com"
echo "  🔑 密码: admin123"
echo ""
echo "⚠️  请登录后立即修改默认密码！"
echo ""
