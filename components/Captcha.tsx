/**
 * 组件：图片验证码
 * 显示验证码图片，支持刷新
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface CaptchaProps {
  onVerify: (captchaId: string, captchaCode: string) => void;
  refreshKey?: number; // 用于强制刷新
}

export default function Captcha({ onVerify, refreshKey = 0 }: CaptchaProps) {
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 加载验证码
  const loadCaptcha = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/captcha');
      const data = await response.json();
      
      if (data.success) {
        setCaptchaId(data.captchaId);
        setCaptchaImage(data.data);
      } else {
        setError(data.message || '加载验证码失败');
      }
    } catch (error) {
      console.error('加载验证码失败:', error);
      setError('网络错误，请重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 组件挂载或refreshKey变化时加载验证码
  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha, refreshKey]);

  // 处理输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 4);
    setUserInput(value);
    setError('');
  };

  // 提交验证
  const handleSubmit = () => {
    if (userInput.length !== 4) {
      setError('请输入4位验证码');
      return;
    }
    
    onVerify(captchaId, userInput);
  };

  // 刷新验证码
  const handleRefresh = () => {
    setUserInput('');
    loadCaptcha();
  };

  return (
    <div className="space-y-4">
      {/* 验证码显示区域 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          {isLoading ? (
            <div className="w-[120px] h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : captchaImage ? (
            <img
              src={captchaImage}
              alt="验证码"
              className="w-[120px] h-10 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={handleRefresh}
              title="点击刷新"
            />
          ) : (
            <div className="w-[120px] h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-sm">
              加载失败
            </div>
          )}
        </div>
        
        <input
          type="text"
          value={userInput}
          onChange={handleInputChange}
          placeholder="请输入验证码"
          className="flex-1 h-10 px-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase tracking-wider text-center text-lg font-mono"
          maxLength={4}
          autoComplete="off"
        />
        
        <button
          type="button"
          onClick={handleRefresh}
          className="p-2 text-gray-500 hover:text-blue-500 hover:bg-gray-100 rounded-lg transition-colors"
          title="刷新验证码"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <p className="text-red-500 text-sm flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}

      {/* 提示文字 */}
      <p className="text-xs text-gray-400">
        点击图片可刷新验证码
      </p>

      {/* 确认按钮 */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={userInput.length !== 4 || isLoading}
        className="w-full py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        确认验证码
      </button>
    </div>
  );
}
