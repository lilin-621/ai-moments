/**
 * API路由：评论相关操作
 * GET /api/comments - 获取评论列表
 * POST /api/comments - 发表评论
 * DELETE /api/comments - 删除评论
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../auth/verify/route';
import { getUserByEmail, supabaseAdmin, updatePostCommentCount } from '@/lib/supabase';
import { CreateCommentRequest, CommentListQuery } from '@/types';

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

// ==================== GET: 获取评论列表 ====================

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get('postId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    if (!postId) {
      return NextResponse.json(
        { success: false, message: '缺少动态ID' },
        { status: 400 }
      );
    }

    // 计算偏移量
    const offset = (page - 1) * pageSize;

    // 查询评论列表
    const { data: comments, error, count } = await supabaseAdmin
      .from('comments')
      .select(`
        *,
        user:users(id, nickname, avatar)
      `, { count: 'exact' })
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('获取评论列表失败:', error);
      return NextResponse.json(
        { success: false, message: '获取评论失败' },
        { status: 500 }
      );
    }

    // 格式化评论数据
    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      userNickname: comment.user?.nickname || '未知用户',
      userAvatar: comment.user?.avatar || '',
      content: comment.content,
      isAI: comment.is_ai,
      aiRole: comment.ai_role,
      createdAt: comment.created_at,
    }));

    return NextResponse.json({
      success: true,
      comments: formattedComments,
      total: count || 0,
      page,
      pageSize,
      hasMore: (count || 0) > offset + pageSize,
    });

  } catch (error) {
    console.error('获取评论列表失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// ==================== POST: 发表评论 ====================

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
    const body: CreateCommentRequest = await request.json();
    const { postId, content } = body;

    // 参数验证
    if (!postId) {
      return NextResponse.json(
        { success: false, message: '缺少动态ID' },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: '评论内容不能为空' },
        { status: 400 }
      );
    }

    if (content.length > 200) {
      return NextResponse.json(
        { success: false, message: '评论内容不能超过200字' },
        { status: 400 }
      );
    }

    // 检查动态是否存在
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, message: '动态不存在' },
        { status: 404 }
      );
    }

    // 创建评论
    const commentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert({
        id: commentId,
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        is_ai: false,
        ai_role: null,
        created_at: now,
      })
      .select(`
        *,
        user:users(id, nickname, avatar)
      `)
      .single();

    if (error) {
      console.error('发表评论失败:', error);
      return NextResponse.json(
        { success: false, message: '评论失败' },
        { status: 500 }
      );
    }

    // 更新动态评论数
    await updatePostCommentCount(postId, 1);

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        postId: comment.post_id,
        userId: comment.user_id,
        userNickname: user.nickname,
        userAvatar: user.avatar,
        content: comment.content,
        isAI: false,
        createdAt: comment.created_at,
      },
      message: '评论成功',
    });

  } catch (error) {
    console.error('发表评论失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// ==================== DELETE: 删除评论 ====================

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
    const commentId = url.searchParams.get('id');

    if (!commentId) {
      return NextResponse.json(
        { success: false, message: '缺少评论ID' },
        { status: 400 }
      );
    }

    // 查询评论，确认所有权
    const { data: existingComment, error: queryError } = await supabaseAdmin
      .from('comments')
      .select('id, user_id, post_id, is_ai')
      .eq('id', commentId)
      .single();

    if (queryError || !existingComment) {
      return NextResponse.json(
        { success: false, message: '评论不存在' },
        { status: 404 }
      );
    }

    // 检查权限（评论所有者或动态所有者可以删除）
    let canDelete = existingComment.user_id === user.id;
    
    if (!canDelete) {
      // 检查是否是动态所有者
      const { data: post } = await supabaseAdmin
        .from('posts')
        .select('user_id')
        .eq('id', existingComment.post_id)
        .single();
      
      canDelete = post?.user_id === user.id;
    }

    if (!canDelete) {
      return NextResponse.json(
        { success: false, message: '无权删除此评论' },
        { status: 403 }
      );
    }

    // 删除评论
    const { error } = await supabaseAdmin
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('删除评论失败:', error);
      return NextResponse.json(
        { success: false, message: '删除失败' },
        { status: 500 }
      );
    }

    // 更新动态评论数
    await updatePostCommentCount(existingComment.post_id, -1);

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });

  } catch (error) {
    console.error('删除评论失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
