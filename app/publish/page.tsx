/**
 * 发布动态页面
 * 发布文字和图片内容
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ImageUploader from '@/components/ImageUploader';

interface User {
  id: string;
  email: string;
  nickname: string;
  avatar: string;
}

export default function PublishPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 检查登录状态
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify');
        const data = await response.json();
        
        if (!data.authenticated) {
          router.push('/login');
          return;
        }
        
        setUser(data.user);
      } catch (error) {
        console.error('检查登录状态失败:', error);
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);

  // 发布动态
  const handlePublish = async () => {
    if (!content.trim()) {
      setError('请输入动态内容');
      return;
    }

    if (content.length > 500) {
      setError('动态内容不能超过500字');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          images,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 发布成功，跳转首页
        router.push('/');
        router.refresh();
      } else {
        setError(data.message || '发布失败');
      }
    } catch (error) {
      console.error('发布失败:', error);
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 字数统计
  const charCount = content.length;
  const charLimit = 500;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <Navbar user={user} />
      
      {/* 主内容区 */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* 返回按钮 */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          返回
        </Link>

        {/* 发布卡片 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* 头部 */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h1 className="text-lg font-medium text-gray-900">发布动态</h1>
            <button
              onClick={handlePublish}
              disabled={loading || !content.trim()}
              className="px-5 py-2 bg-blue-500 text-white font-medium rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  发布中...
                </>
              ) : (
                '发布'
              )}
            </button>
          </div>

          {/* 内容区 */}
          <div className="p-4">
            {/* 用户信息 */}
            {user && (
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                <img
                  src={user.avatar}
                  alt={user.nickname}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium text-gray-900">{user.nickname}</p>
                  <p className="text-sm text-gray-400">发布公开动态</p>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* 文本输入 */}
            <textarea
              value={content}
              onChange={(e) => {
                if (e.target.value.length <= charLimit) {
                  setContent(e.target.value);
                }
              }}
              placeholder="分享你的想法..."
              className="w-full min-h-[200px] text-gray-800 placeholder-gray-400 resize-none focus:outline-none text-base leading-relaxed"
              autoFocus
            />

            {/* 字数统计 */}
            <div className="flex justify-end mt-2">
              <span className={`text-sm ${charCount > charLimit * 0.9 ? 'text-orange-500' : 'text-gray-400'}`}>
                {charCount}/{charLimit}
              </span>
            </div>

            {/* 图片上传 */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <ImageUploader
                images={images}
                onChange={setImages}
                maxCount={9}
              />
            </div>

            {/* AI评论提示 */}
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                  <span className="text-xl">🤖</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">AI智能评论</p>
                  <p className="text-gray-500 text-sm mt-1">
                    发布动态后，15个AI角色将在不同时间段为你送上智能评论，
                    让你的动态不再冷清！
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 space-y-3 text-sm text-gray-500">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>支持上传最多9张图片，每张不超过5MB</span>
          </div>
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>请遵守社区规范，发布积极健康的内容</span>
          </div>
        </div>
      </main>
    </div>
  );
}
