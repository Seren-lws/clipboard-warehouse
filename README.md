# ✿ 剪贴板仓库

轻量快速的个人剪贴板管理工具，PWA 支持，可安装到手机桌面。

## 功能

- 📝 快速记录，打开即写
- 🏷️ 独立标签系统，常用标签一键打
- 📌 钉选置顶
- 📋 一键复制纯正文（不带标签）
- 📅 日历视图，精确到日、显示条数
- 🔍 全文搜索 + 标签搜索
- 📤 按标签/日期/全局导出（TXT / JSON）
- 🖼️ 图片上传（Supabase Storage）
- 🛠️ 格式整理工具
- 📱 PWA 离线支持

## 部署步骤

### 1. Supabase 数据库初始化

进入 [Supabase Dashboard](https://supabase.com/dashboard) → 你的项目 → SQL Editor，
把 `supabase-init.sql` 的内容全部粘贴进去，点 Run。

### 2. 本地开发

```bash
npm install
npm run dev
```

### 3. 部署到 Vercel

1. 把项目推到 GitHub
2. 在 [Vercel](https://vercel.com) 导入这个仓库
3. 在 Vercel 的 Environment Variables 中添加：
   - `VITE_SUPABASE_URL` = 你的 Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = 你的 anon key
4. 部署完成后访问网站，在手机浏览器中点「添加到主屏幕」即可当 App 用

## 技术栈

- React 18 + Vite
- Supabase (PostgreSQL + Storage)
- vite-plugin-pwa (Service Worker + Manifest)
