-- =====================================================
-- AI朋友圈项目 - 数据库初始化SQL
-- 
-- 创建所有必要的表、索引和函数
-- 运行前请确保已创建Supabase项目
-- =====================================================

-- ==================== 1. 用户表 ====================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    avatar TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ==================== 2. 动态（帖子）表 ====================

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

-- 动态索引
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);

-- ==================== 3. 评论表 ====================

CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) <= 200),
    is_ai BOOLEAN DEFAULT FALSE,
    ai_role VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 评论索引
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at ASC);

-- ==================== 4. 点赞表 ====================

CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- 同一用户对同一动态只能点赞一次
    UNIQUE(post_id, user_id)
);

-- 点赞索引
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_user ON likes(post_id, user_id);

-- ==================== 5. 图片验证码表 ====================

CREATE TABLE IF NOT EXISTS captchas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 验证码索引
CREATE INDEX IF NOT EXISTS idx_captchas_id ON captchas(id);
CREATE INDEX IF NOT EXISTS idx_captchas_expires ON captchas(expires_at);

-- ==================== 6. 邮箱验证码表 ====================

CREATE TABLE IF NOT EXISTS email_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 邮箱验证码索引
CREATE INDEX IF NOT EXISTS idx_email_codes_email ON email_codes(email);
CREATE INDEX IF NOT EXISTS idx_email_codes_expires ON email_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_email_codes_email_used ON email_codes(email, used);

-- ==================== 7. AI评论任务表 ====================

CREATE TABLE IF NOT EXISTS ai_comment_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    batch INTEGER NOT NULL CHECK (batch >= 1 AND batch <= 4),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    executed_at TIMESTAMP WITH TIME ZONE,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI任务索引
CREATE INDEX IF NOT EXISTS idx_ai_tasks_post_id ON ai_comment_tasks(post_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON ai_comment_tasks(status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_scheduled ON ai_comment_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_pending_scheduled ON ai_comment_tasks(status, scheduled_at);

-- ==================== 8. IP频率限制表 ====================

CREATE TABLE IF NOT EXISTS ip_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) NOT NULL,
    action VARCHAR(50) NOT NULL,
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IP限制索引
CREATE INDEX IF NOT EXISTS idx_ip_limits_ip_action ON ip_limits(ip_address, action);
CREATE INDEX IF NOT EXISTS idx_ip_limits_window ON ip_limits(window_start);

-- ==================== 9. 辅助函数 ====================

/**
 * 增加评论数函数
 */
CREATE OR REPLACE FUNCTION increment_comments_count(post_id UUID, delta INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE posts 
    SET comments_count = GREATEST(0, comments_count + delta)
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * 清理过期验证码的函数（可定期执行）
 */
CREATE OR REPLACE FUNCTION cleanup_expired_captchas()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM captchas WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * 清理过期邮箱验证码的函数
 */
CREATE OR REPLACE FUNCTION cleanup_expired_email_codes()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM email_codes WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * 清理过期IP限制记录的函数
 */
CREATE OR REPLACE FUNCTION cleanup_expired_ip_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ip_limits WHERE window_start < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * 自动更新updated_at的触发器函数
 */
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/**
 * 为posts表创建updated_at触发器
 */
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==================== 10. Row Level Security (RLS) 配置 ====================

-- 启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- 用户表策略：公开读取，所有人可访问用户信息
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

-- 用户表策略：用户只能更新自己的信息
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 动态表策略：所有人可查看动态
CREATE POLICY "Posts are viewable by everyone" ON posts
    FOR SELECT USING (true);

-- 动态表策略：登录用户可创建动态
CREATE POLICY "Authenticated users can create posts" ON posts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 动态表策略：用户只能更新自己的动态
CREATE POLICY "Users can update own posts" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

-- 动态表策略：用户只能删除自己的动态
CREATE POLICY "Users can delete own posts" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- 评论表策略：所有人可查看评论
CREATE POLICY "Comments are viewable by everyone" ON comments
    FOR SELECT USING (true);

-- 评论表策略：登录用户可创建评论
CREATE POLICY "Authenticated users can create comments" ON comments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 评论表策略：用户只能删除自己的评论
CREATE POLICY "Users can delete own comments" ON comments
    FOR DELETE USING (auth.uid() = user_id);

-- 点赞表策略：所有人可查看点赞
CREATE POLICY "Likes are viewable by everyone" ON likes
    FOR SELECT USING (true);

-- 点赞表策略：登录用户可创建/删除点赞
CREATE POLICY "Authenticated users can manage likes" ON likes
    FOR ALL USING (auth.role() = 'authenticated');

-- ==================== 11. 初始化数据（可选） ====================

-- 插入一个测试用户（如果不存在）
INSERT INTO users (id, email, nickname, avatar)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'demo@example.com',
    '演示用户',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=demo'
)
ON CONFLICT (email) DO NOTHING;

-- 插入一条测试动态（如果不存在）
INSERT INTO posts (id, user_id, content, images)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '欢迎来到AI朋友圈！🎉 这里是一个充满AI互动乐趣的社交平台，快来发布你的第一条动态吧~',
    ARRAY['https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400']
)
ON CONFLICT DO NOTHING;

-- ==================== 12. 设置RLS服务角色密钥 ====================

-- 在Supabase Dashboard中完成以下设置：
-- 1. 设置service_role密钥的环境变量
-- 2. 确保anon密钥只能访问公开数据
-- 3. 服务端代码使用service_role密钥绕过RLS进行管理操作

-- =====================================================
-- 完成！数据库已初始化
-- =====================================================
