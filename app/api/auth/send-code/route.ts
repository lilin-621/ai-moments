/**
 * API路由：发送邮箱验证码
 * POST /api/auth/send-code
 * 
 * 请求体：
 * {
 *   email: string,      // 邮箱地址
 *   captchaId: string,  // 图片验证码ID
 *   captchaCode: string // 图片验证码内容
 * }
 * 
 * 防暴力措施：
 * - 需先通过图片验证码
 * - 同一IP每小时最多5次
 * - 同一邮箱60秒内只能发1次
 */

import { NextResponse } from 'next/server';
import { sendEmailCode } from '@/lib/captcha';

/**
 * 获取客户端IP地址
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  return '127.0.0.1';
}

export async function POST(request: Request) {
  try {
    // 解析请求体
    const body = await request.json();
    const { email, captchaId, captchaCode } = body;

    // 参数验证
    if (!email || !captchaId || !captchaCode) {
      return NextResponse.json(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取客户端IP
    const clientIP = getClientIP(request);

    // 发送验证码
    const result = await sendEmailCode(email, captchaId, captchaCode, clientIP);

    if (!result.success) {
      // 根据错误类型返回不同状态码
      const statusCode = result.message.includes('频繁') ? 429 : 400;
      return NextResponse.json(
        { success: false, message: result.message },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn,
    });

  } catch (error) {
    console.error('发送验证码失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
