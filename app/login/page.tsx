/**
 * 登录页面
 * 包含图片验证码和邮箱验证码登录
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Captcha from '@/components/Captcha';

type LoginStep = 'captcha' | 'email' | 'verify';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('captcha');
  const [email, setEmail] = useState('');
  const [captchaId, setCaptchaId] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sendLoading, setSendLoading] = useState(false);
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);

  // 倒计时效果
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 处理图片验证码验证
  const handleCaptchaVerify = (id: string, code: string) => {
    setCaptchaId(id);
    setCaptchaCode(code);
    setStep('email');
    setError('');
  };

  // 发送邮箱验证码
  const handleSendCode = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setSendLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          captchaId,
          captchaCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStep('verify');
        setCountdown(60);
      } else {
        setError(data.message);
        // 如果是验证码错误，刷新验证码
        if (data.message.includes('验证码')) {
          setCaptchaRefreshKey(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      setError('发送失败，请重试');
    } finally {
      setSendLoading(false);
    }
  };

  // 验证邮箱验证码并登录
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailCode || emailCode.length !== 6) {
      setError('请输入6位验证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: emailCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 登录成功，跳转首页
        router.push('/');
        router.refresh();
      } else {
        setError(data.message);
      }
    } catch (error) {
      console.error('登录失败:', error);
      setError('登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 返回上一步
  const handleBack = () => {
    if (step === 'email') {
      setStep('captcha');
      setEmail('');
      setCaptchaCode('');
    } else if (step === 'verify') {
      setStep('email');
      setEmailCode('');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">🤖</span>
            </div>
            <span className="text-3xl font-bold text-white">AI朋友圈</span>
          </Link>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* 标题 */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {step === 'captcha' && '安全验证'}
              {step === 'email' && '输入邮箱'}
              {step === 'verify' && '输入验证码'}
            </h1>
            <p className="text-gray-500 text-sm">
              {step === 'captcha' && '请先完成安全验证'}
              {step === 'email' && '我们会向您的邮箱发送验证码'}
              {step === 'verify' && `验证码已发送至 ${email}`}
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* 第一步：图片验证码 */}
          {step === 'captcha' && (
            <div className="space-y-6">
              <Captcha 
                onVerify={handleCaptchaVerify}
                refreshKey={captchaRefreshKey}
              />
              
              <div className="text-sm text-gray-500 text-center">
                <p>安全验证可以防止恶意注册</p>
              </div>
            </div>
          )}

          {/* 第二步：输入邮箱 */}
          {step === 'email' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱地址
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入您的邮箱"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <button
                onClick={handleSendCode}
                disabled={sendLoading || !email}
                className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {sendLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    发送中...
                  </>
                ) : (
                  '发送验证码'
                )}
              </button>
            </div>
          )}

          {/* 第三步：输入邮箱验证码 */}
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱验证码
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="请输入6位验证码"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-xl tracking-widest font-mono"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 text-center">
                  验证码5分钟内有效
                </p>
              </div>
              
              <button
                type="submit"
                disabled={loading || emailCode.length !== 6}
                className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    验证中...
                  </>
                ) : (
                  '验证并登录'
                )}
              </button>
            </form>
          )}

          {/* 返回按钮 */}
          {step !== 'captcha' && (
            <button
              onClick={handleBack}
              className="w-full mt-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              ← 返回上一步
            </button>
          )}

          {/* 重新获取验证码 */}
          {step === 'verify' && countdown > 0 && (
            <p className="mt-4 text-center text-gray-400 text-sm">
              {countdown}秒后可重新获取验证码
            </p>
          )}
          
          {step === 'verify' && countdown === 0 && (
            <button
              onClick={handleSendCode}
              disabled={sendLoading}
              className="w-full mt-4 py-2 text-blue-500 text-sm hover:text-blue-600 disabled:opacity-50"
            >
              {sendLoading ? '发送中...' : '重新获取验证码'}
            </button>
          )}
        </div>

        {/* 底部说明 */}
        <p className="text-center text-white/80 text-sm mt-6">
          登录即表示同意我们的{' '}
          <a href="#" className="underline hover:text-white">服务条款</a>
          {' '}和{' '}
          <a href="#" className="underline hover:text-white">隐私政策</a>
        </p>
      </div>
    </div>
  );
}
