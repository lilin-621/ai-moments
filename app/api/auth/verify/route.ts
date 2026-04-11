/**
 * API路由：验证邮箱验证码并登录
 * POST /api/auth/verify
 * 
 * 开发模式：使用内存存储，无需数据库
 */

import { NextResponse } from 'next/server';
import { verifyEmailCode } from '@/lib/captcha';
import { cookies } from 'next/headers';

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

// 内存存储用户数据
const usersStore = new Map<string, { id: string; email: string; nickname: string; avatar: string }>();

/**
 * 生成简单的JWT令牌
 * 实际生产环境建议使用 jose 库
 */
function generateToken(userId: string, email: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7天有效期
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // 简单的签名（实际应使用crypto）
  const signature = Buffer.from(`${base64Header}.${base64Payload}.${JWT_SECRET}`)
    .toString('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * 验证JWT令牌
 */
function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const [header, payload, signature] = token.split('.');
    
    // 验证签名
    const expectedSignature = Buffer.from(`${header}.${payload}.${JWT_SECRET}`)
      .toString('base64url');
    
    if (signature !== expectedSignature) {
      return null;
    }

    // 验证过期时间
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { userId: decoded.userId, email: decoded.email };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { email, code } = body;

    // 参数验证
    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证邮箱验证码
    const verifyResult = await verifyEmailCode(email, code);
    
    if (!verifyResult.valid) {
      return NextResponse.json(
        { success: false, message: verifyResult.message },
        { status: 400 }
      );
    }

    // 从内存查询或创建用户
    let user = usersStore.get(email.toLowerCase());
    
    if (!user) {
      // 新用户，自动注册
      const userId = crypto.randomUUID();
      const nickname = `用户${Math.random().toString(36).substring(2, 8)}`;
      const avatarIndex = Math.floor(Math.random() * 70) + 1;
      
      user = {
        id: userId,
        email: email.toLowerCase(),
        nickname,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarIndex}`,
      };
      
      usersStore.set(email.toLowerCase(), user);
    }

    // 生成JWT令牌
    const token = generateToken(user.id, user.email);

    // 设置HTTP-only Cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7天
      path: '/',
    });

    // 返回用户信息
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
      },
      token,
      message: '登录成功',
    });

  } catch (error) {
    console.error('登录验证失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * GET: 获取当前登录状态
 */
export async function GET(request: Request) {
  try {
    // 从Cookie获取令牌
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        message: '未登录',
      });
    }

    // 验证令牌
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        message: '登录已过期',
      });
    }

    // 从内存获取用户信息
    const user = usersStore.get(decoded.email);

    if (!user) {
      return NextResponse.json({
        success: false,
        authenticated: false,
        message: '用户不存在',
      });
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    });

  } catch (error) {
    console.error('获取登录状态失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: 退出登录
 */
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');

    return NextResponse.json({
      success: true,
      message: '已退出登录',
    });
  } catch (error) {
    console.error('退出登录失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
