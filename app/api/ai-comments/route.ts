/**
 * API路由：AI评论触发和调度
 * POST /api/ai-comments - 手动触发AI评论（可选）
 * GET /api/ai-comments - 获取AI评论任务状态
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../auth/verify/route';
import { getUserByEmail, supabaseAdmin } from '@/lib/supabase';
import { 
  createAICommentTasks, 
  getTasksForPost,
  cancelTasksForPost,
  getSchedulerStatus,
} from '@/lib/scheduler';
import { GenerateAICommentsRequest } from '@/types';

// ==================== 工具函数 ====================

/**
 * 获取当前登录用户
 */
async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  return await getUserByEmail(decoded.email);
}

// ==================== POST: 手动触发AI评论 ====================

export async function POST(request: Request) {
  try {
    // 验证用户登录
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    // 解析请求体
    const body: GenerateAICommentsRequest = await request.json();
    const { postId, content, images } = body;

    // 参数验证
    if (!postId) {
      return NextResponse.json(
        { success: false, message: '缺少动态ID' },
        { status: 400 }
      );
    }

    // 检查动态是否存在且属于当前用户
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id, user_id, content, images')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, message: '动态不存在' },
        { status: 404 }
      );
    }

    // 如果提供了新内容，使用新内容；否则使用动态原有内容
    const finalContent = content || post.content;
    const finalImages = images || post.images || [];

    // 检查是否已有待执行的AI评论任务
    const existingTasks = await getTasksForPost(postId);
    const pendingTasks = existingTasks.filter(t => t.status === 'pending');

    if (pendingTasks.length > 0) {
      return NextResponse.json({
        success: false,
        message: '该动态已有AI评论任务在排队中',
        tasksCount: pendingTasks.length,
      });
    }

    // 创建新的AI评论任务
    const tasks = await createAICommentTasks(postId, finalContent, finalImages);

    return NextResponse.json({
      success: true,
      message: `已创建${tasks.length}个AI评论任务`,
      tasks: tasks.map(t => ({
        id: t.id,
        batch: t.batch,
        scheduledAt: t.scheduledAt,
      })),
    });

  } catch (error) {
    console.error('触发AI评论失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// ==================== GET: 获取AI评论状态 ====================

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get('postId');
    const status = url.searchParams.get('status');

    // 如果请求调度器状态
    if (status === 'scheduler') {
      const schedulerStatus = getSchedulerStatus();
      return NextResponse.json({
        success: true,
        scheduler: {
          isRunning: schedulerStatus.isRunning,
          queueLength: schedulerStatus.queueLength,
          pendingCount: schedulerStatus.pendingTasks.length,
        },
      });
    }

    // 如果请求指定动态的AI评论任务
    if (postId) {
      const tasks = await getTasksForPost(postId);

      return NextResponse.json({
        success: true,
        tasks: tasks.map(t => ({
          id: t.id,
          batch: t.batch,
          status: t.status,
          scheduledAt: t.scheduledAt,
          executedAt: t.executedAt,
          error: t.error,
        })),
      });
    }

    // 返回参数错误
    return NextResponse.json(
      { success: false, message: '请提供postId或status参数' },
      { status: 400 }
    );

  } catch (error) {
    console.error('获取AI评论状态失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// ==================== DELETE: 取消AI评论任务 ====================

export async function DELETE(request: Request) {
  try {
    // 验证用户登录
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    // 解析查询参数
    const url = new URL(request.url);
    const postId = url.searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { success: false, message: '缺少动态ID' },
        { status: 400 }
      );
    }

    // 检查动态所有权
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (error || !post) {
      return NextResponse.json(
        { success: false, message: '动态不存在' },
        { status: 404 }
      );
    }

    if (post.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: '无权操作此动态' },
        { status: 403 }
      );
    }

    // 取消任务
    await cancelTasksForPost(postId);

    return NextResponse.json({
      success: true,
      message: '已取消AI评论任务',
    });

  } catch (error) {
    console.error('取消AI评论失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
