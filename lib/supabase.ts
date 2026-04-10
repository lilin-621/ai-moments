/**
 * AI朋友圈项目 - Supabase客户端配置
 * 负责初始化和管理Supabase连接
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ==================== 环境变量检查 ====================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 验证必需的环境变量
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ 缺少Supabase配置: 请在.env文件中设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Supabase客户端单例
 * 使用匿名密钥，适用于客户端组件
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      // 自动刷新令牌
      persistSession: true,
      // 自动检测会话
      detectSessionInUrl: true,
      // 设置cookie名称前缀
      cookieName: 'ai-moments',
    },
    // 全局错误处理
    global: {
      headers: {
        'x-application-name': 'ai-moments',
      },
    },
  }
);

/**
 * 服务端Supabase客户端（带管理员权限）
 * 仅用于服务端API路由，具有完整的数据库访问权限
 */
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: {
      // 服务端不使用持久化会话
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * 创建带用户认证的Supabase客户端
 * @param token - 用户的访问令牌
 */
export function createAuthenticatedClient(token: string): SupabaseClient {
  return createClient(supabaseUrl || '', supabaseAnonKey || '', {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

// ==================== 数据库操作辅助函数 ====================

/**
 * 辅助函数：构建用户信息（用于动态展示）
 */
export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('id, nickname, avatar')
    .eq('id', userId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 辅助函数：批量获取用户信息
 */
export async function getUserProfiles(userIds: string[]) {
  const { data, error } = await supabase
    .from('users')
    .select('id, nickname, avatar')
    .in('id', userIds);
  
  if (error) throw error;
  
  // 转换为Map便于快速查找
  const userMap = new Map();
  data?.forEach(user => {
    userMap.set(user.id, user);
  });
  
  return userMap;
}

/**
 * 辅助函数：获取用户最近登录时间并更新
 */
export async function updateLastLogin(userId: string) {
  const { error } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
  
  if (error) console.error('更新登录时间失败:', error);
}

/**
 * 辅助函数：创建新用户
 */
export async function createUser(email: string) {
  // 生成随机昵称和头像
  const nickname = `用户${Math.random().toString(36).substring(2, 8)}`;
  const avatarIndex = Math.floor(Math.random() * 70) + 1; // 1-70的头像
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: crypto.randomUUID(),
      email,
      nickname,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarIndex}`,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 辅助函数：根据邮箱获取用户
 */
export async function getUserByEmail(email: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * 辅助函数：检查用户是否点赞了某个动态
 */
export async function checkUserLiked(postId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single();
  
  return !!data;
}

/**
 * 辅助函数：批量检查用户点赞状态
 */
export async function batchCheckUserLikes(postIds: string[], userId: string): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)
    .in('post_id', postIds);
  
  if (error) throw error;
  
  const likedSet = new Set(data?.map(item => item.post_id) || []);
  const result = new Map<string, boolean>();
  
  postIds.forEach(id => {
    result.set(id, likedSet.has(id));
  });
  
  return result;
}

/**
 * 辅助函数：获取动态列表（带用户信息）
 */
export async function getPosts(
  page: number = 1,
  pageSize: number = 10,
  userId?: string
) {
  const offset = (page - 1) * pageSize;
  
  let query = supabase
    .from('posts')
    .select(`
      *,
      user:users(id, nickname, avatar)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);
  
  // 如果指定了用户ID，只获取该用户的动态
  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  const { data, error, count } = await query;
  
  if (error) throw error;
  
  // 获取评论数量和点赞数量
  const posts = await Promise.all(
    (data || []).map(async (post) => {
      // 获取评论数
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      
      return {
        ...post,
        userNickname: post.user?.nickname || '未知用户',
        userAvatar: post.user?.avatar || '',
        commentsCount: commentsCount || 0,
      };
    })
  );
  
  return {
    posts,
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > offset + pageSize,
  };
}

/**
 * 辅助函数：获取动态的评论列表
 */
export async function getComments(postId: string, page: number = 1, pageSize: number = 20) {
  const offset = (page - 1) * pageSize;
  
  const { data, error, count } = await supabase
    .from('comments')
    .select(`
      *,
      user:users(id, nickname, avatar)
    `, { count: 'exact' })
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .range(offset, offset + pageSize - 1);
  
  if (error) throw error;
  
  const comments = (data || []).map(comment => ({
    ...comment,
    userNickname: comment.user?.nickname || '未知用户',
    userAvatar: comment.user?.avatar || '',
  }));
  
  return {
    comments,
    total: count || 0,
    page,
    pageSize,
    hasMore: (count || 0) > offset + pageSize,
  };
}

/**
 * 辅助函数：更新动态的评论数
 */
export async function updatePostCommentCount(postId: string, delta: number = 1) {
  const { data, error } = await supabase.rpc('increment_comments_count', {
    post_id: postId,
    delta: delta,
  });
  
  if (error) {
    console.error('更新评论数失败:', error);
  }
  
  return data;
}
