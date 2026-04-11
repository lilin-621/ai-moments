/**
 * AI朋友圈项目 - 图片验证码模块
 * 生成和验证图片验证码，防止暴力注册
 * 
 * 开发模式：使用内存存储，无需数据库
 * 生产模式：使用Supabase数据库
 */

import { CaptchaResponse, SendCodeRequest, SendCodeResponse } from '@/types';

// ==================== 内存存储（开发模式）====================

// 内存存储验证码
const captchaStore = new Map<string, { code: string; expiresAt: number; used: boolean }>();
const emailCodeStore = new Map<string, { code: string; expiresAt: number; used: boolean }>();
const ipLimitStore = new Map<string, { count: number; resetAt: number }>();

// 是否使用数据库模式
const USE_DATABASE = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

// 动态导入Supabase（仅在数据库模式时）
let supabaseAdmin: any = null;
if (USE_DATABASE) {
  import('./supabase').then(module => {
    supabaseAdmin = module.supabaseAdmin;
  });
}

// ==================== 验证码配置 ====================

/** 验证码有效期（秒） */
const CAPTCHA_EXPIRES_IN = 5 * 60; // 5分钟

/** 邮箱验证码有效期（秒） */
const EMAIL_CODE_EXPIRES_IN = 5 * 60; // 5分钟

/** 同一邮箱发送验证码冷却时间（秒） */
const EMAIL_COOLDOWN = 60; // 60秒

/** IP每小时最大请求次数 */
const IP_MAX_REQUESTS_PER_HOUR = 5;

/** IP限制时间窗口（小时） */
const IP_WINDOW_HOURS = 1;

// ==================== 验证码字符集 ====================

/** 生成验证码的字符集（排除容易混淆的字符） */
const CAPTCHA_CHARS = '2345678abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * 生成随机验证码字符串
 * @param length - 验证码长度，默认4位
 */
export function generateCaptchaCode(length: number = 4): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CAPTCHA_CHARS.length);
    code += CAPTCHA_CHARS[randomIndex];
  }
  return code;
}

/**
 * 生成随机数字验证码（6位，用于邮箱验证）
 */
export function generateEmailCode(): string {
  return Math.random().toString().substring(2, 8).padStart(6, '0');
}

// ==================== SVG验证码生成 ====================

/**
 * 生成SVG格式的验证码图片
 * @param code - 验证码内容
 * @returns SVG字符串
 */
export function generateCaptchaSVG(code: string): string {
  const width = 120;
  const height = 40;
  const fontSize = 24;
  const padding = 10;

  // 随机扭曲参数
  const chars = code.split('');
  const charWidth = (width - padding * 2) / chars.length;

  // 生成干扰线
  const lines = generateNoiseLines(3);

  // 生成噪点
  const noise = generateNoisePoints(30);

  // 构建每个字符的SVG元素（带随机旋转和位置偏移）
  const textElements = chars.map((char, index) => {
    const x = padding + index * charWidth + charWidth / 2;
    const y = height / 2 + fontSize / 3;
    const rotate = (Math.random() - 0.5) * 30; // -15° 到 15°
    const translateY = (Math.random() - 0.5) * 8;

    return `
      <text
        x="${x}"
        y="${y + translateY}"
        font-family="Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="bold"
        fill="${getRandomColor()}"
        text-anchor="middle"
        dominant-baseline="middle"
        transform="rotate(${rotate}, ${x}, ${y})"
      >${escapeXml(char)}</text>
    `;
  }).join('');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <!-- 背景 -->
      <rect width="${width}" height="${height}" fill="#f5f5f5"/>
      
      <!-- 干扰线 -->
      ${lines}
      
      <!-- 噪点 -->
      ${noise}
      
      <!-- 验证码文字 -->
      ${textElements}
    </svg>
  `;

  return svg;
}

/**
 * 生成干扰线
 */
function generateNoiseLines(count: number): string {
  let lines = '';
  for (let i = 0; i < count; i++) {
    const x1 = Math.random() * 120;
    const y1 = Math.random() * 40;
    const x2 = Math.random() * 120;
    const y2 = Math.random() * 40;
    lines += `
      <line 
        x1="${x1}" y1="${y1}" 
        x2="${x2}" y2="${y2}" 
        stroke="${getRandomColor()}" 
        stroke-width="${1 + Math.random()}"
        opacity="${0.3 + Math.random() * 0.3}"
      />
    `;
  }
  return lines;
}

/**
 * 生成噪点
 */
function generateNoisePoints(count: number): string {
  let points = '';
  for (let i = 0; i < count; i++) {
    const x = Math.random() * 120;
    const y = Math.random() * 40;
    const r = Math.random() * 2;
    points += `
      <circle cx="${x}" cy="${y}" r="${r}" fill="${getRandomColor()}" opacity="${0.3 + Math.random() * 0.4}"/>
    `;
  }
  return points;
}

/**
 * 获取随机颜色（蓝灰色系）
 */
function getRandomColor(): string {
  const colors = [
    '#1a73e8', '#ea4335', '#34a853', '#fbbc05',
    '#673ab7', '#e91e63', '#00bcd4', '#795548',
    '#607d8b', '#3f51b5', '#009688', '#ff5722',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * XML转义（防止SVG注入）
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ==================== 验证码存储和验证 ====================

/**
 * 创建图片验证码
 * @param ipAddress - 用户IP地址
 * @returns 验证码ID和SVG图片
 */
export async function createCaptcha(ipAddress: string): Promise<CaptchaResponse> {
  // 检查IP频率限制
  const ipAllowed = await checkIPRateLimit(ipAddress, 'captcha');
  if (!ipAllowed) {
    return {
      success: false,
      captchaId: '',
      message: '请求过于频繁，请稍后再试',
    };
  }

  // 生成验证码
  const code = generateCaptchaCode(4);
  const captchaId = crypto.randomUUID();
  const expiresAt = Date.now() + CAPTCHA_EXPIRES_IN * 1000;

  // 使用内存存储
  captchaStore.set(captchaId, {
    code: code.toLowerCase(),
    expiresAt,
    used: false,
  });

  // 生成SVG图片
  const svg = generateCaptchaSVG(code);
  const base64Svg = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  return {
    success: true,
    captchaId,
    data: base64Svg,
    message: '验证码生成成功',
  };
}

/**
 * 验证图片验证码
 * @param captchaId - 验证码ID
 * @param userCode - 用户输入的验证码
 * @returns 是否验证通过
 */
export async function verifyCaptcha(
  captchaId: string,
  userCode: string
): Promise<{ valid: boolean; message: string }> {
  // 从内存获取验证码
  const captcha = captchaStore.get(captchaId);

  if (!captcha) {
    return { valid: false, message: '验证码不存在' };
  }

  // 检查是否过期
  if (captcha.expiresAt < Date.now()) {
    captchaStore.delete(captchaId);
    return { valid: false, message: '验证码已过期' };
  }

  // 检查是否已使用
  if (captcha.used) {
    return { valid: false, message: '验证码已使用' };
  }

  // 验证验证码是否正确（忽略大小写）
  if (captcha.code !== userCode.toLowerCase()) {
    return { valid: false, message: '验证码错误' };
  }

  // 标记为已使用
  captcha.used = true;

  return { valid: true, message: '验证通过' };
}

// ==================== 邮箱验证码发送 ====================

/**
 * 发送邮箱验证码
 * @param email - 邮箱地址
 * @param captchaId - 图片验证码ID
 * @param captchaCode - 图片验证码
 * @param ipAddress - 用户IP
 */
export async function sendEmailCode(
  email: string,
  captchaId: string,
  captchaCode: string,
  ipAddress: string
): Promise<SendCodeResponse> {
  // 验证邮箱格式
  if (!isValidEmail(email)) {
    return { success: false, message: '邮箱格式不正确' };
  }

  // 验证图片验证码
  const captchaResult = await verifyCaptcha(captchaId, captchaCode);
  if (!captchaResult.valid) {
    return { success: false, message: captchaResult.message };
  }

  // 检查IP频率限制
  const ipAllowed = await checkIPRateLimit(ipAddress, 'email_code');
  if (!ipAllowed) {
    return { success: false, message: '请求过于频繁，请稍后再试' };
  }

  // 检查邮箱发送冷却
  const cooldownAllowed = await checkEmailCooldown(email);
  if (!cooldownAllowed) {
    return { success: false, message: '验证码发送太频繁，请稍后再试' };
  }

  // 生成邮箱验证码
  const code = generateEmailCode();
  const expiresAt = Date.now() + EMAIL_CODE_EXPIRES_IN * 1000;

  // 使用内存存储
  emailCodeStore.set(email.toLowerCase(), {
    code,
    expiresAt,
    used: false,
  });

  // 发送邮件（控制台输出）
  try {
    await sendEmail(email, code);
    return {
      success: true,
      message: '验证码已发送',
      expiresIn: EMAIL_CODE_EXPIRES_IN,
    };
  } catch (error) {
    console.error('发送邮件失败:', error);
    return { success: false, message: '邮件发送失败，请稍后再试' };
  }
}

/**
 * 验证邮箱验证码
 * @param email - 邮箱地址
 * @param code - 验证码
 */
export async function verifyEmailCode(
  email: string,
  code: string
): Promise<{ valid: boolean; message: string }> {
  // 从内存获取验证码
  const emailCode = emailCodeStore.get(email.toLowerCase());

  if (!emailCode) {
    return { valid: false, message: '验证码不存在或已失效' };
  }

  // 检查是否过期
  if (emailCode.expiresAt < Date.now()) {
    emailCodeStore.delete(email.toLowerCase());
    return { valid: false, message: '验证码已过期' };
  }

  // 验证验证码
  if (emailCode.code !== code) {
    return { valid: false, message: '验证码错误' };
  }

  // 标记为已使用
  emailCode.used = true;

  return { valid: true, message: '验证通过' };
}

// ==================== 频率限制 ====================

/**
 * 检查IP频率限制
 */
async function checkIPRateLimit(
  ipAddress: string,
  action: string
): Promise<boolean> {
  const key = `${ipAddress}:${action}`;
  const now = Date.now();
  const windowMs = IP_WINDOW_HOURS * 60 * 60 * 1000;

  const record = ipLimitStore.get(key);

  // 如果没有记录或窗口已过期，重置
  if (!record || record.resetAt < now) {
    ipLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  // 检查是否超过限制
  if (record.count >= IP_MAX_REQUESTS_PER_HOUR) {
    return false;
  }

  // 增加计数
  record.count++;
  return true;
}

/**
 * 检查邮箱验证码发送冷却
 */
async function checkEmailCooldown(email: string): Promise<boolean> {
  const emailCode = emailCodeStore.get(email.toLowerCase());

  if (!emailCode) {
    return true;
  }

  // 检查是否在冷却期内
  const cooldownMs = EMAIL_COOLDOWN * 1000;
  const lastSentAt = emailCode.expiresAt - EMAIL_CODE_EXPIRES_IN * 1000;

  return Date.now() - lastSentAt > cooldownMs;
}

// ==================== 工具函数 ====================

/**
 * 验证邮箱格式
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 发送邮件（实际实现需要配置SMTP）
 */
async function sendEmail(to: string, code: string): Promise<void> {
  // 实际发送逻辑（需要配置SMTP）
  // 这里使用控制台日志模拟
  console.log(`
    ╔═══════════════════════════════════════════╗
    ║         AI朋友圈 - 邮箱验证码             ║
    ╠═══════════════════════════════════════════╣
    ║  收件人: ${to.padEnd(32)}║
    ║  验证码: ${code.padEnd(32)}║
    ║  有效期: 5分钟                             ║
    ╚═══════════════════════════════════════════╝
  `);

  // 实际发送时取消下面这行注释并配置SMTP
  // await sendWithSMTP(to, code);

  // 如果配置了SMTP，取消下面的代码注释并填入配置
  /*
  const nodemailer = require('nodemailer');
  
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `"AI朋友圈" <${process.env.SMTP_USER}>`,
    to,
    subject: '【AI朋友圈】您的登录验证码',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>您好！</h2>
        <p>您的登录验证码是：<strong style="font-size: 24px; color: #1a73e8;">${code}</strong></p>
        <p>验证码有效期为5分钟，请尽快完成验证。</p>
        <p style="color: #666; font-size: 12px;">如果您没有请求此验证码，请忽略此邮件。</p>
      </div>
    `,
  });
  */

  return Promise.resolve();
}

export default {
  createCaptcha,
  verifyCaptcha,
  sendEmailCode,
  verifyEmailCode,
  generateCaptchaCode,
  generateEmailCode,
  generateCaptchaSVG,
};
