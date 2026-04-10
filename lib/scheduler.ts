/**
 * AI朋友圈项目 - AI评论延迟调度器
 * 实现分批次延迟发送AI评论
 */

import { AICommentTask, AIUser } from '@/types';
import { generateAIComment, batchGenerateComments } from './zhipu';
import { AI_USER_POOL, matchAIUsersForContent } from './ai-users';
import { supabaseAdmin } from './supabase';

// ==================== 配置 ====================

/**
 * AI评论批次调度配置
 * 分4批延迟发送，制造自然的评论节奏
 */
export const AI_COMMENT_SCHEDULE = [
  { batch: 1, delay: 45, commentCount: 2 },   // 第1批：45秒后，2条评论
  { batch: 2, delay: 120, commentCount: 2 },   // 第2批：2分钟后，2条评论
  { batch: 3, delay: 180, commentCount: 2 },  // 第3批：3分钟后，2条评论
  { batch: 4, delay: 300, commentCount: 1 },  // 第4批：5分钟后，1条评论
];

/**
 * 单次最大AI评论数
 */
const MAX_COMMENTS_PER_POST = 7;

/**
 * 任务执行间隔（毫秒）
 */
const TASK_CHECK_INTERVAL = 5000;

// ==================== 任务队列状态 ====================

/** 内存中的任务队列（生产环境建议使用Redis） */
let taskQueue: AICommentTask[] = [];
let isSchedulerRunning = false;

/**
 * 创建AI评论任务
 * @param postId - 动态ID
 * @param content - 动态内容
 * @param images - 动态图片
 * @returns 创建的任务列表
 */
export async function createAICommentTasks(
  postId: string,
  content: string,
  images: string[] = []
): Promise<AICommentTask[]> {
  const now = new Date();
  const tasks: AICommentTask[] = [];

  // 根据内容匹配合适的AI角色
  const matchedUsers = matchAIUsersForContent(content);
  
  // 为每批评论创建任务
  for (const schedule of AI_COMMENT_SCHEDULE) {
    const scheduledAt = new Date(now.getTime() + schedule.delay * 1000);
    
    // 随机选择该批次使用的AI角色
    const batchUsers = matchedUsers
      .sort(() => Math.random() - 0.5)
      .slice(0, schedule.commentCount);

    const task: AICommentTask = {
      id: crypto.randomUUID(),
      postId,
      content,
      images,
      scheduledAt,
      status: 'pending',
      batch: schedule.batch,
      createdAt: now,
    };

    tasks.push(task);

    // 保存任务到数据库
    const { error } = await supabaseAdmin
      .from('ai_comment_tasks')
      .insert({
        id: task.id,
        post_id: postId,
        batch: schedule.batch,
        scheduled_at: scheduledAt.toISOString(),
        status: 'pending',
      });

    if (error) {
      console.error('创建AI评论任务失败:', error);
    }
  }

  // 添加到内存队列
  taskQueue.push(...tasks);

  console.log(`[调度器] 为动态 ${postId} 创建了 ${tasks.length} 个AI评论任务`);
  
  return tasks;
}

/**
 * 执行单个AI评论任务
 */
async function executeTask(task: AICommentTask): Promise<void> {
  console.log(`[调度器] 执行任务 ${task.id}，批次 ${task.batch}`);
  
  // 更新任务状态为处理中
  await supabaseAdmin
    .from('ai_comment_tasks')
    .update({ status: 'processing' })
    .eq('id', task.id);

  try {
    // 随机选择1-2个AI角色生成评论
    const commentCount = task.batch === 4 ? 1 : Math.floor(Math.random() * 2) + 1;
    const aiUsers = AI_USER_POOL
      .sort(() => Math.random() - 0.5)
      .slice(0, commentCount);

    for (const aiUser of aiUsers) {
      try {
        // 生成AI评论
        const commentContent = await generateAIComment(
          aiUser,
          task.content,
          task.images
        );

        // 保存评论到数据库
        await supabaseAdmin
          .from('comments')
          .insert({
            id: crypto.randomUUID(),
            post_id: task.postId,
            user_id: aiUser.id,
            content: commentContent,
            is_ai: true,
            ai_role: aiUser.role,
            created_at: new Date().toISOString(),
          });

        // 更新动态评论数
        await supabaseAdmin.rpc('increment_comments_count', {
          post_id: task.postId,
          delta: 1,
        });

        console.log(`[调度器] AI评论已添加 [${aiUser.name}]: ${commentContent}`);
      } catch (error) {
        console.error(`[调度器] 生成AI评论失败 [${aiUser.name}]:`, error);
      }
    }

    // 更新任务状态为完成
    await supabaseAdmin
      .from('ai_comment_tasks')
      .update({ 
        status: 'completed',
        executed_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    // 从队列中移除
    taskQueue = taskQueue.filter(t => t.id !== task.id);

  } catch (error) {
    console.error(`[调度器] 任务执行失败 ${task.id}:`, error);
    
    // 更新任务状态为失败
    await supabaseAdmin
      .from('ai_comment_tasks')
      .update({ 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', task.id);
  }
}

/**
 * 检查并执行到期的任务
 */
async function checkAndExecuteTasks(): Promise<void> {
  const now = new Date();

  // 查找所有待执行且已到期的任务
  const dueTasks = taskQueue.filter(
    task => task.status === 'pending' && new Date(task.scheduledAt) <= now
  );

  for (const task of dueTasks) {
    await executeTask(task);
  }
}

/**
 * 启动调度器
 * 在服务器启动时调用
 */
export function startScheduler(): void {
  if (isSchedulerRunning) {
    console.log('[调度器] 调度器已在运行中');
    return;
  }

  isSchedulerRunning = true;
  console.log('[调度器] AI评论调度器已启动');

  // 启动定时检查
  const intervalId = setInterval(checkAndExecuteTasks, TASK_CHECK_INTERVAL);

  // 将intervalId保存到全局（用于关闭）
  (global as any).__aiSchedulerInterval = intervalId;

  // 初始加载：恢复数据库中的待执行任务
  loadPendingTasksFromDB();
}

/**
 * 停止调度器
 */
export function stopScheduler(): void {
  const intervalId = (global as any).__aiSchedulerInterval;
  if (intervalId) {
    clearInterval(intervalId);
    delete (global as any).__aiSchedulerInterval;
  }
  isSchedulerRunning = false;
  console.log('[调度器] AI评论调度器已停止');
}

/**
 * 从数据库加载待执行任务
 */
async function loadPendingTasksFromDB(): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('ai_comment_tasks')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString());

    if (error) {
      console.error('[调度器] 加载待执行任务失败:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log(`[调度器] 从数据库恢复了 ${data.length} 个待执行任务`);
      
      // 将任务添加到内存队列
      for (const row of data) {
        taskQueue.push({
          id: row.id,
          postId: row.post_id,
          content: '', // 旧任务可能没有这些字段
          images: [],
          scheduledAt: new Date(row.scheduled_at),
          status: 'pending',
          batch: row.batch,
          createdAt: new Date(row.created_at),
        });
      }
    }
  } catch (error) {
    console.error('[调度器] 加载任务失败:', error);
  }
}

/**
 * 获取当前队列状态
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  queueLength: number;
  pendingTasks: AICommentTask[];
} {
  return {
    isRunning: isSchedulerRunning,
    queueLength: taskQueue.length,
    pendingTasks: taskQueue.filter(t => t.status === 'pending'),
  };
}

/**
 * 取消指定动态的所有AI评论任务
 */
export async function cancelTasksForPost(postId: string): Promise<void> {
  // 从内存队列移除
  taskQueue = taskQueue.filter(t => t.postId !== postId);

  // 更新数据库状态
  await supabaseAdmin
    .from('ai_comment_tasks')
    .update({ status: 'failed', error: 'Cancelled by user' })
    .eq('post_id', postId)
    .eq('status', 'pending');

  console.log(`[调度器] 已取消动态 ${postId} 的所有待执行任务`);
}

/**
 * 获取指定动态的AI评论任务列表
 */
export async function getTasksForPost(postId: string): Promise<AICommentTask[]> {
  const { data, error } = await supabaseAdmin
    .from('ai_comment_tasks')
    .select('*')
    .eq('post_id', postId)
    .order('batch', { ascending: true });

  if (error) {
    console.error('获取AI评论任务失败:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    postId: row.post_id,
    content: '',
    images: [],
    scheduledAt: new Date(row.scheduled_at),
    status: row.status,
    batch: row.batch,
    createdAt: new Date(row.created_at),
    executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
    error: row.error,
  }));
}

export default {
  createAICommentTasks,
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  cancelTasksForPost,
  getTasksForPost,
};
