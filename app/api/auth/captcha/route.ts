/**
 * API路由：获取图片验证码
 * GET /api/auth/captcha
 * 
 * 生成一个图片验证码，返回SVG格式的图片
 * 包含频率限制：同一IP每小时最多5次
 */

import { NextResponse } from 'next/server';
import { createCaptcha } from '@/lib/captcha';

/**
 * 获取客户端IP地址
 */
function getClientIP(request: Request): string {
  // 尝试从各种头部获取真实IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // 默认值（开发环境）
  return '127.0.0.1';
}

export async function GET(request: Request) {
  try {
    // 获取客户端IP
    const clientIP = getClientIP(request);
    
    // 生成验证码
    const result = await createCaptcha(clientIP);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 429 } // Too Many Requests
      );
    }

    // 返回验证码数据
    return NextResponse.json({
      success: true,
      captchaId: result.captchaId,
      data: result.data,
      message: result.message,
    });

  } catch (error) {
    console.error('获取验证码失败:', error);
    return NextResponse.json(
      { success: false, message: '服务器错误' },
      { status: 500 }
    );
  }
}
