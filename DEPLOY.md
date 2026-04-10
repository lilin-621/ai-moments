# AI朋友圈 - 免费部署指南

> 本指南将帮助你把 AI朋友圈 项目免费部署到线上，使用 Vercel 托管前端 + Supabase 数据库 + 智谱AI API。

---

## 📋 部署概览

| 服务 | 用途 | 免费额度 | 注册链接 |
|------|------|----------|----------|
| **Vercel** | 网站托管 | 100GB 带宽/月 | [vercel.com](https://vercel.com) |
| **Supabase** | 数据库+存储 | 500MB 数据库 + 1GB 存储 | [supabase.com](https://supabase.com) |
| **智谱AI** | AI 对话 | 100万 token/月 | [open.bigmodel.cn](https://open.bigmodel.cn) |

**预估月费用：$0** （全部免费）

---

## 🗄️ 第一步：部署 Supabase 数据库

### 1.1 注册 Supabase

1. 访问 [supabase.com](https://supabase.com)
2. 点击 **"Start your project"**
3. 使用 GitHub 账号登录（推荐）
4. 或使用邮箱注册

> 📸 截图位置：Supabase 注册页面

### 1.2 创建新项目

1. 进入 Dashboard 后，点击 **"New Project"**
2. 填写项目信息：
   - **Organization**: 选择你的组织
   - **Name**: `ai-moments`（或任意名称）
   - **Database Password**: 设置强密码，**务必保存！**
   - **Region**: 选择离你最近的区域（如 `Northeast Asia`）
3. 点击 **"Create new project"**
4. 等待 2 分钟，项目创建完成

> 📸 截图位置：Supabase 项目创建表单

### 1.3 获取连接信息

项目创建完成后，进入 **Settings** → **API** 页面，复制以下信息：

```
Project URL:     https://xxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ 注意：`anon` key 是公开的，可以在前端使用

> 📸 截图位置：Supabase API 设置页面

### 1.4 创建数据库表

1. 进入你的 Supabase 项目
2. 点击左侧菜单 **"SQL Editor"**
3. 点击 **"New query"**
4. 复制以下 SQL 语句并执行：

```sql
-- =====================================================
-- AI朋友圈项目 - 数据库初始化SQL
-- =====================================================

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    avatar TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 2. 动态（帖子）表
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 500),
    images TEXT[] DEFAULT '{}',
    likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
    comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);

-- 3. 评论表
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 200),
    is_ai BOOLEAN DEFAULT FALSE,
    ai_role VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- 4. 点赞表
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- 5. 图片验证码表
CREATE TABLE IF NOT EXISTS captchas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_captchas_expires ON captchas(expires_at);

-- 6. 邮箱验证码表
CREATE TABLE IF NOT EXISTS email_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_codes_expires ON email_codes(expires_at);

-- 7. AI好友角色表
CREATE TABLE IF NOT EXISTS ai_friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    avatar TEXT DEFAULT '',
    personality TEXT DEFAULT '',
    system_prompt TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 预设几个AI好友
INSERT INTO ai_friends (name, avatar, personality, system_prompt) VALUES
('小智', 'https://api.dicebear.com/7.x/bottts/svg?seed=xiaozhi', '活泼开朗的AI助手', '你是一个活泼开朗、乐于助人的AI助手，喜欢用轻松的方式与用户交流。'),
('小艺', 'https://api.dicebear.com/7.x/bottts/svg?seed=xiaoyi', '温柔体贴的AI伙伴', '你是一个温柔体贴、善解人意的AI伙伴，总是能给用户带来温暖的陪伴。');
```

5. 点击 **"Run"** 执行 SQL

> 📸 截图位置：SQL Editor 执行界面

### 1.5 开启邮箱认证（可选）

1. 进入 **Authentication** → **Providers**
2. 找到 **Email**，点击启用
3. 配置邮件模板（可选）
4. 关闭 **Confirm email** 如果不想强制邮箱验证

> 📸 截图位置：Authentication 设置页面

---

## 🤖 第二步：获取智谱AI API Key

### 2.1 注册智谱AI

1. 访问 [open.bigmodel.cn](https://open.bigmodel.cn)
2. 点击右上角 **"登录/注册"**
3. 使用手机号或微信登录

### 2.2 获取 API Key

1. 登录后进入控制台
2. 点击左侧 **"API Keys"**
3. 点击 **"创建API Key"**
4. 输入名称（如 `ai-moments`）
5. 点击 **"复制"** 保存 API Key

> 📸 截图位置：智谱AI API Keys 页面

### 2.3 领取免费额度

1. 新用户注册送 **100万 token**
2. 每月签到可额外领取
3. 查看额度：控制台 → **用量中心**

---

## 🚀 第三步：部署到 Vercel

### 3.1 推送代码到 GitHub

#### 方法一：使用 GitHub 网页（推荐新手）

1. 登录 [GitHub](https://github.com)
2. 点击右上角 **"+"** → **"New repository"**
3. 填写信息：
   - **Repository name**: `ai-moments`
   - **Description**: `AI朋友圈 - 智能互动社交平台`
   - 选择 **Private** 或 **Public**
4. 点击 **"Create repository"**
5. 在新页面找到 **"push an existing repository"**
6. 在终端执行以下命令：

```bash
cd ai-moments
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/ai-moments.git
git push -u origin main
```

> 📸 截图位置：GitHub 创建仓库页面

#### 方法二：使用 GitHub CLI

```bash
gh auth login
gh repo create ai-moments --public --push
```

### 3.2 部署到 Vercel

1. 登录 [vercel.com](https://vercel.com)
2. 点击 **"Add New..."** → **"Project"**
3. 选择 **"Import Git Repository"**
4. 选择你刚创建的 GitHub 仓库 `ai-moments`
5. 配置项目：
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

> 📸 截图位置：Vercel 导入项目配置

### 3.3 配置环境变量

在 Vercel 项目设置中，点击 **"Environment Variables"**，添加以下变量：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` （从 Supabase 获取） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1...` （从 Supabase 获取） |
| `ZHIPU_API_KEY` | `xxxxxxxx` （从智谱AI获取） |

> ⚠️ 重要：变量名前缀为 `NEXT_PUBLIC_` 的会在客户端可见，其他仅服务端可用

> 📸 截图位置：Vercel 环境变量配置页面

### 3.4 部署

1. 点击 **"Deploy"**
2. 等待 2-3 分钟部署完成
3. 获得一个 `.vercel.app` 域名
4. 点击访问你的网站

> 📸 截图位置：Vercel 部署成功页面

---

## ⚙️ 第四步：配置自定义域名（可选）

1. 进入 Vercel 项目 → **Settings** → **Domains**
2. 输入你的域名（如 `moments.yourdomain.com`）
3. 按照提示添加 DNS 记录
4. 等待 DNS 生效

---

## 🧪 第五步：测试验证

### 5.1 本地测试

```bash
# 克隆代码
git clone https://github.com/你的用户名/ai-moments.git
cd ai-moments

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env.local
# 编辑 .env.local 填写你的配置

# 启动开发服务器
npm run dev
```

### 5.2 功能测试清单

- [ ] 首页加载正常
- [ ] 用户注册/登录
- [ ] 发布朋友圈动态
- [ ] 图片上传功能
- [ ] AI 好友对话
- [ ] 点赞功能
- [ ] 评论功能

---

## 🔧 常见问题

### Q1: 部署后显示 500 错误？

检查环境变量是否配置正确，特别是：
- `NEXT_PUBLIC_SUPABASE_URL` 是否以 `https://` 开头
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是否完整

### Q2: AI 对话不工作？

1. 检查 `ZHIPU_API_KEY` 是否正确
2. 检查 Supabase 表是否创建成功
3. 查看 Vercel 日志排查问题

### Q3: 图片无法上传？

1. 检查 Supabase Storage 是否配置
2. 检查 RLS 策略是否允许上传

### Q4: 忘记 Supabase 密码？

进入 Supabase → Settings → Database → Reset password

---

## 📞 获取帮助

- 项目问题：[GitHub Issues](https://github.com/你的用户名/ai-moments/issues)
- Vercel 文档：https://vercel.com/docs
- Supabase 文档：https://supabase.com/docs
- 智谱AI 文档：https://open.bigmodel.cn/doc

---

## 📁 项目文件结构

```
ai-moments/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── login/             # 登录页面
│   ├── profile/           # 个人主页
│   ├── publish/           # 发布页面
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 布局组件
│   └── page.tsx           # 首页
├── components/            # React 组件
├── lib/                   # 工具库
│   ├── supabase.ts        # Supabase 客户端
│   ├── zhipu.ts           # 智谱AI SDK
│   └── ...
├── sql/
│   └── init.sql          # 数据库初始化
├── .env.local             # 本地环境变量
├── .env.example           # 环境变量示例
├── deploy.sh             # 部署脚本
├── package.json
├── next.config.js
└── DEPLOY.md             # 本文档
```

---

**祝你部署成功！🎉**
