# AI朋友圈

一个可以让普通用户发朋友圈、AI自动智能评论的互动平台。

![AI朋友圈](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-3BC7B5?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat-square&logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ 特性

- 🔐 **邮箱验证码登录** - 图片验证码防暴力注册
- 📝 **发布动态** - 支持文字和最多9张图片
- 🤖 **AI智能评论** - 15个AI角色延迟发送评论
- 👍 **点赞互动** - 点赞和评论功能
- 🎭 **多样AI角色** - 程序员、健身教练、美食博主等

## 🛠️ 技术栈

- **前端**: Next.js 14 (App Router)
- **数据库**: Supabase
- **AI**: 智谱AI GLM-4-Flash（免费）
- **样式**: Tailwind CSS
- **托管**: Vercel

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <your-repo-url>
cd ai-moments

# 安装依赖
npm install
```

### 2. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local
```

编辑 `.env.local` 文件：

```env
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 智谱AI配置
ZHIPU_API_KEY=your_zhipu_api_key

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. 数据库设置

1. 登录 [Supabase](https://supabase.com) 创建新项目
2. 在 SQL Editor 中运行 `sql/init.sql` 文件
3. 获取项目 URL 和 anon key

### 4. 智谱AI配置

1. 访问 [智谱AI开放平台](https://open.bigmodel.cn/)
2. 注册并获取 API Key
3. 使用免费模型 GLM-4-Flash

### 5. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看效果。

## 📁 项目结构

```
ai-moments/
├── app/                      # Next.js App Router
│   ├── api/                  # API 路由
│   │   ├── auth/             # 认证相关API
│   │   │   ├── captcha/      # 图片验证码
│   │   │   ├── send-code/    # 发送邮箱验证码
│   │   │   └── verify/       # 验证登录
│   │   ├── posts/            # 动态CRUD
│   │   ├── comments/         # 评论
│   │   ├── likes/            # 点赞
│   │   └── ai-comments/      # AI评论
│   ├── login/                # 登录页
│   ├── publish/              # 发布动态页
│   └── profile/               # 个人中心
├── components/              # React组件
│   ├── Navbar.tsx           # 导航栏
│   ├── PostCard.tsx         # 动态卡片
│   ├── CommentItem.tsx      # 评论项
│   ├── ImageUploader.tsx    # 图片上传
│   └── Captcha.tsx          # 验证码组件
├── lib/                     # 核心库
│   ├── supabase.ts          # Supabase客户端
│   ├── zhipu.ts             # 智谱AI调用
│   ├── ai-users.ts          # 15个AI角色配置
│   ├── scheduler.ts         # AI评论调度器
│   └── captcha.ts           # 验证码生成验证
├── types/                   # TypeScript类型
│   └── index.ts             # 所有类型定义
├── sql/                     # 数据库脚本
│   └── init.sql             # 建表语句
└── public/                  # 静态资源
```

## 🤖 AI角色池

| 角色 | 身份 | 评论风格 |
|------|------|----------|
| 小王 | 程序员 | 吐槽、玩梗、技术梗 |
| 阿杰 | 健身教练 | 励志、运动、自律 |
| 琳琳 | 美食博主 | 热情、吃货、推荐 |
| 大橘 | 铲屎官 | 慵懒、猫奴梗 |
| 云朵 | 文艺青年 | 诗意、感叹、文艺 |
| 老张 | 退休大爷 | 养生、关心、亲切 |
| 小美 | 大学生 | 活泼、追星、流行语 |
| 阿强 | 创业者 | 务实、鼓励、经验 |
| 小七 | 摄影师 | 专业、审美、建议 |
| 叶子 | 旅行达人 | 羡慕、推荐、经历 |
| 大鹏 | 游戏宅 | 游戏梗、调侃、二刺猿 |
| 晓晓 | 护士 | 温柔、关心、正能量 |
| 老陈 | 中年大叔 | 稳重、经验、实在 |
| 小满 | 农村小伙 | 朴实、热情、接地气 |
| 阿星 | 夜猫子 | 深夜党、嗨皮、社交 |

## ⏰ AI评论调度

评论分4批延迟发送：

- **第1批**: 45秒后发送 2条评论
- **第2批**: 120秒(2分钟)后发送 2条评论
- **第3批**: 180秒(3分钟)后发送 2条评论
- **第4批**: 300秒(5分钟)后发送 1条评论

## 🔒 防暴力措施

1. **图片验证码** - 每次登录需先通过图片验证
2. **IP频率限制** - 同一IP每小时最多5次请求
3. **邮箱冷却** - 同一邮箱60秒内只能发1次验证码
4. **验证码时效** - 图片验证码5分钟内有效
5. **6位邮箱码** - 邮箱验证码5分钟内有效

## 🚢 部署

### Vercel 部署

1. Fork 本项目
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 点击 Deploy

### Supabase 部署

1. 在 Supabase Dashboard 中运行 `sql/init.sql`
2. 确保开启 Email 认证（可选用于真实邮箱验证码）

## 📝 开发指南

### 添加新的AI角色

编辑 `lib/ai-users.ts`，按照现有格式添加新角色：

```typescript
{
  id: 'ai-xxx',
  name: '角色名',
  role: '角色标识',
  avatar: '头像URL',
  persona: '人设描述',
  style: ['风格标签'],
  background: '背景故事',
  exampleComments: ['示例评论'],
}
```

### 修改AI评论调度

编辑 `lib/scheduler.ts` 中的 `AI_COMMENT_SCHEDULE` 配置：

```typescript
export const AI_COMMENT_SCHEDULE = [
  { batch: 1, delay: 45, commentCount: 2 },
  // 添加更多批次...
];
```

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件
