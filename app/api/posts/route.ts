/**
 * API路由：动态（帖子）CRUD操作
 * GET /api/posts - 获取动态列表
 * POST /api/posts - 创建新动态
 * PUT /api/posts - 更新动态
 * DELETE /api/posts - 删除动态
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../auth/verify/route';
import { 
  getPosts, 
  getUserByEmail,
  supabaseAdmin,
  checkUserLiked,
  batchCheckUserLikes,
} from '@/lib/supabase';
import { createAICommentTasks } from '@/lib/scheduler';
import { CreatePostRequest, UpdatePostRequest, PostListQuery } from '@/types';

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

// ==================== GET: 获取动态列表 ====================

export async function GET(request: Request) {
  try {
    // 解析查询参数
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const userId = url.searchParams.get('userId') || undefined;

    // 获取当前用户（用于判断点赞状态）
    const currentUser = await getCurrentUser();

    // 获取动态列表
    const result = await getPosts(page, pageSize, userId);

    // 如果用户已登录，检查点赞状态
    let posts = result.posts;
    
    if (currentUser && posts.length > 0) {
      const postIds = posts.map(p => p.id);
      const likedMap = await batchCheckUserLikes(postIds, currentUser.id);
      
      posts = posts.map(post => ({
        ...post,
        isLiked: likedMap.get(post.id) || false,
      }));
    }

    return NextResponse.json({
      success: true,
      posts,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      hasMore: result.hasMore,
    });

  } catch (error) {
    console.error('获取动态列表失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// ==================== POST: 创建新动态 ====================

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
    const body: CreatePostRequest = await request.json();
    const { content, images } = body;

    // 参数验证
    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: '动态内容不能为空' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { success: false, message: '动态内容不能超过500字' },
        { status: 400 }
      );
    }

    // 验证图片数量
    if (images && images.length > 9) {
      return NextResponse.json(
        { success: false, message: '最多只能上传9张图片' },
        { status: 400 }
      );
    }

    // 创建动态
    const postId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert({
        id: postId,
        user_id: user.id,
        content: content.trim(),
        images: images || [],
        likes_count: 0,
        comments_count: 0,
        created_at: now,
        updated_at: now,
      })
      .select(`
        *,
        user:users(id, nickname, avatar)
      `)
      .single();

    if (error) {
      console.error('创建动态失败:', error);
      return NextResponse.json(
        { success: false, message: '创建动态失败' },
        { status: 500 }
      );
    }

    // 触发AI评论（异步，不阻塞响应）
    setImmediate(async () => {
      try {
        await createAICommentTasks(postId, content.trim(), images || []);
      } catch (error) {
        console.error('触发AI评论失败:', error);
      }
    });

    // 返回创建的动态
    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        userId: post.user_id,
        userNickname: user.nickname,
        userAvatar: user.avatar,
        content: post.content,
        images: post.images,
        likesCount: 0,
        commentsCount: 0,
        createdAt: post.created_at,
        isLiked: false,
      },
      message: '发布成功',
    });

  } catch (error) {
    console.error('创建动态失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// ==================== PUT: 更新动态 ====================

export async function PUT(request: Request) {
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
    const body: UpdatePostRequest = await request.json();
    const { postId, content, images } = body;

    // 参数验证
    if (!postId) {
      return NextResponse.json(
        { success: false, message: '缺少动态ID' },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: '动态内容不能为空' },
        { status: 400 }
      );
    }

    // 查询动态，确认所有权
    const { data: existingPost, error: queryError } = await supabaseAdmin
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (queryError || !existingPost) {
      return NextResponse.json(
        { success: false, message: '动态不存在' },
        { status: 404 }
      );
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: '无权修改此动态' },
        { status: 403 }
      );
    }

    // 更新动态
    const updateData: any = {
      content: content.trim(),
      updated_at: new Date().toISOString(),
    };

    if (images !== undefined) {
      updateData.images = images;
    }

    const { data: updatedPost, error } = await supabaseAdmin
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      console.error('更新动态失败:', error);
      return NextResponse.json(
        { success: false, message: '更新失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
      message: '更新成功',
    });

  } catch (error) {
    console.error('更新动态失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// ==================== DELETE: 删除动态 ====================

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

    // 解析查询参数获取要删除的动态ID
    const url = new URL(request.url);
    const postId = url.searchParams.get('id');

    if (!postId) {
      return NextResponse.json(
        { success: false, message: '缺少动态ID' },
        { status: 400 }
      );
    }

    // 查询动态，确认所有权
    const { data: existingPost, error: queryError } = await supabaseAdmin
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (queryError || !existingPost) {
      return NextResponse.json(
        { success: false, message: '动态不存在' },
        { status: 404 }
      );
    }

    if (existingPost.user_id !== user.id) {
      return NextResponse.json(
        { success: false, message: '无权删除此动态' },
        { status: 403 }
      );
    }

    // 删除动态（级联删除评论和点赞）
    await supabaseAdmin
      .from('comments')
      .delete()
      .eq('post_id', postId);

    await supabaseAdmin
      .from('likes')
      .delete()
      .eq('post_id', postId);

    await supabaseAdmin
      .from('ai_comment_tasks')
      .update({ status: 'failed', error: 'Post deleted' })
      .eq('post_id', postId)
      .eq('status', 'pending');

    const { error: deleteError } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('删除动态失败:', deleteError);
      return NextResponse.json(
        { success: false, message: '删除失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '删除成功',
    });

  } catch (error) {
    console.error('删除动态失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
