/**
 * API路由：点赞相关操作
 * POST /api/likes - 点赞/取消点赞
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '../auth/verify/route';
import { getUserByEmail, supabaseAdmin } from '@/lib/supabase';
import { LikeRequest } from '@/types';

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

// ==================== POST: 点赞/取消点赞 ====================

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
    const body: LikeRequest = await request.json();
    const { postId, action } = body;

    // 参数验证
    if (!postId) {
      return NextResponse.json(
        { success: false, message: '缺少动态ID' },
        { status: 400 }
      );
    }

    if (!action || !['like', 'unlike'].includes(action)) {
      return NextResponse.json(
        { success: false, message: '无效的操作类型' },
        { status: 400 }
      );
    }

    // 检查动态是否存在
    const { data: post, error: postError } = await supabaseAdmin
      .from('posts')
      .select('id, likes_count')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { success: false, message: '动态不存在' },
        { status: 404 }
      );
    }

    // 检查是否已经点赞
    const { data: existingLike } = await supabaseAdmin
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (action === 'like') {
      // 点赞操作
      if (existingLike) {
        return NextResponse.json({
          success: true,
          liked: true,
          message: '已经点过赞了',
        });
      }

      // 创建点赞记录
      const { error } = await supabaseAdmin
        .from('likes')
        .insert({
          id: crypto.randomUUID(),
          post_id: postId,
          user_id: user.id,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('点赞失败:', error);
        return NextResponse.json(
          { success: false, message: '点赞失败' },
          { status: 500 }
        );
      }

      // 更新点赞数
      await supabaseAdmin
        .from('posts')
        .update({ likes_count: post.likes_count + 1 })
        .eq('id', postId);

      return NextResponse.json({
        success: true,
        liked: true,
        likesCount: post.likes_count + 1,
        message: '点赞成功',
      });

    } else {
      // 取消点赞操作
      if (!existingLike) {
        return NextResponse.json({
          success: true,
          liked: false,
          message: '还没点赞呢',
        });
      }

      // 删除点赞记录
      const { error } = await supabaseAdmin
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (error) {
        console.error('取消点赞失败:', error);
        return NextResponse.json(
          { success: false, message: '操作失败' },
          { status: 500 }
        );
      }

      // 更新点赞数
      const newCount = Math.max(0, post.likes_count - 1);
      await supabaseAdmin
        .from('posts')
        .update({ likes_count: newCount })
        .eq('id', postId);

      return NextResponse.json({
        success: true,
        liked: false,
        likesCount: newCount,
        message: '已取消点赞',
      });
    }

  } catch (error) {
    console.error('点赞操作失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

// ==================== GET: 获取用户点赞列表（可选） ====================

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: '请先登录' },
        { status: 401 }
      );
    }

    // 获取用户点赞的所有动态ID
    const { data: likes, error } = await supabaseAdmin
      .from('likes')
      .select('post_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取点赞列表失败:', error);
      return NextResponse.json(
        { success: false, message: '获取失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      likes: likes || [],
    });

  } catch (error) {
    console.error('获取点赞列表失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
