# 细胞库管理系统部署与发布指南

> 版本: v1.0  
> 更新日期: 2025-02-14

---

## 目录

1. [部署方式概览](#一部署方式概览)
2. [方式一：Web服务器部署](#二方式一web服务器部署)
3. [方式二：打包为桌面应用](#三方式二打包为桌面应用)
4. [方式三：打包为移动端应用](#四方式三打包为移动端应用)
5. [方式四：PWA渐进式应用](#五方式四pwa渐进式应用)
6. [推荐方案](#六推荐方案)

---

## 一、部署方式概览

| 方式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| Web服务器部署 | 多人协作、联网使用 | 跨平台、易维护 | 需要服务器 |
| 桌面应用( Electron ) | 单机离线使用 | 无需服务器、离线可用 | 安装包较大 |
| 移动端应用 | 移动办公 | 原生体验 | 需要应用商店或签名 |
| PWA | 跨平台轻量部署 | 安装简单、可离线 | 功能受限 |

---

## 二、方式一：Web服务器部署

### 2.1 生产构建

```bash
# 进入项目目录
cd /home/z/my-project

# 构建生产版本
bun run build

# 启动生产服务（默认端口3000）
bun run start
```

### 2.2 服务器部署（推荐）

#### 方案A：使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start bun --name "cell-bank" -- run start

# 设置开机自启
pm2 startup
pm2 save

# 常用命令
pm2 logs cell-bank    # 查看日志
pm2 restart cell-bank # 重启
pm2 stop cell-bank    # 停止
```

#### 方案B：使用Docker

```dockerfile
# 创建 Dockerfile
FROM oven/bun:1 AS base
WORKDIR /app

# 安装依赖
FROM base AS deps
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# 构建
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# 运行
FROM base AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
```

```bash
# 构建镜像
docker build -t cell-bank-system .

# 运行容器
docker run -d -p 3000:3000 -v ./data:/app/prisma cell-bank-system
```

#### 方案C：使用Nginx反向代理

```nginx
# /etc/nginx/sites-available/cell-bank
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/cell-bank /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2.3 云服务部署

| 平台 | 部署方式 | 说明 |
|------|---------|------|
| **Vercel** | `vercel deploy` | Next.js官方平台，最简单 |
| **Railway** | 连接GitHub仓库 | 支持数据库 |
| **Render** | 连接GitHub仓库 | 免费套餐可用 |
| **阿里云/腾讯云** | 购买ECS服务器 | 完全自主控制 |

---

## 三、方式二：打包为桌面应用

使用 **Electron** 将Web应用打包为桌面应用，支持Windows/macOS/Linux。

### 3.1 安装依赖

```bash
# 安装Electron相关依赖
bun add -D electron electron-builder

# 安装Next.js独立输出适配器
bun add @electron/remote
```

### 3.2 修改 next.config.ts

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',  // 添加此行
  reactStrictMode: true,
};

export default nextConfig;
```

### 3.3 创建Electron入口文件

```javascript
// electron/main.js
const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, 'icon.png'),
    title: '细胞库管理系统',
  });

  // 加载应用
  mainWindow.loadURL('http://localhost:3000');
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  const serverPath = path.join(__dirname, '.next/standalone/server.js');
  nextProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: '3000' },
    stdio: 'inherit',
  });
}

app.whenReady().then(() => {
  startNextServer();
  setTimeout(createWindow, 2000); // 等待服务器启动
});

app.on('window-all-closed', () => {
  if (nextProcess) nextProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
```

### 3.4 添加打包配置

```json
// package.json 添加
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"bun run dev\" \"electron .\"",
    "electron:build": "bun run build && electron-builder"
  },
  "build": {
    "appId": "com.cellbank.app",
    "productName": "细胞库管理系统",
    "directories": {
      "output": "dist"
    },
    "files": [
      "electron/**/*",
      ".next/standalone/**/*",
      ".next/static/**/*",
      "public/**/*",
      "prisma/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "public/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "public/icon.png"
    }
  }
}
```

### 3.5 构建桌面应用

```bash
# 构建
bun run electron:build

# 输出文件位于 dist/ 目录
# Windows: dist/细胞库管理系统 Setup 1.0.0.exe
# macOS: dist/细胞库管理系统-1.0.0.dmg
# Linux: dist/细胞库管理系统-1.0.0.AppImage
```

---

## 四、方式三：打包为移动端应用

使用 **Capacitor** 或 **React Native WebView** 将Web应用打包为移动端应用。

### 4.1 使用Capacitor（推荐）

#### 安装依赖

```bash
# 安装Capacitor
bun add @capacitor/core @capacitor/cli
bun add -D @capacitor/android @capacitor/ios

# 初始化Capacitor
bunx cap init "细胞库管理系统" "com.cellbank.app"
```

#### 配置 capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cellbank.app',
  appName: '细胞库管理系统',
  webDir: 'out',  // Next.js静态导出目录
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  }
};

export default config;
```

#### 修改Next.js配置

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'export',  // 静态导出
  images: {
    unoptimized: true,  // 静态导出需要禁用图片优化
  },
  trailingSlash: true,  // 确保路由正确
};
```

#### 构建和同步

```bash
# 静态导出
bun run build

# 同步到移动端
bunx cap sync android
bunx cap sync ios

# 打开Android Studio / Xcode
bunx cap open android
bunx cap open ios
```

#### 生成APK/IPA

**Android:**
1. 打开Android Studio
2. Build → Generate Signed Bundle/APK
3. 选择APK，配置签名
4. 构建完成

**iOS:**
1. 打开Xcode
2. 配置开发者账号
3. Product → Archive
4. 分发到App Store或导出IPA

### 4.2 使用TWA（Trusted Web Activity）

适用于Android，将PWA包装为APK：

```bash
# 安装bubblewrap
npm install -g @anthropic/bubblewrap

# 初始化TWA项目
bubblewrap init --manifest="https://your-domain.com/manifest.json"

# 构建APK
bubblewrap build
```

---

## 五、方式四：PWA渐进式应用

PWA允许用户将网站"安装"到设备，支持离线使用。

### 5.1 创建 manifest.json

```json
// public/manifest.json
{
  "name": "细胞库管理系统",
  "short_name": "细胞库",
  "description": "专业的细胞库管理解决方案",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0891b2",
  "orientation": "any",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### 5.2 添加Service Worker

```typescript
// public/sw.js
const CACHE_NAME = 'cell-bank-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
```

### 5.3 修改 layout.tsx

```typescript
// src/app/layout.tsx 添加
export const metadata: Metadata = {
  title: "细胞库管理系统",
  manifest: "/manifest.json",
  themeColor: "#0891b2",
  // ...其他配置
};
```

### 5.4 安装PWA

**PC端（Chrome/Edge）:**
1. 访问网站
2. 地址栏右侧出现"安装"图标
3. 点击安装

**移动端（Android Chrome）:**
1. 访问网站
2. 菜单 → "添加到主屏幕"
3. 图标出现在桌面

**移动端（iOS Safari）:**
1. 访问网站
2. 分享 → "添加到主屏幕"
3. 图标出现在桌面

---

## 六、推荐方案

### 6.1 团队协作场景

```
推荐方案：Web服务器部署

架构：
┌─────────────┐
│   用户设备   │ (PC/手机/平板)
└──────┬──────┘
       │ 互联网/内网
       ▼
┌─────────────┐
│  Nginx代理  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Next.js服务 │ (PM2管理)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   SQLite    │ (数据文件)
└─────────────┘
```

**优点：**
- 多人同时使用
- 数据集中管理
- 跨设备访问
- 易于维护

### 6.2 单机离线场景

```
推荐方案：Electron桌面应用

架构：
┌─────────────────────────────────────┐
│         Electron应用                 │
│  ┌─────────────┐  ┌─────────────┐   │
│  │  前端界面   │  │  内嵌服务    │   │
│  │ (渲染进程)  │  │ (主进程)     │   │
│  └──────┬──────┘  └──────┬──────┘   │
│         │                │          │
│         └────────┬───────┘          │
│                  ▼                  │
│         ┌─────────────┐             │
│         │   SQLite    │             │
│         │  (本地文件)  │             │
│         └─────────────┘             │
└─────────────────────────────────────┘
```

**优点：**
- 无需服务器
- 完全离线使用
- 数据本地存储
- 原生桌面体验

### 6.3 移动办公场景

```
推荐方案：PWA + 云服务器

步骤：
1. 部署Web服务到云服务器
2. 配置PWA支持
3. 移动设备访问并"添加到主屏幕"

优点：
- 无需应用商店审核
- 轻量级安装
- 自动更新
- 跨平台支持
```

---

## 七、快速部署清单

### 7.1 最简单的部署（Vercel）

```bash
# 1. 安装Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 完成！获得永久访问地址
```

### 7.2 局域网部署

```bash
# 1. 构建项目
bun run build

# 2. 启动服务
bun run start

# 3. 局域网访问
# http://你的IP:3000

# 4. 其他设备访问
# 确保防火墙开放3000端口
```

### 7.3 完整生产部署

```bash
# 1. 准备服务器（Ubuntu示例）
sudo apt update
sudo apt install nodejs npm nginx

# 2. 安装Bun
curl -fsSL https://bun.sh/install | bash

# 3. 上传项目或克隆代码
git clone <your-repo>
cd my-project

# 4. 安装依赖
bun install

# 5. 构建项目
bun run build

# 6. 使用PM2管理进程
npm install -g pm2
pm2 start bun --name "cell-bank" -- run start
pm2 startup
pm2 save

# 7. 配置Nginx反向代理（见上文）

# 8. 配置HTTPS（可选）
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx
```

---

## 八、注意事项

### 8.1 数据备份

无论哪种部署方式，请定期备份SQLite数据库文件：

```bash
# 自动备份脚本
#!/bin/bash
DATE=$(date +%Y%m%d)
cp /path/to/prisma/dev.db /backup/dev.db.$DATE
# 保留最近30天
find /backup -name "dev.db.*" -mtime +30 -delete
```

### 8.2 安全配置

1. **修改默认密码**：部署后立即修改admin密码
2. **使用HTTPS**：生产环境必须使用HTTPS
3. **限制访问**：内网部署可限制IP访问
4. **定期更新**：保持依赖包更新

### 8.3 性能优化

1. **启用Gzip压缩**：Nginx配置
2. **CDN加速**：静态资源使用CDN
3. **数据库优化**：定期清理日志

---

## 九、技术支持

如遇到部署问题，请参考：

1. [Next.js官方文档](https://nextjs.org/docs)
2. [Electron官方文档](https://www.electronjs.org/docs)
3. [Capacitor官方文档](https://capacitorjs.com/docs)
4. [Vercel部署指南](https://vercel.com/docs)

---

**文档结束**
