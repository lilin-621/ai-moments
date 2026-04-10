/**
 * AI朋友圈项目 - 类型定义文件
 * 包含所有核心类型、接口和类型守卫
 */

// ==================== 用户相关类型 ====================

/** 用户基本信息 */
export interface User {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  created_at: string;
  last_login_at: string;
}

/** 用户注册/登录请求 */
export interface AuthRequest {
  email: string;
  code: string;
}

/** 登录响应 */
export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

// ==================== 验证码相关类型 ====================

/** 图片验证码响应 */
export interface CaptchaResponse {
  success: boolean;
  captchaId: string; // 验证码唯一ID
  data?: string; // Base64编码的图片
  message?: string;
}

/** 验证码校验请求 */
export interface CaptchaVerifyRequest {
  captchaId: string;
  captchaCode: string;
}

/** 邮箱验证码发送请求 */
export interface SendCodeRequest {
  email: string;
  captchaId: string;
  captchaCode: string;
}

/** 发送验证码响应 */
export interface SendCodeResponse {
  success: boolean;
  message: string;
  expiresIn?: number; // 过期时间（秒）
}

// ==================== 动态/帖子相关类型 ====================

/** 动态内容 */
export interface Post {
  id: string;
  userId: string;
  userNickname: string;
  userAvatar: string;
  content: string;
  images: string[]; // 图片URL数组
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  // 额外字段（前端使用）
  isLiked?: boolean;
}

/** 创建动态请求 */
export interface CreatePostRequest {
  content: string;
  images: string[];
}

/** 更新动态请求 */
export interface UpdatePostRequest {
  postId: string;
  content: string;
  images?: string[];
}

/** 动态列表查询参数 */
export interface PostListQuery {
  page: number;
  pageSize: number;
  userId?: string;
}

/** 动态列表响应 */
export interface PostListResponse {
  posts: Post[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ==================== 评论相关类型 ====================

/** 评论内容 */
export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userNickname: string;
  userAvatar: string;
  content: string;
  isAI: boolean; // 是否为AI评论
  aiRole?: string; // AI角色标识
  createdAt: string;
}

/** 创建评论请求 */
export interface CreateCommentRequest {
  postId: string;
  content: string;
}

/** 评论列表查询参数 */
export interface CommentListQuery {
  postId: string;
  page: number;
  pageSize: number;
}

// ==================== 点赞相关类型 ====================

/** 点赞请求 */
export interface LikeRequest {
  postId: string;
  action: 'like' | 'unlike';
}

// ==================== AI相关类型 ====================

/** AI用户角色配置 */
export interface AIUser {
  id: string;
  name: string;
  role: string; // 角色标识
  avatar: string; // 头像URL
  persona: string; // 人设描述
  style: string[]; // 评论风格标签
  background: string; // 背景故事
  exampleComments: string[]; // 示例评论
}

/** AI评论任务 */
export interface AICommentTask {
  id: string;
  postId: string;
  content: string;
  images: string[];
  scheduledAt: Date; // 计划执行时间
  status: 'pending' | 'processing' | 'completed' | 'failed';
  batch: number; // 批次号 (1-4)
  createdAt: Date;
  executedAt?: Date;
  error?: string;
}

/** AI评论生成请求 */
export interface GenerateAICommentsRequest {
  postId: string;
  content: string;
  images: string[];
}

/** AI评论结果 */
export interface AICommentResult {
  success: boolean;
  comments: Array<{
    roleId: string;
    content: string;
  }>;
  message?: string;
}

// ==================== API响应类型 ====================

/** 通用API响应 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== 工具类型 ====================

/** 泛型API处理器 */
export type ApiHandler<T = any, R = any> = (
  req: Request,
  context?: T
) => Promise<ApiResponse<R>>;

/** 表单字段错误 */
export interface FieldError {
  field: string;
  message: string;
}

/** 验证结果 */
export interface ValidationResult {
  valid: boolean;
  errors?: FieldError[];
}

// ==================== 数据库相关类型 ====================

/** 数据库行接口 - 用户表 */
export interface DbUser {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
  created_at: string;
  last_login_at: string;
}

/** 数据库行接口 - 动态表 */
export interface DbPost {
  id: string;
  user_id: string;
  content: string;
  images: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

/** 数据库行接口 - 评论表 */
export interface DbComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  is_ai: boolean;
  ai_role: string | null;
  created_at: string;
}

/** 数据库行接口 - 点赞表 */
export interface DbLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

/** 数据库行接口 - 验证码表 */
export interface DbCaptcha {
  id: string;
  code: string;
  expires_at: string;
  created_at: string;
}

/** 数据库行接口 - 邮箱验证码表 */
export interface DbEmailCode {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

/** 数据库行接口 - AI评论任务表 */
export interface DbAICommentTask {
  id: string;
  post_id: string;
  batch: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduled_at: string;
  executed_at: string | null;
  error: string | null;
  created_at: string;
}

/** 数据库行接口 - IP限制表 */
export interface DbIPLimit {
  id: string;
  ip_address: string;
  action: string;
  count: number;
  window_start: string;
  created_at: string;
}

// ==================== 会话类型 ====================

/** NextAuth会话用户 */
export interface SessionUser {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
}

/** 会话信息 */
export interface Session {
  user: SessionUser;
  expires: string;
}
